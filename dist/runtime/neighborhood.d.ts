import { type ParsedGraph, type RunState } from '../graph/types.js';
export declare function generateOverview(root: ParsedGraph, currentPath: string[]): string;
export declare function generateNeighborhood(root: ParsedGraph, currentPath: string[], state: RunState): string;
