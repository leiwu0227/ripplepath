# 00004 framework architecture v1

> Captured 2026-05-14 as a sharpened architecture note after a
> follow-up critical discussion of `00004_thoughts.md`. The original
> note preserves the full conversation arc and prior-art survey. This
> note records the crisper architecture that emerged after pressure
> testing run layout, consumer CLI rendering, naming, history, multiple
> graphs, and suspend/resume.

## Executive shape

Ripplegraph is the shared **Coach** kernel for host-agent-driven CLIs.
It owns operational flow for the currently focused run: position,
schemas, gates, transitions, run-local artifacts, and the structured
context returned to the coding agent.

Ripplegraph is not the domain CLI, not the Wiki, and not the LLM
executor. Specdev, oceanshed, oceanlive, and demoflow build on top of
it by choosing graph definitions, naming policies, storage paths,
renderers, and domain commands.

The refined model:

```text
consumer workflow root
  workflow.json              stable graph package
  current.json               focus pointer for the active run
  runs/
    <run-id>/
      checkpoint.json        current position and graph/runtime metadata
      transition-log.jsonl   append-only transition/audit record
      artifacts/             graph-declared run artifacts
      scratch/               optional non-contract working material
  wiki/                      future companion system, not Coach-owned
```

The important change from the first architecture note: the consumer
workspace itself is **not** the run. A run is a persisted directory
under `runs/`, and `current.json` tells the Coach which run to render.
This keeps the good part of the git metaphor (explicit focus switching)
without rotating or archiving arbitrary top-level workspace files.

## Load-bearing principles

### One focused run, many saved runs

A workspace may contain many runs, but at most one run is focused.
`state` always answers for the focused run only. This prevents the main
coding agent from receiving multiple competing "next action" answers.

Runs persist continuously. Every successful graph step writes the
checkpoint and transition log. Therefore `suspend` and `resume` are
small focus/status operations, not heavyweight serialization events.

```text
start   -> creates a run and focuses it
step    -> validates output, advances graph, persists checkpoint/log
suspend -> marks focused run suspended and clears focus
resume  -> focuses an existing suspended run
abandon -> removes a run from active work-in-progress without deleting it
```

`suspend` means "I intend to resume." `abandon` means "keep this as
history/evidence, but stop treating it as active work."

### Workflow package has many graphs; a run has one root graph

The graph package may contain multiple named graph definitions. A run
selects exactly one root graph at creation time.

```text
workflow package
  graphs:
    assignment
    discussion
    reviewloop
    create-signal
    daily-execution
    mockcopy-backtest

run
  rootGraph: daily-execution
```

This reconciles the target consumers:

- SpecDev: `assignment` and `discussion` are separate run types.
- Oceanshed: task workflows such as `create-signal`,
  `sweep-is-oos`, `stage-candidate`, and `promote-signal` are
  selectable root graphs.
- Oceanlive: `daily-execution` and `mockcopy-backtest` are different
  root graphs; the user can suspend one and resume another.

Do not model multiple disjoint active graphs inside one run. If the
user needs to switch work, suspend the current run and focus another.

**On-disk shape.** A workflow package can be either a single
`workflow.json` with all graphs inline, or a directory layout with one
graph per file:

```text
workflow/
  manifest.json       lists available graphs + metadata
  graphs/
    assignment.json
    discussion.json
```

Ripplegraph supports both via convention. For small consumers
(demoflow, early specdev) inline `workflow.json` is fine; once graph
count grows past three or so, the directory layout scales better
because each graph's diffs stay isolated and individual graphs can be
shared across consumers.

### No lonely latches

Latches are re-entry points inside a graph. They are not free-floating
commands and not a second routing system.

If something is not part of the focused graph, it is one of:

- a different root graph, started as a separate run
- a subgraph called from the focused graph
- a side action/capability available at the current node
- a consumer CLI command outside ripplegraph
- Wiki/search behavior outside the Coach

This preserves the mission: the graph owns flow; the LLM only works
inside the current boundary.

### History is evidence, not runtime

Only the current/focused run is operational state. Old runs are not
required to keep fitting the current graph definition. They become
historical evidence for users, audits, and the future Wiki.

This matters for backward compatibility. Future ripplegraph and
consumer CLI improvements should not force migrations of every old
assignment/session/sweep just so the CLI remains usable.

Rule:

> Ripplegraph strictly validates the focused run. Historical runs are
> readable evidence and may be indexed by the Wiki, but they are not
> executable unless explicitly resumed/upgraded by the consumer CLI.

## Consumer CLI layering

### Ripplegraph returns canonical structured state

