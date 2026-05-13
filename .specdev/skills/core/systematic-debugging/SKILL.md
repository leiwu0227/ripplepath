---
name: systematic-debugging
description: Root-cause-first debugging with evidence gathering
type: core
---

# Systematic Debugging

## Contract

- **Input:** A failing test, bug report, or unexpected behavior
- **Process:** Reproduce → gather evidence → hypothesize → experiment → confirm → fix + regression test
- **Output:** Root cause identified, regression test written, fix committed
- **Next skill:** verification

## Scripts

This skill has no scripts of its own. It references:

| Script | Source | When to run |
|--------|--------|-------------|
| `.specdev/skills/core/test-driven-development/scripts/verify-tests.sh` | test-driven-development skill | To run tests and verify reproduce/fix status |

## Process

### Step 1: Reproduce

Make the bug happen reliably.

1. Run `test-driven-development/scripts/verify-tests.sh <project-root>` to see current test state
2. If there's a failing test — that's your reproduction. Note the exact error message.
3. If no failing test — write one that demonstrates the bug
4. Confirm the test fails consistently (run it 2-3 times)
5. Record: what fails, exact error, which file/line

### Step 2: Gather Evidence

Understand the context before guessing.

1. Read the failing code path — trace from test to implementation
2. Check recent commits — did something change recently?
3. Read error messages carefully — they often point to the exact problem
4. Check inputs and outputs at each step of the code path
5. Note any assumptions the code makes

### Step 3: Hypothesize

Form your top 3 hypotheses, ranked by likelihood.

1. Based on evidence, list your top 3 possible root causes
2. Rank them by likelihood (most likely first)
3. For each hypothesis, write: "If this is the cause, I expect to see [X] when I [Y]"
4. Each hypothesis must be testable — you need a way to confirm or rule it out

**Rules:**
- Maximum 3 hypotheses at a time
- Most likely first
- Each must be testable

### Step 4: Experiment

Test ONE hypothesis at a time.

1. Start with hypothesis #1 (most likely)
2. Run the experiment you described in Step 3
3. Record the result: confirmed or ruled out
4. If ruled out, move to hypothesis #2
5. If all 3 ruled out, go back to Step 2 with new evidence

**Rules:**
- One hypothesis at a time — do not test multiple simultaneously
- Record every experiment and result
- If you're on hypothesis #3 and it's ruled out, re-gather evidence

### Step 5: Confirm

Verify you found the actual root cause.

1. You have a confirmed hypothesis — now verify it's the ROOT cause, not a symptom
2. Ask: "If I fix this, will the bug be fully resolved, or will it just move?"
3. If it's a symptom, go deeper — what caused THIS to happen?
4. Write down the root cause in one sentence

### Step 6: Fix + Regression Test

Fix the root cause and prevent regression.

1. Write a regression test that fails with the current code (RED)
2. Run `test-driven-development/scripts/verify-tests.sh <project-root>` — confirm it fails
3. Apply the fix — minimal change to address the root cause
4. Run `test-driven-development/scripts/verify-tests.sh <project-root>` — confirm ALL tests pass (GREEN)
5. Commit the fix + regression test together

## Red Flags

- Fixing symptoms instead of root causes — keep asking "why?" until you reach the root
- Skipping the regression test — every fix needs a test that would catch the bug if it recurred
- Testing multiple hypotheses at once — one at a time, record each result
- Guessing without evidence — gather evidence before forming hypotheses
- Making the test pass by weakening it — fix the code, not the test
- Spending too long on one hypothesis — if 3 experiments don't confirm it, move on

## Integration

- **Before this skill:** executing or verification (surfaces the failing test)
- **After this skill:** verification (confirm the fix is complete)
- **Always paired with:** test-driven-development (for the regression test)
