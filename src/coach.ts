import {
  appendTransition,
  ensureWorkflowRoot,
  listRunIds,
  loadWorkflow,
  readCheckpoint,
  readCurrent,
  writeCheckpoint,
  writeCurrent,
  writeNodeOutput,
} from './storage.js';
import {
  RipplegraphError,
  type Checkpoint,
  type Edge,
  type Graph,
  type JsonSchema,
  type Node,
  type Position,
  type TransitionLogEntry,
  type Workflow,
} from './schema.js';

export interface WorkflowRootOptions {
  workflowRoot: string;
}

export interface StartRunOptions extends WorkflowRootOptions {
  graph: string;
  runId: string;
}

export interface StepRunOptions extends WorkflowRootOptions {
  output: unknown;
}

export interface SuspendRunOptions extends WorkflowRootOptions {
  note?: string;
}

export interface ResumeRunOptions extends WorkflowRootOptions {
  runId: string;
}

export interface AbandonRunOptions extends WorkflowRootOptions {
  reason?: string;
}

export interface StateOk {
  status: 'ok';
  workflow: { id: string; version: string };
  run: { id: string; status: Checkpoint['status']; rootGraph: string };
  position: Position;
  node: {
    id: string;
    purpose: string;
    instructions?: string;
    exec: Node['exec'];
    outputSchema: JsonSchema;
  };
  context: {
    previous: Array<{ id: string; purpose: string }>;
    next: Array<{ id: string; purpose: string }>;
    latches: [];
    capabilities: [];
  };
  responseContract: { command: 'step'; acceptedFormats: ['json'] };
}

export interface StateNoFocusedRun {
  status: 'no_focused_run';
  workflow: { id: string; version: string };
  availableGraphs: string[];
  resumableRuns: Array<{ id: string; status: 'suspended'; rootGraph: string }>;
}

export interface RunSummary {
  id: string;
  status: Checkpoint['status'];
  rootGraph: string;
  position: Position;
  updatedAt: string;
}

export interface RunList {
  status: 'ok';
  workflow: { id: string; version: string };
  focusedRunId: string | null;
  runs: RunSummary[];
}

export interface ValidationErrorResponse {
  status: 'validation_error';
  run: { id: string; status: Checkpoint['status']; rootGraph: string };
  position: Position;
  errors: Array<{ path: string; message: string }>;
}

export type CoachState = StateOk | StateNoFocusedRun;
export type StepRunResponse = StateOk | { status: 'completed'; run: { id: string; status: 'completed'; rootGraph: string }; position: Position } | ValidationErrorResponse;

export function validateWorkflowRoot(rootPath: string): { status: 'ok'; workflow: { id: string; version: string }; graphs: string[] } {
  const workflow = loadWorkflow(rootPath);
  ensureWorkflowRoot(rootPath);
  return { status: 'ok', workflow: { id: workflow.id, version: workflow.version }, graphs: Object.keys(workflow.graphs) };
}

export function startRun(opts: StartRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  if (current.focusedRunId) {
    throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
  }
  const graph = getGraph(workflow, opts.graph);
  if (listRunIds(opts.workflowRoot).includes(opts.runId)) {
    throw new RipplegraphError('E_RUN_EXISTS', `run already exists: ${opts.runId}`);
  }
  const now = new Date().toISOString();
  const checkpoint: Checkpoint = {
    runId: opts.runId,
    status: 'active',
    rootGraph: opts.graph,
    workflow: { id: workflow.id, version: workflow.version },
    position: { graph: opts.graph, node: graph.entry },
    createdAt: now,
    updatedAt: now,
    outputs: {},
  };
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: opts.runId });
  appendTransition(opts.workflowRoot, opts.runId, transitionEntry('start', opts.runId, null, checkpoint.position));
  return stateForCheckpoint(workflow, checkpoint);
}

export function getState(opts: WorkflowRootOptions): CoachState {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  if (!current.focusedRunId) {
    return {
      status: 'no_focused_run',
      workflow: { id: workflow.id, version: workflow.version },
      availableGraphs: Object.keys(workflow.graphs),
      resumableRuns: resumableRuns(opts.workflowRoot),
    };
  }
  return stateForCheckpoint(workflow, readCheckpoint(opts.workflowRoot, current.focusedRunId));
}

