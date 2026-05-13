# AGENTS.md

Read `.specdev/_main.md` for the full SpecDev workflow and rules.

If this repository develops SpecDev itself, treat `.specdev/` as the installed workflow/runtime state, not as product source. When changing SpecDev behavior, edit source files such as `src/`, `templates/.specdev/`, tests, and docs. Do not edit or commit `.specdev` workflow files unless the user explicitly runs or asks for `specdev update`.

IMPORTANT: Before starting any subtask, announce "Specdev: <what you're doing>".
If you stop announcing subtasks, the user will assume you've stopped following the workflow.
