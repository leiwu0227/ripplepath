export function recordAttempt(state) {
    state.current.attempt += 1;
}
export function resetAttempt(state) {
    state.current.attempt = 0;
}
export function shouldGateForRetry(state, node) {
    return state.current.attempt >= node.max_retries;
}
