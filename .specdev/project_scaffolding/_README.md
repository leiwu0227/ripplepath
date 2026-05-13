# Project scaffolding guide

## Purpose

Optional, lightweight mirror of the production codebase so assignment
documentation and real files stay aligned. Use this directory when the
project benefits from a parallel index of files (cross-link from
assignments, surface ownership, summarise critical behaviour). Skip it if
your project doesn't need this layer — the directory is not load-bearing.

## How to use this directory

- Create subdirectories that reflect the real project structure (e.g.,
  `src/`, `apps/api/`, `packages/lib/`).
- For each tracked file, add a markdown stub that includes:
  - Assignment IDs touching the file (`#####_type_name`).
  - File purpose and critical behaviours.
  - Outstanding questions, TODOs, or follow-up items.
- Keep summaries concise — this directory stores guidance, not full source
  code.

## When to update

- Optional phase-end knowledge capture (see
  `skills/core/knowledge-capture/SKILL.md`).
- When new files are introduced or ownership changes.
- Whenever an assignment reveals insights that future contributors need
  near the code path.

## Suggested template

```
# File: path/to/file.py
- Assignments: 00012_feature_auth-flow, 00015_bugfix_token-expiry
- Purpose: Brief description
- Notes:
  - Important behaviour or integration detail
  - Follow-up item or monitoring reminder
```

## Tips

- Cross-link to assignments (`.specdev/assignments/#####_type_name/`) for
  deep context.
- Use stable identifiers for components to make diffing easier over time.
- Treat this mirror as living documentation; stale entries should be
  pruned or refreshed as part of new assignments.