Ripplegraph should return a stable, domain-neutral state object. It
should not author the entire agent-facing prompt in SpecDev or
Oceanshed language.

Canonical responsibilities:

- workflow/graph/run identity
- focused position
- node instruction and output schema
- execution policy hint (`inline`, `spawn`, `script`)
- prior/next neighborhood context
- available latches
- side actions/capabilities available now
- requirements and blockers
- response contract for advancing
- machine-readable errors

Sketch:

```json
{
  "workflow": {
    "id": "oceanlive",
    "version": "1.4.0"
  },
  "run": {
    "id": "daily_2026-05-14",
    "status": "active",
    "rootGraph": "daily-execution"
  },
  "position": {
    "graph": "daily-execution",
    "node": "gate.review-intents"
  },
  "node": {
    "purpose": "Review generated intents with the user",
    "instructions": "...",
    "exec": "inline",
    "output_schema": {}
  },
  "context": {
    "previous": [],
    "next": [],
    "latches": [],
    "capabilities": []
  },
  "response_contract": {
    "command": "step",
    "accepted_formats": ["json", "file"]
  }
}
```

### Consumer CLI renders domain language

Consumer CLIs provide the human/agent-facing vocabulary and prompt
shape. SpecDev can say "assignment" where ripplegraph says "run";
Oceanshed can say "signal workflow"; Oceanlive can say "session."

Ripplegraph names remain canonical in storage and API:

```text
workflow
graph
run
node
edge
checkpoint
latch
artifact
capability
```

**Ripplegraph emits the canonical structured state object only. It
authors no human-facing prose.** Vocabulary mapping is not a framework
concept; consumer CLIs read the canonical state and emit their own
domain-shaped prose.

Rule:

> Storage and raw API use ripplegraph terms. Ripplegraph never renders
> human-facing text — the consumer CLI is responsible for all
> instruction text, blocker messages, next-action prompts, gate
> wording, and domain vocabulary.

The reference CLI that ripplegraph ships includes a starter renderer
sufficient for demoflow-style consumers. It's a starting point, not a
contract — SpecDev, oceanshed, and oceanlive each ship their own
renderer code over the canonical state object.

This is a stricter separation than a "vocabulary config" approach.
The benefit: ripplegraph doesn't need to know about prose templates,
i18n, gate-prompt phrasing, or how a consumer wants to address the
agent. All of that lives in the consumer CLI alongside the rest of
its domain logic. The cost: every non-trivial consumer ships
renderer code. For our target consumers (each non-trivial), that's
the right trade.

### Run IDs are consumer policy

Ripplegraph treats run IDs as opaque strings. The consumer CLI owns
ID generation, display labels, directory naming, collision handling,
and whether IDs are numeric, timestamped, slugged, or domain-shaped.

Ripplegraph requirements:

- unique within the consumer's run namespace
- filesystem-safe if used as a path segment
- stored in checkpoint metadata
- creation time stored separately from sortable ID assumptions

Example:

```json
{
  "run": {
    "id": "00004_feature_framework-hooks",
    "label": "Framework architecture",
    "createdAt": "2026-05-14T14:22:00Z",
    "consumerType": "specdev.assignment"
  }
}
```

## Graph constructs

### Graphs and subgraphs

A graph is a connected executable workflow with one entry point.
A subgraph is a graph called from another graph with explicit
input/output mapping. Subgraphs are still the composition primitive,
but root graph selection is per run.

### Latches

A latch is a declared re-entry target inside the active graph. It
supports revise/rewind behavior without giving the LLM arbitrary
routing power.

Properties to settle in design:

- sealed-by-default vs open-by-default
- confirmation mechanism
- artifact invalidation policy
- whether latches can cross subgraph boundaries

### Capabilities / side actions

Oceanlive shows that some operations are legal at a position but do
not advance the graph. Example: `load-scale-table` prepares table
state, while the later FSM transition consumes it.

These should be modeled as capabilities, not latches and not separate
graphs.

Capabilities are declared **per node** (position-scoped):

```yaml
nodes:
  intents_pending:
    capabilities:
      - id: load-scale-table
        advances: false
        writes:
          - external: server.scale_table
```

Capabilities may read/write artifacts or external resources, but they
do not change graph position unless declared as advancing actions.

Per-node declaration keeps the capability local to where it matters
and lets the `state` response naturally surface only capabilities
valid at the current position. If duplication across nodes shows up
in practice, generalize to a shared registry later — v0.1 stays
simple.

### Human gates

Human gates should be first-class graph nodes for agent UX. A gate
node renders a prompt, records the explicit user decision, and enables
guarded outgoing edges.

This is better than hiding gates only as edge guards because the
primary product of ripplegraph is the rendered "what should I do now"
context.

