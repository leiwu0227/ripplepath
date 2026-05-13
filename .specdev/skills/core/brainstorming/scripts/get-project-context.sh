#!/usr/bin/env bash
set -euo pipefail

# get-project-context.sh — Scan a project and return structured context for planning
#
# Usage: get-project-context.sh <project-root>
# Output: Markdown summary to stdout
# Exit: 0 on success, 1 on error

PROJECT_ROOT="${1:-}"

if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: project root directory required" >&2
  echo "Usage: get-project-context.sh <project-root>" >&2
  exit 1
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" && pwd)

echo "# Project Context"
echo ""

# --- Project identity ---
if [ -f "$PROJECT_ROOT/package.json" ]; then
  NAME=$(grep -o '"name":\s*"[^"]*"' "$PROJECT_ROOT/package.json" | head -1 | sed 's/"name":\s*"//;s/"//')
  VERSION=$(grep -o '"version":\s*"[^"]*"' "$PROJECT_ROOT/package.json" | head -1 | sed 's/"version":\s*"//;s/"//')
  echo "## Project: ${NAME:-unknown} v${VERSION:-unknown}"
elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
  NAME=$(grep '^name' "$PROJECT_ROOT/Cargo.toml" | head -1 | sed 's/name\s*=\s*"//;s/"//')
  echo "## Project: ${NAME:-unknown}"
elif [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
  NAME=$(grep '^name' "$PROJECT_ROOT/pyproject.toml" | head -1 | sed 's/name\s*=\s*"//;s/"//')
  echo "## Project: ${NAME:-unknown}"
else
  DIRNAME=$(basename "$PROJECT_ROOT")
  echo "## Project: $DIRNAME"
fi
echo ""

# --- File structure (top 2 levels, excluding hidden/node_modules/vendor) ---
echo "## File Structure"
echo '```'
if command -v find &> /dev/null; then
  find "$PROJECT_ROOT" -maxdepth 2 \
    -not -path '*/\.*' \
    -not -path '*/node_modules/*' \
    -not -path '*/vendor/*' \
    -not -path '*/__pycache__/*' \
    -not -path '*/target/*' \
    -not -name '*.lock' \
    | sed "s|^$PROJECT_ROOT/||" \
    | sort \
    | head -50
fi
echo '```'
echo ""

# --- Recent git history ---
if [ -d "$PROJECT_ROOT/.git" ]; then
  echo "## Recent Commits"
  echo '```'
  git -C "$PROJECT_ROOT" log --oneline -10 2>/dev/null || echo "(no commits)"
  echo '```'
  echo ""
fi

# --- Existing knowledge (scan all subdirectories) ---
KNOWLEDGE_BASE="$PROJECT_ROOT/.specdev/knowledge"
if [ -d "$KNOWLEDGE_BASE" ]; then
  KNOWLEDGE_FILES=$(find "$KNOWLEDGE_BASE" -name '*.md' -not -name '_index.md' -type f 2>/dev/null)
  if [ -n "$KNOWLEDGE_FILES" ]; then
    echo "## Existing Knowledge"
    echo ""
    for f in $KNOWLEDGE_FILES; do
      RELPATH=$(echo "$f" | sed "s|^$PROJECT_ROOT/.specdev/knowledge/||")
      echo "### $RELPATH"
      cat "$f"
      echo ""
    done
  fi
fi

# --- Current assignments ---
ASSIGNMENTS_DIR="$PROJECT_ROOT/.specdev/assignments"
if [ -d "$ASSIGNMENTS_DIR" ]; then
  ASSIGNMENT_COUNT=$(find "$ASSIGNMENTS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
  if [ "$ASSIGNMENT_COUNT" -gt 0 ]; then
    echo "## Active Assignments ($ASSIGNMENT_COUNT)"
    echo ""
    find "$ASSIGNMENTS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | while read -r dir; do
      ANAME=$(basename "$dir")
      echo "- $ANAME"
      if [ -f "$dir/status.json" ]; then
        BRAINSTORM=$(grep -o '"brainstorm_approved":\s*[^,}]*' "$dir/status.json" | head -1 | sed 's/.*:\s*//')
        IMPL=$(grep -o '"implementation_approved":\s*[^,}]*' "$dir/status.json" | head -1 | sed 's/.*:\s*//')
        echo "  Gates: brainstorm=${BRAINSTORM:-?} implementation=${IMPL:-?}"
      fi
    done
    echo ""
  fi
fi
