import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { advanceStructural } from '../../src/runtime/advance.js';
import type { ParsedGraph, RunState, WorkNode, SubgraphRef } from '../../src/graph/types.js';

let runDir: string;

beforeEach(() => {
  // advance.ts emits transcript events; give it a real path so writes succeed
  runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplepath-advance-'));
  fs.mkdirSync(path.join(runDir, 'runs', 'r1'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(runDir, { recursive: true, force: true });
});

function workNode(id: string): WorkNode {
  return { kind: 'work', id, exec: 'inline', nodePath: `/fake/${id}`, purpose: id, max_retries: 3 };
}

function subgraphNode(id: string, inner: ParsedGraph): SubgraphRef {
  return {
    kind: 'subgraph',
    id,
    refPath: `/fake/${id}`,
    inputMap: {},
    outputMap: {},
    purpose: id,
    graph: inner,
  };
}

function freshState(currentPath: string[]): RunState {
  return {
    run_id: 'r1',
    workflow_path: runDir,
    current: { path: currentPath, attempt: 0 },
    outputs: {},
    subgraphs: {},
    stack: [],
  };
}

describe('advanceStructural — modal pop within subgraph (F2.1)', () => {
  it('pops a subgraph-local modal frame at the subgraph END instead of exiting the subgraph', () => {
    // Subgraph has its own free entry targeting node `alpha`; nodes are
    // alpha and beta, edges alpha→beta→__end__.
    const sub: ParsedGraph = {
      rootPath: '/fake/sub',
      version: 1,
      goal: 'sub',
      nodes: [workNode('alpha'), workNode('beta')],
      edges: [
        { from: '__start__', to: 'alpha' },
        { from: 'alpha', to: 'beta' },
        { from: 'beta', to: '__end__' },
      ],
      entries: [{ id: 'reset', target: 'alpha', description: 'rerun', mode: 'modal' }],
    };
    const root: ParsedGraph = {
      rootPath: runDir,
      version: 1,
      goal: 'root',
      nodes: [subgraphNode('digger', sub), workNode('finish')],
      edges: [
        { from: '__start__', to: 'digger' },
        { from: 'digger', to: 'finish' },
        { from: 'finish', to: '__end__' },
      ],
      entries: [],
    };

    // Simulate the post-modal-confirm state: we just jumped to alpha inside
    // digger, with a stack frame saved at depth 1 ([digger, beta]).
    const state = freshState(['digger', 'alpha']);
    state.stack = [{ path: ['digger', 'beta'], attempt: 0 }];

    // Manually walk the modal flow:
    //   alpha → beta (via step.ts logic; here we just mutate)
    //   beta → __end__ (via edge)
    state.current.path = ['digger', '__end__'];

    const result = advanceStructural(state, root, { rootPath: runDir, runId: 'r1' });

    // Modal pop should restore the deferred resume position INSIDE the
    // subgraph rather than exit the subgraph.
    expect(state.current.path).toEqual(['digger', 'beta']);
    expect(state.stack).toHaveLength(0);
    // We are now at a real work node (beta) — advance should have returned
    // it as the next executable position.
    expect(result.kind).toBe('work');
    if (result.kind !== 'work') return;
    expect(result.node.id).toBe('beta');
  });
});
