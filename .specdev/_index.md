# Index

Reference dictionary for all SpecDev resources. Consult when you need to find a specific guide, skill, or command.

---

## Workflow

- **`_guides/workflow.md`** — The 3-phase workflow (brainstorm → breakdown → implement) with optional phase-end knowledge capture. Contains phase-by-phase instructions: what to do, which skill to load, checkpoint/gate commands, and review options. Read this when starting an assignment or resuming work.

## Agents

- **`agents/researcher/agent.md`** — Researches a topic across the repo, SpecDev knowledge, and the public web. Use via `specdev research "<topic>"` when evidence is thin or the assignment topic is unfamiliar.

## Reference Guides

- **`_guides/assignment_guide.md`** — How to create and structure assignment folders. Covers naming convention (NNNNN_type_slug), required subdirectories (brainstorm/, breakdown/, implementation/, review/), which template files to copy, and the expected artifacts at each phase.

- **`_guides/codestyle_guide.md`** — Project coding standards. Covers module independence, pure functions, single-responsibility, explicit signatures, documentation expectations, and import rules. Must read before writing any code.

- **`_guides/migration_guide.md`** — Migrating `.specdev/` layouts to the current structure. Covers guided layout migration (`specdev migrate`) for any non-conforming layout, and `specdev migrate legacy-assignments` for deterministic V3-to-V4 assignment file moves.

- **`_guides/update_guide.md`** — Manual patches to apply after running `specdev update`. Covers changes to CLAUDE.md and other files that `specdev update` does not overwrite automatically.

## Core Skills

### Brainstorm phase — choose one based on assignment type:

- **`skills/core/brainstorming/SKILL.md`** — For features, refactors, and new functionality. Interactive Q&A session: scans project context, asks 1-3 questions per round, explores 2-3 approaches, presents design in 200-300 word sections for incremental validation. Outputs `brainstorm/proposal.md` + `brainstorm/design.md`.

- **`skills/core/investigation/SKILL.md`** — For understanding unfamiliar code or systems. Defines learning objectives, investigates entry points and call chains, tests hypotheses with spike code, documents findings with file:line references. Outputs same brainstorm artifacts but as a research report.

- **`skills/core/diagnosis/SKILL.md`** — For bugs and unexpected behavior. Reproduces the bug (failing test required), finds root cause through evidence-based hypothesis testing, proposes fix with risk assessment. Outputs same brainstorm artifacts but as root cause analysis + fix design.

### Breakdown phase:

- **`skills/core/breakdown/SKILL.md`** — Turns validated design into an implementation plan. Each task is a coherent change slice with bite-sized 2-5 minute TDD steps, exact code and commands, file paths, commit message, and a declared execution mode (`inline`, `subagent`, or `parallel`). Subagent reviews the plan (1-2 rounds), then auto-chains to implementing.

### Implement phase:

- **`skills/core/implementing/SKILL.md`** — Executes plan tasks according to the plan's execution mode: inline by default, fresh subagent per task when boundaries are clear, or parallel worktrees for disjoint file ownership. Tracks progress via `scripts/track-progress.sh`. Supports task review modes: `standard`, `full`, and `lightweight`. Verification scales by task risk and budget.

- **`skills/core/test-driven-development/SKILL.md`** — The RED-GREEN-REFACTOR cycle. Write failing test → verify RED via `scripts/verify-tests.sh` → write minimal code → verify GREEN → refactor → commit. Used by the current agent or injected into implementer subagents when tasks declare it in their `Skills:` field.

- **`skills/core/parallel-worktrees/SKILL.md`** — Git worktree isolation for tasks with zero overlapping file writes. Analyzes parallelizability, creates worktrees via `scripts/setup-worktree.sh`, dispatches independent subagents, merges branches, runs integration tests. Use when plan has clearly independent tasks.

### Optional phase-end hooks:

- **`skills/core/knowledge-capture/SKILL.md`** — Optional non-blocking phase-end guide. Suggests durable knowledge only when useful, searches existing notes first, and prunes/replaces stale knowledge before writing small direct updates to `knowledge/` or `project_notes/`.

### Always-apply (read before any assignment):

- **`skills/core/verification-before-completion.md`** — No completion claims without fresh verification evidence. Core rule: run the command, read the output, only then claim success. Applies to tests, builds, linting, bug fixes — any status claim.

- **`skills/core/receiving-code-review.md`** — No performative agreement in reviews. Verify feedback against codebase before implementing. Push back with technical reasoning when feedback is wrong. No gratitude expressions — just fix or disagree with evidence.

