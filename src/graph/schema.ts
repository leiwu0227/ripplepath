import { z } from 'zod';

// EDGE EXPRESSIONS:
// `when` is a JavaScript boolean expression evaluated via:
//   new Function('state', `return (${when});`)(state)
// `state` is the only injected identifier. Authors are responsible for keeping
// these expressions side-effect-free and deterministic — the framework does
// not sandbox beyond function-scoping. Edges with no `when` are unconditional.

const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const MAP_EXPR_PATTERN = /^\$(?:\.[A-Za-z_][A-Za-z0-9_-]*)+$/;

export const idSchema = z.string().regex(ID_PATTERN, 'id must be [A-Za-z_][A-Za-z0-9_-]*');
export const mapExprSchema = z
  .string()
  .regex(MAP_EXPR_PATTERN, 'expected $.path.to.value');

export const workNodeJsonSchema = z
  .object({
    id: idSchema,
    exec: z.enum(['inline', 'spawn']),
    node: z.string().min(1),
    purpose: z.string().min(1),
    role_in_graph: z.string().min(1).optional(),
    max_retries: z.number().int().nonnegative().default(3),
  })
  .strict();

export const subgraphRefJsonSchema = z
  .object({
    id: idSchema,
    ref: z.string().min(1),
    inputMap: z.record(z.string(), mapExprSchema).default({}),
    outputMap: z.record(z.string(), mapExprSchema).default({}),
    purpose: z.string().min(1),
  })
  .strict();

export const nodeJsonSchema = z.union([workNodeJsonSchema, subgraphRefJsonSchema]);

export const edgeJsonSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    when: z.string().min(1).optional(),
  })
  .strict();

export const freeEntryJsonSchema = z
  .object({
    id: idSchema,
    target: idSchema,
    description: z.string().min(1),
    mode: z.enum(['modal', 'replace']),
  })
  .strict();

export const workflowJsonSchema = z
  .object({
    version: z.literal(1),
    goal: z.string().min(1),
    nodes: z.array(nodeJsonSchema).min(1),
    edges: z.array(edgeJsonSchema).min(1),
    entries: z.array(freeEntryJsonSchema).default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set<string>(['__start__', '__end__']);
    for (const node of data.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate or reserved node id: ${node.id}`,
        });
      }
      ids.add(node.id);
    }
    for (const edge of data.edges) {
      if (!ids.has(edge.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge.from references unknown id: ${edge.from}`,
        });
      }
      if (!ids.has(edge.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge.to references unknown id: ${edge.to}`,
        });
      }
    }
    for (const entry of data.entries) {
      if (!ids.has(entry.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `entry.target references unknown id: ${entry.target}`,
        });
      }
    }
  });

export type WorkflowJson = z.infer<typeof workflowJsonSchema>;
export type WorkNodeJson = z.infer<typeof workNodeJsonSchema>;
export type SubgraphRefJson = z.infer<typeof subgraphRefJsonSchema>;
