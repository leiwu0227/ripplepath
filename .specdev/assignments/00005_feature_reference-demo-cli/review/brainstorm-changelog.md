## Round 1

- Addressed [F1.1] by updating the design to require an explicit coach-level `listRuns({ workflowRoot })` summary API.
- Clarified that `ripplegraph-demo` should not read checkpoints directly for normal status/run listing behavior; run discovery belongs behind the coach API boundary.
- Added success criteria covering run summaries with id, status, root graph, position, and focused run id.
