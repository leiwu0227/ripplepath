import { z } from 'zod';

export const input = z.object({}).strict();

export const output = z
  .object({
    findings: z
      .object({
        chosen: z.string().min(1),
        justification: z.string().min(20),
      })
      .strict(),
    handoff_summary: z.string().min(40).max(500),
  })
  .strict();
