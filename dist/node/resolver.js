import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';
import { z } from 'zod';
import { RipplegraphError } from '../graph/types.js';
// Cross-instance Zod detection. We use the documented `_def.typeName` rather
// than `instanceof` because schemas the user imports may come from a
// different Zod instance than ours (peer-dependency dual-load), in which
// case `instanceof ZodObject` returns false even for valid schemas.
function getTypeName(schema) {
    if (!schema || typeof schema !== 'object')
        return null;
    const def = schema._def;
    if (!def || typeof def.typeName !== 'string')
        return null;
    return def.typeName;
}
function isZodObject(schema) {
    return getTypeName(schema) === 'ZodObject';
}
function isZodString(schema) {
    return getTypeName(schema) === 'ZodString';
}
function getObjectShape(schema) {
    const def = schema._def;
    if (def && typeof def.shape === 'function')
        return def.shape();
    // Fallback to .shape getter on the schema (Zod v3 exposes both)
    const shape = schema.shape;
    return shape ?? {};
}
export class MissingNodeAssetError extends RipplegraphError {
    constructor(folderPath, asset) {
        super('E_MISSING_NODE_ASSET', `missing ${asset} in node folder: ${folderPath}`);
    }
}
export class InvalidSchemaModuleError extends RipplegraphError {
    constructor(folderPath, details) {
        super('E_INVALID_SCHEMA_MODULE', `schema.ts in ${folderPath}: ${details}`);
    }
}
export class MissingHandoffSummaryError extends RipplegraphError {
    constructor(folderPath) {
        super('E_MISSING_HANDOFF_SUMMARY', `schema.ts in ${folderPath} must declare a string output.handoff_summary field`);
    }
}
export class HandoffSummaryBoundsError extends RipplegraphError {
    constructor(folderPath, details) {
        super('E_HANDOFF_SUMMARY_BOUNDS', `schema.ts in ${folderPath}: handoff_summary ${details} — required: z.string().min(40).max(500)`);
    }
}
function inspectStringBounds(field) {
    if (!isZodString(field))
        return null;
    const def = field._def;
    let min;
    let max;
    for (const check of def.checks ?? []) {
        if (check.kind === 'min' && typeof check.value === 'number')
            min = check.value;
        if (check.kind === 'max' && typeof check.value === 'number')
            max = check.value;
    }
    return { min, max };
}
function enforceHandoffSummary(folderPath, outputSchema) {
    if (!isZodObject(outputSchema)) {
        throw new InvalidSchemaModuleError(folderPath, `output export must be a z.object; got typeName=${getTypeName(outputSchema) ?? typeof outputSchema}`);
    }
    const shape = getObjectShape(outputSchema);
    const field = shape['handoff_summary'];
    if (!field) {
        throw new MissingHandoffSummaryError(folderPath);
    }
    const bounds = inspectStringBounds(field);
    if (!bounds) {
        throw new HandoffSummaryBoundsError(folderPath, 'must be a z.string()');
    }
    if (bounds.min !== 40) {
        throw new HandoffSummaryBoundsError(folderPath, `min is ${bounds.min ?? 'unset'}; expected 40`);
    }
    if (bounds.max !== 500) {
        throw new HandoffSummaryBoundsError(folderPath, `max is ${bounds.max ?? 'unset'}; expected 500`);
    }
}
const cache = new Map();
export async function resolveWorkNode(folderPath) {
    const abs = path.resolve(folderPath);
    const cached = cache.get(abs);
    if (cached)
        return cached;
    const instructionPath = path.join(abs, 'instruction.md');
    const schemaPath = path.join(abs, 'schema.ts');
    if (!fs.existsSync(instructionPath)) {
        throw new MissingNodeAssetError(abs, 'instruction.md');
    }
    if (!fs.existsSync(schemaPath)) {
        throw new MissingNodeAssetError(abs, 'schema.ts');
    }
    const instruction = fs.readFileSync(instructionPath, 'utf8');
    let module;
    try {
        module = (await tsImport(pathToFileURL(schemaPath).href, import.meta.url));
    }
    catch (e) {
        throw new InvalidSchemaModuleError(abs, e.message);
    }
    const input = module['input'];
    const output = module['output'];
    if (!input || typeof input !== 'object' || !('_def' in input)) {
        throw new InvalidSchemaModuleError(abs, 'missing or invalid `input` Zod schema export');
    }
    if (!output || typeof output !== 'object' || !('_def' in output)) {
        throw new InvalidSchemaModuleError(abs, 'missing or invalid `output` Zod schema export');
    }
    enforceHandoffSummary(abs, output);
    const assets = {
        instruction,
        inputSchema: input,
        outputSchema: output,
    };
    cache.set(abs, assets);
    return assets;
}
export function clearResolverCache() {
    cache.clear();
}
// re-export z so node schema files can `import { z } from "ripplegraph"` if they prefer
export { z };
