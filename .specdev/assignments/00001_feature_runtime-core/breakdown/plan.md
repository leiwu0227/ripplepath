# ripplegraph runtime-core Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Ship a working two-command graph runtime (`state` + `step`) that drives a stub host end-to-end through a multi-step, multi-subgraph workflow with schema validation, modal entries, and per-step JSON checkpointing.

**Architecture:** A small TypeScript/Node CLI exposes `ripplegraph state` (read-or-init) and `ripplegraph step` (validate-and-transition). Graph definitions live as JSON/JSONC; node instructions as Markdown; node output schemas as Zod-exporting TS modules loaded via `tsx` at runtime. The CLI parses the graph, validates outputs at every transition, manages run state on disk under `runs/<run-id>/`, applies `inputMap`/`outputMap` at subgraph boundaries, and serves neighborhood + workflow-overview context to the host agent. No LLM SDK in the runtime — execution stays in the host.

**Tech Stack:** TypeScript, Node 20+ (ESM), Zod (peer), `jsonc-parser`, `zod-to-json-schema`, `tsx` (embedded TS loader for user schemas), Vitest for tests.

**Execution Mode:** inline

**Test Budget:** 5 new test **files** (one per isolated module: parser, state-store, neighborhood, free-entry, E2E), with up to ~7 `it()` cases per file — each case covers a distinct error path or success contract that warrants a named diagnostic. Aggregate cap ≤ 35 `it()` cases. Justification for going over the default `+1 per task`: a v0 runtime parser/state-store/etc. has multiple distinct failure modes (missing file, schema mismatch, cyclic ref, dangling pointer, etc.) and consolidating into single tests would lose the diagnostic value of named assertions. Composing CLI commands (`state`, `step`) and the state-mapping evaluator remain test-budget-free — covered transitively by the E2E.

---

### Task 1: Project scaffolding
**Mode:** lightweight
**Skills:** []
**Files:** `package.json`, `tsconfig.json`, `bin/ripplegraph`, `src/index.ts`, `.gitignore`, `README.md`, `vitest.config.ts`

**Work:**
- `package.json`: `name: "ripplegraph"`, `type: "module"`, `bin: { ripplegraph: "./bin/ripplegraph" }`, peer `zod` (`^3.25 || ^4`), deps `jsonc-parser`, `zod-to-json-schema`, `tsx`, devDeps `typescript`, `vitest`, `@types/node`
- `tsconfig.json`: Node 20+ ESM, `strict`, `moduleResolution: bundler`, output to `dist/`
- `bin/ripplegraph`: shim that delegates to compiled `dist/cli.js`
- `src/index.ts`: empty exports placeholder
- `vitest.config.ts`: Node environment, no coverage for v0
- `.gitignore`: `node_modules`, `dist`, `runs/`, `*.log`
- `README.md`: one-paragraph intro + install/usage stub
- No template content yet — that lives in Task 13

**Verify:**
- Text-only: `npm install` completes; `tsc --noEmit` clean against empty placeholders; `cat package.json | jq .` succeeds

**Test Budget:** +0; text-only
**Test Pruning:** N/A
**Commit:** `git commit -m "scaffold ripplegraph package and tooling"`

---

### Task 2: Graph and run-state types + Zod schemas
**Mode:** standard
**Skills:** []
**Files:** `src/graph/types.ts`, `src/graph/schema.ts`, `src/runtime/state-schema.ts`

**Work:**
- `types.ts`: TypeScript types for the parsed graph IR — `ParsedGraph`, `WorkNode`, `SubgraphRef`, `Edge`, `FreeEntry`, `NodeRef` (discriminated union), `MapExpr` (the `$.path.to.value` mapping shape used by `inputMap`/`outputMap`); plus runtime types `RunState`, `ActiveRunPointer`, `StackFrame`, `PendingConfirmation`
- `schema.ts`: Zod schemas (`.strict()`) for `workflow.json`:
  - `workNodeSchema`: `{ id, exec: 'inline'|'spawn', node, purpose (required string), role_in_graph?, max_retries? }`
  - `subgraphRefSchema`: `{ id, ref, inputMap: Record<string, MapExpr>, outputMap: Record<string, MapExpr>, purpose (required) }`
  - `edgeSchema`: `{ from, to, when?: string }` — `when` is a JavaScript boolean expression (see Edge expressions below)
  - `freeEntrySchema`: `{ id, target, description, mode: 'modal'|'replace' }`
  - `workflowSchema`: `{ version, goal: string, nodes: NodeRef[], edges: Edge[], entries?: FreeEntry[] }` with refinements: each node is exactly one shape (work or ref), all `edge.from`/`edge.to` ids exist, all `entry.target` ids exist, START/END markers (`__start__`, `__end__`) are reserved
  - **`purpose` is required** on every node — neighborhood generator falls back on `id` only if absolutely missing, but the schema rejects missing-purpose at validation time
