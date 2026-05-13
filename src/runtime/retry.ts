import type { RunState, WorkNode } from '../graph/types.js';

export function recordAttempt(state: RunState): void {
  state.current.attempt += 1;
}

export function resetAttempt(state: RunState): void {
  state.current.attempt = 0;
}

export function shouldGateForRetry(state: RunState, node: WorkNode): boolean {
  return state.current.attempt >= node.max_retries;
}
