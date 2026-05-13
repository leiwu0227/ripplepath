## Overview

ripplegraph is a small, host-agent-driven workflow framework. A directed graph is
the deterministic skeleton of execution; nodes are units of agent work where
LLMs can freely explore within schema-validated boundaries; the CLI is the
runtime gatekeeper. The framework's value prop is drift containment — even when
LLM behavior drifts across models or sessions, the graph still owns control flow
and the CLI rejects any output that doesn't satisfy the contract.

This is the inverse shape of langgraph.js. There, the Node process owns the LLM
loop. In ripplegraph, the host agent owns the LLM loop; ripplegraph owns the state
machine and surfaces structured instructions and schemas to the host via two CLI
commands. This decoupling makes ripplegraph portable across host agents (Claude
Code, Codex, plain shell) and reusable across host CLIs (specdev-cli,
oceanshed-cli, oceanlive-cli, and future host-agent-driven CLIs).

## Goals

- Two-command CLI surface (`state`, `step`) sufficient to drive any workflow
- Graph as data: JSON / JSONC defines structure, Zod (TS) defines schemas,
  Markdown defines instructions
- Subgraph-as-node is the only composition primitive (unified node model — a
  leaf is a subgraph with one work node)
- Per-node binding `exec: inline | spawn` directive
- Universal mandatory `handoff_summary` field on every work-node output
- Isolated subgraph state with explicit `inputMap` / `outputMap`
- Neighborhood context on every `cli state` (north star, breadcrumb,
  prior/next outputs, available free entries) plus a workflow-overview block
  (top-level structure with current location marker)
- Free latch entries: LLM proposes, user confirms, modal default, stack depth
  cap = 2
- Per-`step` JSON checkpoint on disk; append-only transcript log
- Zod `.strict()` defaults; per-node retry cap (default 3)
- Worked example workflow that exercises every mechanic end-to-end
- ~500–700 LOC runtime; zero runtime LLM SDK dependency

## Non-Goals

- Multi-active-run support in the same workflow folder (one run at a time)
- Plugin loading mechanism (interfaces declared in code; only built-in
  implementations ship)
- Streaming, time travel, supervisor patterns
- Subgraph registry / npm resolver (filesystem-only refs)
- Real-LLM end-to-end integration tests (deterministic stub host instead)
- Migrating specdev / oceanshed / oceanlive (separate later assignments)
- Workflow visualizer (later enhancement)
- YAML parser (JSON / JSONC only)
- Performance optimization

## Design

### CLI surface

Two commands, irreducible:

| Command | Purpose |
|---|---|
| `ripplegraph state` | Read or initialize. If an active run exists, returns its current state (workflow overview, neighborhood context, instruction, output schema, `exec` mode, available free entries, attempt count). If no active run exists, auto-creates one from `workflow.json` and returns the initial state. Idempotent — safe to re-call mid-node for re-anchoring. Accepts optional `--workflow-root <path>` when the host is not running in the workflow's cwd. |
| `ripplegraph step --output <json> --exec-used <mode>` | Submit the host agent's validated output. Atomic: validate against schema → write to state → evaluate outgoing edge → checkpoint → return next state. Also handles `proposed_jump` payloads for free-entry transitions (always user-confirmed). |

A third command, `ripplegraph init`, is part of v0 scope: it writes the
templated `AGENT.md` and scaffolds the user-facing folder. It is not part of the
runtime protocol.

Every other concept (resume, history, jump) collapses into one of the above or
is implicit in their inputs/outputs.

### Graph format

`workflow.json` (or `.jsonc` for inline comments) at each graph's root.
Validated by a Zod schema for the graph itself. Two mutually exclusive node
shapes:

- **Work node** — `{ id, exec, node, purpose?, role_in_graph?, max_retries? }`.
  `exec: 'inline' | 'spawn'` is **required and binding** — the host must honor
  it. `node:` points to a node folder (see Node folder layout below).
- **Subgraph node** — `{ id, ref, inputMap, outputMap }`. `ref:` points to a
  subgraph folder containing its own `workflow.json` and content.

Edges are declared with deterministic expressions over validated state (no LLM
in the loop). Free entries are declared as a graph-level list with
`mode: 'modal' | 'replace'`.

