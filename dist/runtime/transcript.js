import fs from 'node:fs';
import path from 'node:path';
function transcriptPath(rootPath, runId) {
    return path.join(rootPath, 'runs', runId, 'transcript.md');
}
function formatBody(body) {
    if (body === undefined)
        return '';
    if (typeof body === 'string')
        return body;
    return '```json\n' + JSON.stringify(body, null, 2) + '\n```';
}
export function appendEvent(rootPath, runId, event) {
    const filePath = transcriptPath(rootPath, runId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const ts = new Date().toISOString();
    const body = formatBody(event.body);
    const block = body
        ? `## ${ts} — ${event.type}\n\n${body}\n\n`
        : `## ${ts} — ${event.type}\n\n`;
    fs.appendFileSync(filePath, block, 'utf8');
}
