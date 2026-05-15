# Reference Demo CLI Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add `ripplegraph-demo` as a reference consumer CLI with compact agent-facing output and `.ripplegraph/` runtime state.

**Architecture:** Keep `ripplegraph` as the low-level JSON CLI. Move state path resolution into storage/coach so both CLIs use the same `.ripplegraph/` runtime layout. Implement `ripplegraph-demo` as argument parsing plus rendering over coach APIs, including a coach-level run listing API.

**Tech Stack:** TypeScript, Node.js ESM, Zod, Vitest, filesystem JSON state.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks.

---

### Task 1: Add `.ripplegraph/` State Directory
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/storage.ts`, `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Add a storage-level state directory abstraction that defaults runtime files to `.ripplegraph/`.
- Update `currentPath`, `runsDir`, `runDir`, `checkpointPath`, `transitionLogPath`, and `artifactPath` to use the state directory.
- Keep `workflow.json` loading from the workflow root.
- Update coach operations to continue passing `workflowRoot` while storage resolves runtime paths internally.
- Update tests to assert `.ripplegraph/current.json` and `.ripplegraph/runs/<run-id>/...`.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Replace old root-level `current.json` / `runs/` assertions rather than adding duplicate assertions.

**Commit:** `git commit -m "move runtime state under ripplegraph directory"`

### Task 2: Add Coach Run Summaries
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/index.ts`, `tests/coach.test.ts`

**Work:**
- Add public `listRuns({ workflowRoot })` to the coach API.
- Return workflow id/version, `focusedRunId`, and run summaries containing id, status, root graph, position, and updated timestamp.
- Reuse existing checkpoint reading helpers; do not expose storage parsing to the demo CLI.
- Keep `getState` behavior compatible unless reusing summary data makes implementation simpler.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Extend the existing suspend/resume test if it already creates the needed active and suspended runs.

**Commit:** `git commit -m "add coach run summaries"`

### Task 3: Implement `ripplegraph-demo` CLI
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/demo-cli.ts`, `bin/ripplegraph-demo`, `package.json`, `tests/demo-cli.test.ts`

**Work:**
- Add a package binary named `ripplegraph-demo`.
- Implement commands:
  - `status [--workflow-root <path>]`
  - `runs [--workflow-root <path>]`
  - `start <graph-id> --run <run-id> [--workflow-root <path>]`
  - `pause [note] [--workflow-root <path>]`
  - `resume <run-id> [--workflow-root <path>]`
  - `submit <json> [--file <path>] [--workflow-root <path>]`
- Route all transitions and run listing through coach APIs.
- Render concise text for current node, required output fields, available graphs, resumable runs, and suggested next commands.
- Keep errors readable while preserving underlying error codes when available.

**Verify:**
- `npm test -- tests/demo-cli.test.ts`

**Test Budget:** +2 in `tests/demo-cli.test.ts`; focused (<30s) — one test for the active-run happy path, one for no-focused-run/runs output.

**Test Pruning:**
- Do not duplicate low-level JSON CLI tests; only cover demo rendering and command wiring.

**Commit:** `git commit -m "add ripplegraph demo cli"`

### Task 4: Refresh Templates, Examples, and Docs
**Mode:** lightweight
**Skills:** []
**Files:** `templates/AGENT.md.tmpl`, `templates/minimal/AGENT.md`, `README.md`, `examples/minimal/AGENT.md`, `.gitignore`

**Work:**
- Update agent guidance to prefer `ripplegraph-demo` for normal driving.
- Keep `ripplegraph` documented as the low-level JSON/debugging command.
- Document `.ripplegraph/` as the runtime state directory.
- Add `.ripplegraph/` to `.gitignore`.
- Update quick-start examples for `ripplegraph-demo`.

**Verify:**
- `rg "current\\.json|runs/<run-id>|ripplegraph-demo|\\.ripplegraph" README.md templates examples .gitignore`

**Test Budget:** +0; text-only

**Test Pruning:**
- Remove stale root-level runtime state references instead of preserving both old and new paths.

**Commit:** `git commit -m "document ripplegraph demo workflow"`

### Task 5: Build, Pack, and Smoke Verify
**Mode:** standard
**Skills:** systematic-debugging
**Files:** `dist/`, `package-lock.json` if dependency metadata changes

**Work:**
- Run full typecheck, tests, and build.
- Verify `npm pack --dry-run` includes `bin/ripplegraph-demo`, `dist/demo-cli.*`, and templates.
- Run a fresh temporary workflow smoke test with `ripplegraph-demo`:
  - copy minimal template
  - `status`
  - `start daily-execution --run smoke-daily`
  - `submit '{"decision":"stop"}'`
  - `start mockcopy-backtest --run smoke-mock`
  - `submit '{"plan":"smoke plan"}'`
  - `runs`
- Confirm a fresh workflow root creates `.ripplegraph/` and not root-level `current.json` or `runs/`.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack --dry-run`

**Test Budget:** +0; final verification only

**Test Pruning:**
- No new tests in this task; fix earlier tests if final verification exposes stale assumptions.

**Commit:** `git commit -m "verify ripplegraph demo cli"`
