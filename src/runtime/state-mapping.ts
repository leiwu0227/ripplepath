import { type RunState, type MapExpr, type SubgraphState, RipplepathError } from '../graph/types.js';

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

function getOrCreateSubgraphState(state: RunState, nodeId: string): SubgraphState {
  let s = state.subgraphs[nodeId];
  if (!s) {
    s = {};
    state.subgraphs[nodeId] = s;
  }
  return s;
}

export function applyInputMap(
  parentState: RunState,
  subgraphNodeId: string,
  inputMap: Record<string, MapExpr>,
): void {
  const sub = getOrCreateSubgraphState(parentState, subgraphNodeId);
  const input: Record<string, unknown> = sub.input ?? {};
  for (const [key, expr] of Object.entries(inputMap)) {
    input[key] = evalMapExpr(parentState, expr);
  }
  sub.input = input;
}

export function applyOutputMap(
  parentState: RunState,
  subgraphNodeId: string,
  outputMap: Record<string, MapExpr>,
): void {
  const sub = getOrCreateSubgraphState(parentState, subgraphNodeId);
  // The expressions are evaluated against the SUBGRAPH's state scope.
  // We expose a synthetic scope { outputs: sub.outputs ?? {}, input: sub.input ?? {} }
  // so authors can write $.outputs.leafNode.key or $.input.topic.
  const subScope = {
    outputs: sub.outputs ?? {},
    input: sub.input ?? {},
  };
  const target: Record<string, unknown> = (parentState.outputs[subgraphNodeId] as Record<string, unknown>) ?? {};
  for (const [key, expr] of Object.entries(outputMap)) {
    target[key] = evalMapExpr(subScope, expr);
  }
  parentState.outputs[subgraphNodeId] = target;
}
