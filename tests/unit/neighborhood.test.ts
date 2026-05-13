import { describe, it, expect } from 'vitest';
import { generateOverview, generateNeighborhood } from '../../src/runtime/neighborhood.js';
import type { ParsedGraph, RunState, WorkNode, SubgraphRef } from '../../src/graph/types.js';

function workNode(id: string, purpose: string): WorkNode {
  return {
    kind: 'work',
    id,
    exec: 'inline',
    nodePath: `/fake/${id}`,
    purpose,
    max_retries: 3,
  };
}

function subgraph(id: string, purpose: string, inner: ParsedGraph): SubgraphRef {
  return {
    kind: 'subgraph',
    id,
    refPath: `/fake/${id}`,
    inputMap: {},
    outputMap: {},
    purpose,
    graph: inner,
  };
}

function freshGraph(): ParsedGraph {
  const inner: ParsedGraph = {
    rootPath: '/fake/sub',
    version: 1,
    goal: 'inner work',
    nodes: [workNode('alpha', 'do alpha'), workNode('beta', 'do beta')],
    edges: [
      { from: '__start__', to: 'alpha' },
      { from: 'alpha', to: 'beta' },
      { from: 'beta', to: '__end__' },
    ],
    entries: [],
  };
  const root: ParsedGraph = {
    rootPath: '/fake/root',
    version: 1,
    goal: 'top goal',
    nodes: [
      workNode('kickoff', 'start things'),
      subgraph('digger', 'delegate to digger', inner),
      workNode('finish', 'wrap up'),
    ],
    edges: [
      { from: '__start__', to: 'kickoff' },
      { from: 'kickoff', to: 'digger' },
      { from: 'digger', to: 'finish' },
      { from: 'finish', to: '__end__' },
    ],
    entries: [
      { id: 'reset', target: 'kickoff', description: 'restart from the top', mode: 'modal' },
    ],
  };
  return root;
}

function state(currentPath: string[]): RunState {
  return {
    run_id: 'r1',
    workflow_path: '/fake/root',
    current: { path: currentPath, attempt: 0 },
    outputs: {},
    subgraphs: {},
    stack: [],
  };
}

describe('generateOverview', () => {
  it('lists top-level nodes with subgraph goals and marks current location', () => {
    const root = freshGraph();
    const overview = generateOverview(root, ['digger', 'alpha']);
    expect(overview).toContain('North star: top goal');
    expect(overview).toContain('`kickoff`');
    expect(overview).toContain('`digger`');
    expect(overview).toContain('goal: inner work');
    expect(overview).toContain('`finish`');
    expect(overview).toMatch(/`digger`.*YOU ARE HERE/);
  });

  it('includes free entries list', () => {
    const root = freshGraph();
    const overview = generateOverview(root, ['kickoff']);
    expect(overview).toContain('Free entries');
    expect(overview).toContain('`reset`');
    expect(overview).toContain('modal');
  });
});

describe('generateNeighborhood', () => {
  it('shows breadcrumb and parent goal at depth 1', () => {
    const root = freshGraph();
    const s = state(['digger', 'alpha']);
    const nb = generateNeighborhood(root, ['digger', 'alpha'], s);
    expect(nb).toContain('Position: digger > alpha');
    expect(nb).toContain('Parent subgraph goal: inner work');
  });

  it('lists next nodes by outgoing edge with purpose', () => {
    const root = freshGraph();
    const s = state(['digger', 'alpha']);
    const nb = generateNeighborhood(root, ['digger', 'alpha'], s);
    expect(nb).toContain('`beta` — do beta');
  });

  it('shows prior outputs from the active graph in full', () => {
    const root = freshGraph();
    const s = state(['digger', 'beta']);
    s.subgraphs['digger'] = {
      outputs: {
        alpha: { handoff_summary: 'alpha summary', value: 42 },
      },
    };
    const nb = generateNeighborhood(root, ['digger', 'beta'], s);
    expect(nb).toContain('Prior outputs in this graph');
    expect(nb).toContain('`alpha`');
    expect(nb).toContain('"value": 42');
  });

  it('reports attempt as 1-based for first try', () => {
    const root = freshGraph();
    const s = state(['kickoff']);
    s.current.attempt = 2;
    const nb = generateNeighborhood(root, ['kickoff'], s);
    expect(nb).toContain('Attempt: 3');
  });
});
