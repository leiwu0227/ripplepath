import { type Checkpoint, type JsonSchema, type Node, type Position } from './schema.js';
export interface WorkflowRootOptions {
    workflowRoot: string;
}
export interface StartRunOptions extends WorkflowRootOptions {
    graph: string;
    runId: string;
}
export interface StepRunOptions extends WorkflowRootOptions {
    output: unknown;
}
export interface SuspendRunOptions extends WorkflowRootOptions {
    note?: string;
}
export interface ResumeRunOptions extends WorkflowRootOptions {
    runId: string;
}
export interface AbandonRunOptions extends WorkflowRootOptions {
    reason?: string;
}
export interface StateOk {
    status: 'ok';
    workflow: {
        id: string;
        version: string;
    };
    run: {
        id: string;
        status: Checkpoint['status'];
        rootGraph: string;
    };
    position: Position;
    node: {
        id: string;
        purpose: string;
        instructions?: string;
        exec: Node['exec'];
        outputSchema: JsonSchema;
    };
    context: {
        previous: Array<{
            id: string;
            purpose: string;
        }>;
        next: Array<{
            id: string;
            purpose: string;
        }>;
        latches: [];
        capabilities: [];
    };
    responseContract: {
        command: 'step';
        acceptedFormats: ['json'];
    };
}
export interface StateNoFocusedRun {
    status: 'no_focused_run';
    workflow: {
        id: string;
        version: string;
    };
    availableGraphs: string[];
    resumableRuns: Array<{
        id: string;
        status: 'suspended';
        rootGraph: string;
    }>;
}
export interface RunSummary {
    id: string;
    status: Checkpoint['status'];
    rootGraph: string;
    position: Position;
    updatedAt: string;
}
export interface RunList {
    status: 'ok';
    workflow: {
        id: string;
        version: string;
    };
    focusedRunId: string | null;
    runs: RunSummary[];
}
export interface ValidationErrorResponse {
    status: 'validation_error';
    run: {
        id: string;
        status: Checkpoint['status'];
        rootGraph: string;
    };
    position: Position;
    errors: Array<{
        path: string;
        message: string;
    }>;
}
export type CoachState = StateOk | StateNoFocusedRun;
export type StepRunResponse = StateOk | {
    status: 'completed';
    run: {
        id: string;
        status: 'completed';
        rootGraph: string;
    };
    position: Position;
} | ValidationErrorResponse;
export declare function validateWorkflowRoot(rootPath: string): {
    status: 'ok';
    workflow: {
        id: string;
        version: string;
    };
    graphs: string[];
};
export declare function startRun(opts: StartRunOptions): StateOk;
export declare function getState(opts: WorkflowRootOptions): CoachState;
export declare function listRuns(opts: WorkflowRootOptions): RunList;
export declare function stepRun(opts: StepRunOptions): StepRunResponse;
export declare function suspendRun(opts: SuspendRunOptions): StateOk;
export declare function resumeRun(opts: ResumeRunOptions): StateOk;
export declare function abandonRun(opts: AbandonRunOptions): {
    status: 'abandoned';
    run: {
        id: string;
        status: 'abandoned';
        rootGraph: string;
    };
    position: Position;
};
