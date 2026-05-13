import type { Edge } from '../graph/types.js';
import { RipplegraphError } from '../graph/types.js';
export declare class EdgeExpressionError extends RipplegraphError {
    constructor(expr: string, detail: string);
}
export declare class NoMatchingEdgeError extends RipplegraphError {
    constructor(fromId: string);
}
export declare function evaluateWhen(expr: string, scope: unknown): boolean;
export declare function pickEdge(edges: Edge[], fromId: string, scope: unknown): Edge;
