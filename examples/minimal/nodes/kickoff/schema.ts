import { z } from 'zod';

export const input = z.object({}).strict();

export const output = z
  .object({
    topic: z.string().min(3),
    intent: z.string().min(3),
    handoff_summary: z
      .string()
      .min(40)
      .max(500)
      .describe('One paragraph for the analyze subgraph; topic + intent context.'),
  })
  .strict();
