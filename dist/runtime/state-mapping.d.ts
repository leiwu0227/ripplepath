import { type MapExpr, type SubgraphState, RipplepathError } from '../graph/types.js';
import type { ScopeState } from './scope.js';
export declare class MapExprResolutionError extends RipplepathError {
    constructor(expr: string, detail: string);
}
export declare function evalMapExpr(scope: unknown, expr: MapExpr): unknown;
export declare function applyInputMap(parentScope: ScopeState, subgraphNodeId: string, inputMap: Record<string, MapExpr>): void;
export declare function applyOutputMap(parentScope: ScopeState, childScope: SubgraphState, subgraphNodeId: string, outputMap: Record<string, MapExpr>): void;
