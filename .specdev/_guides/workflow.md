# Workflow Guide

Every assignment follows these 3 required phases in order. Do not skip phases.

For action selection, use the runtime contract first:

```bash
specdev next --json
```

The runtime reads `.specdev/workflow.yaml`, the active assignment, artifact presence, gates, and progress, then returns one canonical next action with evidence, blockers, structured choices, and hook outcomes. This guide is the human-readable reference for the same workflow; it should not be treated as a second state machine.

---

## Phase 1: Brainstorm

**Goal:** Understand the problem and produce a validated design or research output.

**Output:** `brainstorm/proposal.md` + `brainstorm/design.md`

**Start:** Prefer `specdev assignment "<description>" --type=<type> --slug=<slug>`. This creates the assignment folder, creates the phase directories, and sets `.specdev/.current`.
- Valid assignment types: feature | bugfix | refactor | familiarization
- Reserve-only mode exists for manual folder creation: `specdev assignment "<description>"`
- To switch to an existing assignment: `specdev focus <id>` (updates `.specdev/.current`)
- To explore ideas without committing to a full assignment: `specdev discussion "<description>"` — creates a lightweight discussion folder; promote later with `specdev assignment "<desc>" --discussion=<id> --type=<type> --slug=<slug>`

**Choose the skill that matches your work:**
- Building or changing functionality → `skills/core/brainstorming/SKILL.md`
- Understanding existing code → `skills/core/investigation/SKILL.md`
- Diagnosing a bug → `skills/core/diagnosis/SKILL.md`

After setup, run `specdev next --json` and follow the returned guide or command.

**Checkpoint:** Run `specdev checkpoint brainstorm`.
Must pass before requesting review.

**Review (optional):**
- `specdev review brainstorm` — manual review in a separate session
- `specdev reviewloop brainstorm` — automated review via external CLI (e.g., Codex)

**Gate:** `specdev approve brainstorm` must have been run. If `specdev reviewloop --autocontinue` approved the phase, continue with the next action from its contract or from `specdev next --json`.

---

## Phase 2: Breakdown

**Goal:** Turn the approved design into an implementation plan with coherent tasks, verification guidance, and an execution mode.

**Skill:** `skills/core/breakdown/SKILL.md`

**Internal reviews:** Design review (up to 2 rounds) then plan review (1-2 rounds). Both run automatically inside breakdown.

**Output:** `breakdown/plan.md`

After writing the plan, run `specdev next --json` for the next implementation action.

---

## Phase 3: Implement

**Goal:** Execute tasks using the plan's execution mode and task-level verification/review.

**Skill:** `skills/core/implementing/SKILL.md`

**Checkpoint:** Run `specdev checkpoint implementation`.
Must pass before requesting review.

**Review (optional):**
- `specdev review implementation` — manual review in a separate session
- `specdev reviewloop implementation` — automated review via external CLI (e.g., Codex)

**Gate:** `specdev approve implementation` must have been run. If `specdev reviewloop --autocontinue` approved the phase, continue with the next action from its contract or from `specdev next --json`.

---

## Optional Phase-End Knowledge Capture

**Goal:** Capture reusable knowledge only when it helps future assignments.

**Skill:** `skills/core/knowledge-capture/SKILL.md`

**Output:** Optional direct updates to `knowledge/` or `project_notes/`. This never blocks workflow progress.

At the end of brainstorm, breakdown, or implementation, suggest capture only if the phase produced reusable knowledge. Search first with `specdev knowledge search "<issue>"`. Prefer prune-and-replace: update or replace an existing note when one applies; create a concise new note only when no existing note fits. Ask the user before writing.

---

## Always-Apply Skills

Read these before starting any assignment:
- `skills/core/verification-before-completion.md` — no completion claims without evidence
- `skills/core/receiving-code-review.md` — no performative agreement in reviews
- `_guides/codestyle_guide.md` — coding standards
