---
name: implementing
description: Execute a plan task-by-task using the plan's execution mode and task-level verification
type: core
phase: implement
input: breakdown/plan.md
output: Implemented code, committed per-task
next: null
---

# Implementing

## Contract

- **Input:** `breakdown/plan.md` from the assignment folder
- **Process:** Extract tasks -> execute inline or dispatch subagents based on plan execution mode -> mode-based verification/review -> commit -> progress report
- **Output:** Implemented code, committed per-task, with progress tracked
- **Next phase:** assignment complete after implementation approval; optional phase-end knowledge capture may be suggested

## Scripts

| Script | Purpose | When to run |
|--------|---------|-------------|
| `.specdev/skills/core/implementing/scripts/extract-tasks.sh` | Parse plan into structured JSON task list | At the start |
| `.specdev/skills/core/implementing/scripts/prepare-task.sh` | Mark started, resolve skills, output ready-to-use prompt + mode as JSON | Before dispatching each task |
| `.specdev/skills/core/implementing/scripts/complete-task.sh` | Mark completed, store summary, report progress | After each task completes |
| `.specdev/skills/core/implementing/scripts/track-progress.sh` | Low-level progress primitive (used internally by prepare/complete scripts) | For summary only |

## Prompts

| Prompt | Purpose | When to dispatch |
|--------|---------|-----------------|
| `.specdev/skills/core/implementing/prompts/implementer.md` | Fresh subagent to implement one task | Per task when execution mode is `subagent` or `parallel` |
| `.specdev/skills/core/implementing/prompts/code-reviewer.md` | Verify spec compliance first, then code quality | After implementer completes (`full` mode only) |

## Process

### Phase 1: Setup

1. Read `breakdown/plan.md`
2. Run `.specdev/skills/core/implementing/scripts/extract-tasks.sh <plan-file>` to get the structured task list
3. Review — execution mode, how many tasks, their names, file paths
4. Resolve execution mode from the plan header:
   - `inline`: implement tasks directly in this session
   - `subagent`: dispatch a fresh subagent per task
   - `parallel`: use `skills/core/parallel-worktrees/SKILL.md` only for disjoint file ownership
   - Missing or unknown mode: treat as `inline`

### Phase 2: Task Execution

Execute tasks in plan order. For each task:

1. **Prepare** — run `.specdev/skills/core/implementing/scripts/prepare-task.sh <plan-file> <N>`
   - This marks the task as started, resolves skills, and outputs JSON with `task_number`, `total_tasks`, `mode`, and `prompt`
   - You MUST use the `prompt` field from this output as the task contract — do not construct task instructions manually
2. **Execute task** according to execution mode:
   - `inline`: use the `prompt` as your task contract, then implement, verify, commit, and self-review in this session
   - `subagent`: dispatch a fresh subagent with the `prompt` from step 1; fresh subagent, no prior context
   - `parallel`: follow `skills/core/parallel-worktrees/SKILL.md` for isolated worktrees and integration
3. **Mode-based verification/review** — use the `mode` from step 1:
   - `lightweight`: do not run per-task executable tests. Run only cheap text-only checks listed by the task, if any. Defer executable tests to final verification.
   - `standard`: if executable behavior changed, run the focused relevant test or command; otherwise use the listed verification. Self-review only. Keep focused verification under 30 seconds unless justified.
   - `full`: use strict TDD and dispatch `.specdev/skills/core/implementing/prompts/code-reviewer.md` — FAIL/NOT READY blocks; fix findings → re-review loop.
4. **Complete** — run `.specdev/skills/core/implementing/scripts/complete-task.sh <plan-file> <N> "<summary of task changes>"`
   - This marks the task as completed, stores the summary, and reports progress

After meaningful checkpoints, report concise progress: tasks completed, verification run, and notable decisions. Do not stop for a user gate during implementation.

When touching tests:
- Prefer prune-and-replace over adding coverage.
- Inspect nearby tests before adding anything.
- Delete stale, duplicate, or implementation-detail tests and replace them with the smallest current contract test.
- Keep compatibility, migration, public CLI contract, regression, safety, and security tests when the supported behavior still exists.
- Do not preserve obsolete historical assertions just because they already exist.

### Phase 3: Final Review

1. Run the verification appropriate for the assignment risk. Use focused commands or text-only scans for narrow docs/template/config changes. Run executable tests once here for lightweight work if needed. Use the full test suite only for broad executable changes. Keep final verification under 2 minutes unless explicitly justified.
2. Run `.specdev/skills/core/implementing/scripts/track-progress.sh <plan-file> summary`
3. Present a summary to the user inline: what was built, tests passing, any notable decisions
4. Run `specdev checkpoint implementation`. After any specdev command that prints an `interaction` block, render it via `AskUserQuestion` (Claude Code) or its host equivalent, using the exact labels and order. Do not paraphrase, reorder, or drop options. If a chosen option has `requires_reviewer: true`, render the `follow_up` block as a second `AskUserQuestion`. After any command that prints a `continuation` block with `interrupt: false`, invoke the printed command immediately without prompting the user.
5. Stop and wait only when the runtime has not printed a non-interrupting `continuation` block.

## Red Flags

- **Constructing the implementer prompt manually instead of using `prepare-task.sh`** — the script handles progress tracking, skill resolution, and template filling automatically
- Summarizing task text — always send FULL task text to subagent
- Reusing a subagent across tasks in `subagent` mode — fresh context per task
- Forcing subagents onto tightly coupled work — use `inline` when boundaries are unclear
- Accepting first pass without fixing findings — loop until clean
- Skipping `complete-task.sh` after a task finishes — always record completion and summary
- **Loosening a test assertion to make it pass** — before relaxing any assertion, identify whether the test or the implementation is wrong. If the assertion came from `brainstorm/design.md` Success Criteria or `breakdown/plan.md`, the implementation is wrong by definition — trim/refactor to fit, or update the design first with a documented reason. Silent test relaxation is a unilateral spec change.

## Integration

- **Before this skill:** breakdown (creates the plan)
- **After this skill:** use `specdev next --json`; assignment completes after implementation approval, with optional phase-end knowledge capture
- **Review:** User may run `specdev review implementation` for optional holistic review after all tasks complete