## Storage and runtime

### Focus record

`current.json` is not a run and not history. It is only the Coach's
focus pointer.

```json
{
  "focusedRunId": "daily_2026-05-14"
}
```

When no run is focused, `state` should return `no_focused_run` plus
consumer-renderable options to start or resume a run.

### Checkpoint

`checkpoint.json` is the latest operational state of one run.

It should include at least:

- run id, label, created/updated timestamps
- status (`active`, `suspended`, `completed`, `abandoned`)
- root graph id
- graph version/schema version used when the run started
- current position
- validated node outputs or references to artifacts
- gate decisions
- latch stack if modal latches are supported
- resume note/open questions if suspended

Persisted statuses should stay minimal:

```text
active | suspended | completed | abandoned
```

Blocked/error states are computed from checkpoint + graph validation,
not usually persisted as lifecycle statuses.

`abandoned` covers both "user chose to stop" and "errored beyond
recovery." From the framework's perspective both are the same:
something happened, the run can be inspected as evidence, but it is
no longer active work. No separate `errored` status — it would
duplicate `abandoned` for the consumer/agent's purposes.

### Transition log

`transition-log.jsonl` is required from v0.1. It gives audit,
debugging, review, resume summaries, and future Wiki indexing a stable
source of truth.

The entry schema (Wiki-ingestible without transformation):

```json
{
  "ts": "2026-05-14T15:22:00Z",
  "op": "step",
  "runId": "daily_2026-05-14",
  "from": {"graph": "daily-execution", "node": "review-intents"},
  "to":   {"graph": "daily-execution", "node": "apply-intents"},
  "actor": "agent",
  "input":  {"artifact": "artifacts/review-intents/decision.json"},
  "output": {"artifact": "artifacts/review-intents/output.json"},
  "validation": {"ok": true},
  "gateDecision": null,
  "error": null
}
```

Operations cover the full lifecycle:

```text
start | step | suspend | resume | abandon | rewind
```

Schema notes:

- Flat shape, FTS5-friendly. A future Wiki can index the whole file
  with SQLite FTS5 + a few indexed columns (`op`, `runId`, node ids)
  without needing extraction or NLP.
- Gate decisions go in `gateDecision` (null when no gate involved).
- Errors are recorded; lifecycle status changes are derivable from
  the log without consulting the checkpoint.
- Artifact references are *paths*, not inline content. The Wiki
  follows references when it wants the content.

This schema is the Coach's contract with the future Wiki. Locking it
in 00004 prevents retrofit pain when the Wiki ships in a later
assignment.

### Artifact ownership

Ripplegraph needs explicit artifact ownership rules:

```text
runs/<id>/checkpoint.json       Coach-owned
runs/<id>/transition-log.jsonl  Coach-owned
runs/<id>/artifacts/            graph-declared contract artifacts
runs/<id>/scratch/              optional non-contract working material
```

Graph validation should rely on declared contract artifacts, not
arbitrary scratch files.

### External resources

Real consumers operate on domain artifacts outside the run directory:
SpecDev source files, Oceanshed signal packages, Oceanlive vessels,
server echo folders, configs, reports, and generated workspaces.

Ripplegraph should not own these files, but graph nodes must be able
to declare references to them with read/write policy.

```yaml
resources:
  - id: source_signal
    path: signal_sets/base/signals/{signal_path}
    access: readwrite
    owner: consumer
```

This prevents the Coach from overreaching while still making side
effects visible in the node contract.

## Suspend/resume

Suspend/resume is the resolution to the Oceanlive "mockcopy halfway,
daily execution now" problem.

Scenario:

```text
Run A: mockcopy-backtest
  status: active
  position: review-generated-report

User needs live daily execution.

suspend Run A
start/focus Run B: daily-execution
complete or suspend Run B
resume Run A later
```

This keeps the invariant that one run has one root graph and one
focused position, without forcing the user to finish non-urgent work
before starting urgent work.

Suspend should do little because state is already persisted:

- validate a focused run exists
- mark its checkpoint status `suspended`
- optionally record a resume note
- append a transition log entry
- clear `current.json.focusedRunId`

Resume:

- validate run exists
- validate status is resumable
- check graph version compatibility
- set status `active`
- set `current.json.focusedRunId`
- append transition log entry
- return/render state

The git analogy is focus switching, not filesystem checkout.

## Versioning and compatibility

Runs must record the graph version they started with. Resume must
compare the run's graph version with the installed graph package.

Possible outcomes:

- compatible: resume normally
- compatible with warning: resume and show warning
- incompatible: require consumer CLI upgrade/import/adapter
- unknown old run: treat as history/evidence, not executable runtime

