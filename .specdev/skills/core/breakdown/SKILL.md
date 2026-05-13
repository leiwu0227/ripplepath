---
name: breakdown
description: Turn a validated design into a concise, executable implementation plan — automatic, no user interaction
type: core
phase: breakdown
input: brainstorm/design.md
output: breakdown/plan.md
next: implementing
---

# Breakdown

## Contract

- **Input:** `brainstorm/design.md` from the assignment folder
- **Process:** Review design (subagent, up to 2 rounds) → decompose into coherent tasks → choose execution mode → write concise task contracts with verification
- **Output:** `breakdown/plan.md` in the assignment folder
- **Next phase:** determined by `specdev next --json` after the plan is ready

## Process

### Phase 1: Design Review

Before decomposing, verify the design is complete enough to plan against. Dispatch a subagent to review `brainstorm/design.md`:

**Review criteria:**
- Are the goal, architecture, and success criteria clear and specific?
- Are there obvious gaps (missing error handling, unclear data flow, unaddressed edge cases)?
- Is the scope well-bounded (no vague "and more" items)?
- Are decisions documented with reasoning?

**Does NOT check:** code-level details or whether the design is the "best" approach (user already approved the direction).

**If issues found:**
1. Fix `brainstorm/design.md` directly — add missing sections, clarify vague language, tighten scope
2. Re-review (max 2 rounds total)
3. If still failing after 2 rounds: surface findings to user and pause

This is a lightweight sanity check — the design was already validated section-by-section with the user during brainstorm.

### Phase 2: Read Design and Decompose

1. Read `brainstorm/design.md` — understand the architecture, components, and success criteria
2. Search for prior implementation patterns: run `specdev knowledge search "<feature-related keywords>"` (auto-indexes on first use) to find how similar features were structured. Use prior patterns to inform task sizing and structure.
3. Break the design into ordered tasks. Each task should be:

- **A coherent implementation slice** — usually one component, behavior, or integration point
- **Sized for reviewable progress** — typically 20-60 minutes, smaller for risky changes
- **Independent enough to commit** — each task produces working code
- **Ordered by dependency** — later tasks build on earlier ones

Avoid tiny artificial tasks. A task should be small enough to review, but large enough to represent a coherent change.

### Phase 2.5: Choose Execution Mode

Add an execution mode to the plan header:

- `inline`: Main agent executes tasks directly. Use for small, tightly coupled, or ordinary changes.
- `subagent`: Fresh subagent per task. Use when tasks have clear boundaries and the handoff value outweighs coordination cost.
- `parallel`: Independent subagents/worktrees. Use only when file ownership is disjoint and integration risk is low.

Default to `inline` unless the plan has naturally independent task boundaries.

### Phase 3: Detail Each Task

Every task MUST be an H3 heading (`### Task N: …`). The breakdown scripts grep for `^### Task [0-9]` — H2 (`## Task N:`) silently produces zero tasks and breaks downstream tracking.

Every task MUST follow this structure (compact form shown):

    ### Task N: [Name]
    **Mode:** lightweight | standard | full
    **Skills:** [skill-a, skill-b]
    **Files:** exact paths expected to change

    **Work:**
    - concise implementation bullets

    **Verify:**
    - `exact command` or `text-only scan`

    **Test Budget:** +<count> in <test files>; <runtime-class>
    e.g. `+1 in tests/test-foo.js; focused (<30s)`
    e.g. `+0; text-only` (lightweight tasks)
    e.g. `+2 in tests/test-foo.js, tests/test-bar.js; focused (<30s) — justify why two`

    **Test Pruning:**
    - prune/replace nearby stale or duplicate tests before adding new tests

    **Commit:** `git commit -m "..."`

Mode rules:
- `lightweight`: no TDD, no reviewer subagent, and no per-task executable tests. Use for docs, templates, command text, scaffolding, and deterministic config with no executable behavior change. Cheap text-only checks are allowed; defer executable tests to final verification if needed.
- `standard` (default): test-first when behavior changes; otherwise implement directly with focused verification and self-review.
- `full`: strict TDD + reviewer subagent (unified spec + quality review). Use only when task is complex or risky.

