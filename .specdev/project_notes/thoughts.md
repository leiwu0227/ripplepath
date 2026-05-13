# Open thoughts / pickup notes

## Where we are

ripplepath now lives at `/mnt/h/ripplepulse/lib/ripplepath/` (own repo,
`github:leiwu0227/ripplepath`). The move out of oceanwave is done; all
`.specdev/` assignment state moved with it intact.

Active assignment: **00002 — dummy CLI consuming ripplepath for end-to-end
framework testing**. State: `brainstorm_checkpoint_ready` — proposal.md
and design.md are written but **not yet reviewed or approved**. The
checkpoint was reached but the review choice was paused for the
repo-move + install-path discussions.

## Demoflow assignment — locked decisions

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
  Code. Project-local installs work fine with npm — see the install-path
  note below for why this is the only path that does.

## Open: where does demoflow live on disk?

Three options, framed by what each gives vs. costs:

| Option | Path | What it gives | What it costs |
|---|---|---|---|
| **A** | Inside ripplepath repo at `packages/demoflow/` | Tight dev loop; change ripplepath, immediately see effect via `file:../..` | Conflates framework and consumer in one repo; `file:../..` is a within-repo path real consumers won't use |
| **B** | Sibling directory next to ripplepath (e.g. `/mnt/h/ripplepulse/lib/demoflow/`) | Real cross-repo separation; matches "external consumer" mental model; still close enough to develop in tandem | Two repos; `file:../demoflow-or-ripplepath` dep path; small extra setup |
| **C** | Alongside the user's other CLI fleet (path TBD now that ripplepath has left oceanwave) | Strongest separation; treats demoflow as a real member of the CLI fleet | Furthest from ripplepath physically; awkward during co-development |

Working hypothesis: **Option B** — `/mnt/h/ripplepulse/lib/demoflow/`,
sibling to ripplepath. That mirrors how real consumer CLIs will look
(external package boundary) and still keeps co-development practical.
Confirm with user before kicking off the brainstorm reviewloop.

The current `design.md` reflects **Option A** (`packages/demoflow/`
inside the ripplepath repo). Sections that change if we pick B/C:

- "Repo layout (this assignment introduces)" — change from
  `packages/demoflow/` to the chosen sibling path
- "Dependencies" — change `file:../..` to the new relative path
- "Local development testing flow" — update the install command

The underlying design (Shape A, commit-drafter workflow, four nodes,
manual acceptance via Claude Code) doesn't change with the location.

## Install-path constraint (added 2026-05-13)

During the post-move shakedown we tried to make
`npm install -g github:leiwu0227/ripplepath` work as a "stable install"
command. It does not, and **cannot** with npm 10.x or 11.x — see
`.claude/projects/.../memory/project_install_path.md` for the full
post-mortem. Two unfixable npm bugs collide on the global-install path
(devDeps not placed in git-clone prep + esbuild postinstall race in
nested layout).

What this means for demoflow:

- **Project-local install of ripplepath works fine with npm.** esbuild
  gets hoisted; no race. So demoflow's planned
  `npm install <abs-path-to-demoflow>` flow is unaffected — keep it.
- **If demoflow ever gets a "stable global install" story** (e.g.
  `npm install -g github:leiwu0227/demoflow` once it bundles ripplepath),
  that path will hit the same global-nested-layout bug. End users would
  need `pnpm add -g github:...` instead. Worth noting in demoflow's
  README but not a v0 design constraint.
- ripplepath's current install story for end users:
  `pnpm add -g github:leiwu0227/ripplepath`. dist/ is committed to git;
  run `npm run build` before each commit that touches `src/`.

This is a temporary state. Long-term fix is `npm publish` (tarball
install path is verified working) — deferred until ripplepath stabilizes.

## 00002 validation findings (2026-05-13)

Demoflow was built, scaffolded into a fresh project, and driven end-to-end
by a real Claude Code session. The scaffolder worked; the central two-command
loop (`state` + `step`) was genuinely pleasant to drive. All friction surfaced
at the framework's edges, not in demoflow. Carry these into the v0.1 follow-up.

**What worked well**
- Two-command protocol holds in working memory; `state` idempotency is a real
  anchor (never lost about "where am I").
- Schema-driven `step` validation: cleaner handshake than prose; the JSON
  schema in the response is the most useful part.
- `neighborhood` dumping prior outputs as JSON was the standout — no need to
  re-fetch or remember.
- Mandatory `handoff_summary` forces a different muscle (writing for the next
  node, not the user) and kept summaries tight.
- `<!-- BEGIN/END workflow-specific guidance -->` envelope cleanly separates
  protocol from per-workflow playbook.

