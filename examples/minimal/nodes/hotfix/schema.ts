import { z } from 'zod';

export const input = z.object({}).strict();

export const output = z
  .object({
    fix: z.string().min(5),
    justification: z.string().min(5),
    handoff_summary: z.string().min(40).max(500),
  })
  .strict();
