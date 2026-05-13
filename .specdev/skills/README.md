# SpecDev Skills Library

Skills are split into two categories:

- **Core skills** (`core/`) — define the workflow phases and supporting practices. Managed by SpecDev and updated by `specdev update`. You should not edit these.
- **Tool skills** (`tools/`) — project-specific capabilities (APIs, search tools, custom scripts). User-owned and never touched by `specdev update`. Declared in plan tasks via the `Skills:` field.

## Core Skills (`core/`)

### Folder-based skills

**Main workflow phases:**

- `core/brainstorming/` — Interactive idea-to-design session
- `core/investigation/` — Research and document existing code
- `core/diagnosis/` — Bug reproduction and root cause analysis
- `core/breakdown/` — Turn design into bite-sized executable steps
- `core/implementing/` — Execute plan with subagent dispatch and unified review
- `core/knowledge-capture/` — Optional phase-end durable knowledge capture with prune-and-replace

**Review (separate session):**
- `core/review-agent/` — Holistic reviewer with file-based signals

**Supporting:**
- `core/test-driven-development/` — RED-GREEN-REFACTOR with verify-tests.sh
- `core/systematic-debugging/` — Root-cause-first debugging
- `core/parallel-worktrees/` — Git worktree isolation for parallel tasks

### Flat reference skills

**Always-apply:**
- `core/verification-before-completion.md` — No completion claims without evidence
- `core/receiving-code-review.md` — No performative agreement in reviews

## Tool Skills (`tools/`)

User-owned. Never touched by `specdev update`. Project-specific tools and capabilities.

See `tools/README.md` for how to add tool skills.

## Frontmatter

All skills use YAML frontmatter aligned with the Claude Code skill format:

```yaml
---
name: skill-name
description: What this skill does

# SpecDev fields
type: core       # or: tool
phase: implement # (core skills only) which workflow phase
---
```

## Plan-Driven Skill Injection

The breakdown phase can declare which skills each task needs via a `Skills:` field in plan tasks. The implementing phase reads these declarations and injects skill content into subagent prompts, solving context fade in long sessions.
