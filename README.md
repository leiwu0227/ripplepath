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
ripplegraph-demo status --workflow-root examples/minimal
ripplegraph-demo start daily-execution --run daily-demo --workflow-root examples/minimal
ripplegraph-demo submit '{"decision":"stop"}' --workflow-root examples/minimal
```

Runtime state is stored under `.ripplegraph/`. To switch work:

```sh
ripplegraph-demo start daily-execution --run daily-1 --workflow-root examples/minimal
ripplegraph-demo pause "pause for mockcopy" --workflow-root examples/minimal
ripplegraph-demo start mockcopy-backtest --run mockcopy-1 --workflow-root examples/minimal
ripplegraph-demo pause --workflow-root examples/minimal
ripplegraph-demo resume daily-1 --workflow-root examples/minimal
ripplegraph-demo runs --workflow-root examples/minimal
```

`ripplegraph-demo` is the reference consumer CLI: compact text for host agents
and humans. `ripplegraph` remains the low-level JSON CLI for debugging and
automation.

Status: v0 in development.
