import { z } from 'zod';

export class RipplegraphError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RipplegraphError';
  }
}

const idSchema = z.string().min(1).regex(/^[A-Za-z0-9_.-]+$/);

const jsonSchemaSchema: z.ZodType<JsonSchema> = z.lazy(() =>
  z
    .object({
      type: z.enum(['object', 'string', 'number', 'boolean', 'array']).optional(),
      required: z.array(z.string()).optional(),
      properties: z.record(jsonSchemaSchema).optional(),
      enum: z.array(z.unknown()).optional(),
    })
    .passthrough(),
);

export interface JsonSchema {
  type?: 'object' | 'string' | 'number' | 'boolean' | 'array';
  required?: string[];
  properties?: Record<string, JsonSchema>;
  enum?: unknown[];
  [key: string]: unknown;
}

export const edgeSchema = z
  .object({
    to: idSchema,
    when: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const nodeSchema = z
  .object({
    purpose: z.string().min(1),
    instructions: z.string().min(1).optional(),
    exec: z.enum(['inline', 'spawn', 'script']).default('inline'),
    outputSchema: jsonSchemaSchema.default({ type: 'object' }),
    edges: z.array(edgeSchema).default([]),
    terminal: z.boolean().default(false),
  })
  .strict();

export const graphSchema = z
  .object({
    entry: idSchema,
    nodes: z.record(idSchema, nodeSchema),
  })
  .strict()
  .superRefine((graph, ctx) => {
    if (!graph.nodes[graph.entry]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entry'],
        message: `entry references unknown node: ${graph.entry}`,
      });
    }
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
      for (const edge of node.edges) {
        if (!graph.nodes[edge.to]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['nodes', nodeId, 'edges'],
            message: `edge references unknown node: ${edge.to}`,
          });
        }
      }
    }
  });

export const workflowSchema = z
  .object({
    id: idSchema,
    version: z.string().min(1),
    graphs: z.record(idSchema, graphSchema),
  })
  .strict();

export const runStatusSchema = z.enum(['active', 'suspended', 'completed', 'abandoned']);

export const positionSchema = z
  .object({
    graph: idSchema,
    node: idSchema,
  })
  .strict();

export const checkpointSchema = z
  .object({
    runId: idSchema,
    status: runStatusSchema,
    rootGraph: idSchema,
    workflow: z.object({ id: idSchema, version: z.string().min(1) }).strict(),
    position: positionSchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    outputs: z.record(z.string(), z.unknown()).default({}),
    resumeNote: z.string().optional(),
  })
  .strict();

export const currentSchema = z
  .object({
    focusedRunId: idSchema.nullable(),
  })
  .strict();

export const transitionLogEntrySchema = z
  .object({
    ts: z.string().min(1),
    op: z.enum(['start', 'step', 'suspend', 'resume', 'abandon']),
    runId: idSchema,
    from: positionSchema.nullable(),
    to: positionSchema.nullable(),
    actor: z.string().min(1),
    input: z.unknown().nullable(),
    output: z.unknown().nullable(),
    validation: z.object({ ok: z.boolean() }).passthrough(),
    gateDecision: z.unknown().nullable(),
    reason: z.string().nullable(),
    error: z.unknown().nullable(),
  })
  .strict();

export type Workflow = z.infer<typeof workflowSchema>;
export type Graph = z.infer<typeof graphSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type Position = z.infer<typeof positionSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type Current = z.infer<typeof currentSchema>;
export type TransitionLogEntry = z.infer<typeof transitionLogEntrySchema>;

