export function rootScope(state) {
    return state;
}
export function ensureSubgraphScope(parent, subgraphNodeId) {
    if (!parent.subgraphs)
        parent.subgraphs = {};
    let s = parent.subgraphs[subgraphNodeId];
    if (!s) {
        s = {};
        parent.subgraphs[subgraphNodeId] = s;
    }
    return s;
}
// Descend through state to the active scope based on ancestor subgraph node ids.
// ancestorIds is the list of subgraph node ids walked from root to the active graph.
export function activeScope(state, ancestorIds) {
    let cursor = state;
    for (const id of ancestorIds) {
        cursor = ensureSubgraphScope(cursor, id);
    }
    return cursor;
}
// Build a read-only edge-evaluation scope for the active graph.
// Exposes `state.outputs` and (for subgraphs) `state.input`.
export function edgeScope(state, ancestorIds) {
    const scope = activeScope(state, ancestorIds);
    return {
        outputs: scope.outputs ?? {},
        input: scope.input ?? {},
    };
}
