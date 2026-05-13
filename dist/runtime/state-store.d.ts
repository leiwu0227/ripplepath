import { type ParsedGraph, type RunState, RipplepathError } from '../graph/types.js';
export declare class DanglingActiveError extends RipplepathError {
    constructor(activeJsonPath: string, expectedRunDir: string);
}
export declare class InvalidStateError extends RipplepathError {
    constructor(stateJsonPath: string, details: string);
}
export declare class InvalidActivePointerError extends RipplepathError {
    constructor(activeJsonPath: string, details: string);
}
export declare function loadOrInitRun(rootPath: string, graph: ParsedGraph): {
    state: RunState;
    runId: string;
};
export declare function writeState(rootPath: string, runId: string, state: RunState): void;
export declare function readState(rootPath: string): {
    state: RunState;
    runId: string;
};
export declare function runDirectoryFor(rootPath: string, runId: string): string;
