import { type MapExpr, type SubgraphState, RipplepathError } from '../graph/types.js';
import type { ScopeState } from './scope.js';

export class MapExprResolutionError extends RipplepathError {
  constructor(expr: string, detail: string) {
    super('E_MAP_EXPR', `cannot resolve map expression "${expr}": ${detail}`);
  }
}

export function evalMapExpr(scope: unknown, expr: MapExpr): unknown {
  if (!expr.startsWith('$.')) {
    throw new MapExprResolutionError(expr, 'must start with $.');
  }
  const keys = expr.slice(2).split('.');
  let cursor: unknown = scope;
  for (const key of keys) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      throw new MapExprResolutionError(expr, `path breaks at "${key}" (not an object)`);
    }
    cursor = (cursor as Record<string, unknown>)[key];
    if (cursor === undefined) {
      throw new MapExprResolutionError(expr, `key "${key}" missing`);
    }
  }
  return cursor;
}

// Seed the child subgraph's `input` by evaluating each expression against
// the parent scope. Parent expressions can read $.outputs.foo or $.input.bar.
export function applyInputMap(
  parentScope: ScopeState,
  subgraphNodeId: string,
  inputMap: Record<string, MapExpr>,
): void {
  if (!parentScope.subgraphs) parentScope.subgraphs = {};
  let sub = parentScope.subgraphs[subgraphNodeId];
  if (!sub) {
    sub = {};
    parentScope.subgraphs[subgraphNodeId] = sub;
  }
  const input: Record<string, unknown> = sub.input ?? {};
  for (const [key, expr] of Object.entries(inputMap)) {
    input[key] = evalMapExpr(parentScope, expr);
  }
  sub.input = input;
}

// Surface the child subgraph's results to the parent by evaluating each
// expression against the child scope (which exposes outputs + input).
// Writes to parentScope.outputs[subgraphNodeId] as an object of the mapped keys.
export function applyOutputMap(
  parentScope: ScopeState,
  childScope: SubgraphState,
  subgraphNodeId: string,
  outputMap: Record<string, MapExpr>,
): void {
  if (!parentScope.outputs) parentScope.outputs = {};
  const target: Record<string, unknown> =
    (parentScope.outputs[subgraphNodeId] as Record<string, unknown>) ?? {};
  const evalScope = {
    outputs: childScope.outputs ?? {},
    input: childScope.input ?? {},
  };
  for (const [key, expr] of Object.entries(outputMap)) {
    target[key] = evalMapExpr(evalScope, expr);
  }
  parentScope.outputs[subgraphNodeId] = target;
}
