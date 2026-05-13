import { z } from 'zod';

export const input = z.object({ topic: z.string() }).strict();

export const output = z
  .object({
    approaches: z
      .array(
        z
          .object({
            name: z.string().min(1),
            rationale: z.string().min(10),
            tradeoffs: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .min(3),
    handoff_summary: z.string().min(40).max(500),
  })
  .strict();
