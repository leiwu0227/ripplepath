# 00004 — minimal Coach runtime proof of concept

Build a breaking-change proof of concept for the refined ripplegraph architecture captured in `.specdev/project_notes/00004_thoughts_v1.md`. The goal is not to finish the full framework; it is to make the core mental model tangible enough that assignment 5 can build a small custom CLI on top and manually drive it with Codex or Claude.

The POC should replace the current runtime as needed. It should prove a workflow package with multiple named graphs, a run directory under `runs/<id>/`, a `current.json` focus pointer, canonical structured `state` output, graph-owned `step` transitions, lightweight `suspend`/`resume` focus switching, `abandon`, and a required `transition-log.jsonl`. It should deliberately defer Wiki, consumer-specific prose rendering, graph migrations, subgraph composition, latches, and capabilities unless a tiny placeholder is needed to avoid painting the design into a corner.

