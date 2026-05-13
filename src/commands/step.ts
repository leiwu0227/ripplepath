import path from 'node:path';
import fs from 'node:fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { parseGraph } from '../graph/parse.js';
import { loadOrInitRun, writeState } from '../runtime/state-store.js';
import { resolveWorkNode } from '../node/resolver.js';
import { advanceStructural } from '../runtime/advance.js';
import { activeScope, edgeScope } from '../runtime/scope.js';
import { pickEdge } from '../runtime/edges.js';
import { proposeJump, confirmJump } from '../runtime/free-entry.js';
import { recordAttempt, resetAttempt, shouldGateForRetry } from '../runtime/retry.js';
import { recordExecAudit, type ExecMode } from '../node/executor.js';
import { generateOverview, generateNeighborhood } from '../runtime/neighborhood.js';
import { appendEvent } from '../runtime/transcript.js';
import { locate } from '../runtime/graph-walk.js';
import { MissingWorkflowRootError } from './state.js';
import {
  RipplepathError,
  type WorkNode,
  END_NODE,
} from '../graph/types.js';

function resolveWorkflowRoot(workflowRoot: string | undefined): string {
  const abs = workflowRoot
    ? path.isAbsolute(workflowRoot)
      ? workflowRoot
      : path.resolve(process.cwd(), workflowRoot)
    : process.cwd();
  if (
    !fs.existsSync(path.join(abs, 'workflow.json')) &&
    !fs.existsSync(path.join(abs, 'workflow.jsonc'))
  ) {
    throw new MissingWorkflowRootError(abs);
  }
  return abs;
}

export class NotAtWorkNodeError extends RipplepathError {
  constructor() {
    super(
      'E_NOT_AT_WORK_NODE',
      'cli step --output requires the run to be at a work node; call cli state first',
    );
  }
}

export class MissingArgumentError extends RipplepathError {
  constructor(details: string) {
    super('E_MISSING_ARG', details);
  }
}

export interface StepOptions {
  workflowRoot?: string;
  output?: unknown;
  execUsed?: ExecMode;
  confirm?: string;
  decision?: 'approved' | 'rejected';
}

export interface StepResponseWork {
  status: 'work';
  run_id: string;
  current_node_id: string;
  exec: 'inline' | 'spawn';
  instruction: string;
  output_schema: unknown;
  overview: string;
  neighborhood: string;
  attempt: number;
}

export interface StepResponseComplete {
  status: 'complete';
  run_id: string;
  overview: string;
}

export interface StepResponsePending {
  status: 'pending_confirmation';
  run_id: string;
  proposal: {
    proposal_id: string;
    entry_id: string;
    reason: string;
    message: string;
  };
}

export interface StepResponseValidationError {
  status: 'validation_error';
  run_id: string;
  current_node_id: string;
  attempt: number;
  max_retries: number;
  errors: Array<{ path: string; message: string }>;
}

export interface StepResponseUserGate {
  status: 'user_gate_failure';
  run_id: string;
  current_node_id: string;
  attempt: number;
  reason: string;
}

export type StepResponse =
  | StepResponseWork
  | StepResponseComplete
  | StepResponsePending
  | StepResponseValidationError
  | StepResponseUserGate;

interface HasProposedJump {
  proposed_jump?: { entry_id?: unknown; reason?: unknown };
}

// proposed_jump is a protocol-level field. It is extracted before schema
// validation so node schemas (which are .strict()) do not need to declare it.
function extractAndStripProposedJump(
  output: unknown,
): { jump: { entry_id: string; reason: string } | null; outputForValidation: unknown } {
  if (!output || typeof output !== 'object') {
    return { jump: null, outputForValidation: output };
  }
  const candidate = (output as HasProposedJump).proposed_jump;
  let jump: { entry_id: string; reason: string } | null = null;
  if (candidate && typeof candidate === 'object') {
    const entryId = candidate.entry_id;
    const reason = candidate.reason;
    if (typeof entryId === 'string' && typeof reason === 'string') {
      jump = { entry_id: entryId, reason };
    }
  }
  if ('proposed_jump' in (output as Record<string, unknown>)) {
    const { proposed_jump: _ignored, ...rest } = output as Record<string, unknown> & {
      proposed_jump?: unknown;
    };
    return { jump, outputForValidation: rest };
  }
  return { jump, outputForValidation: output };
}

