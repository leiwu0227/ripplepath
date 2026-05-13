import { appendEvent } from '../runtime/transcript.js';
import type { WorkNode } from '../graph/types.js';

export type ExecMode = 'inline' | 'spawn';

export interface ExecAuditEntry {
  node_id: string;
  declared: ExecMode;
  used: ExecMode;
  matched: boolean;
}

export function recordExecAudit(
  rootPath: string,
  runId: string,
  node: WorkNode,
  used: ExecMode,
): ExecAuditEntry {
  const audit: ExecAuditEntry = {
    node_id: node.id,
    declared: node.exec,
    used,
    matched: node.exec === used,
  };
  appendEvent(rootPath, runId, {
    type: 'exec_audit',
    body: audit as unknown as Record<string, unknown>,
  });
  return audit;
}