- `state-schema.ts`: Zod schema for `state.json` — `{ run_id, workflow_path, current: { path, attempt }, outputs, subgraphs, stack, pending_confirmation? }`. Used at load time (Task 4) to detect corruption.
- **Edge expressions**: `when` is a JS boolean expression evaluated as `new Function('state', \`return (${when});\`)(state)`. State is the only injected identifier. User-authored; not sandboxed beyond function-scoping. Document this in a `// EDGE EXPRESSIONS:` comment block at the top of `schema.ts`.
- **MapExpr**: A string starting with `$.` plus dot-separated keys. e.g. `"$.outputs.brainstorm.proposal"`. Trivial getter, no transform support in v0. Schema validates the format with a regex.

**Verify:**
- Text-only: `tsc --noEmit`; schemas exhaustive against design.md's node-shape and state-shape sections

**Test Budget:** +0; exercised by parser test (Task 3) and state-store test (Task 4)
**Test Pruning:** N/A
**Commit:** `git commit -m "graph and run-state types with zod schemas"`

---

### Task 3: Graph parser + ref resolver
**Mode:** full
**Skills:** [test-driven-development]
**Files:** `src/graph/parse.ts`, `tests/unit/parse.test.ts`

**Work:**
- `parseGraph(rootPath)`: reads `<rootPath>/workflow.json` (or `.jsonc`) via `jsonc-parser`, validates against `workflowSchema` from Task 2
- For each work node, resolve `node` to an absolute folder path; verify the folder exists with `instruction.md` + `schema.ts` present (presence only — loading is Task 5)
- For each subgraph ref, recursively parse the referenced subgraph; refs are relative to the parent graph's directory
- Detect cycles in the ref tree (DFS with visited-stack); reject with a clear error naming the cycle
- Return a fully-resolved `ParsedGraph` tree with absolute paths everywhere
- Distinct named error types: `MissingWorkflowError`, `InvalidWorkflowError` (with Zod path), `MissingNodeFolderError`, `MissingSubgraphError`, `CyclicRefError`

**Verify:**
- Run: `vitest run tests/unit/parse.test.ts`
- Test exercises: valid graph (nested 2 levels) parses; missing `workflow.json` errors; schema-invalid graph errors with field path; cyclic ref tree rejected; node folder without `schema.ts` rejected

**Test Budget:** +1 file (~7 cases) in `tests/unit/parse.test.ts`; focused (<30s)
**Test Pruning:** N/A
**Commit:** `git commit -m "graph parser with ref resolver and cycle detection"`

---

### Task 4: State store + run lifecycle
**Mode:** full
**Skills:** [test-driven-development]
**Files:** `src/runtime/state-store.ts`, `tests/unit/state-store.test.ts`

**Work:**
- `loadOrInitRun(rootPath, parsedGraph)`: implements the run-lifecycle from design.md §Run lifecycle
  - If `<root>/runs/active.json` exists → load referenced run dir, parse `state.json` via the state Zod schema (Task 2), return `{ state, runId }`
  - Else → generate ISO-8601 timestamp run-id; create `<root>/runs/<run-id>/`; write initial `state.json` with `current.path = [graph.root, __start__]`, `attempt = 0`, empty `outputs`/`subgraphs`/`stack`; write `active.json` pointing to it; return fresh `{ state, runId }`
- `writeState(rootPath, runId, state)`: atomic — `writeFile state.json.tmp`, `rename` to `state.json`
- `readState(rootPath)`: load through active.json indirection; surface `DanglingActiveError` if `active.json` references a non-existent run dir
- Named errors: `MissingWorkflowError` (delegate), `InvalidStateError` (Zod), `DanglingActiveError`

**Verify:**
- Run: `vitest run tests/unit/state-store.test.ts`
- Test exercises: first call creates run + active.json + state.json + transcript.md (empty); subsequent call loads existing run; atomic write leaves no `.tmp` on success; dangling active.json surfaces corruption error; invalid state.json surfaces schema error

