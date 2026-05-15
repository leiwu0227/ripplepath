# Design — `ripplegraph-demo` reference consumer CLI

## Overview

Assignment 5 builds a reference consumer CLI named `ripplegraph-demo`. The core `ripplegraph` command remains the low-level JSON/runtime interface. `ripplegraph-demo` sits one layer above it and shows how a domain CLI can guide a host agent through the same workflow with compact, readable output and safer defaults.

The immediate motivation comes from the assignment 4 manual tests. Claude Code and a weaker agent could drive the POC, including start, state, step, suspend, resume, and terminal completion. The weak spots were not the runtime model; they were ergonomics: verbose JSON, repeated `--workflow-root .`, raw shell JSON quoting, manual run discovery, and root-level runtime files (`current.json`, `runs/`) that should not live beside project source.

This assignment should keep the scope small. It should prove the reference CLI pattern and the `.ripplegraph/` state layout without expanding graph semantics.

## Goals

- Add a second package binary: `ripplegraph-demo`.
- Keep `ripplegraph` as the canonical low-level JSON CLI.
- Move runtime state behind a state directory abstraction, defaulting to `.ripplegraph/`.
- Preserve compatibility with existing assignment 4 root-level test state only where cheap, but favor the new layout.
- Provide compact commands for weak agents:
  - `status`
  - `runs`
  - `start <graph-id> --run <run-id>`
  - `pause [note]`
  - `resume <run-id>`
  - `submit <json-or-file>`
- Render current node instructions and output requirements in concise text.
- Add a coach-level run listing API so consumer CLIs can inspect run summaries without reading checkpoints directly.
- Update templates so host agents can prefer `ripplegraph-demo` while still knowing `ripplegraph` exists for debugging.
- Add tests and a fresh manual smoke path that prove a weak agent can use the friendlier surface.

## Non-Goals

- No SpecDev, Oceanlive, or Oceanshed product CLI in this assignment.
- No graph authoring UX.
- No latches, subgraphs, capabilities, or wiki/history indexing.
- No database.
- No concurrent focused runs.
- No full backwards-compatibility migration for old root-level `current.json` and `runs/`.
- No npm publishing work.
- No attempt to hide the core JSON CLI; it remains useful for debugging and automation.

## Design

The core runtime should gain a configurable state directory. Instead of writing this in the workflow root:

```text
current.json
runs/
```

new runs should use:

```text
.ripplegraph/
  current.json
  runs/
    <run-id>/
      checkpoint.json
      transition-log.jsonl
      artifacts/
```

The workflow definition stays visible and committable:

```text
workflow.json
CLAUDE.md
.ripplegraph/
```

The implementation should avoid duplicating runtime logic. `ripplegraph-demo` should call the same TypeScript coach APIs used by `ripplegraph`, not shell out to the low-level CLI and not read checkpoint files directly for normal behavior. The lower storage layer should own state path resolution so both CLIs agree about the filesystem contract.

To support compact status and run-list output, the coach layer should expose a public run summary operation:

```ts
listRuns({ workflowRoot }): {
  status: 'ok';
  workflow: { id: string; version: string };
  focusedRunId: string | null;
  runs: Array<{
    id: string;
    status: 'active' | 'suspended' | 'completed' | 'abandoned';
    rootGraph: string;
    position: { graph: string; node: string };
    updatedAt: string;
  }>;
}
```

`getState` may continue returning only the narrower `resumableRuns` list, or it may reuse the same summary shape if that keeps the implementation simpler. The important boundary is that `ripplegraph-demo status` and `ripplegraph-demo runs` get run position data from the coach API rather than becoming a separate storage reader.

The low-level `ripplegraph` CLI should continue emitting JSON. Its behavior may switch to `.ripplegraph/` by default, with an option or helper path for tests. `ripplegraph-demo` should render text such as:

```text
Current run: weak-daily-1
Graph: daily-execution
Node: review

Review generated intents
Inspect today's generated intents with the user and submit a decision.

Required output:
  decision: proceed | stop

Next:
  ripplegraph-demo submit '{"decision":"stop"}'
```

When there is no focused run, `status` should show available graphs and resumable runs:

```text
No focused run.

Available graphs:
  daily-execution
  mockcopy-backtest

Resumable runs:
  weak-mock-1  suspended  mockcopy-backtest  plan

Next:
  ripplegraph-demo start daily-execution --run weak-daily-1
  ripplegraph-demo resume weak-mock-1
```

`submit` should accept inline JSON and, if simple to implement, `--file <path>`. The file option reduces shell quoting pain without inventing an interactive editor.

## Key Decisions

- `ripplegraph-demo` is a reference consumer CLI, not the official replacement for `ripplegraph`.
- `.ripplegraph/` is the runtime state directory. It should be easy to ignore in Git while keeping `workflow.json` committed.
- Run discovery belongs in the coach API, not in demo CLI filesystem parsing.
- The demo CLI should be deliberately generic. It may be friendly, but it should not contain Oceanlive or SpecDev domain language.
- Run naming remains caller supplied. The demo CLI may suggest examples but should not impose a naming scheme yet.
- The CLI should prefer readable text output over JSON, because its purpose is agent/human ergonomics. The core CLI remains the machine JSON path.

## Success Criteria

- `package.json` exposes both `ripplegraph` and `ripplegraph-demo`.
- A fresh workflow root stores runtime state under `.ripplegraph/`.
- The coach API exposes run summaries with run id, status, root graph, position, and focused run id.
- `ripplegraph-demo status` clearly shows focused run, current node, required output, available graphs, and resumable runs as applicable.
- A weak agent can complete the same daily-execution and mockcopy-backtest flows using `ripplegraph-demo` commands.
- Existing coach tests pass, with updates for the new state directory.
- New CLI tests cover `status`, `runs`, `start`, `pause`, `resume`, and `submit`.
- `npm pack --dry-run` includes the demo binary and updated templates.

## Testing Approach

Use unit/integration tests around the coach/storage boundary to verify `.ripplegraph/` path behavior. Add CLI tests for the demo command using temporary workflow roots and built-in minimal templates. Keep one manual smoke script or documented flow that mirrors the weak-agent test:

```text
status -> start daily -> submit stop -> start mockcopy -> submit plan -> runs
```

Before completion, verify:

```sh
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Manual verification should also check that no root-level `current.json` or `runs/` are created in a fresh test project.

## Risks

The main risk is letting the demo CLI become a second runtime. Mitigate this by routing all state transitions through the existing coach APIs and limiting `ripplegraph-demo` to argument parsing plus rendering.

Another risk is breaking assignment 4 examples too abruptly. That is acceptable if the templates and README are updated together, but tests should make the new layout explicit.
