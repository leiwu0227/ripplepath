export type TranscriptEventType = 'run_created' | 'state_read' | 'step_submitted' | 'validation_failed' | 'transition' | 'subgraph_entered' | 'subgraph_exited' | 'entry_proposed' | 'entry_confirmed' | 'entry_rejected' | 'exec_audit' | 'workflow_completed' | 'user_gate_failure';
export interface TranscriptEvent {
    type: TranscriptEventType;
    body?: Record<string, unknown> | string;
}
export declare function appendEvent(rootPath: string, runId: string, event: TranscriptEvent): void;
