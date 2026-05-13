import type { WorkNode } from '../graph/types.js';
export type ExecMode = 'inline' | 'spawn';
export interface ExecAuditEntry {
    node_id: string;
    declared: ExecMode;
    used: ExecMode;
    matched: boolean;
}
export declare function recordExecAudit(rootPath: string, runId: string, node: WorkNode, used: ExecMode): ExecAuditEntry;
