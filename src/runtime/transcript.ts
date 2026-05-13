import fs from 'node:fs';
import path from 'node:path';

export type TranscriptEventType =
  | 'run_created'
  | 'state_read'
  | 'step_submitted'
  | 'validation_failed'
  | 'transition'
  | 'subgraph_entered'
  | 'subgraph_exited'
  | 'entry_proposed'
  | 'entry_confirmed'
  | 'entry_rejected'
  | 'exec_audit'
  | 'workflow_completed'
  | 'user_gate_failure';

export interface TranscriptEvent {
  type: TranscriptEventType;
  body?: Record<string, unknown> | string;
}

function transcriptPath(rootPath: string, runId: string): string {
  return path.join(rootPath, 'runs', runId, 'transcript.md');
}

function formatBody(body: TranscriptEvent['body']): string {
  if (body === undefined) return '';
  if (typeof body === 'string') return body;
  return '```json\n' + JSON.stringify(body, null, 2) + '\n```';
}

export function appendEvent(rootPath: string, runId: string, event: TranscriptEvent): void {
  const filePath = transcriptPath(rootPath, runId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const ts = new Date().toISOString();
  const body = formatBody(event.body);
  const block = body
    ? `## ${ts} — ${event.type}\n\n${body}\n\n`
    : `## ${ts} — ${event.type}\n\n`;
  fs.appendFileSync(filePath, block, 'utf8');
}
