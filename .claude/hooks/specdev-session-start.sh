#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook for specdev
# Injects phase-aware context into Claude Code sessions
# Uses `specdev context --json` for data when available, falls back to filesystem detection

SPECDEV_DIR=".specdev"

# No-op if .specdev doesn't exist
if [ ! -d "$SPECDEV_DIR" ]; then
  echo '{}'
  exit 0
fi

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

emit_hook_json() {
  local context="$1"
  local escaped
  escaped=$(escape_for_json "$context")
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "$escaped"
  }
}
EOF
}

# Try specdev context --json for rich data
CONTEXT_JSON=$(specdev context --json 2>/dev/null) || CONTEXT_JSON=""

if [ -n "$CONTEXT_JSON" ]; then
  # Parse context JSON with node
  PARSED=$(node -e "
    try {
      const ctx = JSON.parse(process.argv[1]);
      const a = ctx.assignment;
      const assignmentLine = a ? a.name : 'none';
      const assignmentPath = a?.path || '';
      const phase = a?.phase || '';
      const state = a?.state || '';
      const knowledgeCount = ctx.knowledge?.files?.length || 0;
      const toolSkills = (ctx.skills?.tools || []).join(', ');
      const lastCompleted = ctx.recent_history?.last_completed_assignment || '';
      console.log(JSON.stringify({ assignmentLine, assignmentPath, phase, state, knowledgeCount, toolSkills, lastCompleted }));
    } catch {
      console.log('{}');
    }
  " "$CONTEXT_JSON" 2>/dev/null) || PARSED="{}"

  ASSIGNMENT_LINE=$(echo "$PARSED" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); process.stdout.write(d.assignmentLine||'none')")
  ASSIGNMENT_PATH=$(echo "$PARSED" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); process.stdout.write(d.assignmentPath||'')")
  PHASE=$(echo "$PARSED" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); process.stdout.write(d.phase||'')")
  KNOWLEDGE_COUNT=$(echo "$PARSED" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); process.stdout.write(String(d.knowledgeCount||0))")
  TOOL_SKILLS=$(echo "$PARSED" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); process.stdout.write(d.toolSkills||'')")
  LAST_COMPLETED=$(echo "$PARSED" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); process.stdout.write(d.lastCompleted||'')")
  if [ -n "$ASSIGNMENT_PATH" ] && [ -d "$SPECDEV_DIR/$ASSIGNMENT_PATH/implementation" ]; then
    PHASE="implementation"
  elif [ -n "$ASSIGNMENT_PATH" ] && [ -f "$SPECDEV_DIR/$ASSIGNMENT_PATH/breakdown/plan.md" ]; then
    PHASE="breakdown"
  fi
else
  # Fallback: filesystem detection (for older specdev versions)
  ASSIGNMENTS_DIR="$SPECDEV_DIR/assignments"
  if [ ! -d "$ASSIGNMENTS_DIR" ]; then
    emit_hook_json "You have specdev installed. Read .specdev/_main.md for the full workflow.\n\nAnnounce every subtask with \"Specdev: <action>\".\nIf you stop announcing subtasks, the user will assume you've stopped following the workflow."
    exit 0
  fi

  LATEST=$(ls -1d "$ASSIGNMENTS_DIR"/*/ 2>/dev/null | sort | tail -1 || true)
  if [ -z "$LATEST" ]; then
    emit_hook_json "You have specdev installed. Read .specdev/_main.md for the full workflow.\n\nAnnounce every subtask with \"Specdev: <action>\".\nIf you stop announcing subtasks, the user will assume you've stopped following the workflow."
    exit 0
  fi

  ASSIGNMENT_LINE=$(basename "$LATEST")
  PHASE="unknown"
  if [ -d "$LATEST/implementation" ]; then
    PHASE="implementation"
  elif [ -f "$LATEST/breakdown/plan.md" ]; then
    PHASE="breakdown"
  elif [ -f "$LATEST/brainstorm/design.md" ] || [ -f "$LATEST/brainstorm/proposal.md" ]; then
    PHASE="brainstorm"
  fi

  KNOWLEDGE_COUNT=0
  TOOL_SKILLS=""
  LAST_COMPLETED=""
  TOOLS_DIR="$SPECDEV_DIR/skills/tools"
  if [ -d "$TOOLS_DIR" ]; then
    for skill_dir in "$TOOLS_DIR"/*/; do
      [ -d "$skill_dir" ] || continue
      skill_md="$skill_dir/SKILL.md"
      [ -f "$skill_md" ] || continue
      skill_name=$(basename "$skill_dir")
      TOOL_SKILLS="${TOOL_SKILLS}${TOOL_SKILLS:+, }${skill_name}"
    done
  fi
fi

# Recent completed assignment fallback for older `specdev context --json` output
if [ -z "${LAST_COMPLETED:-}" ] && [ -d "$SPECDEV_DIR/assignments" ]; then
  LAST_COMPLETED=$(find "$SPECDEV_DIR/assignments" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
    | while read -r assignment_dir; do
        [ -f "$assignment_dir/capture/project-notes-diff.md" ] || continue
        [ -f "$assignment_dir/capture/workflow-diff.md" ] || continue
        basename "$assignment_dir"
      done \
    | sort \
    | tail -1)
fi

# Build context message
CONTEXT="SpecDev active. Assignment: $ASSIGNMENT_LINE | Phase: $PHASE\n\n"

# Phase-specific rules and commands
case "$PHASE" in
  brainstorm)
    CONTEXT="${CONTEXT}Rules:\n- Interactive Q&A to validate the design\n- Produce proposal.md and design.md\n- Do not start coding until design is approved\n\nNext: Complete design, run specdev checkpoint brainstorm, get user approval via specdev approve brainstorm\n\nPhase commands: specdev checkpoint brainstorm, specdev approve brainstorm, specdev reviewloop brainstorm, specdev knowledge search"
    ;;
  breakdown)
    CONTEXT="${CONTEXT}Rules:\n- Break design into executable tasks in breakdown/plan.md\n- Each task: 2-5 min, TDD, exact file paths and code\n- Include acceptance criteria for every task\n\nNext: Complete plan.md, inline review, then implementation starts automatically\n\nPhase commands: specdev implement, specdev knowledge search"
    ;;
  implementation)
    CONTEXT="${CONTEXT}Rules:\n- TDD: write failing test -> make it pass -> refactor\n- No completion claims without running tests\n- One task at a time via subagents\n- Per-task review: spec compliance then code quality\n\nNext: Complete remaining tasks, get user approval\n\nPhase commands: specdev checkpoint implementation, specdev reviewloop implementation, specdev approve implementation"
    ;;
  *)
    CONTEXT="${CONTEXT}Run specdev assignment <name> to start a new assignment."
    ;;
esac

# Knowledge availability
if [ "$KNOWLEDGE_COUNT" -gt 0 ] 2>/dev/null; then
  CONTEXT="${CONTEXT}\n\nKnowledge: $KNOWLEDGE_COUNT files available. Run \`specdev knowledge search \"<keywords>\"\` for prior decisions."
fi

# Recent history
if [ -n "$LAST_COMPLETED" ]; then
  CONTEXT="${CONTEXT}\n\nRecent history: last completed assignment was ${LAST_COMPLETED}."
fi

# Tool skills
if [ -n "$TOOL_SKILLS" ]; then
  CONTEXT="${CONTEXT}\n\nTool skills available: ${TOOL_SKILLS}. Declare in plan tasks via Skills: field."
fi

CONTEXT="${CONTEXT}\n\nAnnounce every subtask with \"Specdev: <action>\".\nIf you stop announcing subtasks, the user will assume you've stopped following the workflow."

emit_hook_json "$CONTEXT"
exit 0
