# Design — minimal Coach runtime proof of concept

## Overview

Assignment 4 is a proof of concept for ripplegraph as a small Coach runtime. It should be a breaking-change rewrite if that is the fastest path. The prototype only needs to prove the core loop:

```text
workflow package -> start run -> focused state -> step -> persisted checkpoint/log
                 -> suspend -> resume another run -> continue
```

The POC should be useful enough for assignment 5 to build a tiny consumer CLI on top and manually test the host-agent feel. It should not try to implement the full architecture from `00004_thoughts_v1.md`.

## Goals

- Support a workflow package with multiple named root graphs.
- Support one focused run per workflow root via `current.json`.
- Persist every run under `runs/<run-id>/`.
- Return canonical structured JSON from `state`; no domain prose in core.
- Validate and advance simple node outputs through `step`.
- Append a `transition-log.jsonl` entry for lifecycle and step operations.
- Implement lightweight `suspend`, `resume`, and `abandon`.
- Keep run IDs opaque and caller supplied for the prototype.
- Include enough tests and an example workflow to prove the model.

## Non-Goals

- No Wiki implementation or historical indexing.
- No custom consumer CLI in this assignment; that is assignment 5.
- No prose renderer beyond a reference CLI that emits JSON.
- No graph migration framework.
- No concurrent focused runs.
- No subgraph composition in the POC unless it is trivial to preserve existing code.
- No latch/rewind implementation.
- No capabilities/side actions implementation.
- No script-node executor unless existing code makes it essentially free.
- No compatibility with the current workflow schema or CLI behavior.

## Proposed CLI Surface

The POC reference CLI should expose:

```bash
ripplegraph validate --workflow-root <path>
ripplegraph start --graph <graph-id> --run-id <id> [--workflow-root <path>]
ripplegraph state [--workflow-root <path>]
ripplegraph step --output '<json>' [--workflow-root <path>]
ripplegraph suspend [--note <text>] [--workflow-root <path>]
ripplegraph resume --run-id <id> [--workflow-root <path>]
ripplegraph abandon [--reason <text>] [--workflow-root <path>]
```

All commands should emit JSON. The reference CLI may stay intentionally plain because target consumers will render their own domain instructions.

`start` should fail if another run is focused, unless the caller suspends or abandons it first. This preserves the one-focused-run invariant and keeps `state` unambiguous.

## Workflow Package Shape

Use one canonical runtime format for the POC: a single `workflow.json`. The design note allows a future `workflow/graphs/*.json` layout, but supporting both in assignment 4 would add loader/test surface without improving the proof.

Sketch:

```json
{
  "id": "demo",
  "version": "0.1.0",
  "graphs": {
    "daily-execution": {
      "entry": "review",
      "nodes": {
        "review": {
          "purpose": "Review generated intents",
          "instructions": "Inspect the generated intents and submit a decision.",
          "exec": "inline",
          "outputSchema": {
            "type": "object",
            "required": ["decision"],
            "properties": {
              "decision": {"type": "string", "enum": ["proceed", "stop"]}
            }
          },
          "edges": [
            {"to": "execute", "when": {"decision": "proceed"}},
            {"to": "done", "when": {"decision": "stop"}}
          ]
        },
        "execute": {
          "purpose": "Record execution result",
          "instructions": "Submit the execution summary.",
          "exec": "inline",
          "outputSchema": {"type": "object"},
          "edges": [{"to": "done"}]
        },
        "done": {
          "purpose": "Run complete",
          "terminal": true
        }
      }
    }
  }
}
```

Keep condition support minimal. Equality checks against top-level output fields are enough for the POC. A node with one unconditional edge advances to that edge. A terminal node completes the run.

## Runtime Files

Workflow root:

```text
workflow.json
current.json
runs/
  <run-id>/
    checkpoint.json
    transition-log.jsonl
    artifacts/
      <node-id>/
        output.json
    scratch/
```

`current.json`:

```json
{
  "focusedRunId": "daily_2026-05-15"
}
```

No focused run:

```json
{
  "focusedRunId": null
}
```

`checkpoint.json` should include:

