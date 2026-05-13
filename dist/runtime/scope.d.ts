import type { RunState, SubgraphState } from '../graph/types.js';
export interface ScopeState {
    outputs?: Record<string, unknown>;
    input?: Record<string, unknown>;
    subgraphs?: Record<string, SubgraphState>;
}
export declare function rootScope(state: RunState): ScopeState;
export declare function ensureSubgraphScope(parent: ScopeState, subgraphNodeId: string): SubgraphState;
export declare function activeScope(state: RunState, ancestorIds: string[]): ScopeState;
export declare function edgeScope(state: RunState, ancestorIds: string[]): unknown;
