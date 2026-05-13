---
name: specdev-layout-migration
description: Guide an agent through a safe, user-approved .specdev layout migration
---

Read `.specdev/_guides/migration_guide.md`.

Follow the guide as an interactive migration workflow:

1. Inspect the existing `.specdev/` tree without moving files.
2. **Cross-check the runtime contract before proposing any move.** `grep -rn '<path>' src tests templates`. Paths referenced by `src/utils/workflow-contract.js`, `src/commands/`, `src/utils/`, or the drift tests are load-bearing — recommend "Leave in place" even if they are not in the guide's Target Structure block.
3. Classify the remaining artifacts against the modern structure.
4. Write `.specdev/migration/layout-plan.md` with proposed moves, files to leave in place, and questions for the user.
5. Ask the user to approve the plan before editing.
6. Apply only approved moves, preserving content and avoiding overwrites.
7. Verify with `specdev status --json` and summarize what changed.

If the user only needs the old deterministic assignment-file migration, discuss `specdev migrate legacy-assignments --dry-run` first.

Announce every subtask with "Specdev: <action>".
