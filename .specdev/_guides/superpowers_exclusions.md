# Superpowers Exclusions

When a specdev assignment is active, **do NOT invoke** the following `superpowers:` skills. Specdev's workflow already covers these concerns through its own phase-specific skills.

If the `using-superpowers` skill tells you to invoke one of these, ignore that instruction — specdev's version takes precedence.

| Superpowers skill | Covered by (specdev) |
|---|---|
| `superpowers:brainstorming` | Brainstorm phase — `skills/core/brainstorming/SKILL.md` |
| `superpowers:test-driven-development` | `skills/core/test-driven-development/SKILL.md` |
| `superpowers:verification-before-completion` | `skills/core/verification-before-completion.md` |
| `superpowers:systematic-debugging` | Diagnosis phase — `skills/core/diagnosis/SKILL.md` |
| `superpowers:writing-plans` | Breakdown phase — `skills/core/breakdown/SKILL.md` |
| `superpowers:executing-plans` | Implement phase — `skills/core/implementing/SKILL.md` |
| `superpowers:subagent-driven-development` | Implement phase — `skills/core/implementing/SKILL.md` |
| `superpowers:requesting-code-review` | `skills/core/review-agent/SKILL.md` |
| `superpowers:receiving-code-review` | `skills/core/receiving-code-review.md` |
| `superpowers:dispatching-parallel-agents` | `skills/core/parallel-worktrees/SKILL.md` |

## Non-excluded superpowers

Superpowers skills **not listed above** may still be invoked normally. Examples:
- `superpowers:using-git-worktrees` — fine to use
- `superpowers:finishing-a-development-branch` — fine to use
- `superpowers:writing-skills` — fine to use
- Any non-superpowers skills (e.g., `frontend-design`, `ui-ux-pro-max`) — unaffected
