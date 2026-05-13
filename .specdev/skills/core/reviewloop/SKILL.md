---
name: reviewloop
description: Automated external review loop — spawns external CLI reviewer, reads verdict from artifacts, auto-approves on pass
type: core
phase: brainstorm, implement
input: Completed work (code changes, design docs, etc.)
output: Review verdict in review/{phase}-feedback.md
next: auto-approve on pass, check-review on fail
triggers:
  - after brainstorm checkpoint passes
  - after implementation checkpoint passes
  - when user requests automated external review
---

# Reviewloop — Automated External Review

Run an external CLI reviewer (Codex, OpenCode, Aider, etc.) against the current assignment. The CLI command handles all mechanics: spawn reviewer, read verdict from artifacts, enforce round limits, auto-approve on pass.

## Usage

```bash
specdev reviewloop <phase>
specdev reviewloop <phase> --reviewer=<name>
```

Without `--reviewer`: lists available reviewers. If the user has already chosen automated review mode, ask reviewer type as a second multiple-choice question. Use one choice per reviewer config; do not ask for free-form reviewer text.
With `--reviewer`: spawns the reviewer and processes the result.
With `--autocontinue`: after approval, follow `specdev next --json` without another user prompt.

## Reviewer Launch Notes

See `reviewers/README.md` for per-reviewer launch contracts. In particular:

- Claude runs in print mode and must write the feedback file before exiting.
- Codex runs through `codex exec` with isolated ephemeral review state.
- Reviewer stdout/stderr is captured to the per-round log artifact below.

## Review Artifacts

Two append-only files with clear ownership:

- `review/{phase}-feedback.md` — review agent writes findings (append `## Round N`)
- `review/{phase}-changelog.md` — main agent writes what it fixed (append `## Round N`)
- `review/{phase}-reviewer-{name}-round-N.log` — captured stdout/stderr for debugging reviewer failures

Each agent only writes to its own file and reads the other's.

## Flow

1. Run `specdev reviewloop <phase>` — lists reviewers
2. Ask the user whether to run review-only or review-then-autocontinue
3. Ask reviewer type as a second multiple-choice question
4. Run `specdev reviewloop <phase> --reviewer=<name>`
5. Command spawns reviewer, waits for completion
6. Reads verdict from `review/{phase}-feedback.md`
7. **Pass** → auto-approves phase, then run `specdev next --json` and follow the returned action
8. **Fail** → run `specdev check-review` to read findings, fix issues, write `{phase}-changelog.md`
9. Re-run `specdev reviewloop` for next round

## Autocontinue Contract

When `--autocontinue` is present and the review is approved:

- Do not stop after an approved autocontinue review.
- Run `specdev next --json` and follow the returned action instead of hardcoding phase transitions.
- For brainstorm approval, carry the same reviewer forward when the next runtime action asks for implementation review.
- For implementation approval, follow `specdev next --json` immediately.
- If a reviewer returns `needs-changes`, run `specdev check-review`, address findings, write the changelog, and rerun reviewloop within max rounds.

## Hard Rules

1. **Never skip check-review** — always read findings before the next round
2. **Never argue with findings** — fix what the reviewer says or escalate to the user
3. **Never exceed max rounds** — when max is reached, stop and defer to the user
