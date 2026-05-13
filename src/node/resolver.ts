import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';
import { z, type ZodTypeAny, ZodObject, ZodString } from 'zod';
import { RipplepathError, type ResolvedNodeAssets } from '../graph/types.js';

export class MissingNodeAssetError extends RipplepathError {
  constructor(folderPath: string, asset: string) {
    super('E_MISSING_NODE_ASSET', `missing ${asset} in node folder: ${folderPath}`);
  }
}

export class InvalidSchemaModuleError extends RipplepathError {
  constructor(folderPath: string, details: string) {
    super('E_INVALID_SCHEMA_MODULE', `schema.ts in ${folderPath}: ${details}`);
  }
}

export class MissingHandoffSummaryError extends RipplepathError {
  constructor(folderPath: string) {
    super(
      'E_MISSING_HANDOFF_SUMMARY',
      `schema.ts in ${folderPath} must declare a string output.handoff_summary field`,
    );
  }
}

export class HandoffSummaryBoundsError extends RipplepathError {
  constructor(folderPath: string, details: string) {
    super(
      'E_HANDOFF_SUMMARY_BOUNDS',
      `schema.ts in ${folderPath}: handoff_summary ${details} — required: z.string().min(40).max(500)`,
    );
  }
}

interface ZodStringDefLike {
  checks?: Array<{ kind: string; value?: number }>;
}

function inspectStringBounds(field: ZodTypeAny): { min?: number; max?: number } | null {
  if (!(field instanceof ZodString)) return null;
  const def = (field as ZodString)._def as ZodStringDefLike;
  let min: number | undefined;
  let max: number | undefined;
  for (const check of def.checks ?? []) {
    if (check.kind === 'min' && typeof check.value === 'number') min = check.value;
    if (check.kind === 'max' && typeof check.value === 'number') max = check.value;
  }
  return { min, max };
}

function enforceHandoffSummary(folderPath: string, outputSchema: ZodTypeAny): void {
  if (!(outputSchema instanceof ZodObject)) {
    throw new InvalidSchemaModuleError(
      folderPath,
      `output export must be a z.object; got ${outputSchema?.constructor?.name ?? typeof outputSchema}`,
    );
  }
  const shape = (outputSchema as ZodObject<Record<string, ZodTypeAny>>).shape;
  const field = shape['handoff_summary'];
  if (!field) {
    throw new MissingHandoffSummaryError(folderPath);
  }
  const bounds = inspectStringBounds(field);
  if (!bounds) {
    throw new HandoffSummaryBoundsError(folderPath, 'must be a z.string()');
  }
  if (bounds.min !== 40) {
    throw new HandoffSummaryBoundsError(
      folderPath,
      `min is ${bounds.min ?? 'unset'}; expected 40`,
    );
  }
  if (bounds.max !== 500) {
    throw new HandoffSummaryBoundsError(
      folderPath,
      `max is ${bounds.max ?? 'unset'}; expected 500`,
    );
  }
}

const cache = new Map<string, ResolvedNodeAssets>();

export async function resolveWorkNode(folderPath: string): Promise<ResolvedNodeAssets> {
  const abs = path.resolve(folderPath);
  const cached = cache.get(abs);
  if (cached) return cached;

  const instructionPath = path.join(abs, 'instruction.md');
  const schemaPath = path.join(abs, 'schema.ts');

  if (!fs.existsSync(instructionPath)) {
    throw new MissingNodeAssetError(abs, 'instruction.md');
  }
  if (!fs.existsSync(schemaPath)) {
    throw new MissingNodeAssetError(abs, 'schema.ts');
  }

  const instruction = fs.readFileSync(instructionPath, 'utf8');

  let module: Record<string, unknown>;
  try {
    module = (await tsImport(pathToFileURL(schemaPath).href, import.meta.url)) as Record<
      string,
      unknown
    >;
  } catch (e) {
    throw new InvalidSchemaModuleError(abs, (e as Error).message);
  }

  const input = module['input'];
  const output = module['output'];
  if (!input || typeof input !== 'object' || !('_def' in input)) {
    throw new InvalidSchemaModuleError(abs, 'missing or invalid `input` Zod schema export');
  }
  if (!output || typeof output !== 'object' || !('_def' in output)) {
    throw new InvalidSchemaModuleError(abs, 'missing or invalid `output` Zod schema export');
  }

  enforceHandoffSummary(abs, output as ZodTypeAny);

  const assets: ResolvedNodeAssets = {
    instruction,
    inputSchema: input as ZodTypeAny,
    outputSchema: output as ZodTypeAny,
  };
  cache.set(abs, assets);
  return assets;
}

export function clearResolverCache(): void {
  cache.clear();
}

// re-export z so node schema files can `import { z } from "ripplepath"` if they prefer
export { z };
