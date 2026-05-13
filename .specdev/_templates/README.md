# Templates

This directory contains reusable templates for SpecDev workflows.

---

## Templates

### gate_checklist.md
**Purpose:** Quality gate tracking template for assignments

**Usage:** Copy into your assignment folder as `review/validation_checklist.md` when starting a new assignment

**Contains:**
- Gate 0: Planning Complexity and Skill Selection
- Gate 1: Post-Architecture Review (conditional)
- Gate 2: Per-Task TDD Validation (with task tracking table)
- Review: Spec Compliance + Code Quality
- Verification Evidence
- Finalize and Knowledge Capture

### review_request_schema.json
**Purpose:** JSON schema for the review agent handoff protocol

**Usage:** Reference when creating or validating `review_request.json` files in assignment directories

**Contains:**
- Field definitions for the file-based review handoff
- Status lifecycle: pending → in_progress → passed / failed
- Schema for assignment_id, gate, changed_files, etc.

### review_report_template.md
**Purpose:** Template for review reports written by the reviewer agent

**Usage:** Copy into assignment folder as `review_report.md` and fill in during review

**Contains:**
- Pre-flight results section
- Spec compliance review (requirements coverage, deviations)
- Code quality review (findings with severity tags)
- Verdict section

### scaffolding_template.md
**Purpose:** Format for scaffolding documents

**Usage:** Follow this format when creating scaffold files in `scaffold/` directory

**Contains:**
- Description
- Dependencies
- Workflows
- Examples
- Pseudocode

### brainstorm-design.md
**Purpose:** Starting skeleton for `brainstorm/design.md`

**Usage:** Copy and trim to the sections required by the assignment type
(feature / bugfix / refactor / familiarization)

### workflow_feedback_note.md
**Purpose:** Structured note format for `.specdev/knowledge/workflow_feedback/<slug>.md`

**Usage:** Copy when capturing a SpecDev workflow/product issue or
improvement during phase-end knowledge capture. Fill every field
(Status / Type / Severity / First seen / Last seen / Assignments observed)
so the search index can rank and filter notes.

### agent-spec.schema.json
**Purpose:** JSON schema for workflow agent specs under `agents/<name>/agent.md`

**Usage:** Referenced by `src/utils/agent-runner.js` to validate agent
specs. Used by `specdev agents inspect` and `specdev research`.

