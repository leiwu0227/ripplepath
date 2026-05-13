# SpecDev Migration Guide

Use this guide when a project has an older or ad hoc `.specdev/` layout and you
need to move artifacts into the current structure. Migration is a semantic task:
inspect first, write a plan, ask the user, then apply only approved moves.

## Target Structure

Current SpecDev projects use this shape:

```text
.specdev/
├── .current
├── .gitignore
├── _main.md
├── _index.md
├── _guides/
├── _templates/
├── workflow.yaml              # workflow contract; installed by `specdev init/update`
├── agents/
│   ├── README.md
│   └── researcher/            # runtime agent spec (referenced by workflow-contract.js)
├── assignments/<id>/
│   ├── brainstorm/
│   ├── breakdown/
│   ├── implementation/
│   ├── review/
│   └── context/
├── cache/                     # generated; must be gitignored
├── discussions/
├── knowledge/
│   ├── architecture/
│   ├── codestyle/
│   ├── domain/
│   ├── workflow/
│   └── workflow_feedback/     # 5th branch; SpecDev-workflow observations
├── migration/                 # transient; this guide writes layout-plan.md here
├── project_notes/
├── project_scaffolding/
└── skills/
```

The `agents/`, `workflow.yaml`, and `knowledge/workflow_feedback/` paths are
load-bearing: they are wired into `src/utils/workflow-contract.js`,
`src/utils/workflow-runtime.js`, `src/commands/{context,knowledge}.js`,
`src/utils/{working-memory,update,knowledge}.js`, and locked by
`tests/test-workflow-contract-drift.js` and `tests/test-init.js`. Do not
propose moving them.

## Agent Workflow

1. Read `.specdev/_main.md` and this guide.
2. Inventory `.specdev/` without moving files.
3. **Cross-check the runtime contract before proposing any move.** Any path
   referenced by `src/utils/workflow-contract.js`, `src/commands/`,
   `src/utils/`, or the drift tests is load-bearing — recommend "Leave in
   place" rather than a move, even if the path is not in the Target
   Structure block above. When in doubt: `grep -rn '<path>' src tests
   templates`.
4. Classify each remaining non-conforming artifact.
5. Write `.specdev/migration/layout-plan.md`.
6. Ask the user to approve the plan and answer open questions.
7. Apply only approved changes.
8. Verify with `specdev status --json` and summarize the final structure.

Useful inventory commands:

```bash
find .specdev -maxdepth 2 -type d | sort
find .specdev -maxdepth 2 -type f | sort
specdev status --json
specdev skills --json
```

## Classification Rules

| Artifact | Likely destination | Notes |
| --- | --- | --- |
| Assignment phase files | `assignments/<id>/<phase>/` | Use the phase folder names from the current workflow. |
| Assignment research or logs | `assignments/<id>/context/` | Keep supporting material near the assignment. |
| Current project facts | `project_notes/` | Use for living notes that agents should read often. |
| Durable cross-assignment learning | `knowledge/<branch>/` | Use `architecture`, `codestyle`, `domain`, `workflow`, or `workflow_feedback` (SpecDev-workflow observations, not project process). |
| Source maps or generated structure notes | `project_scaffolding/` | Use for scaffolding and project inventory material. |
| `workflow.yaml` at `.specdev/` root | Leave in place | Workflow-contract artifact installed by `specdev init/update`; consumed by `src/utils/workflow-runtime.js`. Should be tracked in git. |
| `agents/` and `agents/<name>/` | Leave in place | Runtime agent specs referenced by `src/utils/workflow-contract.js`. |
| `_archive/`, `archive/`, historical plans/designs | Leave in place or move out of `.specdev/` | Project history; safe to keep, or relocate to repo-level `docs/archive/` if the user prefers. Never delete without explicit approval. |
| `migration/` | Leave in place (transient) | Created by this guide. Safe to delete after the migration is complete and approved. |
| Ad hoc docs, wiki, images, editor metadata | Needs user decision | Ask whether to keep inside SpecDev, move outside it, or delete. |

When uncertain, leave the file in place and list it under "Needs User Decision".

## Layout Plan Template

Create `.specdev/migration/layout-plan.md`:

```markdown
# SpecDev Layout Migration Plan

## Inventory Summary

- Current shape:
- Non-conforming top-level paths:
- Assignment folders checked:

## Proposed Moves

| From | To | Reason |
| --- | --- | --- |

## Leave In Place

| Path | Reason |
| --- | --- |

## Needs User Decision

| Path | Question |
| --- | --- |

## Risks

- Existing destination conflicts:
- Ambiguous ownership:
- Files that may belong outside `.specdev/`:

## Verification

- Commands to run after migration:
- Expected final checks:
```

## Safety Rules

- Do not overwrite existing files.
- Do not delete artifacts unless the user explicitly approves deletion.
- Preserve file content and history where practical.
- Prefer `git mv` for tracked files.
- Keep project-specific content out of managed system folders unless it belongs there.
- Do not edit `_main.md`, `_index.md`, `_guides/`, `_templates/`, or `skills/` for project notes.
- Ensure `.specdev/.gitignore` includes `cache/` so generated files (e.g. `knowledge.sqlite`) are not committed.

## Legacy Assignment-File Migration

For the old deterministic V3-to-V4 assignment migration, use the explicit
subcommand:

```bash
specdev migrate legacy-assignments --dry-run
specdev migrate legacy-assignments
specdev migrate legacy-assignments --assignment=<assignment-id>
```

This subcommand only handles root-level assignment files:

- `proposal.md` -> `brainstorm/proposal.md`
- `design.md` -> `brainstorm/design.md`
- `plan.md` -> `breakdown/plan.md`
- `implementation.md` -> `implementation/implementation.md`
- `validation_checklist.md` -> `review/validation_checklist.md`

It also ensures `context/` exists and creates `implementation/progress.json`
when `implementation/` exists. Existing destination files are skipped.
