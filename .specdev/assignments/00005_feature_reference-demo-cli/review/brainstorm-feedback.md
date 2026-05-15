## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The design expects `ripplegraph-demo status`/`runs` to render resumable runs with their current node, e.g. `weak-mock-1  suspended  mockcopy-backtest  plan`, while also saying the demo CLI should call the same TypeScript coach APIs rather than becoming a second runtime. The current coach API cannot supply that data: `StateNoFocusedRun.resumableRuns` only contains `{ id, status, rootGraph }`, and there is no public coach operation for listing all runs or their positions. If implementation follows the design as written, the demo CLI must either read checkpoints/storage directly or omit promised output, both of which weaken the stated separation of concerns. Update the design to add an explicit coach-level run listing/status API, or narrow the demo output so it only relies on existing coach responses.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- [F1.1] Addressed by adding an explicit coach-level `listRuns({ workflowRoot })` summary API and clarifying that `ripplegraph-demo` should use coach APIs for status/run listing rather than reading checkpoints directly.
