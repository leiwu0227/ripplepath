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

Without `--reviewer`: lists available reviewers and emits a runtime `interaction` block — render it via `AskUserQuestion` (Claude Code) or its host equivalent using the exact labels and order. Do not paraphrase, reorder, or drop options.
With `--reviewer`: spawns the reviewer and processes the result.
With `--autocontinue`: on approval the runtime prints a `continuation` block — when `interrupt: false`, invoke the printed command immediately without prompting the user.

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

1. Run `specdev reviewloop <phase>` — lists reviewers and emits an `interaction` block when reviewer selection is required. Render it via `AskUserQuestion` (Claude Code) or its host equivalent, using the exact labels and order. Do not paraphrase, reorder, or drop options.
2. Run `specdev reviewloop <phase> --reviewer=<name>` (the value the user picked).
3. Command spawns reviewer, waits for completion, reads verdict from `review/{phase}-feedback.md`.
4. **Pass** → command auto-approves the phase and may print a `continuation` block. After any command that prints a `continuation` block with `interrupt: false`, invoke the printed command immediately without prompting the user.
5. **Fail** → run `specdev check-review` to read findings, fix issues, write `{phase}-changelog.md`, then re-run `specdev reviewloop` for the next round.

## Autocontinue Contract

The runtime is the single source of truth for what happens after an approved review. Honour the `continuation` block emitted by the CLI; do not hardcode reviewer carry, phase transitions, or "stop and ask" behaviour in this skill. Sticky values such as the carried reviewer are persisted by the runtime in `.specdev/.session-state.json`. If a reviewer returns `needs-changes`, run `specdev check-review`, address findings, write the changelog, and rerun reviewloop within max rounds.

When the runtime does not print a `continuation` block (e.g., manual review chosen, or reviewer needs-changes), consult `specdev next --json` to discover the canonical next action rather than guessing.

## Hard Rules

1. **Never skip check-review** — always read findings before the next round
2. **Never argue with findings** — fix what the reviewer says or escalate to the user
3. **Never exceed max rounds** — when max is reached, stop and defer to the user
