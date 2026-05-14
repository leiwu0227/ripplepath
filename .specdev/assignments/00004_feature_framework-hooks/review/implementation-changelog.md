## Round 1

- Addressed [F1.1]: `stepRun` now logs a terminal-reaching step exactly once. The successful step log entry with artifact references is written before terminal finalization; `completeRun` now only marks the checkpoint completed and clears `current.json`.
- Added a regression assertion in `tests/coach.test.ts` that a terminal step produces `["start", "step"]` in `transition-log.jsonl` and preserves the step artifact reference.
- Verification: `npm test -- tests/coach.test.ts`, `npm run typecheck`, `npm run build`, `npm test`.

