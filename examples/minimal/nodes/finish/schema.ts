import { z } from 'zod';

export const input = z.object({}).strict();

export const output = z
  .object({
    conclusion: z.string().min(20),
    handoff_summary: z.string().min(40).max(500),
  })
  .strict();
