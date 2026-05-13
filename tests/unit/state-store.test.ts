import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadOrInitRun,
  readState,
  writeState,
  DanglingActiveError,
  InvalidStateError,
  runDirectoryFor,
} from '../../src/runtime/state-store.js';
import type { ParsedGraph } from '../../src/graph/types.js';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplepath-state-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function fakeGraph(): ParsedGraph {
  return {
    rootPath: tmpRoot,
    version: 1,
    goal: 'test',
    nodes: [],
    edges: [{ from: '__start__', to: '__end__' }],
    entries: [],
  };
}

describe('state-store', () => {
  it('auto-creates run on first call', () => {
    const graph = fakeGraph();
    const { state, runId } = loadOrInitRun(tmpRoot, graph);

    expect(runId).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(state.current.path).toEqual(['__start__']);
    expect(state.outputs).toEqual({});
    expect(state.stack).toEqual([]);
    expect(fs.existsSync(path.join(tmpRoot, 'runs', 'active.json'))).toBe(true);
    expect(fs.existsSync(path.join(runDirectoryFor(tmpRoot, runId), 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(runDirectoryFor(tmpRoot, runId), 'transcript.md'))).toBe(true);
  });

  it('loads existing run on subsequent call', () => {
    const graph = fakeGraph();
    const first = loadOrInitRun(tmpRoot, graph);
    const second = loadOrInitRun(tmpRoot, graph);
    expect(second.runId).toBe(first.runId);
  });

  it('atomic write leaves no .tmp on success', () => {
    const graph = fakeGraph();
    const { state, runId } = loadOrInitRun(tmpRoot, graph);
    state.outputs['foo'] = { bar: 1 };
    writeState(tmpRoot, runId, state);

    const entries = fs.readdirSync(runDirectoryFor(tmpRoot, runId));
    expect(entries.some((e) => e.includes('.tmp.'))).toBe(false);
    expect(entries).toContain('state.json');
  });

  it('throws DanglingActiveError when active.json points to missing dir', () => {
    fs.mkdirSync(path.join(tmpRoot, 'runs'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'runs', 'active.json'),
      JSON.stringify({ run_id: 'ghost', workflow_path: tmpRoot }),
    );
    expect(() => readState(tmpRoot)).toThrow(DanglingActiveError);
  });

  it('throws InvalidStateError on corrupt state.json', () => {
    const graph = fakeGraph();
    const { runId } = loadOrInitRun(tmpRoot, graph);
    fs.writeFileSync(
      path.join(runDirectoryFor(tmpRoot, runId), 'state.json'),
      '{"run_id": 123}',
    );
    expect(() => readState(tmpRoot)).toThrow(InvalidStateError);
  });

  it('writeState persists changes that readState then loads', () => {
    const graph = fakeGraph();
    const { state, runId } = loadOrInitRun(tmpRoot, graph);
    state.outputs['done'] = { ok: true };
    writeState(tmpRoot, runId, state);

    const { state: reloaded } = readState(tmpRoot);
    expect(reloaded.outputs).toEqual({ done: { ok: true } });
  });
});
