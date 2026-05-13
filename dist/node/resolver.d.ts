import { z } from 'zod';
import { RipplepathError, type ResolvedNodeAssets } from '../graph/types.js';
export declare class MissingNodeAssetError extends RipplepathError {
    constructor(folderPath: string, asset: string);
}
export declare class InvalidSchemaModuleError extends RipplepathError {
    constructor(folderPath: string, details: string);
}
export declare class MissingHandoffSummaryError extends RipplepathError {
    constructor(folderPath: string);
}
export declare class HandoffSummaryBoundsError extends RipplepathError {
    constructor(folderPath: string, details: string);
}
export declare function resolveWorkNode(folderPath: string): Promise<ResolvedNodeAssets>;
export declare function clearResolverCache(): void;
export { z };
