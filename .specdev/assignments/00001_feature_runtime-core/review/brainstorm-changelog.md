## Round 1

- **[F1.1] Addressed** — Added an explicit "Run lifecycle" subsection to
  `design.md` under State model. Rule: `ripplepath state` auto-creates a run on
  first call when no `runs/active.json` exists. Workflow root resolved from cwd
  or `--workflow-root <path>`. The auto-init rule keeps the runtime protocol at
  exactly two commands; the host's "call state, do work, call step" contract has
  no special first-call ritual. Error paths spelled out (missing
  `workflow.json`, invalid graph, dangling `active.json`). The
  `ripplepath init` management command (file scaffolding only) is kept distinct
  from run creation. Also updated the `state` row of the CLI surface table to
  reflect the read-or-initialize semantics.
