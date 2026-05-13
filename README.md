# ripplegraph

A lightweight, host-agent-driven workflow framework. A directed graph is the
deterministic skeleton of execution; nodes are units of agent work where LLMs
can freely explore within schema-validated boundaries; the CLI is the runtime
gatekeeper. The framework's value prop is drift containment — the graph (not
the LLM) owns control flow, and the CLI rejects any output that doesn't
satisfy the contract.

## Install

```sh
npm install ripplegraph zod
```

## Quick start

```sh
ripplegraph init                  # scaffolds AGENT.md, workflow.json, runs/
ripplegraph state                 # auto-inits a run and returns the first node
ripplegraph step --output '...'   # validate and transition
```

The host agent (Claude Code, Codex, etc.) calls `ripplegraph state` to read its
instructions and `ripplegraph step` to submit work. See the generated `AGENT.md`
for the full host protocol.

Status: v0 in development.