**Test Budget:** +1 file (~7 cases) in `tests/unit/state-store.test.ts`; focused (<30s)
**Test Pruning:** N/A
**Commit:** `git commit -m "state store with run lifecycle and atomic writes"`

---

### Task 5: Node resolver (instruction + schema.ts loader)
**Mode:** standard
**Skills:** []
**Files:** `src/node/resolver.ts`

**Work:**
- `resolveWorkNode(nodeFolderPath)`: reads `instruction.md` (string); loads `schema.ts` via `tsx` programmatic API; extracts `input` and `output` exports (Zod schemas)
- **Enforce** that `output` is a `z.object` and that its shape includes a `handoff_summary` field constrained to `z.string().min(40).max(500)` — inspect the schema's `_def` to confirm bounds; reject otherwise with a clear error
- Memoize loaded schemas per resolver instance (avoid re-loading on each `state` call within the same process invocation)
- Named errors: `MissingNodeAssetError`, `InvalidSchemaModuleError`, `MissingHandoffSummaryError`, `HandoffSummaryBoundsError`

**Verify:**
- Text-only: compiles; trace bound-check logic against `z.string().min(40).max(500)` introspection
- Covered by E2E in Task 16

**Test Budget:** +0; covered by E2E
**Test Pruning:** N/A
**Commit:** `git commit -m "node resolver with handoff_summary bound enforcement"`

---

### Task 6: Transcript log
**Mode:** lightweight
**Skills:** []
**Files:** `src/runtime/transcript.ts`

**Work:**
- `appendEvent(rootPath, runId, event)`: append a Markdown entry to `<root>/runs/<runId>/transcript.md` (ISO timestamp + event-type heading + body)
- Event type vocabulary: `run_created`, `state_read`, `step_submitted`, `validation_failed`, `transition`, `subgraph_entered`, `subgraph_exited`, `entry_proposed`, `entry_confirmed`, `entry_rejected`, `exec_audit`
- Open in `a+` mode; write-only — never read or parse the transcript

