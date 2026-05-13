---
name: specdev-check-review
description: Read and address review feedback from a separate review session
---

Run `specdev check-review <phase>` to read review findings (phase is brainstorm or implementation).

Address the findings in the phase artifacts.
Write a summary of changes to `review/{phase}-changelog.md` under `## Round N`.
Then say "auto review" or run "specdev review" in a separate session.

Announce every subtask with "Specdev: <action>".
