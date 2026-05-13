import path from 'node:path';
import fs from 'node:fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { parseGraph } from '../graph/parse.js';
import { loadOrInitRun, writeState } from '../runtime/state-store.js';
import { resolveWorkNode } from '../node/resolver.js';
import { generateOverview, generateNeighborhood } from '../runtime/neighborhood.js';
import { advanceStructural } from '../runtime/advance.js';
import { appendEvent } from '../runtime/transcript.js';
import { RipplepathError, type WorkNode, type FreeEntry } from '../graph/types.js';
import { locate } from '../runtime/graph-walk.js';

export class MissingWorkflowRootError extends RipplepathError {
  constructor(rootPath: string) {
    super(
      'E_NO_WORKFLOW_ROOT',
      `no workflow.json (or workflow.jsonc) found at ${rootPath} — run "ripplepath init" first or pass --workflow-root`,
    );
  }
}

export interface StateOptions {
  workflowRoot?: string;
}

export interface StateResponseWork {
  status: 'work';
  run_id: string;
  current_node_id: string;
  exec: 'inline' | 'spawn';
  instruction: string;
  output_schema: unknown;
  overview: string;
  neighborhood: string;
  attempt: number;
  free_entries: FreeEntry[];
}

export interface StateResponseComplete {
  status: 'complete';
  run_id: string;
  overview: string;
}

export interface StateResponsePending {
  status: 'pending_confirmation';
  run_id: string;
  proposal: {
    proposal_id: string;
    entry_id: string;
    reason: string;
    message: string;
  };
}

export type StateResponse = StateResponseWork | StateResponseComplete | StateResponsePending;

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

export async function runStateCommand(opts: StateOptions = {}): Promise<StateResponse> {
  const rootPath = resolveWorkflowRoot(opts.workflowRoot);
  const graph = parseGraph(rootPath);
  const { state, runId } = loadOrInitRun(rootPath, graph);

  // If there is a pending confirmation, surface it instead of advancing.
  if (state.pending_confirmation) {
    appendEvent(rootPath, runId, { type: 'state_read', body: 'pending_confirmation' });
    return {
      status: 'pending_confirmation',
      run_id: runId,
      proposal: { ...state.pending_confirmation },
    };
  }

  const result = advanceStructural(state, graph, { rootPath, runId });
  if (result.mutated) {
    writeState(rootPath, runId, state);
  }

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

  appendEvent(rootPath, runId, {
    type: 'state_read',
    body: { node_id: work.id, attempt: state.current.attempt },
  });

  const located = locate(graph, state.current.path);
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
    free_entries: located.graph.entries,
  };
}
