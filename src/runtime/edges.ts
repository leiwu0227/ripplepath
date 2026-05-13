import type { Edge } from '../graph/types.js';
import { RipplepathError } from '../graph/types.js';

export class EdgeExpressionError extends RipplepathError {
  constructor(expr: string, detail: string) {
    super('E_EDGE_EXPR', `edge "when" expression failed: ${expr} — ${detail}`);
  }
}

export class NoMatchingEdgeError extends RipplepathError {
  constructor(fromId: string) {
    super('E_NO_MATCHING_EDGE', `no outgoing edge from "${fromId}" matched the current state`);
  }
}

// Evaluate `edge.when` against the provided scope. `when` is a JS boolean
// expression; the only injected identifier is `state`.
export function evaluateWhen(expr: string, scope: unknown): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('state', `return (${expr});`);
    return !!fn(scope);
  } catch (e) {
    throw new EdgeExpressionError(expr, (e as Error).message);
  }
}

// Pick the first edge from `fromId` whose `when` evaluates true. An edge with
// no `when` is unconditional and matches. Edges are tried in declaration order.
export function pickEdge(edges: Edge[], fromId: string, scope: unknown): Edge {
  const candidates = edges.filter((e) => e.from === fromId);
  for (const edge of candidates) {
    if (edge.when === undefined) return edge;
    if (evaluateWhen(edge.when, scope)) return edge;
  }
  throw new NoMatchingEdgeError(fromId);
}
