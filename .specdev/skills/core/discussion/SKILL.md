---
name: discussion
description: Start a parallel brainstorming discussion independent of assignments
type: core
phase: any
input: User topic or question to explore
output: discussions/<id>_<slug>/brainstorm/proposal.md + brainstorm/design.md
next: none (standalone)
---

# Discussion Skill

A discussion is a standalone brainstorming session — not tied to any assignment.
Use it to explore ideas, compare approaches, or think through a topic before committing to an assignment.

## Steps

1. Run `specdev discussion "<description>"` to reserve a discussion ID and folder
2. Read the output to get the reserved ID (e.g. `D00001`) and folder path
3. Follow `.specdev/skills/core/brainstorming/SKILL.md` for Phases 1-3 (Understand, Explore, Design), writing artifacts to the discussion's `brainstorm/` folder
4. After writing `brainstorm/proposal.md` and `brainstorm/design.md`, add a row to `.specdev/project_notes/discussion_progress.md`
5. Tell the user their options:
   - `specdev reviewloop discussion --discussion=<ID>` — automated external review
   - Skip review — discussion is exploratory, review is optional
6. Stop and wait for the user

## Important: Discussions are NOT assignments

- Do NOT run `specdev reviewloop brainstorm` — that requires an assignment
- Do NOT run `specdev approve brainstorm` — discussions have no approval gate
- Do NOT run `specdev continue` — discussions are standalone
- For review, use: `specdev reviewloop discussion --discussion=<ID>`

Announce every subtask with "Specdev: <action>".
