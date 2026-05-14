---
name: specdev-reviewloop
description: Automated external review loop — spawns an external reviewer CLI, reads verdict, auto-approves on pass
---

## For assignments

Run `specdev reviewloop <phase>` where phase is `brainstorm` or `implementation`.

Generic rendering rule (applies to every specdev command):

- After any command that prints an `interaction` block, render it via `AskUserQuestion` (Claude Code) or its host equivalent, using the exact labels and order. Do not paraphrase, reorder, or drop options. If a chosen option has `requires_reviewer: true`, render the `follow_up` block as a second `AskUserQuestion`.
- After any command that prints a `continuation` block with `interrupt: false`, invoke the printed command immediately without prompting the user. Sticky values (e.g. the carried reviewer) are persisted by the runtime in `.specdev/.session-state.json`.

Flow:
1. `specdev reviewloop <phase>` — lists reviewers and emits a reviewer-selection `interaction` block.
2. `specdev reviewloop <phase> --reviewer=<name>` — runs the review and processes the result.
3. On pass → command auto-approves the phase. **Do NOT ask the user to run `specdev approve` separately.** Honour the emitted `continuation` block; do not hardcode the next step here.
4. On fail → run `specdev check-review <phase>` to address findings, then re-run reviewloop.

## For discussions

Run `specdev reviewloop discussion --discussion=<ID>` where ID is the discussion ID (e.g. D00001). The same generic rendering rule applies — render any `interaction` block exactly as printed and invoke any non-interrupting `continuation` block automatically.

**Do NOT use `specdev reviewloop brainstorm` for discussions — that requires an assignment.**

This is a Node.js CLI command — run it directly, never via pip/python.
