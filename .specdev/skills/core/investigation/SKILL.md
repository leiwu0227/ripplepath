---
name: investigation
description: Research and document existing code or systems through structured exploration
type: core
phase: brainstorm
input: User request to understand a code area or system
output: brainstorm/proposal.md + brainstorm/design.md (research findings + presentation)
next: breakdown (if follow-up work needed) or knowledge-capture (if research-only)
---

# Investigation

## Contract

- **Input:** A request to understand unfamiliar code, a system, or a domain area
- **Process:** Define learning objectives → investigate code → document findings → present to user
- **Output:** `brainstorm/proposal.md` (learning objectives) + `brainstorm/design.md` (findings and presentation)
- **Next phase:** breakdown (if the investigation leads to implementation work) or knowledge-capture (if research-only)

## Process

### Step 1: Define Objectives

1. Read `brainstorm/proposal.md` if it exists, or ask the user:
   - What code area or system needs understanding?
   - Why? (new team member, prepare for refactor, etc.)
   - Learning objectives — what specifically should you know at the end?
   - Scope constraints (time-box, depth level)
2. Write or update `brainstorm/proposal.md` with the objectives

### Step 2: Investigate

1. Search for prior knowledge: run `specdev knowledge search "<topic keywords>"` (auto-indexes on first use) with 1-2 queries related to the investigation topic. Look for prior decisions, architecture notes, and relevant context. Use `rg` for current implementation facts.
2. Find entry points (main files, API endpoints, test files)
3. Read code and follow function calls
4. Run code with different inputs to verify understanding
5. Write spike code to test hypotheses
6. Document findings as you go — don't wait until the end

**Investigation checklist:**
- How it works (components, data flow, key abstractions)
- Key files with line references (`file.py:123`)
- Important concepts and domain terms
- Hypotheses tested: "I thought X → Result: confirmed/wrong"
- Open questions that need follow-up

Mark facts (verified) vs assumptions (unverified) clearly. Time-box deep dives — prefer breadth-first with targeted drills.

### Step 3: Document and Present

Write `brainstorm/design.md` as a structured research report:

```markdown
# Investigation: [Topic]

## Summary
[2-3 sentences: what was investigated and key conclusion]

## Architecture
[Components, their roles, how they connect]

## Key Findings
- Finding 1 with file:line references
- Finding 2 with file:line references

## What Was Tested
- Hypothesis: [What I thought] → Result: confirmed / wrong

## Open Questions
- [What needs follow-up]

## Next Steps
- [ ] Follow-up task 1
- [ ] Follow-up task 2
```

### Step 4: User Review

1. Present `brainstorm/design.md` to the user
2. Walk through the key findings
3. Get user approval on completeness
4. If the investigation leads to implementation work, the next steps become the basis for breakdown

## Red Flags

- Documenting without investigating — read and run the code
- Skipping hypothesis testing — verify your mental model
- Missing file:line references — be specific
- Writing a journal instead of findings — organize by topic, not chronologically
