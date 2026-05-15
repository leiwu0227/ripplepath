# Ripplegraph minimal POC

Use `ripplegraph-demo` as the workflow guide. Use `ripplegraph` only when you
need low-level JSON for debugging. The filesystem is the source of truth; do
not infer the active step from conversation alone.

Start by running:

```sh
npx ripplegraph-demo status --workflow-root .
```

If there is no current run, start one:

```sh
npx ripplegraph-demo start daily-execution --run daily-demo --workflow-root .
```

For each node:

1. Run `npx ripplegraph-demo status --workflow-root .`.
2. Read the current node purpose, instructions, and required output.
3. Do the requested work.
4. Submit JSON with `npx ripplegraph-demo submit '<json>' --workflow-root .`.

To switch work:

```sh
npx ripplegraph-demo pause "pause current work" --workflow-root .
npx ripplegraph-demo start mockcopy-backtest --run mock-demo --workflow-root .
npx ripplegraph-demo resume <run-id> --workflow-root .
```

Watch these files when debugging:

```sh
.ripplegraph/current.json
.ripplegraph/runs/<run-id>/checkpoint.json
.ripplegraph/runs/<run-id>/transition-log.jsonl
```
