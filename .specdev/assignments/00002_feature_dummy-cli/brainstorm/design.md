## Overview

`demoflow` is a tiny consumer CLI that exists to exercise ripplegraph
end-to-end with a real host agent (Claude Code). It is the second assignment
in the ripplegraph project and its only purpose is integration validation —
the v0 runtime was proven by a deterministic stub host; this assignment
proves it works under a real LLM-driven host.

The consumer-CLI pattern is **Shape A — scaffolder-only**:
`demoflow init` writes a `.demoflow/` workflow folder containing a complete,
domain-flavored workflow. After init, the user calls `ripplegraph state` and
`ripplegraph step` directly (with `--workflow-root .demoflow`) — demoflow does
not wrap or proxy those commands. The wrapping pattern (Shape B) is left to
specdev-cli proper as a separate later assignment.

## Goals

- Ship a separate npm-publishable package `demoflow` with one command:
  `demoflow init [--target <dir>]`
- Bundle a working commit-message drafter workflow that exercises every
  practical ripplegraph mechanic short of subgraphs (subgraphs already proven
  by the v0 E2E):
  - At least one `exec: inline` work node
  - At least one `exec: spawn` work node
  - A node folder with a `scripts/` helper that the node's instruction tells
    the host to invoke
  - Structured Zod output schemas with mandatory `handoff_summary`
  - A human approval gate as the final node
- Live under `packages/demoflow/` with a local `file:../..` dep on ripplegraph
- Be installable into a fresh empty project via `npm install <abs-path-to-demoflow>`
  (and, when later published, `npm install demoflow`)
- Drive successfully under a real Claude Code session: completes the
  workflow, produces a transcript with the expected lifecycle events,
  shows the drafted commit message at the human-approval gate

## Non-Goals

- No wrapping commands (`demoflow state`/`demoflow step`) — Shape B is a
  separate assignment
