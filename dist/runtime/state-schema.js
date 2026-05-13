import { z } from 'zod';
const positionSchema = z.object({
    path: z.array(z.string().min(1)).min(1),
    attempt: z.number().int().nonnegative(),
});
export const stackFrameSchema = z.object({
    path: z.array(z.string().min(1)).min(1),
    attempt: z.number().int().nonnegative(),
});
export const pendingConfirmationSchema = z.object({
    proposal_id: z.string().min(1),
    entry_id: z.string().min(1),
    reason: z.string(),
    message: z.string(),
    resume_path: z.array(z.string().min(1)).min(1),
    resume_attempt: z.number().int().nonnegative(),
});
export const runStateSchema = z.object({
    run_id: z.string().min(1),
    workflow_path: z.string().min(1),
    current: positionSchema,
    outputs: z.record(z.string(), z.unknown()),
    subgraphs: z.record(z.string(), z.unknown()),
    stack: z.array(stackFrameSchema),
    pending_confirmation: pendingConfirmationSchema.optional(),
});
export const activeRunPointerSchema = z.object({
    run_id: z.string().min(1),
    workflow_path: z.string().min(1),
});
