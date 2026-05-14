# Ripplegraph minimal POC

Use `ripplegraph` as the workflow state machine. The filesystem is the source
of truth; do not infer the active step from conversation alone.

Start by running:

```sh
npx ripplegraph validate --workflow-root .
npx ripplegraph state --workflow-root .
```

If there is no current run, start one:

```sh
npx ripplegraph start --graph daily-execution --workflow-root .
```

For each node:

1. Run `npx ripplegraph state --workflow-root .`.
2. Read the current node purpose, instructions, and output schema.
3. Do the requested work.
4. Submit JSON with `npx ripplegraph step --output '<json>' --workflow-root .`.

To switch work:

```sh
npx ripplegraph suspend --note "pause current work" --workflow-root .
npx ripplegraph start --graph mockcopy-backtest --workflow-root .
npx ripplegraph resume --run-id <run-id> --workflow-root .
```

Watch these files when debugging:

```sh
current.json
runs/<run-id>/checkpoint.json
runs/<run-id>/transition-log.jsonl
```
