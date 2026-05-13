---
name: specdev-discussion
description: Start a parallel brainstorming discussion
---

Run `specdev discussion "<description>"` to reserve a discussion ID.

Read the output to get the reserved ID (e.g. D00001) and folder path, then:
1. Follow `.specdev/skills/core/brainstorming/SKILL.md` for Phases 1-3 (Understand, Explore, Design), writing artifacts to the discussion's brainstorm/ folder
2. After writing brainstorm/proposal.md and brainstorm/design.md, add a row to `.specdev/project_notes/discussion_progress.md`
3. Tell the user: `specdev reviewloop discussion --discussion=<ID>` for review (optional)

**Discussions are NOT assignments.** Do NOT use `specdev reviewloop brainstorm`, `specdev approve`, or `specdev continue` — those require an assignment.

Announce every subtask with "Specdev: <action>".