**Verify:**
- Text-only: compiles; event vocabulary covers every event called from Tasks 4, 8, 11, 12
- Covered by E2E in Task 16

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "append-only transcript log"`

---

### Task 7: Neighborhood + workflow overview generator
**Mode:** full
**Skills:** [test-driven-development]
**Files:** `src/runtime/neighborhood.ts`, `tests/unit/neighborhood.test.ts`

**Work:**
- `generateOverview(parsedGraph, currentPath)`: workflow-overview block — north-star goal + top-level node list (id, purpose, kind), subgraph goals one level deep, "you are here" marker located by `currentPath`
- `generateNeighborhood(parsedGraph, currentPath, state)`: prior ~2 nodes (id + purpose + full output including `handoff_summary`) + next ~2 nodes (id + purpose only) + parent subgraph goal + breadcrumb + current attempt count
- Both walk the parsed-graph tree using `currentPath` (e.g. `["root","brainstorm","explore"]`) to locate position
- Free-entry list assembled from the **active graph's** `entries` only (no inheritance in v0)
- Fall back to `id` for `purpose` only if missing (schema requires it; this is defensive)

**Verify:**
- Run: `vitest run tests/unit/neighborhood.test.ts`
- Test exercises: overview lists top-level nodes with subgraph goals; "you are here" marker correctly placed when inside a depth-1 subgraph; neighborhood includes prior outputs in full; next-nodes show purposes only; breadcrumb correct at depth 1 and 2; free entries only from active graph

**Test Budget:** +1 file (~7 cases) in `tests/unit/neighborhood.test.ts`; focused (<30s)
**Test Pruning:** N/A
**Commit:** `git commit -m "neighborhood and workflow overview generator"`

---

### Task 8: Free-entry proposals + modal stack
**Mode:** full
**Skills:** [test-driven-development]
**Files:** `src/runtime/free-entry.ts`, `tests/unit/free-entry.test.ts`

**Work:**
- `proposeJump(state, proposal, parsedGraph)`: validates `proposal.entry_id` exists in the active graph's `entries`; returns a `PendingConfirmation` marker (with a generated `proposal_id`); writes it to `state.pending_confirmation`. Step output transitions are **paused** while pending.
- `confirmJump(state, proposal_id, decision, parsedGraph)`:
  - `decision === 'approved'` → look up the entry; if `mode: 'modal'` → push `{ path: state.current.path, attempt: state.current.attempt }` onto `state.stack`, set `state.current.path` to entry target, reset attempt; if `mode: 'replace'` → discard the current frame, set `state.current.path` to entry target
  - `decision === 'rejected'` → no-op (clear `pending_confirmation`)
- **Depth cap**: a `modal` jump when `state.stack.length >= 2` returns a structured error
- `popFrame(state)`: on subgraph END inside a modal frame, pops the top frame restoring `current.path` and `attempt`. If no frame, signals workflow-complete.
- This module owns state transitions only; the CLI layer (Tasks 11/12) handles the user-facing prompt protocol.

**Verify:**
- Run: `vitest run tests/unit/free-entry.test.ts`
- Test exercises: modal push then pop restores original `current.path` and `attempt`; replace discards stack; depth-2 cap rejects third modal push; invalid entry id rejected; rejected decision clears `pending_confirmation` without state change

**Test Budget:** +1 file (~7 cases) in `tests/unit/free-entry.test.ts`; focused (<30s)
**Test Pruning:** N/A
**Commit:** `git commit -m "free-entry proposals and modal stack"`

---

### Task 9: State mapping (inputMap / outputMap evaluator)
**Mode:** standard
**Skills:** []
**Files:** `src/runtime/state-mapping.ts`

**Work:**
- `evalMapExpr(state, expr)`: evaluates a `MapExpr` of the form `$.a.b.c` against a state object using simple dot-key traversal; returns `undefined` for missing paths (callers handle the error)
- `applyInputMap(parentState, subgraphInputMap)`: for each `{ key: expr }` pair, evaluate `expr` against `parentState` and seed the subgraph's initial state under `state.subgraphs.<node-id>.input.<key>`
- `applyOutputMap(subgraphState, outputMap, parentState, nodeId)`: for each `{ key: expr }`, evaluate `expr` against `subgraphState` and write the value to `parentState.outputs.<nodeId>.<key>`
- Used by the step command (Task 12) at subgraph entry and exit
- Reject missing-source-path errors with a `MapExprResolutionError` naming the bad expression

**Verify:**
- Text-only: compiles; trace evaluator against design.md's "Isolated per subgraph instance" section
- Covered by E2E in Task 16 (which exercises a subgraph with input/output mapping)

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "state mapping evaluator for inputMap and outputMap"`

---

### Task 10: Retry policy + exec audit
**Mode:** standard
**Skills:** []
**Files:** `src/runtime/retry.ts`, `src/node/executor.ts`

**Work:**
- `retry.ts`: `recordAttempt(state)` increments `state.current.attempt`; `shouldGateForRetry(state, node)` returns true when attempt > node's `max_retries` (default 3)
- `executor.ts`: `recordExecAudit(rootPath, runId, nodeId, declaredExec, execUsed)` writes an `exec_audit` event to transcript noting whether `execUsed` matched `declaredExec`. Mismatch is logged but not blocked in v0 (design says audit-only).

**Verify:**
- Text-only: compiles; behavior traceable against design.md's drift-containment section
- Covered by E2E in Task 16

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "retry policy and exec audit"`

---

### Task 11: CLI state command
**Mode:** standard
**Skills:** []
**Files:** `src/commands/state.ts`

**Work:**
- `runStateCommand(opts: { workflowRoot?: string })`:
  1. Resolve workflow root: if `workflowRoot` is absolute use as-is; if relative resolve against cwd; verify the resolved path contains `workflow.json` (else `MissingWorkflowError`)
  2. Parse the graph (Task 3)
  3. Load-or-init the active run (Task 4) — performs auto-init on first call
  4. Locate the current work node via the current path
  5. Resolve the work node (Task 5)
  6. Build overview + neighborhood (Task 7)
  7. Convert the output schema to JSON Schema via `zod-to-json-schema`
  8. If `state.pending_confirmation` is set, return a `pending_confirmation` response shape instead of the normal one (so the host can surface the question)
  9. Append `state_read` event to transcript (Task 6)
  10. Return JSON: `{ run_id, overview, neighborhood, instruction, output_schema, exec, attempt, free_entries }` or `{ pending_confirmation: { proposal_id, entry_id, reason, message } }`

**Verify:**
- Text-only: compiles; response shape matches the AGENT.md template documented in Task 13
- Covered by E2E in Task 16

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "cli state command with workflow-root resolution"`

