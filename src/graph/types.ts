import type { ZodTypeAny } from 'zod';

export const START_NODE = '__start__';
export const END_NODE = '__end__';

export type MapExpr = string;

export interface WorkNode {
  kind: 'work';
  id: string;
  exec: 'inline' | 'spawn';
  nodePath: string;
  purpose: string;
  role_in_graph?: string;
  max_retries: number;
}

export interface SubgraphRef {
  kind: 'subgraph';
  id: string;
  refPath: string;
  inputMap: Record<string, MapExpr>;
  outputMap: Record<string, MapExpr>;
  purpose: string;
  graph: ParsedGraph;
}

export type NodeRef = WorkNode | SubgraphRef;

export interface Edge {
  from: string;
  to: string;
  when?: string;
}

export interface FreeEntry {
  id: string;
  target: string;
  description: string;
  mode: 'modal' | 'replace';
}

export interface ParsedGraph {
  rootPath: string;
  version: number;
  goal: string;
  nodes: NodeRef[];
  edges: Edge[];
  entries: FreeEntry[];
}

export interface ResolvedNodeAssets {
  instruction: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
}

export interface StackFrame {
  path: string[];
  attempt: number;
}

export interface PendingConfirmation {
  proposal_id: string;
  entry_id: string;
  reason: string;
  message: string;
  // Where the runtime would have gone if no jump had been proposed. On a
  // modal jump approval, this is pushed onto the stack so popFrame restores
  // the host to the deferred-transition position (NOT the node it just
  // completed — that node's output is already saved).
  resume_path: string[];
  resume_attempt: number;
}

export interface RunState {
  run_id: string;
  workflow_path: string;
  current: {
    path: string[];
    attempt: number;
  };
  outputs: Record<string, unknown>;
  subgraphs: Record<string, SubgraphState>;
  stack: StackFrame[];
  pending_confirmation?: PendingConfirmation;
}

export interface SubgraphState {
  input?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  current?: { path: string[]; attempt: number };
  subgraphs?: Record<string, SubgraphState>;
  stack?: StackFrame[];
}

export interface ActiveRunPointer {
  run_id: string;
  workflow_path: string;
}

export class RipplegraphError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'RipplegraphError';
  }
}
