# Skill: Verification Before Completion

**Always-apply.** Read at assignment start, follow throughout.

**Core principle:** Evidence before claims, always. Spirit over letter — rephrasing the claim doesn't bypass the rule.

## The Gate

```
BEFORE claiming any status:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |

## Red Flags — STOP

- Using "should", "probably", "seems to" — these are not evidence
- Expressing satisfaction before verification ("Great!", "Done!")
- Relying on a previous run or partial check — run it fresh, run it complete

## Evidence Format

| Command | Exit Code | Key Output | Notes |
|---------|-----------|------------|-------|
| [exact command] | [0/1/...] | [summary line] | [context] |

## Deliverable

Add a `Verification Evidence` section in `review/validation_checklist.md` with the table above.
