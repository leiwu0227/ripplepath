import { RipplegraphError, type FreeEntry } from '../graph/types.js';
export declare class MissingWorkflowRootError extends RipplegraphError {
    constructor(rootPath: string);
}
export interface StateOptions {
    workflowRoot?: string;
}
export interface StateResponseWork {
    status: 'work';
    run_id: string;
    current_node_id: string;
    exec: 'inline' | 'spawn';
    instruction: string;
    output_schema: unknown;
    overview: string;
    neighborhood: string;
    attempt: number;
    free_entries: FreeEntry[];
}
export interface StateResponseComplete {
    status: 'complete';
    run_id: string;
    overview: string;
}
export interface StateResponsePending {
    status: 'pending_confirmation';
    run_id: string;
    proposal: {
        proposal_id: string;
        entry_id: string;
        reason: string;
        message: string;
    };
}
export type StateResponse = StateResponseWork | StateResponseComplete | StateResponsePending;
export declare function runStateCommand(opts?: StateOptions): Promise<StateResponse>;
