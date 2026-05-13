import fs from 'node:fs';
import path from 'node:path';
import { parse as parseJsonc } from 'jsonc-parser';
import { workflowJsonSchema, type WorkflowJson } from './schema.js';
import {
  type ParsedGraph,
  type NodeRef,
  type WorkNode,
  type SubgraphRef,
  RipplegraphError,
} from './types.js';

class MissingWorkflowError extends RipplegraphError {
  constructor(rootPath: string) {
    super('E_MISSING_WORKFLOW', `no workflow.json found at: ${rootPath}`);
  }
}

class InvalidWorkflowError extends RipplegraphError {
  constructor(rootPath: string, details: string) {
    super('E_INVALID_WORKFLOW', `invalid workflow.json at ${rootPath}: ${details}`);
  }
}

class MissingNodeFolderError extends RipplegraphError {
  constructor(nodeId: string, expectedPath: string) {
    super(
      'E_MISSING_NODE_FOLDER',
      `node "${nodeId}" expected folder with instruction.md and schema.ts at: ${expectedPath}`,
    );
  }
}

class MissingSubgraphError extends RipplegraphError {
  constructor(nodeId: string, expectedPath: string) {
    super(
      'E_MISSING_SUBGRAPH',
      `subgraph node "${nodeId}" expected folder containing workflow.json at: ${expectedPath}`,
    );
  }
}

class CyclicRefError extends RipplegraphError {
  constructor(cycle: string[]) {
    super(
      'E_CYCLIC_REF',
      `subgraph reference cycle detected: ${cycle.join(' -> ')}`,
    );
  }
}

export {
  MissingWorkflowError,
  InvalidWorkflowError,
  MissingNodeFolderError,
  MissingSubgraphError,
  CyclicRefError,
};

function findWorkflowFile(rootPath: string): string | null {
  for (const name of ['workflow.json', 'workflow.jsonc']) {
    const candidate = path.join(rootPath, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readWorkflowJson(rootPath: string): WorkflowJson {
  const filePath = findWorkflowFile(rootPath);
  if (!filePath) throw new MissingWorkflowError(rootPath);

  const text = fs.readFileSync(filePath, 'utf8');
  const errors: Array<{ error: number; offset: number; length: number }> = [];
  const data = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const first = errors[0]!;
    throw new InvalidWorkflowError(rootPath, `JSON parse error code=${first.error} at offset=${first.offset}`);
  }

  const result = workflowJsonSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new InvalidWorkflowError(rootPath, issues);
  }
  return result.data;
}

function nodeFolderHasAssets(folderPath: string): boolean {
  return (
    fs.existsSync(path.join(folderPath, 'instruction.md')) &&
    fs.existsSync(path.join(folderPath, 'schema.ts'))
  );
}

function parseGraphInternal(
  rootPath: string,
  visiting: Set<string>,
  visitOrder: string[],
): ParsedGraph {
  const absRoot = path.resolve(rootPath);

  if (visiting.has(absRoot)) {
    const cycle = [...visitOrder, absRoot];
    throw new CyclicRefError(cycle);
  }
  visiting.add(absRoot);
  visitOrder.push(absRoot);

  const json = readWorkflowJson(absRoot);

  const parsedNodes: NodeRef[] = [];
  for (const node of json.nodes) {
    if ('node' in node) {
      const folderPath = path.resolve(absRoot, node.node);
      if (!nodeFolderHasAssets(folderPath)) {
        throw new MissingNodeFolderError(node.id, folderPath);
      }
      const workNode: WorkNode = {
        kind: 'work',
        id: node.id,
        exec: node.exec,
        nodePath: folderPath,
        purpose: node.purpose,
        role_in_graph: node.role_in_graph,
        max_retries: node.max_retries,
      };
      parsedNodes.push(workNode);
    } else {
      const subgraphPath = path.resolve(absRoot, node.ref);
      if (!findWorkflowFile(subgraphPath)) {
        throw new MissingSubgraphError(node.id, subgraphPath);
      }
      const childGraph = parseGraphInternal(subgraphPath, visiting, visitOrder);
      const subgraphRef: SubgraphRef = {
        kind: 'subgraph',
        id: node.id,
        refPath: subgraphPath,
        inputMap: node.inputMap,
        outputMap: node.outputMap,
        purpose: node.purpose,
        graph: childGraph,
      };
      parsedNodes.push(subgraphRef);
    }
  }

  visiting.delete(absRoot);
  visitOrder.pop();

  return {
    rootPath: absRoot,
    version: json.version,
    goal: json.goal,
    nodes: parsedNodes,
    edges: json.edges,
    entries: json.entries,
  };
}

export function parseGraph(rootPath: string): ParsedGraph {
  return parseGraphInternal(rootPath, new Set(), []);
}
