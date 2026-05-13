# Skill: Receiving Code Review

**Always-apply.** Read at assignment start, follow throughout.

**Core principle:** Verify before implementing. Push back when wrong. Technical correctness over social comfort.

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. VERIFY: Check against codebase reality at cited file:line
3. EVALUATE: Technically sound for THIS codebase?
4. RESPOND: Technical acknowledgment or reasoned pushback
5. IMPLEMENT: One item at a time, test each
```

If any item is unclear, STOP and ask for clarification before implementing anything — items may be related.

## No Performative Agreement

Never respond with gratitude or flattery ("You're absolutely right!", "Great catch!", "Thanks for finding that!"). These signal performing compliance rather than evaluating feedback.

Instead: restate the requirement, ask questions, push back with evidence, or just fix it. The code shows you heard.

```
GOOD: "Fixed utils/validator.py:12 — added empty string guard"
GOOD: [Just fix it and show the diff]

BAD: "You're absolutely right!" → then implement
BAD: "Thanks for catching that!" → then implement
```

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Technically incorrect for this stack
- Conflicts with user's architectural decisions

How: use technical reasoning and reference working tests/code. Involve user if architectural.

If you pushed back and were wrong: "Verified and you're correct. My initial understanding was wrong because [reason]. Fixing." State it factually and move on.

## Response Format

- `Fixed <file:line>: <change>`
- `Disagree <file:line>: <evidence>`

## Deliverable

Append a feedback disposition section to `review/validation_checklist.md` with status for each finding.