export function listRuns(opts: WorkflowRootOptions): RunList {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  return {
    status: 'ok',
    workflow: { id: workflow.id, version: workflow.version },
    focusedRunId: current.focusedRunId,
    runs: listRunIds(opts.workflowRoot).map((runId) => {
      const checkpoint = readCheckpoint(opts.workflowRoot, runId);
      return {
        id: checkpoint.runId,
        status: checkpoint.status,
        rootGraph: checkpoint.rootGraph,
        position: checkpoint.position,
        updatedAt: checkpoint.updatedAt,
      };
    }),
  };
}

export function stepRun(opts: StepRunOptions): StepRunResponse {
  const workflow = loadWorkflow(opts.workflowRoot);
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  if (checkpoint.status !== 'active') {
    throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
  }
  const graph = getGraph(workflow, checkpoint.rootGraph);
  const node = getNode(graph, checkpoint.position.node);
  if (node.terminal) {
    return completeRun(opts.workflowRoot, checkpoint, checkpoint.position);
  }
  const errors = validateOutput(node.outputSchema, opts.output);
  if (errors.length > 0) {
    appendTransition(opts.workflowRoot, checkpoint.runId, {
      ...transitionEntry('step', checkpoint.runId, checkpoint.position, checkpoint.position),
      validation: { ok: false, errors },
      error: { code: 'E_VALIDATION', message: 'output failed validation' },
    });
    return {
      status: 'validation_error',
      run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
      position: checkpoint.position,
      errors,
    };
  }

  const artifact = writeNodeOutput(opts.workflowRoot, checkpoint.runId, checkpoint.position.node, opts.output);
  const nextNodeId = selectEdge(node.edges, opts.output)?.to;
  if (!nextNodeId) {
    throw new RipplegraphError('E_NO_EDGE', `node ${checkpoint.position.node} has no matching edge`);
  }
  const from = checkpoint.position;
  const to = { graph: checkpoint.rootGraph, node: nextNodeId };
  checkpoint.outputs[checkpoint.position.node] = opts.output;
  checkpoint.position = to;
  checkpoint.updatedAt = new Date().toISOString();
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('step', checkpoint.runId, from, to),
    input: { artifact },
    output: { artifact },
  });
  const nextNode = getNode(graph, nextNodeId);
  if (nextNode.terminal) {
    return completeRun(opts.workflowRoot, checkpoint, to);
  }
  writeCheckpoint(opts.workflowRoot, checkpoint);
  return stateForCheckpoint(workflow, checkpoint);
}

export function suspendRun(opts: SuspendRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  if (checkpoint.status !== 'active') {
    throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
  }
  checkpoint.status = 'suspended';
  checkpoint.updatedAt = new Date().toISOString();
  if (opts.note) checkpoint.resumeNote = opts.note;
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: null });
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('suspend', checkpoint.runId, checkpoint.position, checkpoint.position),
    reason: opts.note ?? null,
  });
  return stateForCheckpoint(workflow, checkpoint);
}

export function resumeRun(opts: ResumeRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  if (current.focusedRunId) {
    throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
  }
  const checkpoint = readCheckpoint(opts.workflowRoot, opts.runId);
  if (checkpoint.status !== 'suspended') {
    throw new RipplegraphError('E_RUN_NOT_RESUMABLE', `run ${opts.runId} is not suspended`);
  }
  checkpoint.status = 'active';
  checkpoint.updatedAt = new Date().toISOString();
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: opts.runId });
  appendTransition(opts.workflowRoot, checkpoint.runId, transitionEntry('resume', checkpoint.runId, checkpoint.position, checkpoint.position));
  return stateForCheckpoint(workflow, checkpoint);
}

export function abandonRun(opts: AbandonRunOptions): { status: 'abandoned'; run: { id: string; status: 'abandoned'; rootGraph: string }; position: Position } {
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  checkpoint.status = 'abandoned';
  checkpoint.updatedAt = new Date().toISOString();
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: null });
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('abandon', checkpoint.runId, checkpoint.position, checkpoint.position),
    reason: opts.reason ?? null,
  });
  return {
    status: 'abandoned',
    run: { id: checkpoint.runId, status: 'abandoned', rootGraph: checkpoint.rootGraph },
    position: checkpoint.position,
  };
}

function focusedCheckpoint(rootPath: string): Checkpoint {
  ensureWorkflowRoot(rootPath);
  const current = readCurrent(rootPath);
  if (!current.focusedRunId) {
    throw new RipplegraphError('E_NO_FOCUSED_RUN', 'no focused run');
  }
  return readCheckpoint(rootPath, current.focusedRunId);
}

