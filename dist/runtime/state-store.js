import fs from 'node:fs';
import path from 'node:path';
import { runStateSchema, activeRunPointerSchema, } from './state-schema.js';
import { RipplepathError, START_NODE } from '../graph/types.js';
import { appendEvent } from './transcript.js';
export class DanglingActiveError extends RipplepathError {
    constructor(activeJsonPath, expectedRunDir) {
        super('E_DANGLING_ACTIVE', `active.json at ${activeJsonPath} references missing run directory: ${expectedRunDir}`);
    }
}
export class InvalidStateError extends RipplepathError {
    constructor(stateJsonPath, details) {
        super('E_INVALID_STATE', `invalid state.json at ${stateJsonPath}: ${details}`);
    }
}
export class InvalidActivePointerError extends RipplepathError {
    constructor(activeJsonPath, details) {
        super('E_INVALID_ACTIVE', `invalid active.json at ${activeJsonPath}: ${details}`);
    }
}
function runsDir(rootPath) {
    return path.join(rootPath, 'runs');
}
function activeJsonPath(rootPath) {
    return path.join(runsDir(rootPath), 'active.json');
}
function runDir(rootPath, runId) {
    return path.join(runsDir(rootPath), runId);
}
function stateJsonPath(rootPath, runId) {
    return path.join(runDir(rootPath, runId), 'state.json');
}
function atomicWriteJson(filePath, payload) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}
function generateRunId() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
function buildInitialState(runId, workflowPath) {
    return {
        run_id: runId,
        workflow_path: workflowPath,
        current: { path: [START_NODE], attempt: 0 },
        outputs: {},
        subgraphs: {},
        stack: [],
    };
}
function readActivePointer(rootPath) {
    const ap = activeJsonPath(rootPath);
    if (!fs.existsSync(ap))
        return null;
    const text = fs.readFileSync(ap, 'utf8');
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch (e) {
        throw new InvalidActivePointerError(ap, e.message);
    }
    const result = activeRunPointerSchema.safeParse(raw);
    if (!result.success) {
        throw new InvalidActivePointerError(ap, result.error.issues.map((i) => i.message).join('; '));
    }
    return result.data;
}
function readStateFile(rootPath, runId) {
    const sp = stateJsonPath(rootPath, runId);
    const text = fs.readFileSync(sp, 'utf8');
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch (e) {
        throw new InvalidStateError(sp, e.message);
    }
    const result = runStateSchema.safeParse(raw);
    if (!result.success) {
        throw new InvalidStateError(sp, result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    return result.data;
}
export function loadOrInitRun(rootPath, graph) {
    const pointer = readActivePointer(rootPath);
    if (pointer) {
        const dir = runDir(rootPath, pointer.run_id);
        if (!fs.existsSync(dir) || !fs.existsSync(stateJsonPath(rootPath, pointer.run_id))) {
            throw new DanglingActiveError(activeJsonPath(rootPath), dir);
        }
        const state = readStateFile(rootPath, pointer.run_id);
        return { state, runId: pointer.run_id };
    }
    const runId = generateRunId();
    const workflowPath = graph.rootPath;
    const state = buildInitialState(runId, workflowPath);
    atomicWriteJson(stateJsonPath(rootPath, runId), state);
    const transcriptPath = path.join(runDir(rootPath, runId), 'transcript.md');
    fs.writeFileSync(transcriptPath, '', 'utf8');
    atomicWriteJson(activeJsonPath(rootPath), { run_id: runId, workflow_path: workflowPath });
    appendEvent(rootPath, runId, {
        type: 'run_created',
        body: { run_id: runId, workflow_path: workflowPath, goal: graph.goal },
    });
    return { state: state, runId };
}
export function writeState(rootPath, runId, state) {
    atomicWriteJson(stateJsonPath(rootPath, runId), state);
}
export function readState(rootPath) {
    const pointer = readActivePointer(rootPath);
    if (!pointer) {
        throw new RipplepathError('E_NO_ACTIVE_RUN', `no active run at ${rootPath}; call loadOrInitRun first`);
    }
    const dir = runDir(rootPath, pointer.run_id);
    if (!fs.existsSync(stateJsonPath(rootPath, pointer.run_id))) {
        throw new DanglingActiveError(activeJsonPath(rootPath), dir);
    }
    const state = readStateFile(rootPath, pointer.run_id);
    return { state, runId: pointer.run_id };
}
export function runDirectoryFor(rootPath, runId) {
    return runDir(rootPath, runId);
}
