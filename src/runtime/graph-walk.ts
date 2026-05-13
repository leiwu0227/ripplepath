import {
  type ParsedGraph,
  type NodeRef,
  type SubgraphRef,
  START_NODE,
  END_NODE,
  RipplepathError,
} from '../graph/types.js';

export interface LocatedNode {
  graph: ParsedGraph;
  ancestorGraphs: ParsedGraph[];   // root -> ... -> immediate parent
  ancestorIds: string[];           // subgraph node ids leading to this node
  node: NodeRef | null;            // null for __start__ / __end__ markers
  isMarker: boolean;
}

export class PathNotFoundError extends RipplepathError {
  constructor(path: string[], detail: string) {
    super('E_PATH_NOT_FOUND', `cannot locate path [${path.join(' > ')}]: ${detail}`);
  }
}

export function locate(root: ParsedGraph, path: string[]): LocatedNode {
  if (path.length === 0) {
    throw new PathNotFoundError(path, 'empty path');
  }
  let graph = root;
  const ancestorGraphs: ParsedGraph[] = [];
  const ancestorIds: string[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const id = path[i]!;
    const next = graph.nodes.find((n): n is SubgraphRef => n.kind === 'subgraph' && n.id === id);
    if (!next) {
      throw new PathNotFoundError(path, `no subgraph node "${id}" in graph ${graph.rootPath}`);
    }
    ancestorGraphs.push(graph);
    ancestorIds.push(id);
    graph = next.graph;
  }

  const leafId = path[path.length - 1]!;
  if (leafId === START_NODE || leafId === END_NODE) {
    return { graph, ancestorGraphs, ancestorIds, node: null, isMarker: true };
  }
  const node = graph.nodes.find((n) => n.id === leafId) ?? null;
  if (!node) {
    throw new PathNotFoundError(path, `no node "${leafId}" in graph ${graph.rootPath}`);
  }
  return { graph, ancestorGraphs, ancestorIds, node, isMarker: false };
}

export function outgoingEdges(graph: ParsedGraph, fromId: string) {
  return graph.edges.filter((e) => e.from === fromId);
}