This lets consumer CLIs remain naturally backward compatible. Old
assignments/sessions remain readable/searchable even when current
workflow graphs improve.

## Implications for target consumers

### SpecDev

SpecDev should map:

```text
ripplegraph run      -> assignment or discussion
ripplegraph graph    -> assignment workflow, discussion workflow, review workflow
ripplegraph node     -> workflow step
ripplegraph latch    -> revision point
```

Assignments can keep numeric/slug IDs. Historical assignments remain
project memory and do not need forced graph migration.

### Oceanshed

Oceanshed is a graph registry more than a single lifecycle:

```text
create-signal
run-base-simulation
sweep-is-oos
stage-candidate
promote-signal
report-artifacts
knowledge-search
```

The workflow router chooses a graph; a run then follows that graph.
Reviews are subgraphs or spawned agent nodes depending on whether
they are part of the governed flow.

### Oceanlive

Oceanlive has true FSM-like graphs and side-channel capabilities.

```text
daily-execution
mockcopy-backtest
vessel-setup
report-generation
```

Daily execution can preempt a suspended mockcopy run. Side-channel
loads such as scale/fill table loading should be capabilities that do
not advance position.

## 00004 scope after this refinement

Deliver in 00004:

- workflow package schema with multiple named graphs (inline
  `workflow.json` or `workflow/graphs/*.json` directory layout)
- one-root-graph-per-run model
- `current.json` focus pointer
- run directory shape under `runs/<id>/`
- checkpoint format
- transition log format with the Wiki-ingestible entry schema
- canonical structured `state` object (no prose rendering in core)
- reference CLI with a starter renderer; consumers ship their own
- `start`, `state`, `step`, `suspend`, `resume`, `abandon`
- latches as graph-local re-entry points
- capabilities/side actions as **per-node** non-advancing operations
- graph version metadata and resume compatibility behavior
- storage backend interface + filesystem default
- executor backend for script nodes only

Candidate for deferral if scope pressure shows up during design.md:
**capabilities**. Oceanlive needs them; specdev/oceanshed/demoflow
likely don't in v0.1. Could ship 00004 without capabilities and add
them as a small follow-up before the oceanlive rewrite begins. The
node schema would need a forward-compatible `capabilities?` field so
the addition isn't a breaking change.

Defer:

- Wiki implementation and search API
- historical run indexing
- generic graph migration framework
- true concurrent focused runs in one workspace
- git-worktree-style workspace isolation
- MCP surface for Wiki
- consumer rewrites

## Open questions for design.md

Resolved during v1 review (2026-05-14):

- **(was 7, partial — scoping)** Capability scoping: per-node
  declaration. Validation policy (Coach-validated vs consumer-only)
  is still open.
- **(was 10)** Renderer extension hooks: none. Ripplegraph emits
  only canonical state; consumers own all prose rendering.
- **(was 11, partial)** `state` with no focused run: returns
  `no_focused_run` plus consumer-renderable options. Format of the
  options payload still open.
- **(was 12)** `abandon` vs `completed`: both terminal, both indexed
  as evidence; `abandon` subsumes errored-beyond-repair, no separate
  `errored` status.

Still open:

1. Exact `workflow.json` graph schema (and the parallel
   `workflow/graphs/*.json` directory format).
2. Whether root graph selection is only consumer CLI policy or also
   exposed in the reference `ripplegraph start --graph`.
3. How graph version compatibility is declared (semver in
   workflow.json? per-graph version field? `schemaVersion` separate
   from `version`?).
4. Whether run artifacts should be stored directly under
   `artifacts/<node-id>/` or graph-authored paths.
5. Whether `scratch/` is a core convention or left to consumers.
6. Exact gate node schema and user-decision record format.
7. Capability validation policy: does ripplegraph validate
   capability invocations against the graph, or only surface them to
   the consumer CLI?
8. Latch invalidation semantics: what downstream artifacts are stale
   after re-entry.
9. Subgraph call stack and whether latches can target parent/child
   graph positions.
10. `no_focused_run` options payload schema (what the consumer
    renderer gets to display "start new" / "resume" choices).

## Decision summary

The crisp architecture:

> Ripplegraph is a Coach over one focused persisted run. A workflow
> package contains many named graphs; each run selects one root graph.
> Runs are continuously checkpointed under `runs/<id>/`. Suspend and
> resume switch focus, not filesystems. Historical runs are evidence
> for users and the future Wiki, not runtime obligations. Consumer CLIs
> own naming, graph selection, rendering, and domain resources; the
> ripplegraph core owns canonical state, validation, transitions, and
> the structured context contract.

