#!/usr/bin/env bash
set -euo pipefail

# setup-worktree.sh — Create a git worktree + branch for a task
#
# Usage: setup-worktree.sh <project-root> <task-name> [base-branch]
# Output: JSON {"worktree_path": "...", "branch": "...", "base_branch": "...", "task_name": "..."}
# Creates: git worktree + branch worktree/<task-name>
# Exit: 0 on success, 1 on error

PROJECT_ROOT="${1:-}"
TASK_NAME="${2:-}"
BASE_BRANCH="${3:-}"

json_escape() {
  printf '%s' "$1" \
    | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\r/\\r/g' \
    | tr -d '\000-\010\013\014\016-\037' \
    | tr '\n' ' '
}

if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: project root directory required" >&2
  echo "Usage: setup-worktree.sh <project-root> <task-name> [base-branch]" >&2
  exit 1
fi

if [ -z "$TASK_NAME" ]; then
  echo "Error: task name required" >&2
  echo "Usage: setup-worktree.sh <project-root> <task-name> [base-branch]" >&2
  exit 1
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" && pwd)

# Verify this is a git repo
if ! git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Error: $PROJECT_ROOT is not a git repository" >&2
  exit 1
fi

# Determine base branch
if [ -z "$BASE_BRANCH" ]; then
  BASE_BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "main")
  if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH="main"
  fi
fi

BRANCH_NAME="worktree/$TASK_NAME"
PROJECT_NAME=$(basename "$PROJECT_ROOT")
WORKTREE_BASE=$(dirname "$PROJECT_ROOT")/"${PROJECT_NAME}-worktrees"
WORKTREE_PATH="$WORKTREE_BASE/$BRANCH_NAME"

# Create worktree directory parent
mkdir -p "$(dirname "$WORKTREE_PATH")"

# Create the worktree with a new branch
git -C "$PROJECT_ROOT" worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH" >/dev/null 2>&1

# Output JSON
echo "{\"worktree_path\":\"$(json_escape "$WORKTREE_PATH")\",\"branch\":\"$(json_escape "$BRANCH_NAME")\",\"base_branch\":\"$(json_escape "$BASE_BRANCH")\",\"task_name\":\"$(json_escape "$TASK_NAME")\"}"
