import { type ParsedGraph, type RunState, type WorkNode } from '../graph/types.js';
export type AdvanceResult = {
    kind: 'work';
    node: WorkNode;
    path: string[];
    mutated: boolean;
} | {
    kind: 'complete';
    mutated: boolean;
};
export interface AdvanceContext {
    rootPath: string;
    runId: string;
}
export declare function advanceStructural(state: RunState, graph: ParsedGraph, ctx: AdvanceContext): AdvanceResult;
