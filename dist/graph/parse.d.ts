import { type ParsedGraph, RipplepathError } from './types.js';
declare class MissingWorkflowError extends RipplepathError {
    constructor(rootPath: string);
}
declare class InvalidWorkflowError extends RipplepathError {
    constructor(rootPath: string, details: string);
}
declare class MissingNodeFolderError extends RipplepathError {
    constructor(nodeId: string, expectedPath: string);
}
declare class MissingSubgraphError extends RipplepathError {
    constructor(nodeId: string, expectedPath: string);
}
declare class CyclicRefError extends RipplepathError {
    constructor(cycle: string[]);
}
export { MissingWorkflowError, InvalidWorkflowError, MissingNodeFolderError, MissingSubgraphError, CyclicRefError, };
export declare function parseGraph(rootPath: string): ParsedGraph;
