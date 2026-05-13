# demoflow — a dummy consumer CLI exercising ripplepath end-to-end

Build a small consumer CLI named `demoflow` that scaffolds a working
`.demoflow/` workflow folder, then have a real host agent (Claude Code) drive
it via `ripplepath state` / `ripplepath step`. This is the second assignment in
the ripplepath project and its purpose is integration validation: prove that
the framework works under a real LLM-driven host, not just a deterministic stub.

`demoflow` follows the **scaffolder-only** consumer pattern (Shape A) — its
only command is `demoflow init`, which writes a bundled workflow (AGENT.md,
workflow.json, node folders with instruction.md + schema.ts + scripts) into
the target project. After init, the user calls `ripplepath state` / `step`
directly against `.demoflow/`. demoflow lives under `packages/demoflow/` in
this repo, depends on ripplepath via `file:../..` for local development, and
is designed to be publishable to npm later. The bundled workflow is a
**commit-message drafter** with four nodes (gather → analyze → draft → confirm)
that exercises `exec: inline` + `exec: spawn`, a helper script in a node
folder, schema-validated structured output, and a human approval gate. Success
is a real Claude Code session that completes the drafter workflow end-to-end
without protocol gaps.