At the model level there is only one primitive (the graph); a "leaf" is a
subgraph with one work node. **Cross-graph reuse goes through subgraphs**: if a
node is needed in multiple workflows, it is promoted to a single-work-node
subgraph with explicit interface schemas.

### Node folder layout

Every work node is a folder:

```
nodes/<name>/
  instruction.md       # required — prose surfaced to the host agent
  schema.ts            # required — exports `input` and `output` Zod schemas
  scripts/             # optional — deterministic helpers the node invokes
  templates/           # optional — fillable templates the agent uses
  examples/            # optional — few-shot exemplars
```

This matches specdev's `skills/` pattern. Trivial nodes carry only
`instruction.md` + `schema.ts`; complex nodes can grow auxiliary content
without changing the reference shape.

### State model

- **Isolated per subgraph instance**. Parent sees only
  `state.outputs.<node-id>` (the subgraph's declared output via `outputMap`).
- **Subgraph internal state** lives in `state.subgraphs.<node-id>.*`, invisible
  to parent edges. Pure encapsulation.
- **Modal entry** pushes a stack frame; pops back to the original position on
  END. Stack depth capped at 2.

### Run lifecycle

Run creation is implicit and owned by the CLI — the host never has to track
whether a run exists. The rule, applied by `ripplegraph state` on every call:

1. Resolve the workflow root (cwd by default, or `--workflow-root <path>`)
2. If `<root>/runs/active.json` exists:
   - Load the referenced run directory
   - Read its `state.json` and return the current state response
3. If `<root>/runs/active.json` does not exist:
   - Read `<root>/workflow.json` (parse + validate via the graph Zod schema)
   - Generate a new `run_id` (timestamp-based, e.g. `2026-05-13T08-42-15Z`)
   - Create `<root>/runs/<run_id>/`
   - Write the initial `state.json` (current node = graph's START)
   - Write `<root>/runs/active.json` pointing to the new run
   - Write the first entry in `<root>/runs/<run_id>/transcript.md`
   - Return the initial state response

This auto-init rule keeps the protocol surface at exactly two commands. The
host's contract — "call `state`, do work, call `step`, repeat" — has no special
first-call ritual. The lifecycle is the CLI's responsibility.

Errors are explicit:
- No `workflow.json` at the workflow root → fail with a clear "no workflow
  found at <root>; run `ripplegraph init` first" message
- Invalid `workflow.json` → fail with a Zod validation error pointing to the
  offending field
- `active.json` references a missing run directory → fail with a corruption
  warning; recovery is a separate operational concern (out of scope for v0)

`ripplegraph init` (the file-scaffolding management command) is distinct and
unchanged: it writes `AGENT.md`, a starter `workflow.json`, and an empty
`runs/` directory. It does not create a run; the first `cli state` does.

### Execution boundary

1. Host calls `ripplegraph state` → receives workflow overview + neighborhood +
   instruction + schema + `exec` mode + free entries + attempt count
2. Host does the work:
   - `exec: inline` → in its own context
   - `exec: spawn` → via its Task / sub-agent primitive (binding directive; host
     errors out if it cannot comply)
3. Host calls `ripplegraph step --output <json> --exec-used <mode>` → CLI
   validates against schema, writes state, applies edge, transitions, returns
   the next state response
4. On schema failure: retry up to `max_retries`, then escalate to user gate
5. Every event recorded in append-only `transcript.md`

### Workflow overview (always-on)

Every `cli state` response includes a one-level overview:

- Workflow north-star goal sentence
- Top-level node list: id, purpose, kind (work or subgraph)
- For subgraph nodes, their goal sentence (one level deep, no internals)
- "You are here" marker
- Available free entries (id + description + mode)

One level deep is the cap. Incremental reveal of deeper layers is a future
feature — the v0 invariant is the LLM never reasons about flow control inside
unrevealed subgraphs.

### Neighborhood context

Served on every `cli state` alongside the overview:

- Prior ~2 nodes (full output, including their `handoff_summary`)
- Next ~2 nodes (id + purpose only)
- Parent subgraph goal + breadcrumb path
- Current attempt count (for retry awareness)

### Free entries

- Declared at graph level with `mode: 'modal' | 'replace'`
- LLM submits `proposed_jump: { entry_id, reason }` inside its step output
- CLI prompts user for confirmation; never auto-executes
- On approve: push frame (modal) or abandon current frame (replace), transition
  to the entry
- Stack depth capped at 2 — entry inside an entry inside an entry rejected
- A subgraph's free entries are local to that subgraph's instance; to expose
  them at the parent level, the parent must declare its own entries pointing to
  the subgraph

### Schemas

- Zod, `.strict()` by default — extra fields rejected at the boundary
- Every work node's output schema **must** include
  `handoff_summary: z.string().min(40).max(500)`
- Schemas are converted to JSON Schema (via `zod-to-json-schema`) for surfacing
  to the host agent (drives structured output for spawned sub-agents)
- The graph JSON itself is also Zod-validated at parse time

### Drift containment mechanisms

- `.strict()` schemas reject extra fields
- Universal `handoff_summary` bounds cross-node context (structured forgetting)
- Workflow overview + neighborhood re-anchor at every step
- `cli state` is idempotent and re-callable (mid-node re-anchor)
- Edge logic is deterministic JavaScript; never LLM-decided
- Spawn mode available for clean-context judgment nodes
- `exec_used` audit signal recorded in transcript
- `ripplegraph validate` static check before running any graph

### Plugin surfaces (interfaces declared; only defaults ship in v0)

| Surface | v0 default |
|---|---|
| Node kind | `node:` and `ref:` |
| Edge evaluator | Inline expressions on state |
| Schema validator | Zod |
| State store | JSON-on-disk |
| Hooks | none |

## Distribution model

ripplegraph ships as an npm package. Two consumption modes are supported:

1. **Direct CLI use** — user installs `ripplegraph` and `zod`, runs the
   `ripplegraph` binary on PATH directly.
2. **Embedded in a host CLI** — specdev-cli, oceanshed-cli, etc. depend on
   ripplegraph and re-expose its commands. End users install only the host CLI;
   ripplegraph ships transitively. This is the primary consumption pattern.

ripplegraph's runtime code is never duplicated into the user's workflow folder.
The user folder contains only workflow content (graph + instructions + schemas
+ state + transcript). User-authored `schema.ts` files are loaded at runtime via
an embedded `tsx` / `jiti`-style loader, so users do not need a TypeScript build
step.

### Framework repo layout

```
ripplegraph/
  src/
    cli.ts                          # binary entry — dispatch state/step/init/validate
    commands/
      state.ts
      step.ts
      validate.ts
      init.ts
    graph/
      parse.ts                      # JSON/JSONC → typed graph IR
      schema.ts                     # Zod schema for the graph itself
      types.ts
    runtime/
      state-store.ts                # JSON-on-disk, atomic writes
      transcript.ts                 # append-only event log
      neighborhood.ts               # context + overview generator
      free-entry.ts                 # jump + modal stack
      retry.ts                      # schema-failure retry policy
    node/
      resolver.ts                   # load node folder (instruction + schema + helpers)
      executor.ts                   # exec mode handling
  tests/
    unit/
    e2e/                            # deterministic stub host driving examples
  examples/
    minimal/                        # v0 acceptance example workflow
      AGENT.md
      workflow.json
      nodes/
      subgraphs/
  templates/                        # scaffolds written by `ripplegraph init`
    AGENT.md.tmpl
    workflow.json.tmpl
  bin/
    ripplegraph
  package.json
  tsconfig.json
  README.md
```

### User-facing workflow folder

```
.<host-cli>/                        # e.g. .specdev/, .oceanshed/
  AGENT.md                          # entry-level guide for the host agent
  workflow.json                     # top-level graph
  nodes/                            # top-level graph's own work nodes
    <name>/
      instruction.md
      schema.ts
      scripts/                      # optional
      templates/                    # optional
      examples/                     # optional
  subgraphs/                        # top-level graph's own subgraphs
    <name>/                         # self-contained — owns its own nodes/ and subgraphs/
      workflow.json
      nodes/
      subgraphs/
  runs/
    active.json                     # { run_id, workflow_path }
    <run-id>/
      state.json
      transcript.md
```

Encapsulation is recursive: each graph (top-level or subgraph) owns its own
`nodes/` and `subgraphs/`. Refs are relative to the graph's directory. A
subgraph folder is portable — pick it up and drop it into another project and
all internal refs still resolve.

### `AGENT.md` — the host-agent entry guide

`AGENT.md` lives at the workflow root and contains:

1. **The universal ripplegraph protocol** (same for every workflow):
   - Call `ripplegraph state` to start; read `overview`, `neighborhood`,
     `instruction`, `schema`, `exec`, and `free_entries` fields
   - For `exec: inline`, do the work in own context; for `exec: spawn`, use
     Task / sub-agent primitive — binding, no host discretion
   - Submit result via `ripplegraph step --output <json> --exec-used <mode>`
   - On schema failure, fix and retry; after retry cap the run gates for user
   - To propose a free-entry jump, include `proposed_jump` in the output; the
     CLI gates user confirmation
   - Re-call `ripplegraph state` any time to re-anchor mid-node
2. **Workflow-specific guidance** appended by the consumer CLI (e.g., "this
   workflow drives specdev assignments...").

`ripplegraph init` writes the templated `AGENT.md`. Re-running with `--update`
refreshes the protocol section without touching the consumer's appendix.

## Success Criteria

- Two-command surface drives a stub host end-to-end through a multi-step,
  multi-subgraph workflow with no other runtime commands required
- Invalid output → reject + retry + user-gated failure path observable
- Subgraph completes and returns control to parent's next edge with correct
  output mapping
- Free-entry proposal pauses for user confirmation, modally enters, and pops
  back to the original position with stack depth tracked correctly
- `transcript.md` produces a replayable event log including `exec_used` audit
  records
- Worked example mirrors specdev's brainstorm → breakdown → implement shape,
  expressed entirely in framework primitives, exercising every mechanic
  (subgraph, inline + spawn exec, schema retry, modal entry)
- Runtime is ~500–700 LOC of TypeScript; zero LLM SDK dependency

## Dependencies

- Peer: `zod` (^3.25 || ^4)
- Runtime: `jsonc-parser`, `zod-to-json-schema`, embedded `tsx` / `jiti`-style
  TS loader for user schemas
- Node 20+
- TypeScript (build-time only for ripplegraph itself; users do not need their
  own TS build setup)

## Testing Approach

- **Unit**: graph parser, edge evaluator, state writes, schema generation,
  subgraph recursion, free-entry stack, overview generator
- **E2E**: deterministic stub host (a script that calls `state` / `step` with
  pre-recorded outputs) drives the example workflow through every mechanic —
  including a schema retry and a modal entry
- **No real-LLM tests in v0** — protocol correctness is what v0 validates; LLM
  behavior is validated by porting consumers later

## Risks

- **Zod → JSON Schema edge cases.** Some Zod features (`.transform()`,
  multi-path `.refine()`) don't translate cleanly. Mitigation: forbid the
  troublesome subset for node schemas; document the constraint.
- **Worked example must exercise everything.** If the example is too simple,
  hidden mechanics go unvalidated. Mitigation: design it explicitly during
  breakdown to cover every mechanic (subgraph, inline + spawn, schema retry,
  modal entry).
- **Drift surfaces not yet anticipated** may emerge when porting a real CLI.
  Mitigation: separate later assignment; v0 aims for correct, not complete.
- **TS loader for user schemas** (`tsx` / `jiti`) adds a small runtime cost and
  failure surface. Mitigation: schema files are loaded once per run, errors are
  surfaced clearly through `ripplegraph validate`.

## Open Questions

- Exact Zod definition for the graph JSON itself — to be designed during
  implementation
- Naming for subgraph instance IDs when multiple references exist — proposed:
  parent node id
- Whether `transcript.md` should be Markdown or JSONL — proposed: Markdown for
  v0 (human-readable beats machine-replayable at this stage)
- Whether `ripplegraph init` should accept a starter-template flag (`--from
  specdev-skeleton` etc.) — deferred to v0.5
