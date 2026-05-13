# Tool Skills

Project-specific tool skills live here. These are never overwritten by `specdev update`.

## Adding a tool skill

Create a directory with a `SKILL.md` file:

```text
tools/my-tool/
├── SKILL.md           # Instructions and frontmatter (required)
└── scripts/           # Executable scripts (optional)
    └── run.sh
```

## Frontmatter

```yaml
---
name: my-tool
description: What this tool does and when to use it

# SpecDev fields
type: tool
---
```

Tool skills can be referenced in plan tasks via the `Skills:` field. The implementing phase will inject them into subagent context.

## Compatibility

Tool skills use the same SKILL.md format as Claude Code skills. You can copy a skill between `.claude/skills/` and `.specdev/skills/tools/` without modification.
