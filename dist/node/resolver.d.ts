import { z } from 'zod';
import { RipplegraphError, type ResolvedNodeAssets } from '../graph/types.js';
export declare class MissingNodeAssetError extends RipplegraphError {
    constructor(folderPath: string, asset: string);
}
export declare class InvalidSchemaModuleError extends RipplegraphError {
    constructor(folderPath: string, details: string);
}
export declare class MissingHandoffSummaryError extends RipplegraphError {
    constructor(folderPath: string);
}
export declare class HandoffSummaryBoundsError extends RipplegraphError {
    constructor(folderPath: string, details: string);
}
export declare function resolveWorkNode(folderPath: string): Promise<ResolvedNodeAssets>;
export declare function clearResolverCache(): void;
export { z };
