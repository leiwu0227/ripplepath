#!/usr/bin/env bash
set -euo pipefail

# track-progress.sh — Track task execution progress
#
# Usage:
#   track-progress.sh <plan-file> <task-number> started    — Mark task as in progress
#   track-progress.sh <plan-file> <task-number> completed  — Mark task as completed
#   track-progress.sh <plan-file> summary                  — Show progress summary
#
# Output: Status message to stdout
# State: Creates/updates <assignment>/implementation/progress.json
# Exit: 0 on success, 1 on error

PLAN_FILE="${1:-}"
TASK_NUM="${2:-}"
ACTION="${3:-}"

if [ -z "$PLAN_FILE" ]; then
  echo "Error: plan file required" >&2
  echo "Usage: track-progress.sh <plan-file> <task-number> <started|completed>" >&2
  echo "       track-progress.sh <plan-file> summary" >&2
  exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: plan file not found: $PLAN_FILE" >&2
  exit 1
fi

ASSIGNMENT_DIR="$(cd "$(dirname "$PLAN_FILE")/.." && pwd)"
IMPLEMENTATION_DIR="${ASSIGNMENT_DIR}/implementation"
PROGRESS_FILE="${IMPLEMENTATION_DIR}/progress.json"
mkdir -p "$IMPLEMENTATION_DIR"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  TASK_COUNT=$(grep -c '^### Task [0-9]' "$PLAN_FILE" || true)

  if [ "$TASK_COUNT" -eq 0 ]; then
    echo "Error: no '### Task N:' headings found in $PLAN_FILE" >&2
    echo "       The breakdown scripts grep for '^### Task [0-9]' (H3)." >&2
    echo "       Did you use '## Task N:' (H2) by mistake? Tasks must be H3." >&2
    exit 1
  fi

  node -e "
    const fs = require('fs');
    const planFile = process.argv[1];
    const progressFile = process.argv[2];
    const taskCount = parseInt(process.argv[3], 10);
    const tasks = [];
    for (let i = 1; i <= taskCount; i++) {
      tasks.push({number: i, status: 'pending', started_at: null, completed_at: null});
    }
    const data = {plan_file: planFile, total_tasks: taskCount, tasks: tasks};
    fs.writeFileSync(progressFile, JSON.stringify(data, null, 2));
  " "$PLAN_FILE" "$PROGRESS_FILE" "$TASK_COUNT"
fi

# Handle summary action
if [ "$TASK_NUM" = "summary" ]; then
  node -e "
    const fs = require('fs');
    const progressFile = process.argv[1];
    const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    const completed = data.tasks.filter(t => t.status === 'completed').length;
    const inProgress = data.tasks.filter(t => t.status === 'in_progress').length;
    const pending = data.tasks.filter(t => t.status === 'pending').length;
    console.log('Progress: ' + completed + '/' + data.total_tasks + ' completed, ' + inProgress + ' in progress, ' + pending + ' pending');
  " "$PROGRESS_FILE"
  exit 0
fi

# Validate task number and action
if [ -z "$TASK_NUM" ] || [ -z "$ACTION" ]; then
  echo "Error: task number and action required" >&2
  exit 1
fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

case "$ACTION" in
  started)
    node -e "
      const fs = require('fs');
      const progressFile = process.argv[1];
      const taskNum = parseInt(process.argv[2], 10);
      const now = process.argv[3];
      const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
      const task = data.tasks.find(t => t.number === taskNum);
      if (task) {
        task.status = 'in_progress';
        task.started_at = now;
      }
      fs.writeFileSync(progressFile, JSON.stringify(data, null, 2));
    " "$PROGRESS_FILE" "$TASK_NUM" "$NOW"
    echo "Task ${TASK_NUM}: started"
    ;;
  completed)
    node -e "
      const fs = require('fs');
      const progressFile = process.argv[1];
      const taskNum = parseInt(process.argv[2], 10);
      const now = process.argv[3];
      const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
      const task = data.tasks.find(t => t.number === taskNum);
      if (task) {
        task.status = 'completed';
        task.completed_at = now;
      }
      fs.writeFileSync(progressFile, JSON.stringify(data, null, 2));
    " "$PROGRESS_FILE" "$TASK_NUM" "$NOW"
    echo "Task ${TASK_NUM}: completed"
    ;;
  *)
    echo "Error: action must be 'started' or 'completed'" >&2
    exit 1
    ;;
esac