**Framework friction (none of this is a demoflow issue)**
1. **cwd handling.** `ripplepath state` requires cwd inside `.demoflow/`, but
   a node's script may want cwd at the project root. CLI should walk up
   looking for `.<consumer>/workflow.json` (the way git finds `.git/`).
2. **Start/restart protocol gap.** No `start`/`reset`/new-run path in the
   two-command surface. Same hole as #7 below — both are "how does the
   user/agent rewind?"
3. **Large-payload ergonomics.** `--output "$(cat file)"` works but
   shell-escape risk is real for multi-KB payloads. A `--output-file <path>`
   flag would be safer.
4. **`--exec-used` reads as ceremony.** Either drop it, or document the
   silent-degradation-detection rationale so it stops feeling redundant.
5. **Bootstrap preconditions are implicit.** A non-git-repo bubbled a raw
   shell error through the agent. A typed `precondition_failed { remedy }`
   status would be cleaner — needs design on whether nodes get a declared
   `precondition` hook or this is a workflow-author concern.
6. **Terminology.** "Consumer project root" took a re-read — "the directory
   containing `.<consumer>/`" lands faster. One-line docs change in the
   AGENT.md template.
7. **No revise loop.** Combined with #2, "user wants to tweak the analysis"
   is unreachable through the protocol — only via privileged out-of-band
   restart. Same design problem as #2; resolve together.

**Net assessment.** Central loop is genuinely good. The follow-up should fix
the edges (bootstrap, restart, large payloads) without touching the core
two-command abstraction. v0.1 assignment scope — to be opened as 00003.

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

## Demoflow v0 usage + the "ripplepath should bundle zod" proposal (added 2026-05-13)

Captured from the demoflow-cli session that shipped `demoflow init` v0
against globally-installed ripplepath. Two parts: how demoflow is
actually meant to be used, and a follow-up ripplepath assignment idea
that fell out of live testing.

### How demoflow v0 is used in practice

Two paths, depending on whether demoflow is installed globally or
run directly out of the dev repo.

**Quickest test (no install).** From any project with staged changes:

```sh
cd ~/path/to/your/project
git add <files>
node /mnt/h/ripplepulse/lib/cli/demoflow-cli/bin/demoflow init
npm i zod@^3.25
```

Then open the directory in Claude Code and tell it:

> Drive the workflow at `.demoflow/` to completion. Start by running
> `ripplepath state --workflow-root .demoflow`.

Claude reads `.demoflow/AGENT.md`, walks through
`gather → analyze → draft → confirm`, and at the confirm step prints
the drafted commit message and asks the operator to approve / reject
/ revise.

**Installed (so the CLI is on PATH).**

```sh
pnpm add -g /mnt/h/ripplepulse/lib/cli/demoflow-cli
which demoflow
demoflow init --target /tmp/check && ripplepath validate --workflow-root /tmp/check/.demoflow
```

Then in any project:

```sh
cd ~/path/to/your/project
git add <files>
demoflow init           # writes ./.demoflow/
npm i zod@^3.25         # required — v3 specifically; ripplepath rejects v4
```

**Expected lifecycle visible to the operator:**

| Stage | What appears |
|---|---|
| `demoflow init` | Success message + 3 numbered next-step hints. `.demoflow/` folder appears in cwd. |
| `ripplepath validate` | `{ "status": "ok", "workNodeCount": 4, "subgraphCount": 0 }` |
| Claude `ripplepath state` (first) | gather node's instruction + schema |
| Claude runs `collect-git-status.sh` | Real git output piped into `raw_script_output` |
| Claude `ripplepath step` | Transitions to analyze (spawn sub-agent classifies the change) |
| → draft | Composes `<type>(<scope>)?: <subject>` |
| → confirm | Claude prints the draft and asks the operator |
| Operator answers | Workflow completes either way; `state.outputs.confirm.approved` is the readout |

**Known gotchas the README documents:**

- `Cannot find package 'zod'` → `npm i zod@^3.25` in the project.
- `output export must be a z.object; got typeName=object` → zod v4
  installed, downgrade with `npm i zod@^3.25`.
- `ripplepath: command not found` → `pnpm add -g github:leiwu0227/ripplepath`.
- `.demoflow already exists` → add `--force`.

