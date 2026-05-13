# Minimal example — host agent guide

This is the v0 acceptance fixture. The workflow drives a tiny topic-analysis
flow: a kickoff captures the topic, an `analyze` subgraph (explore → refine)
surfaces findings, a finish node composes the conclusion. A free-entry
(`fix_first`, modal) is available so the host can demonstrate a side-quest
into the `hotfix` work node and pop back.

Drive it with:

```sh
ripplepath state                                 # auto-inits a run
ripplepath step --output '{...}' --exec-used inline
```

…until the response is `{ "status": "complete" }`.

Note: `analyze.refine` is `exec: spawn` to exercise that branch of the host
protocol. The other nodes are `exec: inline`. Available free entries appear in
the response's `free_entries` field.

<!-- BEGIN workflow-specific guidance -->
<!-- END workflow-specific guidance -->
