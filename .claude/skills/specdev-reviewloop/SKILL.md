---
name: specdev-reviewloop
description: Automated external review loop — spawns an external reviewer CLI, reads verdict, auto-approves on pass
---

## For assignments

Run `specdev reviewloop <phase>` where phase is `brainstorm` or `implementation`.

Without `--reviewer`: lists available reviewers. If the user has already chosen automated review mode, ask reviewer type as a second multiple-choice question. Use one choice per reviewer config; do not ask for free-form reviewer text.
With `--reviewer=<name>`: spawns the reviewer and processes results automatically.
With `--autocontinue`: after approval, follow `specdev next --json` without another user prompt.
After any approved assignment review, prefer `specdev next --json` if the next step is not already explicit in the reviewloop output.

Flow:
1. `specdev reviewloop <phase>` — lists reviewers
2. Ask the user whether to run review-only or review-then-autocontinue
3. Ask reviewer type as a second multiple-choice question
4. `specdev reviewloop <phase> --reviewer=<name>` — runs review
5. On pass → auto-approves the phase. **The gate is satisfied — use `specdev next --json` for the next action.** Do NOT ask the user to run `specdev approve` separately.
6. On fail → run `specdev check-review <phase>` to address findings, then re-run reviewloop

Autocontinue contract:

When `--autocontinue` is present and the review is approved:

- Do not stop after an approved autocontinue review.
- For brainstorm approval, follow `specdev next --json` immediately.
- Carry the same reviewer forward when the next runtime action asks for implementation review.
- For implementation approval, follow `specdev next --json` immediately.
- If a reviewer returns `needs-changes`, run `specdev check-review`, address findings, write the changelog, and rerun reviewloop within max rounds.

## For discussions

Run `specdev reviewloop discussion --discussion=<ID>` where ID is the discussion ID (e.g. D00001).

Flow:
1. `specdev reviewloop discussion --discussion=<ID>` — lists reviewers
2. Ask reviewer type as a multiple-choice question with one choice per reviewer config
3. `specdev reviewloop discussion --discussion=<ID> --reviewer=<name>` — runs review
4. On pass → discussion review complete. No phase approval needed.
5. On fail → address findings, then re-run

**Do NOT use `specdev reviewloop brainstorm` for discussions — that requires an assignment.**

This is a Node.js CLI command — run it directly, never via pip/python.
