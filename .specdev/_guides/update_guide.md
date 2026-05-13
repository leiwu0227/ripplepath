# SpecDev Update Guide

After running `specdev update`, apply these manual patches to files that `specdev update` does not overwrite.

## CLAUDE.md

Ensure your project's `CLAUDE.md` contains the following line near the top (before the `Read .specdev/_main.md` line):

```
`specdev` is a Node.js CLI — run it directly as `specdev <command>`. It is NOT a Python package. Never use pip, python, or pipx to install or run it.
```

If this line is missing, add it.

## Review artifacts (v0.0.5+)

Review feedback files are now per-phase: `review/{phase}-feedback.md` and `review/{phase}-changelog.md` (e.g. `brainstorm-feedback.md`, `implementation-changelog.md`).

If you have active assignments with a `review/review-feedback.md` or `review/changelog.md`, rename them to match the current phase:

```bash
# Example: assignment in implementation phase
mv review/review-feedback.md review/implementation-feedback.md
mv review/changelog.md review/implementation-changelog.md
```