**One UX gap caught during live testing:** ripplepath defaults
`--workflow-root` to cwd. Our Shape-A convention keeps cwd at the
consumer project root (so the gather script's git commands work),
which means every `ripplepath state` / `ripplepath step` call must
explicitly pass `--workflow-root .demoflow`. The demoflow AGENT.md
appendix didn't make this explicit in v0 — the canonical ripplepath
protocol says "ripplepath state always first" and implicitly assumes
cwd is the workflow root. demoflow v0.1 should add a one-line
"Invocation" section to the appendix to call this out.

### The "ripplepath should bundle zod" proposal

**Problem.** Every consumer of a ripplepath workflow (demoflow today,
others later) has to:
1. Install zod into the consumer project root.
2. Pin it to `^3.25` because ripplepath's resolver only understands
   zod-3 internals.
3. Remember to use npm rather than pnpm in some cases (pnpm's
   content-addressable layout can confuse tsx's upward walk).

This pushes a ripplepath runtime requirement onto every consumer CLI
that builds on top of ripplepath. The dependency relationship is
really:

```
consumer's templates → schema.ts → import zod
                                      ↑
                            (ripplepath's contract)
```

zod isn't a demoflow concern; it's a ripplepath runtime concern.

**Why the consumer carries it today.** When the host calls
`ripplepath state`, ripplepath spawns tsx to load
`.<consumer>/nodes/*/schema.ts`. Those files `import 'zod'`, and
tsx defers to Node's module resolver, which walks up from the
importing file looking for `node_modules/zod`. The walk hits the
consumer project's `node_modules/zod` first — that's the only
location currently populated.

ripplepath being installed globally doesn't help. tsx walks up from
the schema file, not from where the ripplepath binary lives.
Node's **ESM resolver also does not consult `NODE_PATH`** — that
mechanism only works for CommonJS `require()`, and our schemas are
ESM (consumer CLIs write a `package.json` with `"type": "module"`
inside their workflow root). So the only viable resolution path is
having `node_modules/zod` somewhere on the upward walk.

**Proposal.** Have `ripplepath init` write
`<workflow-root>/node_modules/zod` itself, sourced from ripplepath's
own bundled copy.

Implementation sketch:

1. Add `zod ^3.25` to ripplepath's `dependencies` (not peerDeps).
   `pnpm add -g github:leiwu0227/ripplepath` then places zod next
   to ripplepath in the global store.
2. In `ripplepath init`, after writing `AGENT.md` / `workflow.json`
   / `runs/`, additionally:
   - Resolve the path of ripplepath's bundled zod (via
     `import.meta.resolve('zod')` or
     `require.resolve('zod', { paths: [...] })`).
   - Create `<workflow-root>/node_modules/zod` as a symlink on POSIX,
     with a recursive copy fallback for Windows-without-admin and
     non-symlink-capable filesystems.
3. Document this in ripplepath's README and add a smoke test:
   `ripplepath init` into a tmp dir + `ripplepath validate` **without
   the consumer installing anything** → `status: ok`.

**Knock-on wins.**

- Every consumer CLI inherits it for free — none of them have to
  think about zod.
- One source of truth on the supported zod version. ripplepath
  maintainers know best (currently `^3.25` because of Zod-3-only
  internal introspection in `src/node/resolver.ts`).
- The zod-v3-vs-v4 troubleshooting goes away in every consumer's
  README. demoflow's README loses ~30 lines.
- Consumer projects' root `node_modules/` stays untouched — useful
  for non-JS projects (Python repos, prose repos, etc.) that don't
  want a stray npm install on their root.
- Honors demoflow's stated Non-Goal "No bundling of zod with
  demoflow — consumer installs it" — by moving the responsibility
  to where it actually belongs.

**Trade-offs.**

- Changes `ripplepath init`'s contract — every workflow now gets a
  `node_modules/` next to it. Some users may find that surprising.
  Mitigation: document it in the canonical AGENT.md and ripplepath
  README.
- Symlinks need a copy fallback (Windows without dev-mode admin,
  some CI mounts).
- ripplepath ships heavier (~150 KB zod) — negligible for a global
  CLI.

**Suggested next assignment in this repo.** Open as
`ripplepath assignment "bundle zod into ripplepath init scaffolding"
--type=feature --slug=bundle-zod-runtime`. Brainstorm should
explicitly cover (a) symlink-vs-copy on init, (b) what happens on
`ripplepath init --update` (re-create the link? leave it alone?),
(c) implications for any future workflow that might want a
*different* zod version (probably "tough — ripplepath pins the
contract"), and (d) whether the `<workflow-root>/node_modules/`
should also include `tsx` or other dev runtime helpers (probably
no — tsx is already bundled with ripplepath and runs in
ripplepath's own process).

## When you return

1. Confirm the demoflow location decision (Option B is the working
   hypothesis; revisit the table above).
2. Revise `design.md` for the chosen location.
3. Resume the brainstorm checkpoint: choose review path, run reviewloop
   (codex is the carried-forward reviewer from assignment 00001).
4. Proceed through breakdown → implementation.
5. Consider opening the `bundle-zod-runtime` assignment described
   above — that would remove the largest UX wart from the demoflow
   v0 install path.
