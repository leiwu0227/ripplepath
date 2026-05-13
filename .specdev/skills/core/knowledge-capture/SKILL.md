---
name: knowledge-capture
description: Optional phase-end capture of reusable knowledge with prune-and-replace discipline
type: core
phase: phase-end
input: Completed workflow phase
output: Small updates to knowledge/ or project_notes/ when useful
next: null
---

# Knowledge Capture

## Contract

- **Input:** A completed brainstorm, breakdown, or implementation phase
- **Process:** Notice reusable knowledge -> search existing knowledge -> prune/replace stale notes -> ask user before writing -> update the smallest durable note
- **Output:** Optional direct updates to `knowledge/` or `project_notes/`
- **Next:** None. This guide never blocks workflow progress.

Knowledge capture is opportunistic. Do not write notes just because a phase ended. Suggest capture only when the learning is reusable for future assignments.

## When To Suggest Capture

Suggest capture only if at least one is true:

- A repo fact, command, architecture pattern, or workflow rule changed
- The agent learned a recurring gotcha that future agents are likely to hit
- A previous knowledge note is stale, duplicated, or contradicted
- A design decision or testing lesson will affect future assignments

Skip capture when the observation is one-off, obvious from nearby code, or already covered by existing knowledge.

## Phase Guidance

| Phase ending | Useful capture candidates |
|--------------|---------------------------|
| brainstorm | design decisions, scope boundaries, repo facts discovered during context scan |
| breakdown | planning heuristics, task sizing lessons, workflow friction |
| implementation | implementation patterns, test budget lessons, commands, recurring failures |

## Capture Flow

1. State the candidate knowledge in one or two bullets.
2. Search first:

```bash
specdev knowledge search "<topic keywords>"
```

3. Choose one action:
   - `skip` — already covered or not durable
   - `update` — existing note is mostly correct
   - `replace` — existing note is stale or duplicated
   - `add` — genuinely new durable knowledge
4. Ask the user before writing:
   - "Record this to knowledge? yes/no/edit"
5. If approved, write the smallest useful update.
6. Run `specdev knowledge index` after writing or replacing knowledge notes.

## Prune-And-Replace Rules

Prefer prune-and-replace over accumulation.

Before adding a note:

- Inspect related search results and nearby files in `knowledge/`
- Delete stale, duplicate, or contradicted knowledge
- Replace broad historical commentary with current contract-level guidance
- Add a new file only if no existing note fits

Keep knowledge that describes current architecture, supported compatibility behavior, public CLI contracts, recurring bugs, review findings, safety/security behavior, and repo-specific commands.

Remove or replace knowledge that is obsolete, vague, duplicated by a newer note, tied to unsupported workflow behavior, or only useful as historical commentary.

## Destinations

Use these branches:

- `knowledge/codestyle/` — naming conventions, formatting patterns, code style decisions
- `knowledge/architecture/` — system design, component relationships, key decisions
- `knowledge/domain/` — domain concepts and business logic patterns
- `knowledge/workflow/` — project-local process knowledge and tool usage observations
- `knowledge/workflow_feedback/` — SpecDev workflow/product issues or improvement ideas

For reusable project workflow knowledge, use a short FAQ-style note:

```markdown
# <Question or Gotcha>

## Short Answer
<What should the agent do?>

## Applies When
<When this guidance is relevant>

## Example
<Command, decision, or concrete situation>

## Source
- Assignment: <assignment id/name>
- Phase: brainstorm | breakdown | implementation
```

For SpecDev workflow feedback, copy `_templates/workflow_feedback_note.md` into `knowledge/workflow_feedback/<short-slug>.md` and fill every field. If a related feedback note exists, update it instead of creating a duplicate by refreshing `Last seen`, `Assignments observed`, `Current Mitigation`, and `Proposed Action`.

## Red Flags

- Writing knowledge without first running `specdev knowledge search`
- Adding a new note when an existing note should be updated or replaced
- Preserving obsolete workflow behavior as durable guidance
- Capturing vague reflections like "it went fine"
- Blocking phase progress on knowledge capture

## Integration

- **Runs as:** optional non-blocking `phase:end` hook
- **Before this guide:** any completed phase
- **After this guide:** continue with `specdev next --json` or the user's next requested action
