import path from 'node:path';
import fs from 'node:fs';
import { parseGraph } from '../graph/parse.js';
import { resolveWorkNode } from '../node/resolver.js';
import { RipplegraphError } from '../graph/types.js';
export class MissingWorkflowRootError extends RipplegraphError {
    constructor(rootPath) {
        super('E_NO_WORKFLOW_ROOT', `no workflow.json (or workflow.jsonc) found at ${rootPath}`);
    }
}
function resolveWorkflowRoot(workflowRoot) {
    const abs = workflowRoot
        ? path.isAbsolute(workflowRoot)
            ? workflowRoot
            : path.resolve(process.cwd(), workflowRoot)
        : process.cwd();
    if (!fs.existsSync(path.join(abs, 'workflow.json')) &&
        !fs.existsSync(path.join(abs, 'workflow.jsonc'))) {
        throw new MissingWorkflowRootError(abs);
    }
    return abs;
}
async function visitWorkNodes(graph) {
    let work = 0;
    let sub = 0;
    const errors = [];
    for (const node of graph.nodes) {
        if (node.kind === 'work') {
            work++;
            try {
                await resolveWorkNode(node.nodePath);
            }
            catch (e) {
                errors.push(`node "${node.id}": ${e.message}`);
            }
        }
        else {
            sub++;
            const child = await visitWorkNodes(node.graph);
            work += child.work;
            sub += child.sub;
            errors.push(...child.errors);
        }
    }
    return { work, sub, errors };
}
export async function runValidateCommand(opts = {}) {
    const rootPath = resolveWorkflowRoot(opts.workflowRoot);
    const graph = parseGraph(rootPath);
    const { work, sub, errors } = await visitWorkNodes(graph);
    return {
        status: errors.length === 0 ? 'ok' : 'errors',
        rootPath,
        workNodeCount: work,
        subgraphCount: sub,
        ...(errors.length > 0 ? { errors } : {}),
    };
}
