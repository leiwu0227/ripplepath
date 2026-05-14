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
ripplegraph validate --workflow-root examples/minimal
ripplegraph start --workflow-root examples/minimal --graph daily-execution --run-id daily-demo
ripplegraph state --workflow-root examples/minimal
ripplegraph step --workflow-root examples/minimal --output '{"decision":"stop"}'
```

The focused run is stored under `runs/<run-id>/`, and `current.json` records
which run the Coach should render. To switch work:

```sh
ripplegraph start --workflow-root examples/minimal --graph daily-execution --run-id daily-1
ripplegraph suspend --workflow-root examples/minimal --note "pause for mockcopy"
ripplegraph start --workflow-root examples/minimal --graph mockcopy-backtest --run-id mockcopy-1
ripplegraph suspend --workflow-root examples/minimal
ripplegraph resume --workflow-root examples/minimal --run-id daily-1
ripplegraph abandon --workflow-root examples/minimal --reason "manual test complete"
```

All commands emit canonical JSON. The reference CLI deliberately avoids
domain-specific prose; consumer CLIs should render their own instructions from
the structured state object.

Status: v0 in development.
