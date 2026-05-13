import { z } from 'zod';
export declare const idSchema: z.ZodString;
export declare const mapExprSchema: z.ZodString;
export declare const workNodeJsonSchema: z.ZodObject<{
    id: z.ZodString;
    exec: z.ZodEnum<["inline", "spawn"]>;
    node: z.ZodString;
    purpose: z.ZodString;
    role_in_graph: z.ZodOptional<z.ZodString>;
    max_retries: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    id: string;
    exec: "inline" | "spawn";
    node: string;
    purpose: string;
    max_retries: number;
    role_in_graph?: string | undefined;
}, {
    id: string;
    exec: "inline" | "spawn";
    node: string;
    purpose: string;
    role_in_graph?: string | undefined;
    max_retries?: number | undefined;
}>;
export declare const subgraphRefJsonSchema: z.ZodObject<{
    id: z.ZodString;
    ref: z.ZodString;
    inputMap: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    outputMap: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    purpose: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    purpose: string;
    ref: string;
    inputMap: Record<string, string>;
    outputMap: Record<string, string>;
}, {
    id: string;
    purpose: string;
    ref: string;
    inputMap?: Record<string, string> | undefined;
    outputMap?: Record<string, string> | undefined;
}>;
export declare const nodeJsonSchema: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    exec: z.ZodEnum<["inline", "spawn"]>;
    node: z.ZodString;
    purpose: z.ZodString;
    role_in_graph: z.ZodOptional<z.ZodString>;
    max_retries: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    id: string;
    exec: "inline" | "spawn";
    node: string;
    purpose: string;
    max_retries: number;
    role_in_graph?: string | undefined;
}, {
    id: string;
    exec: "inline" | "spawn";
    node: string;
    purpose: string;
    role_in_graph?: string | undefined;
    max_retries?: number | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    ref: z.ZodString;
    inputMap: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    outputMap: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    purpose: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    purpose: string;
    ref: string;
    inputMap: Record<string, string>;
    outputMap: Record<string, string>;
}, {
    id: string;
    purpose: string;
    ref: string;
    inputMap?: Record<string, string> | undefined;
    outputMap?: Record<string, string> | undefined;
}>]>;
export declare const edgeJsonSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    when: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    from: string;
    to: string;
    when?: string | undefined;
}, {
    from: string;
    to: string;
    when?: string | undefined;
}>;
export declare const freeEntryJsonSchema: z.ZodObject<{
    id: z.ZodString;
    target: z.ZodString;
    description: z.ZodString;
    mode: z.ZodEnum<["modal", "replace"]>;
}, "strict", z.ZodTypeAny, {
    id: string;
    target: string;
    description: string;
    mode: "modal" | "replace";
}, {
    id: string;
    target: string;
    description: string;
    mode: "modal" | "replace";
}>;
export declare const workflowJsonSchema: z.ZodEffects<z.ZodObject<{
    version: z.ZodLiteral<1>;
    goal: z.ZodString;
    nodes: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        id: z.ZodString;
        exec: z.ZodEnum<["inline", "spawn"]>;
        node: z.ZodString;
        purpose: z.ZodString;
        role_in_graph: z.ZodOptional<z.ZodString>;
        max_retries: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        exec: "inline" | "spawn";
        node: string;
        purpose: string;
        max_retries: number;
        role_in_graph?: string | undefined;
    }, {
        id: string;
        exec: "inline" | "spawn";
        node: string;
        purpose: string;
        role_in_graph?: string | undefined;
        max_retries?: number | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        ref: z.ZodString;
        inputMap: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        outputMap: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        purpose: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        id: string;
        purpose: string;
        ref: string;
        inputMap: Record<string, string>;
        outputMap: Record<string, string>;
    }, {
        id: string;
        purpose: string;
        ref: string;
        inputMap?: Record<string, string> | undefined;
        outputMap?: Record<string, string> | undefined;
    }>]>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        when: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        from: string;
        to: string;
        when?: string | undefined;
    }, {
        from: string;
        to: string;
        when?: string | undefined;
    }>, "many">;
    entries: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodString;
        description: z.ZodString;
        mode: z.ZodEnum<["modal", "replace"]>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        target: string;
        description: string;
        mode: "modal" | "replace";
    }, {
        id: string;
        target: string;
        description: string;
        mode: "modal" | "replace";
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    entries: {
        id: string;
        target: string;
        description: string;
        mode: "modal" | "replace";
    }[];
    version: 1;
    goal: string;
    nodes: ({
        id: string;
        exec: "inline" | "spawn";
        node: string;
        purpose: string;
        max_retries: number;
        role_in_graph?: string | undefined;
    } | {
        id: string;
        purpose: string;
        ref: string;
        inputMap: Record<string, string>;
        outputMap: Record<string, string>;
    })[];
    edges: {
        from: string;
        to: string;
        when?: string | undefined;
    }[];
}, {
    version: 1;
    goal: string;
    nodes: ({
        id: string;
        exec: "inline" | "spawn";
        node: string;
        purpose: string;
        role_in_graph?: string | undefined;
        max_retries?: number | undefined;
    } | {
        id: string;
        purpose: string;
        ref: string;
        inputMap?: Record<string, string> | undefined;
        outputMap?: Record<string, string> | undefined;
    })[];
    edges: {
        from: string;
        to: string;
        when?: string | undefined;
    }[];
    entries?: {
        id: string;
        target: string;
        description: string;
        mode: "modal" | "replace";
    }[] | undefined;
}>, {
    entries: {
        id: string;
        target: string;
        description: string;
        mode: "modal" | "replace";
    }[];
    version: 1;
    goal: string;
    nodes: ({
        id: string;
        exec: "inline" | "spawn";
        node: string;
        purpose: string;
        max_retries: number;
        role_in_graph?: string | undefined;
    } | {
        id: string;
        purpose: string;
        ref: string;
        inputMap: Record<string, string>;
        outputMap: Record<string, string>;
    })[];
    edges: {
        from: string;
        to: string;
        when?: string | undefined;
    }[];
}, {
    version: 1;
    goal: string;
    nodes: ({
        id: string;
        exec: "inline" | "spawn";
        node: string;
        purpose: string;
        role_in_graph?: string | undefined;
        max_retries?: number | undefined;
    } | {
        id: string;
        purpose: string;
        ref: string;
        inputMap?: Record<string, string> | undefined;
        outputMap?: Record<string, string> | undefined;
    })[];
    edges: {
        from: string;
        to: string;
        when?: string | undefined;
    }[];
    entries?: {
        id: string;
        target: string;
        description: string;
        mode: "modal" | "replace";
    }[] | undefined;
}>;
export type WorkflowJson = z.infer<typeof workflowJsonSchema>;
export type WorkNodeJson = z.infer<typeof workNodeJsonSchema>;
export type SubgraphRefJson = z.infer<typeof subgraphRefJsonSchema>;
