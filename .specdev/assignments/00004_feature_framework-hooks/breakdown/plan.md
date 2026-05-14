# Minimal Coach Runtime POC Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Build a breaking-change proof of concept for ripplegraph as a focused-run Coach runtime.

**Architecture:** Replace the old runtime with a small set of explicit modules: schema validation, filesystem storage, Coach operations, and a thin JSON CLI. The POC uses a single `workflow.json` containing multiple named graphs, persists runs under `runs/<id>/`, and uses `current.json` as the only focus pointer.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Zod for runtime validation, Vitest for tests.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks. Prefer replacing stale tests over preserving old behavior.

---

### Task 1: Replace Core Schema And Storage
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/storage.ts`, `src/index.ts`, remove or stop using old `src/graph/*`, `src/runtime/*`, `src/node/*`, `src/commands/*`

**Work:**
- Define workflow, graph, node, edge, checkpoint, current focus, state response, and transition log types.
- Validate single-file `workflow.json` with `id`, `version`, and `graphs`.
- Implement filesystem helpers for `current.json`, `runs/<id>/checkpoint.json`, `transition-log.jsonl`, `artifacts/<node-id>/output.json`, and `scratch/`.
- Keep run IDs opaque and caller supplied.
- Export the public types/functions through `src/index.ts`.

**Verify:**
- `npm run typecheck`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Replace old runtime tests that assert subgraph/free-entry behavior; those behaviors are out of scope for this POC.

**Commit:** `git commit -m "replace runtime schema and storage"`

### Task 2: Implement Coach Operations
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/schema.ts`, `src/storage.ts`, `tests/coach.test.ts`

**Work:**
- Implement `validateWorkflowRoot`, `startRun`, `getState`, `stepRun`, `suspendRun`, `resumeRun`, and `abandonRun`.
- Enforce one focused run: `startRun` fails while another run is focused.
- Return `no_focused_run` from `getState` when `current.json` is absent or focused run is null.
- Validate node output against minimal JSON Schema support: object `required`, property `type`, and string `enum` are enough for the POC.
- Advance by equality conditions against top-level output fields and unconditional edges.
- Mark runs `completed` when they reach a terminal node.
- Append transition log entries for `start`, `step`, `suspend`, `resume`, and `abandon`.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +3 in `tests/coach.test.ts`; focused (<30s) — covers lifecycle, branching, and validation failure.

**Test Pruning:**
- Remove stale tests whose only supported behavior was old auto-init, free-entry, subgraph, or transcript semantics.

**Commit:** `git commit -m "implement focused coach operations"`

### Task 3: Replace The Reference CLI
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/cli.ts`, `bin/ripplegraph`, `tests/cli.test.ts`

**Work:**
- Replace old `state`, `step`, `validate`, and `init` command wiring with POC commands: `validate`, `start`, `state`, `step`, `suspend`, `resume`, and `abandon`.
- Emit JSON for all successful and failed commands.
- Parse `--workflow-root`, `--graph`, `--run-id`, `--output`, `--note`, and `--reason`.
- Keep the CLI thin: all behavior goes through `src/coach.ts`.

**Verify:**
- `npm test -- tests/cli.test.ts`

**Test Budget:** +1 in `tests/cli.test.ts`; focused (<30s)

**Test Pruning:**
- Replace CLI tests that assert old command flags such as `--exec-used`, `--confirm`, or auto-init state.

**Commit:** `git commit -m "replace reference cli"`

### Task 4: Refresh Example And Docs
**Mode:** lightweight
**Skills:** []
**Files:** `examples/minimal/workflow.json`, `README.md`, remove stale example node folders if unused

**Work:**
- Replace the old example with a single-file multi-graph example containing at least `daily-execution` and `mockcopy-backtest`.
- Update the README quick start to show `start`, `state`, `step`, `suspend`, `resume`, and `abandon`.
- Remove instructions that imply state auto-initializes or that nodes load `instruction.md`/`schema.ts`.

**Verify:**
- `rg "exec-used|pending_confirmation|free_entries|workflow.jsonc|instruction.md|schema.ts" README.md examples src tests`

**Test Budget:** +0; text-only

**Test Pruning:**
- Remove stale example files that no longer participate in the POC.

**Commit:** `git commit -m "refresh poc example and docs"`

### Task 5: Final Verification And Build Artifacts
**Mode:** standard
**Skills:** verification-before-completion
**Files:** `dist/**`, `package.json` only if scripts need adjustment

**Work:**
- Run the full verification sequence.
- Rebuild `dist/` via `npm run build`; do not hand-edit generated files.
- Inspect `git diff` for unrelated churn and stale generated files.

**Verify:**
- `npm run build`
- `npm test`
- Manual CLI smoke in a temporary copy of `examples/minimal`

**Test Budget:** +0; final verification only

**Test Pruning:**
- If full test run shows obsolete old-behavior tests, remove or replace them rather than preserving unsupported behavior.

**Commit:** `git commit -m "verify coach runtime poc"`

