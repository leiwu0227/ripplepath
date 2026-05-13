import { describe, it, expect } from 'vitest';
import {
  proposeJump,
  confirmJump,
  popFrame,
  UnknownEntryError,
  ModalDepthCapError,
  NoMatchingProposalError,
  MODAL_STACK_DEPTH_CAP,
} from '../../src/runtime/free-entry.js';
import type { ParsedGraph, RunState, WorkNode } from '../../src/graph/types.js';

function workNode(id: string): WorkNode {
  return {
    kind: 'work',
    id,
    exec: 'inline',
    nodePath: `/fake/${id}`,
    purpose: id,
    max_retries: 3,
  };
}

function fixture(): ParsedGraph {
  return {
    rootPath: '/fake',
    version: 1,
    goal: 'g',
    nodes: [workNode('one'), workNode('two'), workNode('reset_target')],
    edges: [
      { from: '__start__', to: 'one' },
      { from: 'one', to: 'two' },
      { from: 'two', to: '__end__' },
      { from: 'reset_target', to: '__end__' },
    ],
    entries: [
      { id: 'reset', target: 'reset_target', description: 'reset', mode: 'modal' },
      { id: 'switch', target: 'reset_target', description: 'switch', mode: 'replace' },
    ],
  };
}

function fakeState(path: string[]): RunState {
  return {
    run_id: 'r',
    workflow_path: '/fake',
    current: { path, attempt: 0 },
    outputs: {},
    subgraphs: {},
    stack: [],
  };
}

describe('free-entry', () => {
  it('proposeJump records a pending confirmation', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    const pending = proposeJump(
      state,
      { entry_id: 'reset', reason: 'user asked' },
      graph,
      { path: ['two'], attempt: 0 },
    );
    expect(pending.entry_id).toBe('reset');
    expect(state.pending_confirmation).toEqual(pending);
  });

  it('proposeJump rejects unknown entry id', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    expect(() =>
      proposeJump(state, { entry_id: 'ghost', reason: 'x' }, graph, { path: ['two'], attempt: 0 }),
    ).toThrow(UnknownEntryError);
  });

  it('confirmJump in modal mode pushes the deferred-resume frame and moves to target', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    state.current.attempt = 2;
    const pending = proposeJump(state, { entry_id: 'reset', reason: 'r' }, graph, {
      path: ['two'],
      attempt: 0,
    });
    const result = confirmJump(state, pending.proposal_id, 'approved', graph);
    expect(result.applied).toBe(true);
    expect(result.mode).toBe('modal');
    expect(state.stack).toHaveLength(1);
    // Stack frame is the DEFERRED resume target, not the originating node
    expect(state.stack[0]).toEqual({ path: ['two'], attempt: 0 });
    expect(state.current.path).toEqual(['reset_target']);
    expect(state.current.attempt).toBe(0);
    expect(state.pending_confirmation).toBeUndefined();
  });

  it('confirmJump in replace mode does not push frame', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    const pending = proposeJump(state, { entry_id: 'switch', reason: 'r' }, graph, {
      path: ['two'],
      attempt: 0,
    });
    confirmJump(state, pending.proposal_id, 'approved', graph);
    expect(state.stack).toHaveLength(0);
    expect(state.current.path).toEqual(['reset_target']);
  });

  it('confirmJump rejected leaves state untouched (only clears pending)', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    const pending = proposeJump(state, { entry_id: 'reset', reason: 'r' }, graph, {
      path: ['two'],
      attempt: 0,
    });
    const beforePath = [...state.current.path];
    confirmJump(state, pending.proposal_id, 'rejected', graph);
    expect(state.current.path).toEqual(beforePath);
    expect(state.stack).toHaveLength(0);
    expect(state.pending_confirmation).toBeUndefined();
  });

  it('confirmJump rejects mismatched proposal_id', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    proposeJump(state, { entry_id: 'reset', reason: 'r' }, graph, {
      path: ['two'],
      attempt: 0,
    });
    expect(() => confirmJump(state, 'bad-id', 'approved', graph)).toThrow(
      NoMatchingProposalError,
    );
  });

  it('popFrame restores the deferred resume target', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    const pending = proposeJump(state, { entry_id: 'reset', reason: 'r' }, graph, {
      path: ['two'],
      attempt: 0,
    });
    confirmJump(state, pending.proposal_id, 'approved', graph);
    expect(state.current.path).toEqual(['reset_target']);
    const popped = popFrame(state);
    expect(popped.popped).toBe(true);
    expect(state.current.path).toEqual(['two']);
    expect(state.current.attempt).toBe(0);
    expect(state.stack).toHaveLength(0);
  });

  it('caps modal stack at depth 2', () => {
    const graph = fixture();
    const state = fakeState(['one']);
    state.stack = [
      { path: ['old1'], attempt: 0 },
      { path: ['old2'], attempt: 0 },
    ];
    expect(state.stack.length).toBe(MODAL_STACK_DEPTH_CAP);
    const pending = proposeJump(state, { entry_id: 'reset', reason: 'r' }, graph, {
      path: ['two'],
      attempt: 0,
    });
    expect(() => confirmJump(state, pending.proposal_id, 'approved', graph)).toThrow(
      ModalDepthCapError,
    );
  });
});
