---
name: diagnosis
description: Bug reproduction and root cause analysis before planning a fix
type: core
phase: brainstorm
input: Bug report or unexpected behavior
output: brainstorm/proposal.md + brainstorm/design.md (root cause analysis + fix proposal)
next: breakdown
---

# Diagnosis

## Contract

- **Input:** A bug report, failing test, or unexpected behavior
- **Process:** Bug intake → systematic debugging → propose fix
- **Output:** `brainstorm/proposal.md` (bug description) + `brainstorm/design.md` (root cause + fix design)
- **Next phase:** breakdown (to plan the fix)

## Process

### Step 1: Understand the Bug

1. Read `brainstorm/proposal.md` if it exists, or ask the user:
   - Reproduction steps
   - Expected vs actual behavior
   - Impact (who is affected, how badly)
2. Write or update `brainstorm/proposal.md` with the bug description

**If the bug can't be reproduced from the description, do not proceed. Gather more information from the user.**

### Step 2: Reproduce and Find Root Cause

Search for prior context: run `specdev knowledge search "<bug-related keywords>"` (auto-indexes on first use) to check for prior decisions, known issues, or architecture notes related to the affected area. Use `rg` for current implementation facts.

Follow `skills/core/systematic-debugging/SKILL.md` Steps 1-5 (Reproduce → Gather Evidence → Hypothesize → Experiment → Confirm).

Record all evidence and experiment results — you'll need them for the design output.

### Step 3: Propose Fix

Write `brainstorm/design.md` with the root cause analysis and fix design:

```markdown
# Diagnosis: [Bug Title]

## Bug Summary
[What's broken and how to reproduce]

## Root Cause
[One clear sentence explaining WHY it happens]

## Evidence
- [Experiment 1: tested X, found Y]
- [Experiment 2: tested X, found Y]

## Proposed Fix
[What needs to change and why]

## Regression Test
[Description of the test that will prevent this from recurring]

## Risk Assessment
[What could go wrong with this fix, blast radius]
```

### Step 4: User Review

1. Present the root cause and proposed fix to the user
2. Get user approval before proceeding to breakdown

## Red Flags

- Skipping reproduction — if you can't reproduce it, you can't verify the fix
- Proposing a fix before understanding the root cause
- Skipping the systematic debugging process — don't jump to conclusions
