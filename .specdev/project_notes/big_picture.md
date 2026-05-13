# Project Big Picture

## Overview
A lightweight, host-agent-driven workflow framework inspired by langgraph.js. The
graph is the deterministic skeleton; nodes are units of agent execution where an
LLM can freely explore within a schema-validated boundary. The CLI is the runtime
gatekeeper — not the LLM. Goal: tame agent drift by making the graph (not the
LLM) own control flow.

## Users / Consumers
Primarily the author's own host-agent-driven CLIs that need deterministic,
multi-step agent workflows:
- `specdev-cli` — assignment workflow (brainstorm → breakdown → implement) with
  human gates and external reviewer loops.
- `oceanshed-cli` — signal/sweep lifecycles, candidate promotion, agent reviews.
- `oceanlive-cli` — live trading session orchestration with human approval at
  every step.

Secondarily: other CLIs that install a `.xxx/` workflow folder and rely on a host
agent (Claude Code, Codex, etc.) to follow it.

## Tech Stack
- TypeScript / Node.js (matches the three target CLIs).
- Zod for runtime schema validation plus type inference.
- Filesystem-based state: JSON checkpoints, YAML graph definitions.
- No runtime LLM SDK dependency — LLM execution stays in the host agent; the
  framework never calls an LLM directly in v0.
- Distributed as an npm package plus a CLI binary.

## Architecture
- **Graph owns flow, LLM is free within nodes.** Edges are deterministic
  functions of validated state; the LLM never decides which node runs next.
- **Composition primitive: subgraph-as-node.** A graph is a unit of
  orchestration; a node is a unit of agent execution. Mini-graphs compose into
  larger workflows recursively.
- **Subgraph state is isolated** with explicit `inputMap` / `outputMap` at
  boundaries, so subgraphs stay portable across CLIs.
- **Subgraph pluggability is interface-based** (declare contract, swap
  implementations) plus parameterized (config knobs); never prose-editable.
- **Co-located filesystem packaging** in `.xxx/subgraphs/` for v0; no registry
  resolver yet.
- **Host-agent runtime model.** The host agent calls CLI commands
  (`cli current`, `cli advance`, `cli resume`) between steps. The CLI returns
  instructions + schema; the agent does the work; the CLI validates output and
  performs the transition. Drift is bounded to *inside a step*.
- **Neighborhood context** served on every step: prior ~2 nodes (full outputs),
  next ~2 nodes (names + purposes), parent subgraph goal, workflow-level north
  star, available free-entry nodes.
- **Free latch entry nodes.** Graph-declared anchors the LLM can *propose*
  jumping to (with reason); the CLI requires user confirmation before executing.
  Modal (push/pop) by default; replace is opt-in.
- **Per-advance JSON checkpointing** for resumability; runs are file-stateful
  from day one.

## Conventions & Constraints
- **Litmus test for every feature:** "Does this give the LLM control over flow,
  or only over content within a fixed flow?" If the former, redesign.
- Schemas must be as tight as the use case allows — loose schemas hide drift.
- Context revelation is graph-authored, not agent-pulled.
- No auto-execution of LLM-proposed transitions; the human gates every flow
  change.
- Bring-your-own LLM: the framework never calls an LLM directly. All LLM
  execution happens inside the host agent that ticks the graph via CLI commands.
- Keep the core small (target ~500 LOC for v0). Adopt langgraph.js only if we
  discover the model is inadequate.
