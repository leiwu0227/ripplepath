import { type ExecMode } from '../node/executor.js';
import { RipplegraphError, type FreeEntry } from '../graph/types.js';
export declare class NotAtWorkNodeError extends RipplegraphError {
    constructor();
}
export declare class MissingArgumentError extends RipplegraphError {
    constructor(details: string);
}
export interface StepOptions {
    workflowRoot?: string;
    output?: unknown;
    execUsed?: ExecMode;
    confirm?: string;
    decision?: 'approved' | 'rejected';
}
export interface StepResponseWork {
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
export interface StepResponseComplete {
    status: 'complete';
    run_id: string;
    overview: string;
}
export interface StepResponsePending {
    status: 'pending_confirmation';
    run_id: string;
    proposal: {
        proposal_id: string;
        entry_id: string;
        reason: string;
        message: string;
    };
}
export interface StepResponseValidationError {
    status: 'validation_error';
    run_id: string;
    current_node_id: string;
    attempt: number;
    max_retries: number;
    errors: Array<{
        path: string;
        message: string;
    }>;
}
export interface StepResponseUserGate {
    status: 'user_gate_failure';
    run_id: string;
    current_node_id: string;
    attempt: number;
    reason: string;
}
export type StepResponse = StepResponseWork | StepResponseComplete | StepResponsePending | StepResponseValidationError | StepResponseUserGate;
export declare function runStepCommand(opts: StepOptions): Promise<StepResponse>;
export declare const END = "__end__";