Assign `full` when ANY of these apply:
- Task introduces new architecture (new module, new pattern, new abstraction)
- Task is security-sensitive (auth, input validation, crypto)
- Task is integration-heavy (wiring multiple components together)
- Task changes shared behavior with broad blast radius

Use `standard` for ordinary behavior changes. Use `lightweight` aggressively for wording, templates, docs, and simple deterministic refactors.

Test budget rules:

*Count* (how many new tests):
- Default: **at most 1 new test per task** (`+1`). The plan header declares an aggregate ceiling (default **≤ 5 new tests across the plan**); the sum of per-task `+N` values must not exceed it without an explicit justification line in the plan.
- Lightweight tasks default to `+0` (no executable tests).
- Tasks adding more than one test must include a one-line justification in the **Test Budget:** line (e.g. `+2 ... — second test covers the error path that cannot be combined with the happy path`).
- The implementation reviewer counts tests added per task (via grep / framework-appropriate counter) and flags any task whose actual count exceeds its declared `+N`. See `review-agent/prompts/implementation-reviewer.md`.

*Runtime* (how slow):
- Focused task verification should be under 30 seconds.
- Final assignment verification should be under 2 minutes.
- Full-suite verification is only for broad executable risk and must be justified in the task.

Test pruning rules:
- Prefer prune-and-replace over additive testing.
- Before adding tests, inspect nearby tests for the same behavior.
- Delete stale, duplicate, or implementation-detail tests and replace them with the smallest current contract test.
- Do not preserve obsolete historical assertions unless the current design explicitly supports that behavior.
- Keep backward-compatibility, migration, public CLI contract, regression, safety, and security tests when the supported behavior still exists.

**Skill declaration:** Run `specdev skills` to list available skills. Declare only what each task needs:

| Task involves | Declare skill |
|---------------|--------------|
| Writing new code | `test-driven-development` |
| Debugging | `systematic-debugging` |
| Project-specific tool | exact name from `specdev skills` |

### Phase 4: Write Plan

1. Write the plan with header:

```
# [Feature Name] Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** [One sentence from design]

**Architecture:** [2-3 sentences from design]

**Tech Stack:** [From design]

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks (default). If a higher cap is needed, state it here with one-sentence justification.

---
```

2. Write all tasks in order
3. Save to `breakdown/plan.md` in the assignment folder
4. A subagent review (1-2 rounds) will check the plan for completeness and correctness
   - If the review finds issues: address them and re-run the review

### Phase 5: Start Implementation (MANDATORY — do not stop here)

Breakdown has NO user gate. Once the plan review passes, you MUST continue immediately through the runtime contract:

Run `specdev next --json` and follow the returned command/guide. The expected next action is implementation.

Do NOT stop, report, or wait for user input between plan completion and implementation start.

## Design Principles

Apply these when planning tasks — they are not optional:

- **Modular** — small, focused units with clear boundaries and separation of duties
- **Minimal side effects** — prefer pure functions; isolate state changes
- **Idempotent** — operations should be safe to retry
- **No overengineering** — solve the actual problem, not hypothetical future ones
- **No deep layering** — avoid function call chains that obscure what's happening; prefer flat, direct code
- **Readable and reviewable** — code should be obvious at a glance; variable and function names must convey meaning
- **Elegant** — the simplest solution that fully solves the problem

## Rules

- Exact file paths always — never "add a test file"
- Concrete work bullets — never "add validation logic" with no target behavior
- Exact verification commands or an explicit text-only scan
- TDD is required for `full` tasks and for `standard` tasks that change executable behavior
- Lightweight tasks defer executable tests to final verification
- Tests should be pruned/replaced rather than added alongside stale coverage
- DRY, YAGNI — only what the design specifies
- Frequent commits — one per task

## Red Flags

- Vague task steps ("add error handling") — name the behavior and files
- Large unfocused tasks — split by component, behavior, or integration point
- Tiny artificial tasks — merge into coherent work
- Requiring full code blocks in breakdown — that duplicates implementation and slows the workflow

## Integration

- **Before this skill:** brainstorming (produces the design this skill reads)
- **After this skill:** use `specdev next --json` to auto-chain to implementation after plan review passes
- **Review:** Design review (subagent, up to 2 rounds) runs first, then plan review (subagent, 1-2 rounds). Do NOT use `specdev review` here — proceed directly to implementing
