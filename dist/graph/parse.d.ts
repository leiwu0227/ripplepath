import { type ParsedGraph, RipplegraphError } from './types.js';
declare class MissingWorkflowError extends RipplegraphError {
    constructor(rootPath: string);
}
declare class InvalidWorkflowError extends RipplegraphError {
    constructor(rootPath: string, details: string);
}
declare class MissingNodeFolderError extends RipplegraphError {
    constructor(nodeId: string, expectedPath: string);
}
declare class MissingSubgraphError extends RipplegraphError {
    constructor(nodeId: string, expectedPath: string);
}
declare class CyclicRefError extends RipplegraphError {
    constructor(cycle: string[]);
}
export { MissingWorkflowError, InvalidWorkflowError, MissingNodeFolderError, MissingSubgraphError, CyclicRefError, };
export declare function parseGraph(rootPath: string): ParsedGraph;