function completeRun(rootPath: string, checkpoint: Checkpoint, to: Position): StepRunResponse {
  checkpoint.status = 'completed';
  checkpoint.position = to;
  checkpoint.updatedAt = new Date().toISOString();
  writeCheckpoint(rootPath, checkpoint);
  writeCurrent(rootPath, { focusedRunId: null });
  return {
    status: 'completed',
    run: { id: checkpoint.runId, status: 'completed', rootGraph: checkpoint.rootGraph },
    position: checkpoint.position,
  };
}

function stateForCheckpoint(workflow: Workflow, checkpoint: Checkpoint): StateOk {
  const graph = getGraph(workflow, checkpoint.rootGraph);
  const node = getNode(graph, checkpoint.position.node);
  return {
    status: 'ok',
    workflow: { id: workflow.id, version: workflow.version },
    run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
    position: checkpoint.position,
    node: {
      id: checkpoint.position.node,
      purpose: node.purpose,
      instructions: node.instructions,
      exec: node.exec,
      outputSchema: node.outputSchema,
    },
    context: {
      previous: previousNodes(checkpoint),
      next: node.edges.map((edge) => {
        const next = getNode(graph, edge.to);
        return { id: edge.to, purpose: next.purpose };
      }),
      latches: [],
      capabilities: [],
    },
    responseContract: { command: 'step', acceptedFormats: ['json'] },
  };
}

function getGraph(workflow: Workflow, graphId: string): Graph {
  const graph = workflow.graphs[graphId];
  if (!graph) throw new RipplegraphError('E_UNKNOWN_GRAPH', `unknown graph: ${graphId}`);
  return graph;
}

function getNode(graph: Graph, nodeId: string): Node {
  const node = graph.nodes[nodeId];
  if (!node) throw new RipplegraphError('E_UNKNOWN_NODE', `unknown node: ${nodeId}`);
  return node;
}

function selectEdge(edges: Edge[], output: unknown): Edge | null {
  return edges.find((edge) => !edge.when || matchesWhen(edge.when, output)) ?? null;
}

function matchesWhen(when: Record<string, unknown>, output: unknown): boolean {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return false;
  const record = output as Record<string, unknown>;
  return Object.entries(when).every(([key, value]) => record[key] === value);
}

function validateOutput(schema: JsonSchema, output: unknown): Array<{ path: string; message: string }> {
  const errors: Array<{ path: string; message: string }> = [];
  validateValue(schema, output, '', errors);
  return errors;
}

function validateValue(schema: JsonSchema, value: unknown, path: string, errors: Array<{ path: string; message: string }>): void {
  if (schema.type && !matchesType(schema.type, value)) {
    errors.push({ path, message: `expected ${schema.type}` });
    return;
  }
  if (schema.enum && !schema.enum.some((item) => item === value)) {
    errors.push({ path, message: `expected one of ${schema.enum.join(', ')}` });
  }
  if (schema.type === 'object' || schema.properties || schema.required) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push({ path, message: 'expected object' });
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) errors.push({ path: path ? `${path}.${key}` : key, message: 'required' });
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in record) validateValue(childSchema, record[key], path ? `${path}.${key}` : key, errors);
    }
  }
}

function matchesType(type: JsonSchema['type'], value: unknown): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

function previousNodes(checkpoint: Checkpoint): Array<{ id: string; purpose: string }> {
  return Object.keys(checkpoint.outputs).slice(-2).map((id) => ({ id, purpose: 'Completed node' }));
}

function resumableRuns(rootPath: string): StateNoFocusedRun['resumableRuns'] {
  return listRunIds(rootPath)
    .map((runId) => readCheckpoint(rootPath, runId))
    .filter((checkpoint) => checkpoint.status === 'suspended')
    .map((checkpoint) => ({ id: checkpoint.runId, status: 'suspended', rootGraph: checkpoint.rootGraph }));
}

function transitionEntry(
  op: TransitionLogEntry['op'],
  runId: string,
  from: Position | null,
  to: Position | null,
): TransitionLogEntry {
  return {
    ts: new Date().toISOString(),
    op,
    runId,
    from,
    to,
    actor: 'agent',
    input: null,
    output: null,
    validation: { ok: true },
    gateDecision: null,
    reason: null,
    error: null,
  };
}
