import { appendEvent } from '../runtime/transcript.js';
export function recordExecAudit(rootPath, runId, node, used) {
    const audit = {
        node_id: node.id,
        declared: node.exec,
        used,
        matched: node.exec === used,
    };
    appendEvent(rootPath, runId, {
        type: 'exec_audit',
        body: audit,
    });
    return audit;
}