```json
{
  "runId": "daily_2026-05-15",
  "status": "active",
  "rootGraph": "daily-execution",
  "workflow": {"id": "demo", "version": "0.1.0"},
  "position": {"graph": "daily-execution", "node": "review"},
  "createdAt": "2026-05-15T00:00:00.000Z",
  "updatedAt": "2026-05-15T00:00:00.000Z",
  "outputs": {}
}
```

Persisted statuses:

```text
active | suspended | completed | abandoned
```

Blocked/error states should be computed and returned by commands rather than persisted as lifecycle statuses.

## Canonical State Output

`state` should return a canonical object suitable for consumer renderers:

```json
{
  "status": "ok",
  "workflow": {"id": "demo", "version": "0.1.0"},
  "run": {"id": "daily_2026-05-15", "status": "active", "rootGraph": "daily-execution"},
  "position": {"graph": "daily-execution", "node": "review"},
  "node": {
    "id": "review",
    "purpose": "Review generated intents",
    "instructions": "Inspect the generated intents and submit a decision.",
    "exec": "inline",
    "outputSchema": {}
  },
  "context": {
    "previous": [],
    "next": [{"id": "execute", "purpose": "Record execution result"}],
    "latches": [],
    "capabilities": []
  },
  "responseContract": {
    "command": "step",
    "acceptedFormats": ["json"]
  }
}
```

When no run is focused, return:

```json
{
  "status": "no_focused_run",
  "workflow": {"id": "demo", "version": "0.1.0"},
  "availableGraphs": ["daily-execution", "mockcopy-backtest"],
  "resumableRuns": []
}
```

## Transition Log

Every lifecycle operation writes one JSON line to `transition-log.jsonl`.

Entry shape:

```json
{
  "ts": "2026-05-15T00:00:00.000Z",
  "op": "step",
  "runId": "daily_2026-05-15",
  "from": {"graph": "daily-execution", "node": "review"},
  "to": {"graph": "daily-execution", "node": "execute"},
  "actor": "agent",
  "input": {"artifact": "artifacts/review/output.json"},
  "output": {"artifact": "artifacts/review/output.json"},
  "validation": {"ok": true},
  "gateDecision": null,
  "reason": null,
  "error": null
}
```

Operations for the POC:

```text
start | step | suspend | resume | abandon
```

`abandon` should keep status minimal but preserve reason in the log.

## Implementation Approach

Prefer deleting/replacing existing runtime modules over adapting them. The current code has useful tests and concepts, but the architecture changed enough that a small clean runtime is lower risk than preserving the old free-entry/subgraph machinery.

Recommended module shape:

```text
src/schema.ts          workflow/checkpoint/state types and Zod schemas
src/storage.ts         filesystem read/write helpers
src/coach.ts           start/state/step/suspend/resume/abandon operations
src/cli.ts             thin JSON CLI
src/index.ts           public exports
```

Tests can start with:

```text
tests/coach.test.ts
tests/cli.test.ts
```

The existing `dist/` output should be rebuilt by `npm run build`; do not hand-edit generated files.

## Success Criteria

1. `npm run build` passes.
2. `npm test` passes.
3. An example workflow can start two different runs from two different graphs.
4. `state` returns the focused run only.
5. `step` writes node output, advances position, updates checkpoint, and appends the transition log.
6. `suspend` clears focus and marks the run suspended.
7. `resume` focuses a suspended run and returns it to active.
8. `abandon` clears focus, marks the run abandoned, and records a reason in the transition log.
9. Assignment 5 can build a tiny custom CLI by importing the Coach API or shelling to the reference CLI.

## Risks

- Supporting two workflow package layouts too early will slow down the POC. Use one `workflow.json` runtime format.
- Reusing the old runtime may preserve stale assumptions. Prefer a clean cut.
- Overbuilding schema validation can distract from the core run/focus model. Validate enough to reject malformed workflows and node outputs.
- Deferring latches/capabilities means Oceanlive is not fully covered yet, but the POC should leave obvious extension points in the state object.

## Open Questions

1. Should `start` auto-generate a run ID when `--run-id` is omitted, or require caller-supplied IDs for the POC?
2. Should the public API return rich result objects only, or throw typed errors for invalid operations?
3. Should output validation use JSON Schema directly for the POC, or Zod schemas compiled/embedded from consumers later?

