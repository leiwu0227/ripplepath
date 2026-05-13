import type { RunState, WorkNode } from '../graph/types.js';
export declare function recordAttempt(state: RunState): void;
export declare function resetAttempt(state: RunState): void;
export declare function shouldGateForRetry(state: RunState, node: WorkNode): boolean;
