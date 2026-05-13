---
name: review-agent
description: Phase-aware holistic reviewer — runs via specdev review in a separate session
type: core
phase: verify
input: Assignment folder with completed phase outputs
output: review/{phase}-feedback.md
next: null
---

# Review Agent

## Contract

- **Input:** An assignment folder with completed phase outputs
- **Process:** Detect phase → read phase artifacts → holistic review → discuss findings with user
- **Output:** `review/{phase}-feedback.md` with verdict and findings
- **Next:** User communicates findings to the main agent session (or approves)

## How to Launch

User runs `specdev review brainstorm` or `specdev review implementation` in a separate Claude Code session. The command:

1. Detects the active assignment automatically
2. Uses the specified phase to load the review protocol
3. Starts an interactive review session with the user

## Prompts

| Prompt | Purpose | When to dispatch |
|--------|---------|-----------------|
| `.specdev/skills/core/review-agent/prompts/implementation-reviewer.md` | Review the full implementation holistically | After implementation phase completes |

**Note:** Breakdown plan review is handled by inline subagent review during the breakdown phase, NOT by `specdev review <phase>`. Do not wait for `specdev review` after breakdown — proceed directly to `specdev implement`.

## Review Protocol

### Brainstorm Review

Read `brainstorm/proposal.md` and `brainstorm/design.md`. Check:
- Is the goal clear and specific?
- Does the architecture make sense?
- Are the decisions well-reasoned?

**ALWAYS scan the codebase to verify claims** — never assume. Read the actual files, grep for symbols, check dependencies. Take eager effort to find answers; do not take shortcuts or guess based on naming conventions alone.

### Implementation Review

Use `.specdev/skills/core/review-agent/prompts/implementation-reviewer.md`. Check:
- Does the implementation match the design?
- Do all tests pass?
- Is there scope drift (things built that weren't in the design)?

**ALWAYS scan the codebase to verify claims** — never assume. Prefer simplification over addition. Flag patch-stacking where layered fixes should be consolidated. Flag special-case production code that exists only to satisfy tests — the tests may need updating instead. Only flag issues worth the cost of fixing.

## Feedback Format

### {phase}-feedback.md (written by review agent)

```markdown
## Round N

**Verdict:** approved | needs-changes

### Findings
1. [FN.1] Description of finding

### Addressed from changelog
- [FN.X] description of addressed finding
```

## Red Flags

- Nitpicking during holistic review — focus on macro issues, not style
- Approving without reading the actual files — always read the artifacts
- Skipping re-review after fixes — always verify fixes actually address findings

## Multi-Round Review

When `check-review` processes feedback with a `needs-changes` verdict:
1. Main agent addresses findings in the phase artifacts
2. Main agent appends changes to `review/{phase}-changelog.md` under `## Round N`
3. On subsequent `specdev review <phase>` runs, the reviewer reads the previous feedback and changelog
4. Round number increments from appended rounds in `review/{phase}-feedback.md`
5. Loop continues until verdict is `approved`

## Integration

- **Works with:** Main agent (brainstorming and implementing skills)
- **Launched by:** User, via `specdev review <phase>` in a separate session
- **Feedback loop:** Main agent uses `specdev check-review` to read and address findings
- **When to use:** Optionally after brainstorm (`specdev review brainstorm`) or implementation (`specdev review implementation`). Never between breakdown and implement — that transition is automatic
