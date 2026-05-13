# 00003 — ripplegraph v0.1 host-agent ergonomics

## Motivation

Assignment 00002 (demoflow as end-to-end validation harness) succeeded as a
test of the central two-command loop (`state` + `step`). The loop itself
is good and should not change. Friction at the edges was real, however —
seven distinct issues surfaced when a real Claude Code session drove the
workflow. None are demoflow bugs; all are ripplegraph framework gaps that
the deterministic E2E stub (built into 00001) did not exercise.

This assignment closes those gaps. Goal: a v0.1 ripplegraph that a host
agent can drive without surprise, without privileged out-of-band recovery,
and without shell-escape land mines.

## Items in scope

### Workflow-root discovery
- **Problem:** `ripplegraph state` requires cwd inside `.<consumer>/`. A
  node's script often needs cwd at the project root (e.g. running
  `git status`). The agent context-switches cwd between steps.
- **Direction:** walk up from cwd looking for `.<consumer>/workflow.json`
  the way git finds `.git/`. Resolve once, store on the run, never ask
  the agent again.

### Restart / new-run protocol — **separate from revise**
- **Problem:** no documented way to start fresh. Re-running
  `ripplegraph state` keeps the same run-id. There's no `start`, no
  `reset`, no `--new-run`. When the agent typed an out-of-band token at
  a node, the protocol had no answer.
- **Treated as a run-level concern** (per the user's bundling decision on
  2026-05-13): this is "abandon current run, begin a new one with fresh
  state" — distinct from in-place revision. New run-id, fresh transcript.
- **Direction (open):** could be `ripplegraph state --new-run`, a separate
  `ripplegraph reset` command, or a status field the agent can request.
  Brainstorm should land the surface explicitly.

### Large-payload output
- **Problem:** `--output "$(cat file)"` works for small JSON but the
  validation node's `raw_script_output` was ~5 KB of escaped diff. Shell
  escaping risk is real.
- **Direction:** add `--output-file <path>` alongside `--output <json>`.
  Mutually exclusive. Documented in `state` response so the agent picks
  the right one based on size.

### `--exec-used` redundancy
- **Problem:** the CLI tells the agent what mode to use (`inline` or
  `spawn`); the agent echoing it back on `step` reads as ceremony.
- **Resolve one way:** either drop the flag (trust the CLI's dictate), or
  document the silent-degradation-detection rationale so it stops feeling
  redundant. Brainstorm picks; both are defensible.

### Typed precondition failures
- **Problem:** running demoflow's `gather` node in a non-git-repo bubbled
  a raw "fatal: not a git repository" through the agent. Not actionable.
- **Direction (open):** do nodes get a declared `precondition` hook that
  runs first and returns `precondition_failed { remedy }`, or is this a
  workflow-author concern handled inside the node's script? The
  framework-level option is more powerful but bigger; the workflow-level
  option is leaner but pushes work to every consumer.

### Terminology
- **Problem:** "consumer project root" took a re-read. The actual concept
  is "the directory containing `.<consumer>/`".
- **Direction:** one-line docs edit in the AGENT.md template. Small.

### In-place revise — **separate from restart**
- **Problem:** "user wants to tweak the analysis" is currently unreachable
  through the protocol. Combined with the missing restart, it forced a
  privileged out-of-band restart.
- **Treated as a node-level concern** (per the user's bundling decision):
  re-enter a completed node with new inputs while preserving the rest of
  history. This is *not* a fresh run — the transcript continues; only
  one node's output is invalidated and re-collected.
- **Direction (open):** how does the agent signal this? A new `step`
  variant (e.g. `--revise <node-id>`)? A new top-level command? What
  happens to downstream nodes whose outputs depended on the revised
  one — invalidated automatically, or held with a "stale" marker?

## Out of scope

- Workflow visualizer (deferred from v0, still deferred).
- Subgraph composition changes (works correctly per 00001's E2E).
- LLM-side concerns (free-entry, neighborhood, schema validation) —
  these worked well in 00002 validation.
- Multi-host-agent coordination (single-agent assumption stands for v0.1).
- Distribution / publish path (separate concern; see
  `project_notes/thoughts.md` install-path constraint).

## Success criteria

A real Claude Code session can drive a multi-node workflow that includes:
- Starting fresh (restart works without privileged intervention).
- Hitting a bootstrap precondition failure (e.g., not-a-git-repo) and
  recovering through the protocol, not via raw shell errors.
- Running a node whose script needs project-root cwd while the workflow
  state lives in a subdirectory.
- Producing a 5+ KB structured output without shell-escape contortions.
- Revising a completed node's output and continuing without losing the
  rest of the run.

All without consulting documentation beyond `AGENT.md` and the `state`
response shape.

## Open design questions to land in brainstorm

1. Restart surface: `state --new-run` vs `reset` vs status-driven.
2. Revise surface: `step --revise` vs new command vs status-driven.
3. Restart vs revise — is there a shared internal primitive
   (e.g., "checkpoint rewind") even if surfaces differ?
4. Precondition mechanism: framework-level node hook vs workflow-level
   convention.
5. `--exec-used`: keep with rationale doc, or drop.
6. Backwards compatibility: do existing 00001 transcripts and graphs
   continue to work unchanged? (Should be yes for everything but #2/#7.)
