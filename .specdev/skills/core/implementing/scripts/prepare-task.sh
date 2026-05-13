#!/usr/bin/env bash
set -euo pipefail

# prepare-task.sh — Prepare a task for implementation
#
# Usage: prepare-task.sh <plan-file> <task-number>
# Output: JSON to stdout with task_number, total_tasks, mode, prompt
# Exit: 0 on success, 1 on error

PLAN_FILE="${1:-}"
TASK_NUMBER="${2:-}"

if [ -z "$PLAN_FILE" ] || [ -z "$TASK_NUMBER" ]; then
  echo "Error: plan file and task number required" >&2
  echo "Usage: prepare-task.sh <plan-file> <task-number>" >&2
  exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: plan file not found: $PLAN_FILE" >&2
  exit 1
fi

# Derive directory paths from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SPECDEV_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
PROJECT_ROOT="$(cd "$SPECDEV_DIR/.." && pwd)"

# Derive assignment info from plan file path
ASSIGNMENT_DIR="$(cd "$(dirname "$PLAN_FILE")/.." && pwd)"
ASSIGNMENT_NAME="$(basename "$ASSIGNMENT_DIR")"

# Step 1: Mark task as started
echo "Marking task ${TASK_NUMBER} as started..." >&2
"$SCRIPT_DIR/track-progress.sh" "$PLAN_FILE" "$TASK_NUMBER" started >&2

# Step 2: Read plan content and extract task info
CONTENT=$(cat "$PLAN_FILE")

TOTAL_TASKS=$(echo "$CONTENT" | grep -c '^### Task [0-9]' || true)

if [ "$TOTAL_TASKS" -eq 0 ]; then
  echo "Error: no '### Task N:' headings found in $PLAN_FILE" >&2
  echo "       The breakdown scripts grep for '^### Task [0-9]' (H3)." >&2
  echo "       Did you use '## Task N:' (H2) by mistake? Tasks must be H3." >&2
  exit 1
fi

if [ "$TASK_NUMBER" -lt 1 ] || [ "$TASK_NUMBER" -gt "$TOTAL_TASKS" ]; then
  echo "Error: task number ${TASK_NUMBER} out of range (1-${TOTAL_TASKS})" >&2
  exit 1
fi

# Extract full task text using sed (same approach as extract-tasks.sh)
NEXT_TASK=$((TASK_NUMBER + 1))
if echo "$CONTENT" | grep -q "^### Task ${NEXT_TASK}:"; then
  TASK_TEXT=$(echo "$CONTENT" | sed -n "/^### Task ${TASK_NUMBER}:/,/^### Task ${NEXT_TASK}:/p" | head -n -1)
else
  TASK_TEXT=$(echo "$CONTENT" | sed -n "/^### Task ${TASK_NUMBER}:/,\$p")
fi

if [ -z "$TASK_TEXT" ]; then
  echo "Error: could not extract text for task ${TASK_NUMBER}" >&2
  exit 1
fi

# Step 3: Determine mode (from **Mode:** field, default "standard")
MODE="standard"
MODE_LINE=$(echo "$TASK_TEXT" | grep '^\*\*Mode:\*\*' || true)
if [ -n "$MODE_LINE" ]; then
  MODE_RAW=$(echo "$MODE_LINE" | sed 's/^\*\*Mode:\*\*\s*//' | tr '[:upper:]' '[:lower:]' | xargs)
  case "$MODE_RAW" in
    full|standard|lightweight) MODE="$MODE_RAW" ;;
  esac
fi

# Step 4: Resolve skills
TASK_SKILLS=""
SKILLS_LINE=$(echo "$TASK_TEXT" | grep '^\*\*Skills:\*\*' || true)
if [ -n "$SKILLS_LINE" ]; then
  SKILLS_RAW=$(echo "$SKILLS_LINE" | sed 's/^\*\*Skills:\*\*\s*//')
  IFS=',' read -ra SKILL_ARRAY <<< "$SKILLS_RAW"
  for skill in "${SKILL_ARRAY[@]}"; do
    skill=$(echo "$skill" | xargs)  # trim whitespace
    if [ -z "$skill" ]; then
      continue
    fi

    SKILL_FILE=""
    if [ -f "$SPECDEV_DIR/skills/core/${skill}/SKILL.md" ]; then
      SKILL_FILE="$SPECDEV_DIR/skills/core/${skill}/SKILL.md"
    elif [ -f "$SPECDEV_DIR/skills/tools/${skill}/SKILL.md" ]; then
      SKILL_FILE="$SPECDEV_DIR/skills/tools/${skill}/SKILL.md"
    fi

    if [ -n "$SKILL_FILE" ]; then
      echo "Resolved skill: ${skill}" >&2
      SKILL_CONTENT=$(cat "$SKILL_FILE")
      TASK_SKILLS+="### Skill: ${skill}"$'\n\n'"${SKILL_CONTENT}"$'\n\n'
    else
      echo "Warning: skill not found: ${skill}" >&2
    fi
  done
fi

if [ -z "$TASK_SKILLS" ]; then
  TASK_SKILLS="No additional skills for this task."
fi

# Step 5: Read implementer template and fill placeholders
TEMPLATE_FILE="$SKILL_DIR/prompts/implementer.md"
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Error: implementer template not found: $TEMPLATE_FILE" >&2
  exit 1
fi

TEMPLATE=$(cat "$TEMPLATE_FILE")

# Fill placeholders
PROMPT="$TEMPLATE"
PROMPT="${PROMPT//\{TASK_TEXT\}/$TASK_TEXT}"
PROMPT="${PROMPT//\{PROJECT_ROOT\}/$PROJECT_ROOT}"
PROMPT="${PROMPT//\{ASSIGNMENT_NAME\}/$ASSIGNMENT_NAME}"
PROMPT="${PROMPT//\{TASK_NUMBER\}/$TASK_NUMBER}"
PROMPT="${PROMPT//\{TOTAL_TASKS\}/$TOTAL_TASKS}"
PROMPT="${PROMPT//\{TASK_SKILLS\}/$TASK_SKILLS}"

# Step 6: Output JSON using node for proper escaping
node -e "
  const data = {
    task_number: parseInt(process.argv[1], 10),
    total_tasks: parseInt(process.argv[2], 10),
    mode: process.argv[3],
    prompt: process.argv[4]
  };
  console.log(JSON.stringify(data, null, 2));
" "$TASK_NUMBER" "$TOTAL_TASKS" "$MODE" "$PROMPT"
