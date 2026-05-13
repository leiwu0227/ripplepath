# ripplepath runtime-core (v0)

Build a small, host-agent-driven workflow framework that gives LLM-powered CLIs
a deterministic graph runtime. The graph owns flow; the LLM is free to explore
within schema-validated nodes; the CLI is the runtime gatekeeper that enforces
every transition. The framework's value prop is drift containment — even when
LLM behavior drifts across models or sessions, the graph still owns control flow
and the CLI rejects any output that doesn't satisfy the contract.

v0 delivers the core runtime: a two-command CLI (`state` and `step`), a JSON
graph format, Zod-validated node schemas, isolated subgraph state with explicit
input/output mapping, neighborhood + workflow-overview context generation, free
latch entries with user-confirmed jumps, append-only transcript, and JSON-on-disk
state — plus one worked example workflow that exercises every mechanic. The
framework never calls an LLM directly: execution stays in the host agent (Claude
Code, Codex, etc.), which calls ripplepath between steps. Success means
specdev-cli, oceanshed-cli, and oceanlive-cli can later migrate by writing only
their subgraph definitions and a top-level `workflow.json`, with no runtime
customization.