export async function runStepCommand(opts: StepOptions): Promise<StepResponse> {
  const rootPath = resolveWorkflowRoot(opts.workflowRoot);
  const graph = parseGraph(rootPath);
  const { state, runId } = loadOrInitRun(rootPath, graph);

  // Free-entry confirmation branch
  if (opts.confirm !== undefined) {
    if (!opts.decision) {
      throw new MissingArgumentError('--confirm requires --decision approved|rejected');
    }
    const result = confirmJump(state, opts.confirm, opts.decision, graph);
    appendEvent(rootPath, runId, {
      type: result.applied ? 'entry_confirmed' : 'entry_rejected',
      body: { proposal_id: opts.confirm, decision: opts.decision, mode: result.mode ?? null },
    });
    writeState(rootPath, runId, state);
    return await buildAdvanceResponse(rootPath, runId, graph, state);
  }

  // Normal output branch
  if (opts.output === undefined) {
    throw new MissingArgumentError('cli step requires either --output <json> or --confirm <id> --decision <...>');
  }
  if (!opts.execUsed) {
    throw new MissingArgumentError('cli step --output requires --exec-used inline|spawn');
  }

  // Resolve current work node
  const located = locate(graph, state.current.path);
  if (located.isMarker || !located.node || located.node.kind !== 'work') {
    throw new NotAtWorkNodeError();
  }
  const workNode: WorkNode = located.node;
  const assets = await resolveWorkNode(workNode.nodePath);

  // Strip protocol-level proposed_jump before schema validation
  const { jump, outputForValidation } = extractAndStripProposedJump(opts.output);

  // Validate output
  const parseResult = assets.outputSchema.safeParse(outputForValidation);
  if (!parseResult.success) {
    recordAttempt(state);
    appendEvent(rootPath, runId, {
      type: 'validation_failed',
      body: { node_id: workNode.id, attempt: state.current.attempt, issues: parseResult.error.issues },
    });
    if (shouldGateForRetry(state, workNode)) {
      writeState(rootPath, runId, state);
      appendEvent(rootPath, runId, {
        type: 'user_gate_failure',
        body: { node_id: workNode.id, attempt: state.current.attempt },
      });
      return {
        status: 'user_gate_failure',
        run_id: runId,
        current_node_id: workNode.id,
        attempt: state.current.attempt,
        reason: `node "${workNode.id}" failed validation after ${state.current.attempt} attempts`,
      };
    }
    writeState(rootPath, runId, state);
    return {
      status: 'validation_error',
      run_id: runId,
      current_node_id: workNode.id,
      attempt: state.current.attempt,
      max_retries: workNode.max_retries,
      errors: parseResult.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    };
  }

  const validated = parseResult.data as Record<string, unknown>;
  recordExecAudit(rootPath, runId, workNode, opts.execUsed);

  // Write output to active scope
  const scope = activeScope(state, located.ancestorIds);
  if (!scope.outputs) scope.outputs = {};
  scope.outputs[workNode.id] = validated;

  appendEvent(rootPath, runId, {
    type: 'step_submitted',
    body: { node_id: workNode.id, exec_used: opts.execUsed },
  });

  // Compute the deferred transition (where we would go if no jump) so a modal
  // pop can resume from the post-transition position — never re-execute the
  // node whose output we just wrote.
  const eScope = edgeScope(state, located.ancestorIds);
  const deferredEdge = pickEdge(located.graph.edges, workNode.id, eScope);
  const deferredPath = [...located.ancestorIds, deferredEdge.to];

  // Check for proposed_jump (extracted before validation)
  if (jump) {
    const pending = proposeJump(state, jump, graph, { path: deferredPath, attempt: 0 });
    appendEvent(rootPath, runId, {
      type: 'entry_proposed',
      body: { proposal_id: pending.proposal_id, entry_id: jump.entry_id, reason: jump.reason },
    });
    writeState(rootPath, runId, state);
    return {
      status: 'pending_confirmation',
      run_id: runId,
      proposal: {
        proposal_id: pending.proposal_id,
        entry_id: pending.entry_id,
        reason: pending.reason,
        message: pending.message,
      },
    };
  }

  // Normal transition via edges
  state.current.path = deferredPath;
  resetAttempt(state);
  appendEvent(rootPath, runId, {
    type: 'transition',
    body: { from: workNode.id, to: deferredEdge.to },
  });

  return await buildAdvanceResponse(rootPath, runId, graph, state);
}

async function buildAdvanceResponse(
  rootPath: string,
  runId: string,
  graph: ReturnType<typeof parseGraph>,
  state: Awaited<ReturnType<typeof loadOrInitRun>>['state'],
): Promise<StepResponse> {
  // Auto-advance past markers / subgraph descents
  const result = advanceStructural(state, graph);
  writeState(rootPath, runId, state);

  if (result.kind === 'complete') {
    appendEvent(rootPath, runId, { type: 'workflow_completed' });
    return {
      status: 'complete',
      run_id: runId,
      overview: generateOverview(graph, state.current.path),
    };
  }

  const work: WorkNode = result.node;
  const assets = await resolveWorkNode(work.nodePath);
  const outputJsonSchema = zodToJsonSchema(assets.outputSchema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  });

  return {
    status: 'work',
    run_id: runId,
    current_node_id: work.id,
    exec: work.exec,
    instruction: assets.instruction,
    output_schema: outputJsonSchema,
    overview: generateOverview(graph, state.current.path),
    neighborhood: generateNeighborhood(graph, state.current.path, state),
    attempt: state.current.attempt,
  };
}

// Re-export markers for tests
export const END = END_NODE;
