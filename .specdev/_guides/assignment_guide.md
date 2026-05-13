## How to complete a proposed assignment

## Setup rules

- User must provide an assignment description. If missing, ask for it.
- Run `specdev assignment "<description>"` to reserve the next ID. This sets `.specdev/.current` automatically.
  - To supply type and slug explicitly (e.g., in automated flows): add `--type=<type> --slug=<slug>`
  - To promote an existing discussion to a full assignment: add `--discussion=<id>`
- Create `.specdev/assignments/#####_type_name/`.
  - `#####` is the next 5-digit assignment number from `project_notes/assignment_progress.md`.
  - `type` is `feature`, `refactor`, `bugfix`, `familiarization`, etc.
  - `name` is kebab-case.
- Copy `.specdev/_templates/gate_checklist.md` to `review/validation_checklist.md`.

## Switching assignments

Run `specdev focus <id>` to change the active assignment. This updates `.specdev/.current` and is the only supported way to switch — do not edit `.current` manually.

## Before starting

Read always-apply skills: `skills/core/verification-before-completion.md` and `skills/core/receiving-code-review.md`. These apply to every assignment throughout.

## Workflow

All assignments follow the same 3 required phases. See `_guides/workflow.md` for the full guide.

1. **Brainstorm** — interactive Q&A → validated design
2. **Breakdown** — design → concise implementation plan with coherent tasks and verification guidance
3. **Implement** — plan execution mode with task-level verification/review

Optional phase-end knowledge capture records reusable knowledge only when useful.

## Assignment folder structure

`.specdev/assignments/[#####_type_name]/`

- `brainstorm/proposal.md` (user-approved)
- `brainstorm/design.md`
- `breakdown/plan.md`
- `implementation/implementation.md` (optional narrative)
- `implementation/progress.json`
- `review/validation_checklist.md`
- `review/{brainstorm,implementation}-feedback.md` (per-phase reviewer feedback)
- `review/{brainstorm,implementation}-changelog.md` (per-phase changelog when changes are made after review)
- `context/` (assignment-scoped research, notes, and supporting material)
- `status.json` (gate state)
