import fs from 'node:fs';
import path from 'node:path';
import { checkpointSchema, currentSchema, RipplegraphError, transitionLogEntrySchema, workflowSchema, } from './schema.js';
function workflowPath(rootPath) {
    return path.join(rootPath, 'workflow.json');
}
export function runsDir(rootPath) {
    return path.join(rootPath, 'runs');
}
export function currentPath(rootPath) {
    return path.join(rootPath, 'current.json');
}
export function runDir(rootPath, runId) {
    assertPathSegment(runId, 'runId');
    return path.join(runsDir(rootPath), runId);
}
export function checkpointPath(rootPath, runId) {
    return path.join(runDir(rootPath, runId), 'checkpoint.json');
}
export function transitionLogPath(rootPath, runId) {
    return path.join(runDir(rootPath, runId), 'transition-log.jsonl');
}
export function artifactPath(rootPath, runId, nodeId) {
    assertPathSegment(nodeId, 'nodeId');
    return path.join(runDir(rootPath, runId), 'artifacts', nodeId, 'output.json');
}
function assertPathSegment(value, label) {
    if (!value || value.includes('/') || value.includes('\\') || value === '.' || value === '..') {
        throw new RipplegraphError('E_BAD_PATH_SEGMENT', `${label} must be a filesystem-safe path segment`);
    }
}
function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    catch (error) {
        throw new RipplegraphError('E_BAD_JSON', `failed to read JSON at ${filePath}: ${error.message}`);
    }
}
function writeJson(filePath, payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}
export function ensureWorkflowRoot(rootPath) {
    fs.mkdirSync(runsDir(rootPath), { recursive: true });
    if (!fs.existsSync(currentPath(rootPath))) {
        writeCurrent(rootPath, { focusedRunId: null });
    }
}
export function loadWorkflow(rootPath) {
    const filePath = workflowPath(rootPath);
    if (!fs.existsSync(filePath)) {
        throw new RipplegraphError('E_MISSING_WORKFLOW', `no workflow.json found at ${rootPath}`);
    }
    const result = workflowSchema.safeParse(readJson(filePath));
    if (!result.success) {
        throw new RipplegraphError('E_INVALID_WORKFLOW', result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; '));
    }
    return result.data;
}
export function readCurrent(rootPath) {
    const filePath = currentPath(rootPath);
    if (!fs.existsSync(filePath))
        return { focusedRunId: null };
    const result = currentSchema.safeParse(readJson(filePath));
    if (!result.success) {
        throw new RipplegraphError('E_INVALID_CURRENT', result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; '));
    }
    return result.data;
}
export function writeCurrent(rootPath, current) {
    writeJson(currentPath(rootPath), currentSchema.parse(current));
}
export function readCheckpoint(rootPath, runId) {
    const filePath = checkpointPath(rootPath, runId);
    if (!fs.existsSync(filePath)) {
        throw new RipplegraphError('E_MISSING_CHECKPOINT', `no checkpoint.json found for run ${runId}`);
    }
    const result = checkpointSchema.safeParse(readJson(filePath));
    if (!result.success) {
        throw new RipplegraphError('E_INVALID_CHECKPOINT', result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; '));
    }
    return result.data;
}
export function writeCheckpoint(rootPath, checkpoint) {
    const runPath = runDir(rootPath, checkpoint.runId);
    fs.mkdirSync(path.join(runPath, 'artifacts'), { recursive: true });
    fs.mkdirSync(path.join(runPath, 'scratch'), { recursive: true });
    writeJson(checkpointPath(rootPath, checkpoint.runId), checkpointSchema.parse(checkpoint));
}
export function writeNodeOutput(rootPath, runId, nodeId, output) {
    const filePath = artifactPath(rootPath, runId, nodeId);
    writeJson(filePath, output);
    return path.relative(runDir(rootPath, runId), filePath).replaceAll(path.sep, '/');
}
export function appendTransition(rootPath, runId, entry) {
    const parsed = transitionLogEntrySchema.parse(entry);
    const filePath = transitionLogPath(rootPath, runId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(parsed)}\n`, 'utf8');
}
export function listRunIds(rootPath) {
    const dir = runsDir(rootPath);
    if (!fs.existsSync(dir))
        return [];
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}
