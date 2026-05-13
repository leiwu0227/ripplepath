import { RipplepathError } from '../graph/types.js';
export class MapExprResolutionError extends RipplepathError {
    constructor(expr, detail) {
        super('E_MAP_EXPR', `cannot resolve map expression "${expr}": ${detail}`);
    }
}
export function evalMapExpr(scope, expr) {
    if (!expr.startsWith('$.')) {
        throw new MapExprResolutionError(expr, 'must start with $.');
    }
    const keys = expr.slice(2).split('.');
    let cursor = scope;
    for (const key of keys) {
        if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
            throw new MapExprResolutionError(expr, `path breaks at "${key}" (not an object)`);
        }
        cursor = cursor[key];
        if (cursor === undefined) {
            throw new MapExprResolutionError(expr, `key "${key}" missing`);
        }
    }
    return cursor;
}
// Seed the child subgraph's `input` by evaluating each expression against
// the parent scope. Parent expressions can read $.outputs.foo or $.input.bar.
export function applyInputMap(parentScope, subgraphNodeId, inputMap) {
    if (!parentScope.subgraphs)
        parentScope.subgraphs = {};
    let sub = parentScope.subgraphs[subgraphNodeId];
    if (!sub) {
        sub = {};
        parentScope.subgraphs[subgraphNodeId] = sub;
    }
    const input = sub.input ?? {};
    for (const [key, expr] of Object.entries(inputMap)) {
        input[key] = evalMapExpr(parentScope, expr);
    }
    sub.input = input;
}
// Surface the child subgraph's results to the parent by evaluating each
// expression against the child scope (which exposes outputs + input).
// Writes to parentScope.outputs[subgraphNodeId] as an object of the mapped keys.
export function applyOutputMap(parentScope, childScope, subgraphNodeId, outputMap) {
    if (!parentScope.outputs)
        parentScope.outputs = {};
    const target = parentScope.outputs[subgraphNodeId] ?? {};
    const evalScope = {
        outputs: childScope.outputs ?? {},
        input: childScope.input ?? {},
    };
    for (const [key, expr] of Object.entries(outputMap)) {
        target[key] = evalMapExpr(evalScope, expr);
    }
    parentScope.outputs[subgraphNodeId] = target;
}