### When needed:

- **`skills/core/systematic-debugging/SKILL.md`** — Root-cause-first debugging. Reproduce → gather evidence → hypothesize (top 3, ranked) → experiment one at a time → confirm root cause (not symptom) → fix with regression test. Use when tests fail unexpectedly during implementation.

## Tool Skills

Project-specific capabilities installed in `skills/tools/`. Declared in breakdown plan tasks via the `Skills:` field and injected into subagent prompts during implementation.

- Run `specdev skills` to list all installed tool skills with descriptions
- See `skills/tools/README.md` for how to create custom tool skills

## Project Context

- **`project_notes/big_picture.md`** — Project goals, tech stack, key decisions. Read at the start of every session.
- **`project_notes/feature_descriptions.md`** — Catalog of what's built: feature name, assignment ID, completion date, key files. Updated only when a phase-end knowledge capture note makes it useful.
- **`project_notes/assignment_progress.md`** — Assignment status tracking: ID, name, phase, status. Used to determine next assignment number.
- **`knowledge/`** — Accumulated project knowledge organized by branch (codestyle, architecture, domain, workflow). Built up over assignments via knowledge capture.

## CLI Commands

### Workflow Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `specdev assignment "<desc>"` | Reserve next assignment ID; sets `.current` pointer | Starting new work |
| `specdev assignment "<desc>" --type=<type> --slug=<slug>` | Reserve ID with explicit type and folder slug | Automated/scripted assignment creation |
| `specdev assignment "<desc>" --discussion=<id>` | Promote a discussion to a full assignment | After a `specdev discussion` exploration |
| `specdev focus <id>` | Set the active assignment (writes `.specdev/.current`) | Switching between assignments |
| `specdev discussion "<desc>"` | Start a parallel brainstorming discussion (no full assignment) | Exploring ideas before committing to an assignment |
| `specdev checkpoint <phase>` | Validate phase artifacts exist and are well-formed | Before requesting review or approval |
| `specdev checkpoint <phase> --discussion=<id>` | Validate discussion artifacts | Within a discussion workflow |
| `specdev approve <phase>` | Hard gate: approve a phase | After user reviews and is satisfied |
| `specdev continue` | Detect current assignment state, suggest next action | Resuming work in a new session |
| `specdev implement` | Set up and kick off implementation phase | After breakdown completes |
| `specdev revise` | Record design revision, re-enter brainstorm | When design needs rework after breakdown |
| `specdev review <phase>` | Launch manual review in a separate session | Optional quality check (brainstorm or implementation) |
| `specdev review <phase> --discussion=<id>` | Launch manual review for a discussion | Optional review of discussion output |
| `specdev reviewloop <phase>` | Automated review loop for assignment | Automated review of brainstorm or implementation |
| `specdev reviewloop <phase> --discussion=<id>` | Automated review loop for a discussion | Automated review of discussion output |
| `specdev check-review` | Read review feedback and address findings | After a review session has been run |

### Knowledge & Maintenance Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `specdev knowledge index` | Build/rebuild SQLite FTS index of `.specdev/` knowledge | After adding new content (search auto-builds on first use) |
| `specdev knowledge search "<keywords>"` | Search indexed knowledge (BM25-ranked) | Finding relevant project context |
| `specdev memory refresh` | Regenerate bounded working memory for agents | After completing assignments or adding knowledge |
| `specdev migrate` | Guided layout migration for non-conforming `.specdev/` | When `.specdev/` structure doesn't match current layout |
| `specdev migrate legacy-assignments [--assignment=<id>]` | Deterministic V3-to-V4 assignment file moves | When old root-level phase files exist in assignments |

### Setup & Utility Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `specdev init` | Initialize `.specdev/` folder in current directory | Setting up SpecDev for the first time |
| `specdev update` | Update system files while preserving project files | After installing a new specdev version |
| `specdev start` | Check/fill project context (`big_picture.md`) | After init, or when updating project context |
| `specdev status [--json]` | Emit workflow state for humans or automation | Checking current assignment state |
| `specdev skills` | List all installed skills with descriptions | During breakdown to declare task skills |
| `specdev skills install <name>` | Install tool skills with coding agent wrappers | Adding project-specific tool skills |
| `specdev skills remove <name>` | Remove an installed tool skill | Removing a tool skill |
| `specdev skills sync` | Reconcile active tools with available skills | After manually editing skill files |
| `specdev help` | Show CLI usage and command list | Quick reference |
| `specdev --version` | Show version number | Checking installed version |
