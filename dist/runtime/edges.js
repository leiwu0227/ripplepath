import { RipplepathError } from '../graph/types.js';
export class EdgeExpressionError extends RipplepathError {
    constructor(expr, detail) {
        super('E_EDGE_EXPR', `edge "when" expression failed: ${expr} — ${detail}`);
    }
}
export class NoMatchingEdgeError extends RipplepathError {
    constructor(fromId) {
        super('E_NO_MATCHING_EDGE', `no outgoing edge from "${fromId}" matched the current state`);
    }
}
// Evaluate `edge.when` against the provided scope. `when` is a JS boolean
// expression; the only injected identifier is `state`.
export function evaluateWhen(expr, scope) {
    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('state', `return (${expr});`);
        return !!fn(scope);
    }
    catch (e) {
        throw new EdgeExpressionError(expr, e.message);
    }
}
// Pick the first edge from `fromId` whose `when` evaluates true. An edge with
// no `when` is unconditional and matches. Edges are tried in declaration order.
export function pickEdge(edges, fromId, scope) {
    const candidates = edges.filter((e) => e.from === fromId);
    for (const edge of candidates) {
        if (edge.when === undefined)
            return edge;
        if (evaluateWhen(edge.when, scope))
            return edge;
    }
    throw new NoMatchingEdgeError(fromId);
}