- No subgraph in the bundled workflow (covered by ripplegraph's own E2E)
- No automated end-to-end test that drives a real LLM (would require API
  keys / costs / non-determinism). The acceptance test for this assignment
  is a documented manual run in Claude Code.
- No publication to npm in this assignment (just local install path proven)
- No conversion of the ripplegraph repo to a real monorepo (workspaces,
  Turbo, etc.). `packages/demoflow/` is just a sibling folder with its own
  `package.json`; the top-level `package.json` does not learn about it.
- No git command execution by demoflow itself — git interaction happens
  inside a node's `scripts/` helper, invoked by the host agent during the
  workflow run

## Design

### Repo layout (this assignment introduces)

```
ripplegraph repo/
  package.json                            # existing — ripplegraph (root)
  src/ bin/ templates/ examples/          # existing
  packages/                               # NEW
    demoflow/
      package.json                        # name: demoflow, deps: { "ripplegraph": "file:../.." }
      tsconfig.json
      bin/demoflow                        # CLI shim
      src/
        cli.ts                            # argv parser + dispatch
        init.ts                           # the init command
      templates/                          # what `demoflow init` writes
        AGENT.md.tmpl                     # commit-drafter-flavored host guide
        workflow.json.tmpl                # the drafter workflow definition
        nodes/                            # node folders to copy into .demoflow/nodes/
          gather/
            instruction.md
            schema.ts
            scripts/
              collect-git-status.sh
          analyze/
            instruction.md
            schema.ts
          draft/
            instruction.md
            schema.ts
          confirm/
            instruction.md
            schema.ts
      README.md
      .gitignore                          # node_modules, dist/
```

The top-level `package.json` is unchanged — no workspaces config, no scripts
added. `packages/demoflow/` is fully self-contained.

### The `demoflow init` command

Signature: `demoflow init [--target <dir>]` (default `--target .`).

Behavior:

1. Resolve target dir (absolute or relative-to-cwd); create if absent.
2. Create the workflow root inside it: `<target>/.demoflow/`. If the folder
   already exists, error unless `--force` is passed.
3. Copy the entire `templates/` tree into `<target>/.demoflow/`:
   - `AGENT.md.tmpl` → `.demoflow/AGENT.md`
   - `workflow.json.tmpl` → `.demoflow/workflow.json`
   - `nodes/` → `.demoflow/nodes/` (recursively)
4. Create `<target>/.demoflow/runs/` (empty).
5. Print a success message including:
   - Path to the created folder
   - The next-step hint: "now run `ripplegraph state --workflow-root
     <path-to-.demoflow>` (or just `ripplegraph state` if you cd into the
     directory containing `.demoflow/`)"

`init` does not invoke ripplegraph; it only writes files. The ripplegraph
runtime is exercised lazily when the host agent runs `state`/`step`.

### The bundled commit-drafter workflow

Four work nodes, no subgraph.

```
__start__ → gather → analyze → draft → confirm → __end__
```

| Node | exec | Purpose | Notable |
|---|---|---|---|
| `gather` | `inline` | Run `scripts/collect-git-status.sh`; capture branch + staged file list + diff stats | Exercises a node's `scripts/` folder being invoked by the host |
| `analyze` | `spawn` | Classify the change (feat / fix / refactor / docs / chore) with a one-line justification | Exercises spawn mode — host uses its Task / sub-agent primitive with the analyze schema |
| `draft` | `inline` | Compose `{ subject, body, co_authored_by? }` matching the conventional format | Exercises structured output validation |
| `confirm` | `inline` | Show the drafted message to the user; require explicit approval before completing | The human gate. `approved: true` is required to complete; on `false` the host can re-call `state` to surface a revise loop (the workflow itself is single-pass — re-loop is a future enhancement, out of v0 scope) |

All four output schemas include the mandatory `handoff_summary`. No free
entries in v0 of this workflow (would add complexity without proving new
mechanics).

### AGENT.md (workflow-specific guidance)

The bundled `AGENT.md.tmpl` consists of:

1. The full canonical ripplegraph protocol section (copied verbatim from
   ripplegraph's `templates/AGENT.md.tmpl`) — the host's universal contract
2. A `<!-- BEGIN workflow-specific guidance -->` block containing
   demoflow-specific notes:
   - "This workflow drafts a commit message from the current git state."
   - "The `gather` node tells you to run `nodes/gather/scripts/collect-git-status.sh`. Do that with your Bash tool and parse the output."
   - "The `confirm` node REQUIRES `approved: true` in your output. Surface the drafted message to the user and wait for explicit approval. If they want changes, capture their feedback in `handoff_summary` and re-call `ripplegraph state` to retry the node."

### Local development testing flow

Until published to npm:

```sh
# In the ripplegraph repo:
cd packages/demoflow
npm install                              # installs deps incl. file:../.. ripplegraph
npm run build                            # tsc to dist/

# In a fresh empty directory anywhere:
npm install /abs/path/to/ripplegraph/packages/demoflow
npx demoflow init                        # writes .demoflow/
ls .demoflow/                            # AGENT.md  workflow.json  nodes/  runs/
ripplegraph validate --workflow-root .demoflow

# Open this directory in Claude Code; Claude reads .demoflow/AGENT.md
# and drives the workflow via ripplegraph state / step.
```

### What the host agent does

The host agent (Claude Code) sees `.demoflow/AGENT.md` and:

1. Reads the protocol section
2. Reads the workflow-specific guidance
3. Calls `ripplegraph state` — gets the `gather` node's instruction and schema
4. Reads `nodes/gather/scripts/collect-git-status.sh`, runs it via its Bash
   tool, parses the output into the gather schema's shape
5. Calls `ripplegraph step --output <gather-json> --exec-used inline`
6. Receives `analyze` node — sees `exec: spawn`, uses its Task tool to
   spawn a sub-agent with the analyze schema for structured output
7. Submits the sub-agent's result via `ripplegraph step --output ... --exec-used spawn`
8. Receives `draft` node (inline) — composes the commit message
9. Submits
10. Receives `confirm` node — shows the draft to the user, waits for
    approval, submits with `approved: true` (or `false` if rejected)
11. Workflow completes; transcript shows the full lifecycle event log

## Success Criteria

- `packages/demoflow/` builds cleanly with `tsc`
- `demoflow init` writes the full `.demoflow/` tree to a fresh empty
  directory (manual smoke + documented one-liner)
- `ripplegraph validate --workflow-root .demoflow` returns `status: "ok"`
  with the expected counts (4 work nodes, 0 subgraphs)
- A documented manual Claude Code session in a separate directory drives
  the workflow to `status: "complete"`, producing a `transcript.md` with
  all 11 lifecycle event types
- The drafter actually produces a usable commit message (subjective but
  testable by inspecting the final state.outputs.draft)
- demoflow's `package.json` declares `ripplegraph` as a regular dependency
  via `file:../..` — proving the package-consumption shape, not just a
  same-repo import

## Dependencies

- `ripplegraph` (file:../.. for local dev)
- `zod` (peer of ripplegraph, also a runtime dep of node schemas)
- `typescript` (dev)
- Node 20+

No vitest, no testing framework — the acceptance test is a manual real-agent
run, documented in the README.

## Testing Approach

- **Unit**: none for this assignment. demoflow's `init.ts` is a thin
  file-copy operation; the value is in the bundled workflow content, which
  is exercised by the manual run.
- **Smoke**: a documented one-liner (in README) that runs `init`, then
  `ripplegraph validate`, against a temp directory.
- **Acceptance**: a documented Claude Code session that drives the
  workflow end-to-end. Captured as a README "Real host-agent run"
  section describing what the user does and what to expect.

## Risks

- **`tsx` resolution of `zod` from `nodes/*/schema.ts` in a fresh
  install dir**. The v0 ripplegraph E2E worked around this by putting the
  fixture inside the ripplegraph repo so tsx walks up to the repo's
  node_modules. In a real consumer install, zod is in the user's
  `node_modules` adjacent to ripplegraph — tsx should resolve it
  correctly, but this needs verification during the manual smoke.
  Mitigation: include a smoke step in the README and document the
  failure mode if it appears.
- **The host agent skipping the `scripts/` invocation**. The AGENT.md
  appendix tells the host to run a shell script. A drifty host might
  fabricate git output instead. Mitigation: the gather node's schema
  includes a `raw_script_output` field requiring a non-trivial string
  bounded in length — the host can't easily hallucinate convincing
  multi-line git output.
- **Manual acceptance is subjective.** Without a deterministic test
  harness, "did it work" depends on the operator. Mitigation: capture
  the transcript and final state.json as evidence; document the
  pass/fail criteria explicitly in the README.

## Open Questions

- Should `demoflow init` write the `runs/active.json` anchor or leave
  it for `ripplegraph state` to auto-create on first call? Proposed:
  leave to ripplegraph (matches the run-lifecycle design — init does
  scaffolding, state does run creation).
- Should there be a `.demoflow/CLAUDE.md` hint that points the host
  agent at `.demoflow/AGENT.md`? Proposed: yes — a one-line stub that
  says "ripplegraph workflow lives at `.demoflow/AGENT.md`; read that
  before doing anything else." This bridges Claude Code's default
  CLAUDE.md-reading behavior to ripplegraph's AGENT.md convention.
- Should the workflow's `confirm` node support a revise-loop (re-emit
  the draft if user rejects)? Proposed: out of scope for v0 of the
  workflow — the host can re-call `ripplegraph state` if needed; a real
  revise-loop would need a free entry or a back-edge, which is a future
  enhancement.
