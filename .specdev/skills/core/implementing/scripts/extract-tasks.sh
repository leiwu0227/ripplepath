#!/usr/bin/env bash
set -euo pipefail

# extract-tasks.sh — Parse a plan file and output structured task list as JSON
#
# Usage: extract-tasks.sh <plan-file>
# Output: JSON array of tasks to stdout
# Exit: 0 on success, 1 on error

PLAN_FILE="${1:-}"

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
  echo "Error: plan file required and must exist" >&2
  echo "Usage: extract-tasks.sh <plan-file>" >&2
  exit 1
fi

CONTENT=$(cat "$PLAN_FILE")

# Extract task count
TASK_COUNT=$(echo "$CONTENT" | grep -c '^### Task [0-9]' || true)

if [ "$TASK_COUNT" -eq 0 ]; then
  echo "Error: no '### Task N:' headings found in $PLAN_FILE" >&2
  echo "       The breakdown scripts grep for '^### Task [0-9]' (H3)." >&2
  echo "       Did you use '## Task N:' (H2) by mistake? Tasks must be H3." >&2
  exit 1
fi

# Build JSON array
echo "["

TASK_NUM=0
while IFS= read -r header_line; do
  TASK_NUM=$((TASK_NUM + 1))

  # Extract task name
  TASK_NAME=$(echo "$header_line" | sed 's/^### Task [0-9]*:\s*//')

  # Extract task section — from this header to the next task header (or EOF)
  NEXT_TASK=$((TASK_NUM + 1))
  if echo "$CONTENT" | grep -q "^### Task ${NEXT_TASK}:"; then
    TASK_SECTION=$(echo "$CONTENT" | sed -n "/^### Task ${TASK_NUM}:/,/^### Task ${NEXT_TASK}:/p" | head -n -1)
  else
    TASK_SECTION=$(echo "$CONTENT" | sed -n "/^### Task ${TASK_NUM}:/,\$p")
  fi

  # Extract files
  FILES_JSON="["
  FIRST_FILE=true
  while IFS= read -r fline; do
    FILE_PATH=$(echo "$fline" | sed 's/^-\s*\(Create\|Modify\|Test\):\s*//; s/`//g' | xargs)
    FILE_ACTION=$(echo "$fline" | grep -o '^\-\s*\(Create\|Modify\|Test\)' | sed 's/^-\s*//' || echo "unknown")
    if [ -n "$FILE_PATH" ]; then
      if [ "$FIRST_FILE" = true ]; then
        FIRST_FILE=false
      else
        FILES_JSON+=","
      fi
      FILE_PATH_ESC=$(echo "$FILE_PATH" | sed 's/"/\\"/g')
      FILE_ACTION_ESC=$(echo "$FILE_ACTION" | sed 's/"/\\"/g')
      FILES_JSON+="{\"path\":\"${FILE_PATH_ESC}\",\"action\":\"${FILE_ACTION_ESC}\"}"
    fi
  done <<< "$(echo "$TASK_SECTION" | grep -E '^\s*-\s*(Create|Modify|Test):' || true)"
  FILES_JSON+="]"

  # Extract skills
  SKILLS_LINE=$(echo "$TASK_SECTION" | grep '^\*\*Skills:\*\*' || true)
  MODE_LINE=$(echo "$TASK_SECTION" | grep '^\*\*Mode:\*\*' || true)
  MODE="standard"
  if [ -n "$MODE_LINE" ]; then
    MODE_RAW=$(echo "$MODE_LINE" | sed 's/^\*\*Mode:\*\*\s*//' | tr '[:upper:]' '[:lower:]' | xargs)
    case "$MODE_RAW" in
      full|standard|lightweight) MODE="$MODE_RAW" ;;
    esac
  fi
  SKILLS_JSON="["
  if [ -n "$SKILLS_LINE" ]; then
    SKILLS_RAW=$(echo "$SKILLS_LINE" | sed 's/^\*\*Skills:\*\*\s*//')
    FIRST_SKILL=true
    IFS=',' read -ra SKILL_ARRAY <<< "$SKILLS_RAW"
    for skill in "${SKILL_ARRAY[@]}"; do
      skill=$(echo "$skill" | xargs)  # trim whitespace
      if [ -n "$skill" ]; then
        if [ "$FIRST_SKILL" = true ]; then
          FIRST_SKILL=false
        else
          SKILLS_JSON+=","
        fi
        skill_esc=$(echo "$skill" | sed 's/"/\\"/g')
        SKILLS_JSON+="\"${skill_esc}\""
      fi
    done
  fi
  SKILLS_JSON+="]"

  if [ "$TASK_NUM" -gt 1 ]; then
    echo ","
  fi

  TASK_NAME_ESC=$(echo "$TASK_NAME" | sed 's/"/\\"/g')
  MODE_ESC=$(echo "$MODE" | sed 's/"/\\"/g')
  echo "  {\"number\":${TASK_NUM},\"name\":\"${TASK_NAME_ESC}\",\"mode\":\"${MODE_ESC}\",\"files\":${FILES_JSON},\"skills\":${SKILLS_JSON}}"

done <<< "$(echo "$CONTENT" | grep '^### Task [0-9]')"

echo ""
echo "]"
