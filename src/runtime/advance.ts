import {
  type ParsedGraph,
  type RunState,
  type WorkNode,
  type SubgraphRef,
  START_NODE,
  END_NODE,
} from '../graph/types.js';
import { locate } from './graph-walk.js';
import { pickEdge } from './edges.js';
import { activeScope, edgeScope, ensureSubgraphScope } from './scope.js';
import { applyInputMap, applyOutputMap } from './state-mapping.js';
import { popFrame } from './free-entry.js';
import { resetAttempt } from './retry.js';
import { appendEvent } from './transcript.js';

export type AdvanceResult =
  | { kind: 'work'; node: WorkNode; path: string[]; mutated: boolean }
  | { kind: 'complete'; mutated: boolean };

export interface AdvanceContext {
  rootPath: string;
  runId: string;
}

// Walk through structural transitions (markers, subgraph entry/exit, modal pop)
// until we land on a real WorkNode or the workflow completes.
// Mutates `state` along the way (subgraph state seeds, pops, path updates).
// `ctx` is required so we can emit subgraph_entered / subgraph_exited events.
export function advanceStructural(
  state: RunState,
  graph: ParsedGraph,
  ctx: AdvanceContext,
): AdvanceResult {
  let mutated = false;
  const MAX_ITERATIONS = 1000; // safety net against runaway loops

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const located = locate(graph, state.current.path);
    const leaf = state.current.path[state.current.path.length - 1]!;

    if (leaf === START_NODE) {
      const scope = edgeScope(state, located.ancestorIds);
      const edge = pickEdge(located.graph.edges, START_NODE, scope);
      const newPath = [...located.ancestorIds, edge.to];
      state.current.path = newPath;
      resetAttempt(state);
      mutated = true;
      continue;
    }

    if (leaf === END_NODE) {
      // Modal frames are tagged by the depth at which the modal target was
      // entered (== resume_path's ancestor count). If the top frame's depth
      // matches the current __end__ depth, the modal flow has run to
      // completion — pop and resume the deferred position. Otherwise this is
      // either a real workflow completion (root, no frame) or a subgraph
      // exit that has nothing to do with the modal flow.
      const currentDepth = located.ancestorIds.length;
      const top = state.stack[state.stack.length - 1];
      if (top) {
        const topDepth = Math.max(0, top.path.length - 1);
        if (topDepth === currentDepth) {
          popFrame(state);
          mutated = true;
          continue;
        }
      }
      if (currentDepth === 0) {
        return { kind: 'complete', mutated };
      }
      // subgraph END: apply outputMap, pop one path level, follow parent edge
      const subgraphNodeId = located.ancestorIds[located.ancestorIds.length - 1]!;
      const parentGraph = located.ancestorGraphs[located.ancestorGraphs.length - 1]!;
      const subgraphNode = parentGraph.nodes.find(
        (n): n is SubgraphRef => n.kind === 'subgraph' && n.id === subgraphNodeId,
      );
      if (!subgraphNode) {
        throw new Error(`internal: subgraph node ${subgraphNodeId} not found in parent graph`);
      }
      const parentAncestorIds = located.ancestorIds.slice(0, -1);
      const parentScope = activeScope(state, parentAncestorIds);
      const childScope = ensureSubgraphScope(parentScope, subgraphNodeId);
      applyOutputMap(parentScope, childScope, subgraphNodeId, subgraphNode.outputMap);

      // Now resolve parent's edge from subgraphNodeId
      const parentEdgeScope = edgeScope(state, parentAncestorIds);
      const parentEdge = pickEdge(parentGraph.edges, subgraphNodeId, parentEdgeScope);
      state.current.path = [...parentAncestorIds, parentEdge.to];
      resetAttempt(state);
      appendEvent(ctx.rootPath, ctx.runId, {
        type: 'subgraph_exited',
        body: { subgraph_node_id: subgraphNodeId, to: parentEdge.to },
      });
      mutated = true;
      continue;
    }

    // Leaf is a real node (work or subgraph ref) in the active graph
    if (located.node === null) {
      throw new Error(`internal: unable to resolve node "${leaf}" in active graph`);
    }

    if (located.node.kind === 'subgraph') {
      // Descend: seed inputMap, push __start__ for the child graph
      const parentScope = activeScope(state, located.ancestorIds);
      applyInputMap(parentScope, located.node.id, located.node.inputMap);
      state.current.path = [...state.current.path, START_NODE];
      resetAttempt(state);
      appendEvent(ctx.rootPath, ctx.runId, {
        type: 'subgraph_entered',
        body: {
          subgraph_node_id: located.node.id,
          goal: located.node.graph.goal,
        },
      });
      mutated = true;
      continue;
    }

    // WorkNode — we are at a real executable position
    return { kind: 'work', node: located.node, path: state.current.path, mutated };
  }

  throw new Error('advanceStructural exceeded maximum iterations');
}
