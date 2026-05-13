# Open thoughts / pickup notes

## Repo-move plan (this comes first, before continuing assignment 00002)

ripplepath is currently parked under
`/mnt/h/oceanwave/lib/playground/langgraph/`. The intent is to move it out
of the oceanwave tree into its own repo before continuing development. When
that happens, this whole folder (including `.specdev/`) moves with it, so
all assignment state and artifacts are preserved — just resume from the new
path.

When picking up after the move:

1. Resume the active assignment via `specdev focus 00002 && specdev next --json`.
2. The brainstorm artifacts for assignment 00002 are already written
   (`.specdev/assignments/00002_feature_dummy-cli/brainstorm/proposal.md` and
   `design.md`) but **not yet reviewed or approved** — the checkpoint was
   reached but the review choice was paused for this discussion.
3. Re-read `design.md` once you're in the new location and make sure the
   location decision (see below) still matches your intent before kicking
   off the brainstorm reviewloop.

## Demoflow assignment — state at pause

Assignment **00002 — dummy CLI consuming ripplepath for end-to-end framework
testing** is mid-brainstorm. Decisions already locked:

- **Name:** `demoflow`
- **Shape:** Shape A — scaffolder-only consumer. Only command is
  `demoflow init`. After init, the user calls `ripplepath state` / `step`
  directly. No wrapping (`demoflow state`/`step` is Shape B, deferred to a
  later assignment, likely specdev-cli proper).
- **Bundled workflow:** commit-message drafter. Four work nodes:
  `gather → analyze → draft → confirm`. No subgraph (subgraphs already
  covered by ripplepath's own v0 E2E). Exercises:
  - `exec: inline` and `exec: spawn`
  - A node's `scripts/` folder (the gather node has
    `scripts/collect-git-status.sh`)
  - Schema-validated structured output (commit subject/body)
  - A human approval gate at `confirm`
- **Validation outcome:** real Claude Code session driving the workflow
  end-to-end. No automated LLM test (cost / non-determinism).
- **Local-dev install path:** `npm install <abs-path-to-demoflow>` into a
  fresh empty directory, then `npx demoflow init`, then drive with Claude
  Code.

What's not yet decided (this is the open question that paused the
brainstorm): **where on disk demoflow lives**. See the next section.

## Location decision (paused at this point)

Three options surfaced. The framing matters because demoflow's whole
purpose is to prove the npm-consumption pattern works for future real
consumers — and that pattern is meaningful only if there's a real
package boundary between the framework and the consumer.

| Option | Path | What it gives | What it costs |
|---|---|---|---|
| **A** | Inside ripplepath repo at `packages/demoflow/` | Tight dev loop; change ripplepath, immediately see effect via `file:../..` | Conflates framework and consumer in one repo; `file:../..` is a within-repo path real consumers won't use |
| **B** | Sibling playground dir (e.g. `<playground>/demoflow/` next to the ripplepath repo) | Real cross-repo separation; matches "external consumer" mental model; still close enough to develop in tandem | Two repos; `file:../<ripplepath-dir>` dep path; small extra setup |
| **C** | Alongside the user's other CLI fleet (e.g. `/mnt/h/oceanwave/lib/cli/demoflow-cli`) | Strongest separation; treats demoflow as a real member of the CLI fleet | Furthest from ripplepath physically; awkward during co-development |

User's intent: **move ripplepath out of oceanwave first**, then revisit
this. The likely outcome after the move is **Option B-equivalent** —
demoflow as a sibling directory to wherever ripplepath ends up living —
since that mirrors how real consumer CLIs will look and still keeps
co-development practical.

The assignment's current `design.md` reflects **Option A** (`packages/demoflow/`
inside the ripplepath repo). That section will need to be revised once the
repo move happens — specifically:

- Section "Repo layout (this assignment introduces)" — change from
  `packages/demoflow/` to the chosen sibling path
- Section "Dependencies" — change `file:../..` to the new relative path
- Section "Local development testing flow" — update the install command
- The ripplepath repo's top-level files are unchanged either way

The underlying design (Shape A, commit-drafter workflow, four nodes,
manual acceptance via Claude Code) doesn't change with the location
choice.

## Why this matters — restating the bigger picture

In production, the consumer-CLI pattern is:

```
User project:
  npm install ripplepath some-cli           # both from npm
  some-cli init                              # scaffolds .some-cli/ workflow
  # → host agent (Claude Code) reads .some-cli/AGENT.md and runs
  #   ripplepath state / step in that directory
```

`some-cli` is the user-visible surface; ripplepath is internal. demoflow
is a placeholder for `some-cli` whose only job is to prove this end-to-end
flow works under a real host agent (not just our deterministic E2E stub).
Treating demoflow as a true external consumer (Option B or C) is the
honest way to prove that — Option A works but technically shortcuts the
package boundary.

## Other notes worth carrying forward

- The v0 ripplepath runtime is feature-complete and codex-approved
  (assignment 00001 closed). 30 tests pass (`vitest run`).
- The framework's runtime LOC came in at ~2,150 — well over the plan's
  500-700 estimate. Functionality matches the design; the estimate was
  optimistic.
- One subtle design discovery from the v0 E2E:
  `PendingConfirmation` carries a `resume_path` + `resume_attempt` so
  that a modal pop restores the *deferred* position (not the node whose
  output was just written). Worth remembering when reasoning about the
  free-entry mechanic.
- Drift containment story validated by the codex review rounds —
  e.g., the resolver's Zod-internal introspection only works for Zod 3,
  so the peer dep was narrowed to `^3.25.0`. If anyone wants to support
  Zod 4 later, the dual-internal-shape detection in
  `src/node/resolver.ts` needs to be expanded.
- Workflow visualizer is intentionally deferred from v0 — the graph
  JSON is the canonical artifact and a visualizer is straightforward to
  bolt on later.

## When you return

1. Move the repo to its new home (out of oceanwave).
2. Open it in Claude Code; the session-start hook will load the SpecDev
   context.
3. Run `specdev focus 00002` then `specdev next --json` to land back in
   the brainstorm of the demoflow assignment.
4. Revise `design.md` for the chosen location (see the table above).
5. Resume the brainstorm checkpoint: choose review path, run reviewloop
   (codex is the carried-forward reviewer from assignment 00001).
6. Proceed through breakdown → implementation.
