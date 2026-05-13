---
name: parallel-worktrees
description: Git worktree isolation for parallel task execution
type: core
---

# Parallel Worktrees

## Contract

- **Input:** A plan with independent tasks (no overlapping file writes, no shared state)
- **Process:** Analyze parallelizability → create worktrees → dispatch work → merge → integration test
- **Output:** Merged implementation with all tasks integrated
- **Next skill:** verification-before-completion

## Scripts

| Script | Purpose | When to run |
|--------|---------|-------------|
| `.specdev/skills/core/parallel-worktrees/scripts/setup-worktree.sh` | Create a git worktree + branch for a task | Before dispatching work to a worktree |

## Process

### Step 1: Analyze Parallelizability

Before creating worktrees, verify the tasks can run in parallel:

1. List all files each task will create or modify
2. Check for overlaps — if two tasks touch the same file, they CANNOT be parallelized
3. Check for shared state — if task B depends on task A's output, they are sequential
4. Only tasks with zero overlapping files AND zero shared state can be parallel

**Parallelizability criteria:**
- No overlapping file writes between tasks
- No shared state dependencies (task B doesn't need task A's output)
- No shared external resources (same database table, same API endpoint)

### Step 2: Setup Worktrees

For each parallelizable task:

1. Run `.specdev/skills/core/parallel-worktrees/scripts/setup-worktree.sh <project-root> <task-name> [base-branch]`
2. The script creates a worktree at `../<project>-worktrees/worktree/<task-name>`
3. Each worktree gets its own branch: `worktree/<task-name>`
4. Verify the worktree was created successfully (check the JSON output)

### Step 3: Dispatch Work

For each worktree:

1. Dispatch a subagent to the worktree directory
2. The subagent works in isolation — its changes don't affect other worktrees
3. Each subagent follows the same TDD cycle: test → implement → commit

### Step 4: Merge

After all worktrees complete:

1. Switch to the base branch
2. Merge each worktree branch one at a time
3. If merge conflicts occur — resolve them manually (this means the tasks weren't truly independent)
4. After merging, remove each worktree: `git worktree remove <path>`

### Step 5: Integration Test

After merging all branches:

1. Run the FULL test suite — not just individual task tests
2. Check for integration issues: naming conflicts, import errors, shared state problems
3. If integration tests fail — debug and fix before proceeding
4. This step is NOT optional — parallel work can create subtle integration bugs

## Red Flags

- Overlapping file writes between worktrees — tasks are not truly independent
- Skipping integration test after merge — parallel work ALWAYS needs integration testing
- Too many worktrees — more than 3-4 parallel tasks increases merge complexity
- Not removing worktrees after merge — they waste disk space and cause confusion

## Integration

- **Before this skill:** planning (identifies which tasks are independent)
- **After this skill:** verification-before-completion (final gate checks)
- **Alternative:** If tasks aren't parallelizable, use implementing (sequential) instead