---

### Task 12: CLI step command
**Mode:** standard
**Skills:** []
**Files:** `src/commands/step.ts`

**Work:**
- `runStepCommand(opts: { output?: unknown, execUsed?: 'inline'|'spawn', confirm?: string, decision?: 'approved'|'rejected', workflowRoot?: string })`:
  - **Free-entry confirmation branch** (when `confirm` is set): if `state.pending_confirmation` is absent OR `state.pending_confirmation.proposal_id !== confirm`, reject with a structured `NoMatchingProposalError` and leave state untouched. Else dispatch to `confirmJump` (Task 8) with `decision`; on approve apply modal/replace transition, clear `pending_confirmation`; on reject just clear it. Append the matching transcript event. Atomic-write state. Return the next state response (calling into Task 11's logic).
  - **Normal output branch** (when `output` is set): load active run; locate current node; validate `output` against the node's output schema (Task 5)
    - Validation failure: increment attempt (Task 10); if `shouldGateForRetry` → write a `user_gate_failure` response and stop; else write `validation_failed` event and return a structured retry-error response (so the host re-submits)
    - Validation success: record `exec_audit` (Task 10); write `output` to `state.outputs[node_id]`
    - If `output.proposed_jump` is present: dispatch to `proposeJump` (Task 8); set `pending_confirmation`; atomic-write; emit `entry_proposed` event; return a `pending_confirmation` response. **No transition until confirmed.**
    - Else: evaluate outgoing edges (use `new Function('state', \`return (${edge.when});\`)(state)` to pick the first matching edge; `when` absent ≡ default). Set new current node.
    - If the new current node is a subgraph ref: apply `inputMap` via state-mapping (Task 9); push subgraph path; emit `subgraph_entered`
    - If the current path's leaf is `__end__`: apply `outputMap` to parent's `state.outputs[<subgraph-node-id>]` (Task 9); pop the subgraph path; emit `subgraph_exited`; check for modal frame via `popFrame` (Task 8) and continue, OR signal workflow-complete if nothing remains
  - Atomic-write state at the end; emit `step_submitted` + `transition` events
  - Return: next state response, retry-error, pending-confirmation, or completion marker

**Verify:**
- Text-only: compiles; matches design.md's execution boundary + run lifecycle + free-entry sections
- Covered by E2E in Task 16

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "cli step command with validation, mapping, transitions, and confirm protocol"`

---

### Task 13: Template authoring + CLI validate + init commands
**Mode:** standard
**Skills:** []
**Files:** `templates/AGENT.md.tmpl`, `templates/workflow.json.tmpl`, `src/commands/validate.ts`, `src/commands/init.ts`

**Work:**
- `templates/AGENT.md.tmpl`: the canonical host-agent protocol document — sections for "Calling state", "Doing the work" (inline vs spawn — binding), "Submitting via step", "Handling validation failures", "Free-entry proposals (two-step confirm)", "Re-anchoring", with a `<!-- BEGIN workflow-specific guidance -->` / `<!-- END workflow-specific guidance -->` marker block reserved for consumer appendices. Treated as a contract, not boilerplate — write the protocol precisely against the design.
- `templates/workflow.json.tmpl`: minimal one-node starter with `goal`, one inline work node referencing a stub `nodes/start/` folder, a single edge to `__end__`
- `validate.ts`: `runValidateCommand(opts)` — runs the parser (Task 3) and resolves every work node (Task 5) to surface load errors early; prints "ok" or a structured error report
- `init.ts`: `runInitCommand(opts)` — copies both templates into the target directory (cwd by default); creates an empty `runs/` directory. `--update` flag rewrites the protocol section — everything **outside** the `<!-- BEGIN/END workflow-specific guidance -->` marker block — without touching the consumer's appendix between the markers.

**Verify:**
- Text-only: compiles; AGENT.md template covers every protocol facet from design.md
- Smoke: run `ripplegraph init` in a temp dir; `ripplegraph validate` reports ok

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "AGENT.md template, workflow template, validate and init commands"`

---

### Task 14: CLI argv dispatcher
**Mode:** lightweight
**Skills:** []
**Files:** `src/cli.ts`

**Work:**
- Handwritten argv parser (no `commander`/`yargs` dependency)
- Dispatch table: `state`, `step`, `validate`, `init` → call into Tasks 11/12/13
- Flag handling: `--workflow-root <path>`, `--output <json>`, `--exec-used inline|spawn`, `--confirm <id>`, `--decision approved|rejected`, `--update`
- Output: JSON to stdout, errors to stderr with non-zero exit
- `--help` prints command list and flags

**Verify:**
- Text-only: compiles; `ripplegraph --help` runs (after build)
- Smoke: `ripplegraph validate --workflow-root examples/minimal` exits 0 after Tasks 13 + 15 land

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "cli argv dispatcher and help"`

---

### Task 15: Worked example workflow
**Mode:** lightweight
**Skills:** []
**Files:** `examples/minimal/AGENT.md`, `examples/minimal/workflow.json`, `examples/minimal/nodes/<...>/instruction.md` + `schema.ts`, `examples/minimal/subgraphs/<...>/workflow.json` + nested nodes

**Work:**
- Design and author a small workflow that exercises every mechanic the v0 must prove:
  - Top-level graph with at least one subgraph node and one work node
  - The subgraph contains an `exec: inline` work node and an `exec: spawn` work node
  - Top-level declares at least one free-entry with `mode: 'modal'` pointing to a side-quest subgraph
  - One node where the stub host (Task 16) will return invalid output on first attempt, then a valid one — exercising schema retry
  - Subgraph uses non-trivial `inputMap` and `outputMap` (e.g. `inputMap: { topic: "$.outputs.kickoff.topic" }`, `outputMap: { proposal: "$.outputs.refine.proposal" }`)
- Author every `instruction.md` with short, focused prose
- Author every `schema.ts` with `.strict()` Zod schemas including mandatory `handoff_summary: z.string().min(40).max(500)`

**Verify:**
- Text-only: every node folder has both `instruction.md` and `schema.ts`; every output schema includes a properly-bounded `handoff_summary`
- Run `ripplegraph validate --workflow-root examples/minimal` — exits 0

**Test Budget:** +0
**Test Pruning:** N/A
**Commit:** `git commit -m "minimal worked example workflow"`

---

### Task 16: E2E test harness + minimal acceptance test
**Mode:** full
**Skills:** [test-driven-development]
**Files:** `tests/e2e/stub-host.ts`, `tests/e2e/minimal.e2e.test.ts`

**Work:**
- `stub-host.ts`: a deterministic stub host. Given a script of `{ expected_node_id, output, exec_used }` steps plus an optional `{ proposal_id, decision }` queue, it drives the workflow by repeatedly:
  1. Spawn `ripplegraph state` subprocess; parse JSON response
  2. If response is `pending_confirmation`, dequeue the next decision and call `ripplegraph step --confirm <id> --decision <approved|rejected>`
  3. Else assert the current `node_id` matches the script; call `ripplegraph step --output <json> --exec-used <mode>`
  4. On retry-error response, submit the scripted recovery output
  5. Loop until completion or timeout
- `minimal.e2e.test.ts`: vitest test that
  1. Creates a temp directory, copies `examples/minimal/` into it
  2. Drives the workflow via the stub host with a script covering every mechanic
  3. Asserts: final state is `complete`; `transcript.md` contains the expected sequence of event types in order; final `state.json` matches a snapshot; `inputMap` and `outputMap` carried values correctly across the subgraph boundary; the modal entry pushed/popped and returned to the original position

**Verify:**
- Run: `vitest run tests/e2e/minimal.e2e.test.ts`
- All assertions pass; transcript event log is replayable
- Final LOC check: `find src -name '*.ts' -print0 | xargs -0 wc -l` reports total within the ~500–700 target

**Test Budget:** +1 file (~7 cases) in `tests/e2e/minimal.e2e.test.ts`; focused (<2 min)
**Test Pruning:** N/A
**Commit:** `git commit -m "e2e test harness and minimal acceptance test"`

---

## Final Verification

After all tasks complete:
- `vitest run` — all 5 tests pass (parser, state-store, neighborhood, free-entry, E2E)
- `tsc --noEmit` — clean
- `ripplegraph validate --workflow-root examples/minimal` — exits 0
- Total LOC under `src/` within ~500–700 target (verify `find src -name '*.ts' -print0 | xargs -0 wc -l`)
- No LLM SDK dependency in `package.json`
