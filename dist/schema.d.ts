import { z } from 'zod';
export declare class RipplegraphError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export interface JsonSchema {
    type?: 'object' | 'string' | 'number' | 'boolean' | 'array';
    required?: string[];
    properties?: Record<string, JsonSchema>;
    enum?: unknown[];
    [key: string]: unknown;
}
export declare const edgeSchema: z.ZodObject<{
    to: z.ZodString;
    when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strict", z.ZodTypeAny, {
    to: string;
    when?: Record<string, unknown> | undefined;
}, {
    to: string;
    when?: Record<string, unknown> | undefined;
}>;
export declare const nodeSchema: z.ZodObject<{
    purpose: z.ZodString;
    instructions: z.ZodOptional<z.ZodString>;
    exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        to: z.ZodString;
        when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strict", z.ZodTypeAny, {
        to: string;
        when?: Record<string, unknown> | undefined;
    }, {
        to: string;
        when?: Record<string, unknown> | undefined;
    }>, "many">>;
    terminal: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    purpose: string;
    exec: "inline" | "spawn" | "script";
    outputSchema: JsonSchema;
    edges: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[];
    terminal: boolean;
    instructions?: string | undefined;
}, {
    purpose: string;
    instructions?: string | undefined;
    exec?: "inline" | "spawn" | "script" | undefined;
    outputSchema?: JsonSchema | undefined;
    edges?: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[] | undefined;
    terminal?: boolean | undefined;
}>;
export declare const graphSchema: z.ZodEffects<z.ZodObject<{
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
            to: z.ZodString;
            when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strict", z.ZodTypeAny, {
            to: string;
            when?: Record<string, unknown> | undefined;
        }, {
            to: string;
            when?: Record<string, unknown> | undefined;
        }>, "many">>;
        terminal: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
    }>;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
}>, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
    }>;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
}>;
export declare const workflowSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    graphs: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        entry: z.ZodString;
        nodes: z.ZodRecord<z.ZodString, z.ZodObject<{
            purpose: z.ZodString;
            instructions: z.ZodOptional<z.ZodString>;
            exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
            outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
                to: z.ZodString;
                when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strict", z.ZodTypeAny, {
                to: string;
                when?: Record<string, unknown> | undefined;
            }, {
                to: string;
                when?: Record<string, unknown> | undefined;
            }>, "many">>;
            terminal: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
        }, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
        }>;
    }, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
    }>, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
        }>;
    }, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
    }>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    version: string;
    graphs: Record<string, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
        }>;
    }>;
}, {
    id: string;
    version: string;
    graphs: Record<string, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
    }>;
}>;
export declare const runStatusSchema: z.ZodEnum<["active", "suspended", "completed", "abandoned"]>;
export declare const positionSchema: z.ZodObject<{
    graph: z.ZodString;
    node: z.ZodString;
}, "strict", z.ZodTypeAny, {
    graph: string;
    node: string;
}, {
    graph: string;
    node: string;
}>;
export declare const checkpointSchema: z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodEnum<["active", "suspended", "completed", "abandoned"]>;
    rootGraph: z.ZodString;
    workflow: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        id: string;
        version: string;
    }, {
        id: string;
        version: string;
    }>;
    position: z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        graph: string;
        node: string;
    }, {
        graph: string;
        node: string;
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    outputs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    resumeNote: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "suspended" | "completed" | "abandoned";
    runId: string;
    rootGraph: string;
    workflow: {
        id: string;
        version: string;
    };
    position: {
        graph: string;
        node: string;
    };
    createdAt: string;
    updatedAt: string;
    outputs: Record<string, unknown>;
    resumeNote?: string | undefined;
}, {
    status: "active" | "suspended" | "completed" | "abandoned";
    runId: string;
    rootGraph: string;
    workflow: {
        id: string;
        version: string;
    };
    position: {
        graph: string;
        node: string;
    };
    createdAt: string;
    updatedAt: string;
    outputs?: Record<string, unknown> | undefined;
    resumeNote?: string | undefined;
}>;
export declare const currentSchema: z.ZodObject<{
    focusedRunId: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    focusedRunId: string | null;
}, {
    focusedRunId: string | null;
}>;
export declare const transitionLogEntrySchema: z.ZodObject<{
    ts: z.ZodString;
    op: z.ZodEnum<["start", "step", "suspend", "resume", "abandon"]>;
    runId: z.ZodString;
    from: z.ZodNullable<z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        graph: string;
        node: string;
    }, {
        graph: string;
        node: string;
    }>>;
    to: z.ZodNullable<z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        graph: string;
        node: string;
    }, {
        graph: string;
        node: string;
    }>>;
    actor: z.ZodString;
    input: z.ZodNullable<z.ZodUnknown>;
    output: z.ZodNullable<z.ZodUnknown>;
    validation: z.ZodObject<{
        ok: z.ZodBoolean;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        ok: z.ZodBoolean;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        ok: z.ZodBoolean;
    }, z.ZodTypeAny, "passthrough">>;
    gateDecision: z.ZodNullable<z.ZodUnknown>;
    reason: z.ZodNullable<z.ZodString>;
    error: z.ZodNullable<z.ZodUnknown>;
}, "strict", z.ZodTypeAny, {
    validation: {
        ok: boolean;
    } & {
        [k: string]: unknown;
    };
    to: {
        graph: string;
        node: string;
    } | null;
    runId: string;
    ts: string;
    op: "start" | "step" | "suspend" | "resume" | "abandon";
    from: {
        graph: string;
        node: string;
    } | null;
    actor: string;
    reason: string | null;
    input?: unknown;
    output?: unknown;
    gateDecision?: unknown;
    error?: unknown;
}, {
    validation: {
        ok: boolean;
    } & {
        [k: string]: unknown;
    };
    to: {
        graph: string;
        node: string;
    } | null;
    runId: string;
    ts: string;
    op: "start" | "step" | "suspend" | "resume" | "abandon";
    from: {
        graph: string;
        node: string;
    } | null;
    actor: string;
    reason: string | null;
    input?: unknown;
    output?: unknown;
    gateDecision?: unknown;
    error?: unknown;
}>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Graph = z.infer<typeof graphSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type Position = z.infer<typeof positionSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type Current = z.infer<typeof currentSchema>;
export type TransitionLogEntry = z.infer<typeof transitionLogEntrySchema>;
