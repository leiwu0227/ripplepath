import type { RunState, SubgraphState } from '../graph/types.js';

// A "scope" is the state slice visible to edges and node logic inside a
// particular graph layer. The root scope is the RunState's top level
// (it has `outputs` and `subgraphs`). A subgraph scope is its SubgraphState
// (which also has optional `outputs`, `input`, `subgraphs`).
//
// State shape compatibility: RunState and SubgraphState both have an
// `outputs` and `subgraphs` field at the runtime level. We treat them as a
// common ScopeState for navigation purposes.

export interface ScopeState {
  outputs?: Record<string, unknown>;
  input?: Record<string, unknown>;
  subgraphs?: Record<string, SubgraphState>;
}

export function rootScope(state: RunState): ScopeState {
  return state;
}

export function ensureSubgraphScope(parent: ScopeState, subgraphNodeId: string): SubgraphState {
  if (!parent.subgraphs) parent.subgraphs = {};
  let s = parent.subgraphs[subgraphNodeId];
  if (!s) {
    s = {};
    parent.subgraphs[subgraphNodeId] = s;
  }
  return s;
}

// Descend through state to the active scope based on ancestor subgraph node ids.
// ancestorIds is the list of subgraph node ids walked from root to the active graph.
export function activeScope(state: RunState, ancestorIds: string[]): ScopeState {
  let cursor: ScopeState = state;
  for (const id of ancestorIds) {
    cursor = ensureSubgraphScope(cursor, id);
  }
  return cursor;
}

// Build a read-only edge-evaluation scope for the active graph.
// Exposes `state.outputs` and (for subgraphs) `state.input`.
export function edgeScope(state: RunState, ancestorIds: string[]): unknown {
  const scope = activeScope(state, ancestorIds);
  return {
    outputs: scope.outputs ?? {},
    input: scope.input ?? {},
  };
}
