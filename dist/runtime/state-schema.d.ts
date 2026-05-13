import { z } from 'zod';
export declare const stackFrameSchema: z.ZodObject<{
    path: z.ZodArray<z.ZodString, "many">;
    attempt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    path: string[];
    attempt: number;
}, {
    path: string[];
    attempt: number;
}>;
export declare const pendingConfirmationSchema: z.ZodObject<{
    proposal_id: z.ZodString;
    entry_id: z.ZodString;
    reason: z.ZodString;
    message: z.ZodString;
    resume_path: z.ZodArray<z.ZodString, "many">;
    resume_attempt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    proposal_id: string;
    entry_id: string;
    reason: string;
    resume_path: string[];
    resume_attempt: number;
}, {
    message: string;
    proposal_id: string;
    entry_id: string;
    reason: string;
    resume_path: string[];
    resume_attempt: number;
}>;
export declare const runStateSchema: z.ZodObject<{
    run_id: z.ZodString;
    workflow_path: z.ZodString;
    current: z.ZodObject<{
        path: z.ZodArray<z.ZodString, "many">;
        attempt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        path: string[];
        attempt: number;
    }, {
        path: string[];
        attempt: number;
    }>;
    outputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    subgraphs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    stack: z.ZodArray<z.ZodObject<{
        path: z.ZodArray<z.ZodString, "many">;
        attempt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        path: string[];
        attempt: number;
    }, {
        path: string[];
        attempt: number;
    }>, "many">;
    pending_confirmation: z.ZodOptional<z.ZodObject<{
        proposal_id: z.ZodString;
        entry_id: z.ZodString;
        reason: z.ZodString;
        message: z.ZodString;
        resume_path: z.ZodArray<z.ZodString, "many">;
        resume_attempt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        message: string;
        proposal_id: string;
        entry_id: string;
        reason: string;
        resume_path: string[];
        resume_attempt: number;
    }, {
        message: string;
        proposal_id: string;
        entry_id: string;
        reason: string;
        resume_path: string[];
        resume_attempt: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    run_id: string;
    workflow_path: string;
    current: {
        path: string[];
        attempt: number;
    };
    outputs: Record<string, unknown>;
    subgraphs: Record<string, unknown>;
    stack: {
        path: string[];
        attempt: number;
    }[];
    pending_confirmation?: {
        message: string;
        proposal_id: string;
        entry_id: string;
        reason: string;
        resume_path: string[];
        resume_attempt: number;
    } | undefined;
}, {
    run_id: string;
    workflow_path: string;
    current: {
        path: string[];
        attempt: number;
    };
    outputs: Record<string, unknown>;
    subgraphs: Record<string, unknown>;
    stack: {
        path: string[];
        attempt: number;
    }[];
    pending_confirmation?: {
        message: string;
        proposal_id: string;
        entry_id: string;
        reason: string;
        resume_path: string[];
        resume_attempt: number;
    } | undefined;
}>;
export declare const activeRunPointerSchema: z.ZodObject<{
    run_id: z.ZodString;
    workflow_path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    run_id: string;
    workflow_path: string;
}, {
    run_id: string;
    workflow_path: string;
}>;
export type RunStateJson = z.infer<typeof runStateSchema>;
export type ActiveRunPointerJson = z.infer<typeof activeRunPointerSchema>;
