import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseGraph,
  MissingWorkflowError,
  InvalidWorkflowError,
  MissingNodeFolderError,
  CyclicRefError,
} from '../../src/graph/parse.js';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplepath-parse-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function write(filePath: string, body: string | object) {
  const abs = path.join(tmpRoot, filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, typeof body === 'string' ? body : JSON.stringify(body, null, 2));
}

function makeWorkNodeFolder(rel: string) {
  write(`${rel}/instruction.md`, '# instruction');
  write(`${rel}/schema.ts`, 'export const input = {} as any; export const output = {} as any;');
}

describe('parseGraph', () => {
  it('parses a valid single-node workflow', () => {
    makeWorkNodeFolder('nodes/start');
    write('workflow.json', {
      version: 1,
      goal: 'test',
      nodes: [
        {
          id: 'start',
          exec: 'inline',
          node: './nodes/start',
          purpose: 'kickoff',
        },
      ],
      edges: [{ from: '__start__', to: 'start' }, { from: 'start', to: '__end__' }],
    });

    const graph = parseGraph(tmpRoot);
    expect(graph.goal).toBe('test');
    expect(graph.nodes).toHaveLength(1);
    const node = graph.nodes[0]!;
    expect(node.kind).toBe('work');
    expect(node.id).toBe('start');
  });

  it('parses nested subgraphs', () => {
    makeWorkNodeFolder('subgraphs/inner/nodes/leaf');
    write('subgraphs/inner/workflow.json', {
      version: 1,
      goal: 'inner goal',
      nodes: [
        {
          id: 'leaf',
          exec: 'inline',
          node: './nodes/leaf',
          purpose: 'do work',
        },
      ],
      edges: [{ from: '__start__', to: 'leaf' }, { from: 'leaf', to: '__end__' }],
    });
    write('workflow.json', {
      version: 1,
      goal: 'outer goal',
      nodes: [
        {
          id: 'inner',
          ref: './subgraphs/inner',
          purpose: 'delegate',
          inputMap: { topic: '$.topic' },
          outputMap: { result: '$.outputs.leaf' },
        },
      ],
      edges: [{ from: '__start__', to: 'inner' }, { from: 'inner', to: '__end__' }],
    });

    const graph = parseGraph(tmpRoot);
    expect(graph.nodes).toHaveLength(1);
    const sub = graph.nodes[0]!;
    expect(sub.kind).toBe('subgraph');
    if (sub.kind !== 'subgraph') throw new Error('expected subgraph');
    expect(sub.graph.goal).toBe('inner goal');
    expect(sub.graph.nodes).toHaveLength(1);
  });

  it('throws MissingWorkflowError when workflow.json absent', () => {
    expect(() => parseGraph(tmpRoot)).toThrow(MissingWorkflowError);
  });

  it('throws InvalidWorkflowError with field path on schema failure', () => {
    write('workflow.json', { version: 1, goal: '', nodes: [], edges: [] });
    let err: unknown;
    try {
      parseGraph(tmpRoot);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InvalidWorkflowError);
    expect((err as Error).message).toMatch(/goal|nodes|edges/);
  });

  it('throws InvalidWorkflowError on unknown edge.from id', () => {
    makeWorkNodeFolder('nodes/start');
    write('workflow.json', {
      version: 1,
      goal: 'test',
      nodes: [{ id: 'start', exec: 'inline', node: './nodes/start', purpose: 'p' }],
      edges: [{ from: 'ghost', to: 'start' }],
    });
    expect(() => parseGraph(tmpRoot)).toThrow(/unknown id: ghost/);
  });

  it('throws MissingNodeFolderError when node folder lacks schema.ts', () => {
    write('nodes/start/instruction.md', '# x');
    write('workflow.json', {
      version: 1,
      goal: 'test',
      nodes: [{ id: 'start', exec: 'inline', node: './nodes/start', purpose: 'p' }],
      edges: [{ from: '__start__', to: 'start' }, { from: 'start', to: '__end__' }],
    });
    expect(() => parseGraph(tmpRoot)).toThrow(MissingNodeFolderError);
  });

  it('detects cyclic subgraph refs', () => {
    write('a/workflow.json', {
      version: 1,
      goal: 'a',
      nodes: [{ id: 'b', ref: '../b', purpose: 'p' }],
      edges: [{ from: '__start__', to: 'b' }, { from: 'b', to: '__end__' }],
    });
    write('b/workflow.json', {
      version: 1,
      goal: 'b',
      nodes: [{ id: 'a', ref: '../a', purpose: 'p' }],
      edges: [{ from: '__start__', to: 'a' }, { from: 'a', to: '__end__' }],
    });
    write('workflow.json', {
      version: 1,
      goal: 'root',
      nodes: [{ id: 'a', ref: './a', purpose: 'p' }],
      edges: [{ from: '__start__', to: 'a' }, { from: 'a', to: '__end__' }],
    });
    expect(() => parseGraph(tmpRoot)).toThrow(CyclicRefError);
  });
});
