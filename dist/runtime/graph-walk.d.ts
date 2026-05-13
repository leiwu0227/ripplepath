import { type ParsedGraph, type NodeRef, RipplepathError } from '../graph/types.js';
export interface LocatedNode {
    graph: ParsedGraph;
    ancestorGraphs: ParsedGraph[];
    ancestorIds: string[];
    node: NodeRef | null;
    isMarker: boolean;
}
export declare class PathNotFoundError extends RipplepathError {
    constructor(path: string[], detail: string);
}
export declare function locate(root: ParsedGraph, path: string[]): LocatedNode;
export declare function outgoingEdges(graph: ParsedGraph, fromId: string): import("../graph/types.js").Edge[];
