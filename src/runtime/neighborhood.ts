import { type ParsedGraph, type NodeRef, type RunState, END_NODE } from '../graph/types.js';
import { locate, outgoingEdges } from './graph-walk.js';

function purposeOf(node: NodeRef): string {
  return node.purpose || node.id;
}

function kindOf(node: NodeRef): string {
  return node.kind === 'work' ? `work · exec=${node.exec}` : 'subgraph';
}

function pathBreadcrumb(path: string[]): string {
  return path.join(' > ');
}

export function generateOverview(root: ParsedGraph, currentPath: string[]): string {
  const lines: string[] = [];
  lines.push(`# Workflow overview`);
  lines.push(``);
  lines.push(`North star: ${root.goal}`);
  lines.push(``);
  lines.push(`Top-level structure:`);

  const hereTopLevelId = currentPath[0];
  for (let i = 0; i < root.nodes.length; i++) {
    const node = root.nodes[i]!;
    const hereMarker = node.id === hereTopLevelId ? '  ← YOU ARE HERE' : '';
    const subgraphGoal =
      node.kind === 'subgraph' ? ` — goal: ${node.graph.goal}` : '';
    lines.push(`  ${i + 1}. \`${node.id}\` (${kindOf(node)})${subgraphGoal} — ${purposeOf(node)}${hereMarker}`);
  }

  if (root.entries.length > 0) {
    lines.push(``);
    lines.push(`Free entries:`);
    for (const entry of root.entries) {
      lines.push(`  - \`${entry.id}\` (${entry.mode}) → ${entry.target} — ${entry.description}`);
    }
  }

  return lines.join('\n');
}

function getOutputsForActiveGraph(state: RunState, ancestorIds: string[]): Record<string, unknown> {
  if (ancestorIds.length === 0) return state.outputs;
  let cursor: Record<string, unknown> = state.subgraphs as unknown as Record<string, unknown>;
  for (const id of ancestorIds) {
    const next = cursor[id];
    if (!next || typeof next !== 'object') return {};
    cursor = (next as { subgraphs?: Record<string, unknown>; outputs?: Record<string, unknown> })
      .outputs ?? {};
    // for the last ancestor we want its outputs; for intermediates we descend via .subgraphs
    if (id !== ancestorIds[ancestorIds.length - 1]) {
      cursor =
        ((next as { subgraphs?: Record<string, unknown> }).subgraphs as Record<string, unknown>) ??
        {};
    }
  }
  return cursor;
}

export function generateNeighborhood(
  root: ParsedGraph,
  currentPath: string[],
  state: RunState,
): string {
  const located = locate(root, currentPath);
  const activeGraph = located.graph;
  const leafId = currentPath[currentPath.length - 1]!;

  const lines: string[] = [];
  lines.push(`# Neighborhood`);
  lines.push(``);
  lines.push(`Position: ${pathBreadcrumb(currentPath)}`);
  if (located.ancestorGraphs.length > 0) {
    const parentSubgraph = activeGraph;
    lines.push(`Parent subgraph goal: ${parentSubgraph.goal}`);
  }
  lines.push(`Attempt: ${state.current.attempt + 1}`);
  lines.push(``);

  // Prior outputs (last ~2 by insertion order from the active graph's output bag)
  const activeOutputs = getOutputsForActiveGraph(state, located.ancestorIds);
  const priorIds = Object.keys(activeOutputs).slice(-2);
  if (priorIds.length > 0) {
    lines.push(`Prior outputs in this graph:`);
    for (const id of priorIds) {
      const node = activeGraph.nodes.find((n) => n.id === id);
      const purpose = node ? purposeOf(node) : id;
      lines.push(`  - \`${id}\` — ${purpose}`);
      lines.push('    ```json');
      lines.push('    ' + JSON.stringify(activeOutputs[id], null, 2).split('\n').join('\n    '));
      lines.push('    ```');
    }
    lines.push(``);
  }

  // Next nodes (resolve outgoing edges)
  const edges = outgoingEdges(activeGraph, leafId);
  if (edges.length > 0) {
    lines.push(`Next nodes (from outgoing edges):`);
    const seen = new Set<string>();
    for (const edge of edges.slice(0, 2)) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      if (edge.to === END_NODE) {
        lines.push(`  - \`__end__\` (workflow / subgraph complete)`);
        continue;
      }
      const node = activeGraph.nodes.find((n) => n.id === edge.to);
      const purpose = node ? purposeOf(node) : edge.to;
      const cond = edge.when ? ` when \`${edge.when}\`` : '';
      lines.push(`  - \`${edge.to}\` — ${purpose}${cond}`);
    }
    lines.push(``);
  }

  if (activeGraph.entries.length > 0) {
    lines.push(`Free entries available here:`);
    for (const entry of activeGraph.entries) {
      lines.push(`  - \`${entry.id}\` (${entry.mode}) — ${entry.description}`);
    }
  }

  return lines.join('\n');
}
