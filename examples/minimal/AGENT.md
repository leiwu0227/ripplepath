# Minimal POC example

This workflow package contains two root graphs:

- `daily-execution`
- `mockcopy-backtest`

Drive it with the focused-run Coach commands:

```sh
ripplegraph validate --workflow-root .
ripplegraph start --graph daily-execution --run-id daily-demo --workflow-root .
ripplegraph state --workflow-root .
ripplegraph step --output '{"decision":"stop"}' --workflow-root .
```

To switch work, suspend the focused run and start or resume another:

```sh
ripplegraph suspend --note "pause for live work" --workflow-root .
ripplegraph start --graph mockcopy-backtest --run-id mock-demo --workflow-root .
ripplegraph resume --run-id daily-demo --workflow-root .
```

All commands emit canonical JSON. Consumer CLIs are expected to render their
own domain-specific prose from that JSON.
