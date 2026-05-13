#!/usr/bin/env bash
set -euo pipefail

# verify-tests.sh — Run a project's test suite and return structured JSON results
#
# Usage: verify-tests.sh <project-root> [test-command]
# Output: JSON {"passed": bool, "exit_code": N, "command": "...", "output_summary": "..."}
# Auto-detect: package.json→npm test, Cargo.toml→cargo test, pyproject.toml→pytest, Makefile→make test
# Exit: 0 always (test status in JSON), 1 only on script failure (bad args)

PROJECT_ROOT="${1:-}"
TEST_CMD="${2:-}"

json_escape() {
  printf '%s' "$1" \
    | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\r/\\r/g' \
    | tr -d '\000-\010\013\014\016-\037' \
    | tr '\n' ' '
}

emit_json() {
  local passed="$1"
  local exit_code="$2"
  local command="$3"
  local summary="$4"
  local esc_command
  local esc_summary
  esc_command="$(json_escape "$command")"
  esc_summary="$(json_escape "$summary")"
  echo "{\"passed\":${passed},\"exit_code\":${exit_code},\"command\":\"${esc_command}\",\"output_summary\":\"${esc_summary}\"}"
}

if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: project root directory required" >&2
  echo "Usage: verify-tests.sh <project-root> [test-command]" >&2
  exit 1
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" && pwd)

# Auto-detect test command if not provided
if [ -z "$TEST_CMD" ]; then
  if [ -f "$PROJECT_ROOT/package.json" ]; then
    # Heuristic: if package.json contains a "test" script key, use npm test.
    if grep -q '"test"[[:space:]]*:' "$PROJECT_ROOT/package.json" 2>/dev/null; then
      TEST_CMD="npm test"
    fi
  elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
    TEST_CMD="cargo test"
  elif [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
    TEST_CMD="pytest"
  elif [ -f "$PROJECT_ROOT/Makefile" ]; then
    if grep -q '^test:' "$PROJECT_ROOT/Makefile" 2>/dev/null; then
      TEST_CMD="make test"
    fi
  fi

  if [ -z "$TEST_CMD" ]; then
    # No test command found — report as JSON.
    emit_json "false" "-1" "(none detected)" \
      "No test command found. Checked: package.json (npm test), Cargo.toml (cargo test), pyproject.toml (pytest), Makefile (make test)"
    exit 0
  fi
fi

# Run the test command from project root and capture output
OUTPUT_FILE=$(mktemp)
EXIT_CODE=0
(cd "$PROJECT_ROOT" && $TEST_CMD) > "$OUTPUT_FILE" 2>&1 || EXIT_CODE=$?

# Read output and truncate to a summary
OUTPUT=$(cat "$OUTPUT_FILE" | tail -50)
rm -f "$OUTPUT_FILE"

# Determine pass/fail
if [ "$EXIT_CODE" -eq 0 ]; then
  PASSED="true"
else
  PASSED="false"
fi

# Output structured JSON
emit_json "$PASSED" "$EXIT_CODE" "$TEST_CMD" "${OUTPUT:0:2000}"
