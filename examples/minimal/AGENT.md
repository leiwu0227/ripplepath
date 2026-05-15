# Minimal POC example

This workflow package contains two root graphs:

- `daily-execution`
- `mockcopy-backtest`

Drive it with the reference agent-facing commands:

```sh
ripplegraph-demo status --workflow-root .
ripplegraph-demo start daily-execution --run daily-demo --workflow-root .
ripplegraph-demo submit '{"decision":"stop"}' --workflow-root .
```

To switch work, suspend the focused run and start or resume another:

```sh
ripplegraph-demo pause "pause for live work" --workflow-root .
ripplegraph-demo start mockcopy-backtest --run mock-demo --workflow-root .
ripplegraph-demo resume daily-demo --workflow-root .
```

Runtime state is stored under `.ripplegraph/`. Use `ripplegraph` when you need
the low-level JSON/debugging interface.
