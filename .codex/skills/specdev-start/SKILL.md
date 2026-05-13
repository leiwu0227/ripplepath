---
name: specdev-start
description: Interactive Q&A to fill in your project's big_picture.md
---

Read `.specdev/project_notes/big_picture.md`.

**If it already has content** (not the default "TODO: filled by user" template):
- Present the current content to the user
- Ask: "This is your current big picture. Would you like to update it?"
- If yes, ask which sections to change. If no, you're done.

**If empty or still the template:**

1. Run `bash .specdev/skills/core/brainstorming/scripts/get-project-context.sh .` and review the output silently to orient yourself.

2. Ask the user the following questions **one at a time**, waiting for each answer before proceeding:
   - What does this project do? (1-2 sentence summary)
   - Who are the users or consumers of this project?
   - What's the tech stack? (languages, frameworks, key dependencies)
   - What are the key architectural decisions or patterns?
   - Any conventions or constraints the team follows?

3. After all questions are answered, compose a clean `big_picture.md` with the following sections and write it to `.specdev/project_notes/big_picture.md`:

```markdown
# Project Big Picture

## Overview
<what the project does>

## Users / Consumers
<who uses it>

## Tech Stack
<languages, frameworks, key deps>

## Architecture
<key decisions and patterns>

## Conventions & Constraints
<team rules, style guides, constraints>
```

4. Show the user the final content and ask them to confirm or request changes before writing.
