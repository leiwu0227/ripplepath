---
name: specdev-assignment
description: Create a new assignment and start the brainstorm phase
---

Run `specdev assignment "<user's description>"` to reserve an assignment ID.

For agents, prefer command-created assignment setup:

1. Pick a type (feature | bugfix | refactor | familiarization) and a short hyphenated slug based on the description
2. Run `specdev assignment "<user's description>" --type=<type> --slug=<slug>`
3. Read the JSON or text output to confirm the assignment was created and focused
4. Run `specdev next --json` to get the canonical next action
5. Follow the returned guide or command exactly

Only use the reserve-only form when a human explicitly wants to create folders manually.

Announce every subtask with "Specdev: <action>".
