# 00004 framework architecture — discussion record

> Captured 2026-05-14 from a single brainstorm session that started in
> 00003's restart/revise Q&A and pivoted into a deeper architectural
> discussion. 00003 was shelved pending the resolution captured here;
> 00004 was opened to land the framework's shape before returning to
> the smaller ergonomic fixes. This document preserves the conversation
> arc, the research that grounded it, and the architecture that
> crystallized.

## Why this discussion happened

00002 surfaced seven distinct ergonomic gaps when demoflow drove a
real Claude Code session end-to-end (see `thoughts.md` — "00002
validation findings"). 00003 was opened to close those gaps:

1. Workflow-root discovery (cwd handling)
2. Restart / new-run protocol
3. Large-payload `--output-file`
4. `--exec-used` redundancy
5. Typed precondition failures
6. Terminology ("consumer project root")
7. In-place revise

Brainstorming 00003's Q&A — specifically on restart vs revise — kept
hitting structural questions that the 00003 scope couldn't answer.
"How does the agent abandon a run and start fresh?" depends on what a
run *is*. "How does the agent revise a node mid-flow?" depends on
which nodes are re-entrant. Those depend on what ripplegraph's
relationship to the consumer CLI is. Which depends on what
ripplegraph *is*.

The Q&A stopped being about restart/revise and became about
architecture. The decision was to shelve 00003 with a forwarding note
and open 00004 to land the framework's shape first. Several 00003
items survive unchanged into a re-scoped 00003 after 00004 closes
(workflow-root discovery, `--output-file`, terminology); others
(restart, revise, preconditions, `--exec-used`) are reshaped by
00004's decisions and will be reconsidered then.

## The conversation arc — ten reframes

The discussion progressed through ten distinct reframes, each
collapsing or sharpening the previous one. Recording the arc matters
because the final architecture is opinion-loaded with anti-patterns
we explicitly ruled out. Future readers should know why we *didn't*
pick simpler-looking options.

### Reframe 1 — Run as function invocation, not "loop in a chain"

The first attempt at restart was protocol-level: `state --new-run`,
`ripplegraph reset`, or a status-driven `step --action restart`. The
attempt to land restart surfaced a deeper duplication with revise.
Both were "rewind to a checkpoint" operations — restart rewinds to
genesis, revise rewinds to one node.

A first idea was to model loops as a chain: every restart creates a
new loop linked to the previous, so the agent can see what was
already done in the world. That answered the world-state-desync
problem (re-running a node with side effects) but added a chain
concept the framework didn't actually need.

The reframe that landed: **a graph is a function definition; a run is
one invocation of that function**. No chain semantics. Each run is
sovereign — its own directory, its own transcript. Restart isn't a
backward operation; it's "call the function again." This mirrors
how specdev treats assignments and how coeanshed treats sweep runs:
independent invocations, no implicit cross-linking.

Restart dissolves entirely — there's no special command for it,
because there's no time-travel involved. The agent simply starts a
new invocation.

### Reframe 2 — Hooks → pure functions

If ripplegraph is a *framework* (other CLIs consume it), it shouldn't
hardcode persistence. The first sketch was subprocess hooks declared
in workflow.json (language-agnostic) versus library-mode hooks
(in-process callbacks). Subprocess was more general; library mode was
faster.

The user pushed lighter: "why can't they just be callback functions
as parameters?" That collapses both: hooks aren't a framework
concept, just parameters to the ripplegraph functions. Pure
dependency injection.

Then lighter still: "maybe ripplegraph needs no hooks at all — what
the higher CLI does at each node is a script the higher CLI
provides." That collapses *everything*. Pure transition functions
that the consumer's CLI orchestrates. Ripplegraph becomes just:

```js
import { init, advance, rewind, position } from 'ripplegraph'
```

Functional core, imperative shell. xstate-style. Redux-style.

### Reframe 3 — Enforcement crisis: Graph + Runner + Driver

Pure functions give up enforcement. The user surfaced the problem:
"what if the orchestrator doesn't follow?" If ripplegraph has no I/O,
it has no leverage. A consumer's CLI could call `advance` twice
without running the node in between, fabricate state, skip nodes
entirely.

The user's resolution: two concepts that coexist in ripplegraph:

1. **Graph** — the pure kernel (data + transitions)
2. **Runner / Enforcer** — a stateful orchestrator that uses the
   Graph and enforces protocol order

Plus a third role:

3. **Driver** — the consumer-supplied I/O implementation (load/save
   state, run node, save output)

The Runner consumes the Graph and the Driver. The Driver fills in the
I/O details. The Runner enforces the canonical sequence. Power users
who want full control can drop to the Graph directly; the well-trodden
path goes through Runner.

This was the model heading into prior-art research.

### Reframe 4 — Mission anchor (we drifted)

An Explore agent scanned `/mnt/h/oceanwave/lib/specdev-cli`,
`/mnt/h/oceanwave/lib/cli/oceanshed-cli`,
`/mnt/h/oceanwave/lib/cli/oceanlive-cli`, and
`/mnt/h/ripplepulse/lib/cli/demoflow-cli`. Verdict: only demoflow
fits the proposed architecture; the other three are linear pipelines
or scaffolders that resist Graph + Runner.

The user pushed back: those CLIs are exactly the ones ripplegraph
exists to **rewrite**. The Explore agent looked at current
implementations, not the target architecture. The mission is captured
in `.specdev/project_notes/big_picture.md`:

> The graph is the deterministic skeleton; nodes are units of agent
> execution where an LLM can freely explore within a schema-validated
> boundary. The CLI is the runtime gatekeeper — not the LLM. Goal:
> tame agent drift by making the graph (not the LLM) own control
> flow.
>
> Litmus test for every feature: "Does this give the LLM control
> over flow, or only over content within a fixed flow?" If the
> former, redesign.

Re-anchoring on this dissolved the pure-functional drift. Ripplegraph
**must** perform I/O — that's how it gates. The CLI being the
gatekeeper is what bounds drift. A pure-functional ripplegraph would
push gatekeeping to the consumer's CLI, defeating the mission.

### Reframe 5 — langgraph's compile-then-interpret pattern

With the mission re-anchored, research surfaced the established
pattern. langgraph.js uses three layers:

1. **StateGraph** — declarative graph definition (just data)
2. **`.compile(...)`** — binds backends (checkpointer, store), produces
   a runtime instance
3. **Pregel** — the runtime engine, **"not intended to be
   instantiated directly by consumers"**

Pluggable backends (`BaseCheckpointSaver`, `BaseStore`) are small
interfaces; implementations live in separate npm packages
(`langgraph-checkpoint-sqlite`, `langgraph-checkpoint-postgres`).

xstate v5 uses the same pattern: `createMachine` (definition) +
`createActor` (runtime). Actor logic is data; the actor itself is
opaque.

This *exactly* answers the "what if the orchestrator doesn't follow"
concern: the runtime is opaque. Consumers can't bypass it because
they don't have access to internals. The compile step is the bridge
from declarative definition to enforced runtime.

### Reframe 6 — The inversion

But ripplegraph has an inversion that neither langgraph nor xstate
addresses. In their model, the framework drives:

```js
await graph.invoke(input)  // ← framework runs node functions in-process
```

The runtime is a long-lived event loop. The framework calls node
functions. The LLM is invoked *inside* a node by the framework.

In ripplegraph, the **agent drives**. The host agent (Claude Code,
Codex, etc.) calls `ripplegraph state`, does work, calls
`ripplegraph step`. Each CLI invocation is a complete request /
response cycle. There's no event loop. No in-process runtime that
persists across calls.

This changes the middle layer fundamentally. In langgraph:

- **Compile** binds backends, produces long-lived runtime
- **Runtime** drives execution, fires interrupts, manages super-steps

In ripplegraph:

- **Compile** binds backends, produces a **per-call orchestrator**
- **Runtime** is a stateless interpreter, invoked once per CLI call

The agent-driven inversion **simplifies** ripplegraph relative to
langgraph:

- No streaming (every call is one shot)
- No parallel super-step scheduling (sequential by definition)
- No in-memory actor system (state must serialize between calls)
- Smaller surface area
- "Compile" must be cheap because it runs every CLI invocation

### Reframe 7 — The copilot metaphor

The user offered a sharper mental anchor than "framework" or
"runtime": **ripplegraph is a mental copilot to the main coding
agent**. A copilot doesn't fly the plane — they track instruments,
read checklists, say "next is X and X requires Y," validate against
rules, refuse to certify a bad action. The pilot is the LLM. The
copilot has no authority, only credibility.

This reframed several things at once:

- The framework's primary product isn't transitions, it's **rendered
  context**. Every `state` call is the agent asking "what should I be
  thinking about right now?" The response — instruction + schema +
  neighborhood + next nodes + north star — is the framework's main
  artifact.
- "Gate" is too aggressive a word. The framework doesn't *block* the
  agent; it *refuses to certify* a bad transition. The agent can
  ignore the copilot; they just lose its assistance.
- The framework's authority comes from being correct and consistent,
  not from controlling the agent's process.
- Quality measure shifts: "did the agent stay on-rails," not "did
  the framework drive correctly."

This metaphor also explained why specdev / oceanshed / oceanlive fit:
they're already copilots in shape (track agent state, render next
instruction, validate output, advance). Ripplegraph is the shared
copilot kernel.

### Reframe 8 — Two compartments: Coach + Wiki

The next sharpening: the copilot has two distinct jobs that should
be separate systems.

**The Coach (ripplegraph)** answers flow questions only:
- Where am I?
- What's next?
- What schema does this node need?
- What did I just do in this run?

The Coach has **no opinion about folder-specific content**. If the
agent asks "what did we decide about the auth refactor last week,"
the Coach can't answer — that's project-specific knowledge.

**The Wiki** is a separate harness/memory system that holds
project-specific knowledge. When the agent gets confused mid-task or
the user asks about specifics, the Wiki answers. Backed by SQLite
search (FTS5 + optional vector), like OpenClaw and Hermes do.

The user proposed five wiki tiers (initially four, transcripts added
as optional fifth):

- **working** — current run context/memory/state
- **ledger** — historical run recordings
- **semantic / knowledge** — generic distilled knowledge about the
  folder/project
- **workflow / lessons** — detailed guides, gotchas, FAQs about how
  to run the workflow itself
- **transcripts** (optional) — all historical CLI sessions archived
  in SQLite

Important distinction the user drew: **semantic** is about the
PROJECT (what the codebase knows about itself); **workflow** is about
the TOOL (how to use specdev / oceanshed / oceanlive). These are
genuinely different axes that most prior art conflates.

### Reframe 9 — Inline vs spawn + Coach has state

The user pushed back on two specific gaps in the prior-art mapping:

1. **Inline vs spawn execution** of nodes wasn't in the academic
   prior art. ripplegraph's `exec: inline | spawn` from 00001 has no
   StateFlow/schema-gated equivalent because they treat all LLM calls
   as equivalent. The prior art for this distinction is in agent
   *harnesses*, specifically Claude Code's subagent / Task tool docs.

2. **Ripplegraph isn't fully stateless** — each run writes artifacts
   to record state. Coach has I/O. The "stateless framework" framing
   was misleading.

Both were valid. The follow-up research confirmed:

- **Inline vs spawn** is harness-level, not framework-level.
  Ripplegraph dictates policy per node; the host harness (Claude
  Code) actually does the spawning. Inline = same-context tool call;
  spawn = fresh-context subagent via the host's Task tool.
- **Coach has state** but only for the **current run**. Historical
  state belongs to the Wiki.

### Reframe 10 — Git checkout pattern; the workspace IS the current run

The user's final sharpening: `_current` doesn't need to be a pointer
file. Use git's pattern — the workspace IS the current run's working
tree. Past runs live in `.archive/`. Switching runs is `git checkout`
semantics.

This dissolved:

- `_current` pointer file (filesystem layout indicates active state)
- `runs/<id>/` nested path (artifacts live at workspace root)
- "Which run am I in" indirection for the agent (the cwd is the run)

And made the architecture's git analogy literal rather than
metaphorical. Each `ripplegraph run` rotates the current top-level
contents into `.archive/r_N_<timestamp>/` and initializes a fresh
state at the top level. Concurrent runs in one workspace are
explicitly out of scope (like git's default — use a second workspace
or a worktree).

## Prior-art research (what we surveyed and what it gave us)

This section captures the research the discussion drew on. It's
verbose intentionally — future readers can mine it for additional
patterns we didn't adopt but might want to revisit.

### langgraph.js

[deepwiki](https://deepwiki.com/langchain-ai/langgraph),
[langchain docs](https://docs.langchain.com/oss/python/langgraph/persistence)

Three layers:

1. **StateGraph (definition)** — nodes, edges, state schema. Pure
   data.
2. **`builder.compile({ checkpointer, store, interruptBefore })`** —
   produces a `CompiledStateGraph` (which extends Pregel).
3. **Pregel (runtime)** — message-passing graph engine with
   super-step model. **Not intended to be instantiated directly.**

Pluggable backends:

- `BaseCheckpointSaver` — three methods (`put`, `put_writes`,
  `get_tuple`). Implementations in separate packages:
  `langgraph-checkpoint-sqlite`, `langgraph-checkpoint-postgres`,
  `langgraph-checkpoint-mongodb`.
- `BaseStore` — cross-thread memory (different from per-thread
  checkpointer).
- Interrupts (`interruptBefore`, `interruptAfter`) — first-class
  human-in-the-loop pause points.

Key insight: **the runtime is opaque**. Consumers use stable methods
(`.invoke`, `.getState`, `.updateState`). They can't reach inside.
This solves the "what if they don't follow" problem at the
architecture level.

### xstate v5

[blog announcement](https://stately.ai/blog/2023-12-01-xstate-v5)

Actor model as the unit of abstraction. `createMachine(def)` produces
actor logic (data). `createActor(logic)` produces a running actor
instance. Persistence via `getPersistedSnapshot()` and
`createActor(logic, { snapshot })`. Higher-order wrappers like
`withLocalStoragePersistence(actorLogic)`.

Confirms the compile-then-interpret pattern across both langgraph and
xstate. This is the established shape for state-driven libraries.

### StateFlow (arXiv 2403.11322)

[paper](https://arxiv.org/html/2403.11322v1)

Direct academic validation of ripplegraph's mission:

> We propose StateFlow, a novel LLM-based task-solving paradigm that
> conceptualizes complex task-solving processes as state machines.
> We distinguish between **process grounding** (via state transitions
> and states) and **sub-task solving** (through actions within a
> state), enhancing control and interpretability.

Maps exactly onto ripplegraph:

- **Process grounding** = the graph owns where you are, what's next,
  what came before
- **Sub-task solving** = the LLM owns the actual work at each state

Quantitative wins: 13-28% higher success rates vs ReAct, 3-5× less
cost on InterCode SQL / ALFWorld benchmarks.

StateFlow has two variants:

- **Original** — framework drives, sends instructions to the LLM at
  each state
- **SF_Agent** — per-state agent invocation; same architecture, but
  each state instantiates an agent with a specific prompt

**Ripplegraph is SF_Agent applied to long-running CLI-tool-call
deployments.** A known-good architecture in a specific deployment
mode, not a from-scratch design.

### Schema-gated orchestration (arXiv 2603.06394)

[paper](https://arxiv.org/html/2603.06394v1)

Names ripplegraph's gating philosophy with academic precision:

> Schema-gated orchestration: the schema becomes a mandatory
> execution boundary at the composed-workflow level, so that nothing
> runs unless the complete action — including cross-step dependencies
> — validates against a machine-checkable specification.
>
> Conversation may shape intent, but cannot bypass validation.

Distinguishes:

- **Schema-gated tool execution** (single tool calls, e.g., MCP,
  OpenAI function calling) — already mainstream
- **Schema-gated orchestration** (composed workflows with cross-step
  type checking) — what ripplegraph implements

Quote we should adopt: *"An unconstrained agent can skip validation
and act on approximate reasoning; a schema-gated system cannot."*

### CaveAgent (arXiv 2603.something)

[paper](https://arxiv.org/html/2601.01569v3)

Different inversion than ripplegraph (LLM operates a Python runtime
via codegen), but the underlying claim transfers:

> Persistent runtime serves as a high-fidelity external memory that
> reduces context drift in multi-turn interactions.

Experimental: 28-59% token reduction because external state doesn't
have to be re-serialized into context. Validates ripplegraph's
filesystem-state-as-external-memory direction.

### Multi-Layer Memory Framework (arXiv 2603.29194)

[paper](https://arxiv.org/html/2603.29194v1)

Production-grade multi-tier memory:

- Working / episodic / semantic layers
- 56.90% retention after six temporal periods (8.65% absolute
  improvement over Jia et al.)
- Reduced false memory rate to 5.1%
- Reduced context usage to 58.40%

Validates that hierarchical memory addresses the drift containment
problem ripplegraph's Wiki tier is meant to solve.

### Claude Code subagent docs

[official](https://code.claude.com/docs/en/sub-agents)
[deepwiki](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/13.2-sub-agent-architecture)

Subagents have:
- Fresh context (only task description; **not** parent's conversation
  history)
- Share filesystem + CLAUDE.md, but NOT conversation
- Return text summary only (~98.75% token reduction for parent)
- Max recursion depth = 1 (can't spawn subagents)
- Optional `isolation: worktree` (git worktree)

When to use main agent (inline):
- Iterative refinement
- Multiple phases share significant context
- Latency matters
- Quick targeted change

When to use subagent (spawn):
- Verbose output not needed in main
- Tool restrictions wanted
- Self-contained, returns summary

This is the prior art for ripplegraph's `exec: inline | spawn`
declaration. Ripplegraph dictates the policy; the host harness
(Claude Code) actually does the spawn via its Task tool.

### Production agent memory landscape (2026)

[Agent Market Cap article](https://agentmarketcap.ai/blog/2026/04/11/agent-memory-architecture-production-2026)

Three-to-four tier consensus across production agents:

- **Working** (in-context)
- **Episodic** (logged events / past sessions)
- **Semantic** (distilled facts / knowledge base)
- **Procedural** (learned behaviors; often hardcoded as prompts)

LongMemEval leaderboard:
- OMEGA: 95.4% (proprietary)
- Hindsight + Gemini-3 Pro: 91.4%
- MemMachine: 93.0% (LongMemEval-S)
- Supermemory: 85.4%
- Zep + GPT-4o: 63.8%
- Mem0 + GPT-4o: 49.0%

Frameworks:

- **Letta** (formerly MemGPT) — OS-inspired: core memory (RAM),
  recall memory (conversation history), archival memory (vector
  store). Agent manages own memory.
- **Mem0** — minimal memory API (`add`, `search`). ADD/UPDATE/DELETE/
  NOOP at write time. Vector store + optional graph variant.
- **Zep / Graphiti** — temporal knowledge graph. Tracks not just what
  happened but when, and in what sequence.
- **LangGraph** — checkpointer + Store split.

### OpenClaw

[memory docs](https://docs.openclaw.ai/concepts/memory)
[pingcap blog](https://www.pingcap.com/blog/local-first-rag-using-sqlite-ai-agent-memory-openclaw/)

Markdown + SQLite hybrid:

- `MEMORY.md` — compact, curated, in-prompt
- `memory/YYYY-MM-DD.md` — daily notes, indexed for search
- `DREAMS.md` — optional dream-diary summaries
- SQLite + FTS5 + sqlite-vec for hybrid keyword/vector search
- Single-file portable (`~/.openclaw/memory/{agent}.sqlite`)
- Agent expected to distill daily notes → MEMORY.md over time

### Hermes Agent (Nous Research)

[memory features](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/)
[vectorize.io explainer](https://vectorize.io/articles/hermes-agent-memory-explained)
[glukhov analysis](https://www.glukhov.org/ai-systems/hermes/hermes-agent-memory-system/)

Four memory layers, explicitly named:

1. **Prompt memory (hot)** — MEMORY.md + USER.md, ~1300 tokens
   total. Frozen snapshot in system prompt at session start. Bounded
   character limits (2200 / 1375 chars).
2. **Session archive (cold recall)** — SQLite + FTS5 at
   `~/.hermes/state.db`. Searchable via `session_search` tool.
3. **Skills (procedural)** — markdown skill docs in
   `~/.hermes/skills/`. Self-improving as the agent reuses them.
4. **External provider (optional, pluggable)** — Honcho, Mem0,
   Hindsight, Holographic, RetainDB, ByteRover, OpenViking,
   Supermemory.

Explicit philosophy distinction we adopted:

> Hermes Agent has *internal memory* (MEMORY.md, USER.md, external
> providers) and *external knowledge bases* (LLM Wiki, Obsidian,
> Notion, ArXiv, filesystem), and they serve completely different
> roles. Internal memory is the brain; external knowledge bases are
> the library.

Maps to our Coach vs Wiki split.

### Model Workspace Protocol (arXiv 2603.16021)

[paper](https://arxiv.org/html/2603.16021v1)

Explicitly proposes filesystem as orchestration substrate:

> All state, all context, all instructions exist as files in a folder
> namespace... The workspace definition is the system. There is no
> separate deployment artifact.

Five-layer context hierarchy:
- L0: workspace identity
- L1: workspace-level task routing
- L2: stage-specific contract
- L3: factory configuration
- L4: working artifacts (per-run output)

Distinguishes **reference material** (stable rules, persist across
runs) from **working artifacts** (per-run content). The model
receives them as structurally separate context.

This is the closest published prior art to our git-checkout layout.

### "Sessions are disposable. The repository is not."

[dev.to article](https://dev.to/danielbutlerirl/designing-agentic-workflows-the-core-loop-166d)

Same pattern as MWP, named differently:

> Every command in this workflow runs in a fresh session... the
> workflow treats sessions as disposable and moves all durable state
> into the repository being changed.
>
> On the feature branch, alongside the code, you will find:
> - `AGENTS.md`
> - `.agents/tasks/<issue>/gates.md`
> - `.agents/tasks/<issue>/task-N.md`
> - `.agents/tasks/<issue>/cleanup.md`
>
> If it is not written down in the repository, it does not persist.

Per-issue task directory. Sequential workflow (`wf-01` gates → `wf-02`
plan → `wf-03` implement → `wf-04` cleanup). Each stage operates on
files; sessions are fresh.

### Filesystem-based agent state (named pattern)

[Agentic Patterns](https://www.agentic-patterns.com/patterns/filesystem-based-agent-state/)

Names it as a pattern:

> Instead of treating state as transient prompt text, the workflow
> externalizes progress into explicit artifacts that any later run
> can inspect and continue from.
>
> Some agents exhibit "proactive state externalization" — writing
> SUMMARY.md or CHANGELOG.md without explicit prompting when
> approaching context limits, treating the filesystem as extended
> working memory.

### Codified context infrastructure (arXiv 2602.20478)

[paper](https://arxiv.org/html/2602.20478)

Three-tier knowledge architecture from a real 108K-line C# project:

- **Tier 1: Project Constitution (Hot Memory)** — ~660 lines, always
  loaded. Code quality standards, conventions, build commands,
  pattern summaries, checklists.
- **Tier 2: Domain Specialist Agents** — 19 specialized subagents,
  invoked per task. Embed substantial project knowledge in their
  specs.
- **Tier 3: Codified Context Base (Cold Memory)** — 34 markdown
  files, ~16,250 lines, retrieved on demand via MCP.

Empirical: 74 sessions of consistent persistence behavior; 10+
sessions avoiding rediscovery of known issues.

Their Tier 1/Tier 3 conflates two things we separate: "how to
operate" (workflow) and "what the project is" (semantic).

### agentsge

[dev.to article](https://dev.to/reapollo/agentsmd-is-not-enough-building-project-memory-for-ai-coding-agents-1o01)

Proposed directory structure:

```
.agents/
  config.yaml
  rules/
  knowledge/
    _index.md
    architecture/
    patterns/
    lessons/
    conventions/
    dependencies/
  skills/
  mcp/
```

Five knowledge categories: architecture, pattern, lesson, convention,
dependency. The repo as the source of truth; tool-specific files
(AGENTS.md, CLAUDE.md, .cursorrules) are *derived* from this.

### aide-memory

[aide-memory.dev](https://www.aide-memory.dev/)

Path-scoped, layered, git-synced memory:

- Memories attach to code areas (`src/auth/**`)
- Four categorized layers
- JSON files in repo + local SQLite cache
- Auto-capture via hooks; auto-recall via path-scoped triggers

### akm workflow tool

[dev.to article](https://dev.to/itlackey/agents-that-remember-where-they-were-1koe)

Workflow + run model:

- `workflows/` — stored procedures (markdown with frontmatter)
- `runs/` — instances of procedures
- `akm workflow next <ref>` — get current actionable step
- `akm workflow complete <run-id> --step <step> --state completed`
- Survives session boundaries

This is conceptually close to ripplegraph's run-as-invocation model,
just at a different scale (single-CLI vs framework-for-CLIs).

## The architecture that crystallized

After all ten reframes and the research grounding, the architecture
that landed:

### Two systems, filesystem-coupled

```
.consumer/                          ← workspace = current run's working tree
  ├── workflow.json                 ← the program (stable across runs)
  ├── checkpoint.json               ← current run state (Coach owns)
  ├── <node-artifact-dirs>/         ← current run artifacts (Coach + agent)
  │     ├── brainstorm/proposal.md
  │     └── ...
  ├── .archive/                     ← past runs (the ledger)
  │     ├── r_001_2026-04-12T.../
  │     │     ├── checkpoint.json
  │     │     └── <archived artifacts>
  │     └── r_002_2026-05-01T.../
  └── .wiki/                        ← optional companion system
        ├── semantic/                ← project domain knowledge (markdown)
        ├── workflow/                ← workflow lessons / gotchas (markdown)
        └── transcripts.db           ← optional CLI session archive (SQLite FTS5)
```

The consumer workspace itself **is** the current run's working tree
— no `_current` pointer, no `runs/<id>/` nesting. Past runs live in
`.archive/`. The Wiki is a separate companion that survives across
runs.

### The Coach (ripplegraph) — flow only

**Operations:**
- `state` — render current position + instruction + schema +
  neighborhood
- `step` — accept output, validate against schema, advance
- `step --to <latch>` — rewind to a declared latch within the current
  run (gated)
- `run` — rotate current top-level into `.archive/`, initialize fresh
  workspace
- `checkout <archive-id>` — restore an archived run as the current
  workspace (probably v0.2)

**Reads:**
- `workflow.json` (the program)
- `checkpoint.json` (current state)
- Current top-level artifact directories

**Writes:**
- `checkpoint.json` (state transitions)
- Top-level artifact directories (as the agent submits outputs)
- `.archive/` (only during `run` rotation)

**Knows nothing about:**
- Folder-specific project content
- Past runs (those are Wiki territory after rotation)
- `.wiki/*` (the Wiki's domain)

### The Wiki (separate harness) — knowledge

**Five tiers:**

| Tier | Source on disk | Mutability | Who writes | Who reads |
|---|---|---|---|---|
| **working** | `.consumer/<top level>` | Mutable | Coach + agent (current run) | Coach (always); Wiki (for search) |
| **ledger** | `.consumer/.archive/` | Immutable | Coach (rotation) | Wiki (indexes) |
| **semantic** | `.consumer/.wiki/semantic/` | Mutable | Agent (curated) | Wiki (indexes) |
| **workflow** | `.consumer/.wiki/workflow/` | Mutable | Agent (curated) | Wiki (indexes) |
| **transcripts** | `.consumer/.wiki/transcripts.db` | Append-only | CLI tooling | Wiki (searches) |

**Implementation patterns** (borrowed from OpenClaw / Hermes):
- SQLite + FTS5 for keyword search
- Optional sqlite-vec for hybrid keyword + vector search
- Local-first, file-portable, git-committable
- No external service required

**Wiki provides retrieval; Coach provides flow.** They share only the
filesystem layout. Zero code coupling.

### The pluggable backend story

Smaller than I'd initially sketched:

- **Storage backend** — for `checkpoint.json` + artifact persistence.
  Filesystem default ships in-tree. Consumers can override for
  sqlite/etc. but probably won't in v0.1.
- **Executor backend** — only matters for **script-execution nodes**
  (the `exec: inline | spawn` from 00001 maps here for the script
  case). Subprocess default ships in-tree.
- **No Store interface** — what I was calling Store for cross-run
  knowledge is now the Wiki, which is a separate system entirely.

### Inline vs spawn — workflow-author-declared policy

The `exec: inline | spawn` on each node is a **policy declaration**,
not an execution mechanism. Ripplegraph itself doesn't spawn agents
— the host harness (Claude Code) does, via its Task tool.

Two flavors of nodes:

- **Script nodes** (e.g., `gather` runs `collect-git-status.sh`):
  Ripplegraph itself shells out via the Executor backend. Output
  captured deterministically.
- **Agent nodes** (e.g., `analyze` asks the LLM to classify):
  Ripplegraph returns instruction + schema + exec hint. Host agent
  does the work; calls back with output via `step`.

For agent nodes:
- `exec: inline` → agent does the work in its main thread (shares
  conversation context)
- `exec: spawn` → agent uses its Task tool to spawn a subagent with
  fresh context

Ripplegraph dictates which mode the workflow author intended. The
host agent's harness handles the actual delegation.

### The compile-then-interpret pattern (per-CLI-invocation)

Each ripplegraph CLI invocation:

1. Validate `workflow.json` (cheap)
2. Bind backends (storage, executor)
3. Read state from disk (`checkpoint.json`)
4. Perform one operation (state / step / run / checkout)
5. Persist new state
6. Return JSON to stdout
7. Process exits

The runtime is reconstituted every call. State lives on disk. The
"compile" step is per-CLI-startup, not amortized — it must be cheap.

This is langgraph's compile-then-interpret pattern applied to an
agent-driven inversion: the runtime isn't long-lived because the
agent owns the outer loop.

### Schema-gated orchestration (the gate philosophy)

Drift containment works through:

- **Tight schemas** — every node output validated against a Zod
  schema. Bad output is obvious.
- **Neighborhood context** — every `state` response includes prior
  ~2 nodes' full outputs, next ~2 nodes' names/purposes, parent
  subgraph goal, workflow-level north star.
- **Schema as boundary** — the framework refuses to advance unless
  the output validates. *"Conversation may shape intent, but cannot
  bypass validation."*
- **Latch gating** — rewinds are restricted to declared re-entrant
  nodes; the framework refuses to rewind to non-latches.

These are the gate. They don't *block* the agent in any absolute
sense — the agent can ignore the framework. But the framework refuses
to certify a transition that violates them.

## Open questions for design.md

The architecture above is the shape. Several tactical questions
remain for design.md to land:

### Coach-level (00004 scope)

1. **Storage interface** — exact shape of `checkpoint.json` and
   the methods needed to persist/restore.
2. **Latch gate mechanism** — does the framework return a
   `confirmation_required` status that the agent must re-submit with
   `--confirmed`, or is the gate delegated to a hook?
3. **workflow.json schema extensions** — latch declarations
   (sealed-by-default vs open-by-default), exec-mode declarations,
   precondition declarations.
4. **Run-id policy** — auto-generated timestamp ID? Optional
   `--name` for human-readable label? Mirrors specdev's
   `00001_<slug>`.
5. **Run inputs** — none / free-form JSON blob / typed schema. My
   lean is free-form JSON for v0.1; typed schema later if patterns
   emerge.
6. **Schema migration** — what does an existing 00001 workflow.json
   look like under the new model? Backwards compat for everything
   except latch / exec / rewind additions.
7. **Coach's CLI surface** — does ripplegraph ship the agent-facing
   CLI directly (`ripplegraph state` / `step`), or is the CLI
   consumer-provided (specdev's CLI wraps the framework)?
8. **`.archive/` entry naming** — timestamped (`r_001_2026-05-14T...`)
   vs ID-only (`r_001`) vs slug (`r_001_brainstorm-attempt-1`).
9. **What "fresh" looks like** — after rotation, is `.consumer/`
   literally empty of artifacts (just `workflow.json` + blank
   `checkpoint.json`), or does the Coach pre-create empty node
   directories based on the workflow definition?
10. **Concurrent runs** — explicitly out of scope for v0.1. Documented
    as "use a second workspace" or git-worktree-equivalent. OK?

### Wiki-level (future assignment, not 00004)

1. **Search API shape** — what does the host agent call to query the
   Wiki? Direct CLI (`wiki search <query>`)? MCP server? Library
   import?
2. **Indexing trigger** — when does the Wiki index new content?
   On-write hooks? Lazy on-search? Periodic?
3. **Tier-specific schemas** — does the semantic tier have a schema
   (like agentsge's architecture/pattern/lesson/convention/dependency
   types), or is it free-form markdown?
4. **Curation surface** — who decides what gets distilled from
   ledger → semantic? Agent decision? Periodic reflection? Explicit
   user action?
5. **Validation across all consumers** — does the Wiki's design
   actually serve specdev's knowledge needs, oceanshed's signal
   patterns, and oceanlive's session logs? Probably each needs to
   plug in additional indexers / schemas — what's the extensibility
   story?

## Scoping recommendations

### 00004 — Framework architecture (active)

Deliver:
- Definition: workflow.json schema with latches + exec modes
- Coach operations: `state`, `step`, `step --to`, `run`
- Per-run state format: `checkpoint.json`
- Storage backend interface + filesystem default
- Executor backend interface + subprocess default (script nodes
  only)
- The git-checkout workspace layout
- Subgraph composition (carry over from 00001)
- Migration path from 00001's existing workflow.json

Out of scope (deferred):
- The Wiki entirely (its own assignment)
- Multi-workspace / concurrent runs
- `ripplegraph checkout` (v0.2 verb)
- Cross-run knowledge

### 00003 — Surviving ergonomics (re-scoped, post-00004)

After 00004 closes, revisit 00003 with the remaining items:
- Workflow-root discovery (likely simplified by the new layout)
- `--output-file` (still useful, ergonomically)
- Terminology fixes
- Preconditions (likely a lifecycle hook per the new model)
- `--exec-used` (drop or document per the new exec policy)

Items already absorbed by 00004:
- Restart / new-run protocol → `ripplegraph run` rotation
- Revise → `step --to <latch>` within current run

### 00005 (future) — Wiki

The companion knowledge system:
- SQLite FTS5 indexing
- Five-tier surface (working / ledger / semantic / workflow /
  transcripts)
- Search API
- Validation against specdev / oceanshed / oceanlive needs

### 00006+ (future) — Consumer rewrites

Once 00004 and 00005 close:
- specdev rewritten on ripplegraph (`brainstorm → breakdown →
  implementation` as a graph; assignments-as-runs; knowledge index
  as Wiki)
- oceanshed rewritten on ripplegraph (signal lifecycle as a graph)
- oceanlive rewritten on ripplegraph (daily session as a graph)

Each consumer's CLI becomes a thin shell over the Coach + Wiki.
Domain-specific surface; shared kernel.

## What this discussion didn't settle

A few things we deliberately left for later or didn't fully resolve:

1. **The Coach's CLI binding** — does ripplegraph ship "the CLI" or
   just "the framework"? For demoflow, ripplegraph shipping its own
   CLI works (demoflow is a scaffolder only). For specdev / oceanshed
   / oceanlive, they need their own CLI shells anyway. So there's
   probably both: ripplegraph ships a reference CLI usable directly
   (for demoflow-style consumers); consumer-CLI authors can also
   import the framework as a library and wrap it (specdev-style).
2. **MCP vs direct CLI for the Wiki** — many production systems
   surface their wiki / memory as an MCP server. We haven't decided
   whether the ripplegraph Wiki should be MCP-first, CLI-first, or
   both.
3. **Wiki's authority over `workflow/`** — workflow lessons could
   live in the Wiki *or* alongside the workflow definition itself. My
   read: they're separate. workflow.json is the program; `.wiki/
   workflow/` is the lessons accumulated from running the program
   (gotchas, FAQs, "if you see X, try Y"). But this could be argued.
4. **Pluggability of the Executor for agent nodes** — agent nodes
   don't need an executor (they're delegated to the host harness).
   But should the framework provide hooks for the host harness to
   integrate? E.g., "ripplegraph wants to know whether this Task
   subagent succeeded so it can decide the next transition signal."
   Unclear if this is in scope.
5. **Transcript inclusion** — the fifth Wiki tier was added almost
   as an afterthought. We haven't validated whether CLI session
   transcripts are actually useful for retrieval, or whether the
   ledger (per-run artifacts) is sufficient.

These are deferred to design.md / future assignments.

## Why the journey matters

The final architecture looks clean: Coach + Wiki + filesystem layout.
But several steps along the way nearly took us into anti-patterns we
would have regretted:

- The pure-functional reframe (Reframe 2) would have given up the
  gate, which is the mission.
- The Graph + Runner + Driver pattern (Reframe 3) was correct in
  shape but I drifted toward consumer-owns-everything, which the
  mission anchor (Reframe 4) had to correct.
- The langgraph mapping (Reframe 5) was directly applicable until
  the inversion (Reframe 6) showed the runtime layer needed
  reframing.
- I over-fit the four-tier memory framework (working / episodic /
  semantic / procedural) and had to be corrected to the actual axes
  that matter for ripplegraph (Reframe 9).
- The `_current` pointer (early Reframe 8 sketch) was unnecessary
  once the git-checkout pattern landed (Reframe 10).

Recording this so we don't accidentally backslide. The architecture
is opinion-loaded; the opinions are load-bearing; the journey
explains why.

## References

Papers and articles cited above, consolidated:

- StateFlow — https://arxiv.org/html/2403.11322v1
- Schema-gated orchestration — https://arxiv.org/html/2603.06394v1
- CaveAgent — https://arxiv.org/html/2601.01569v3
- Multi-Layer Memory Framework — https://arxiv.org/html/2603.29194v1
- Codified Context Infrastructure — https://arxiv.org/html/2602.20478
- Model Workspace Protocol — https://arxiv.org/html/2603.16021v1
- langgraph.js architecture —
  https://deepwiki.com/langchain-ai/langgraph/3-core-framework-architecture
- langgraph persistence —
  https://docs.langchain.com/oss/python/langgraph/persistence
- xstate v5 — https://stately.ai/blog/2023-12-01-xstate-v5
- Claude Code subagents — https://code.claude.com/docs/en/sub-agents
- Sub-agent architecture deepwiki —
  https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/13.2-sub-agent-architecture
- Production agent memory 2026 —
  https://agentmarketcap.ai/blog/2026/04/11/agent-memory-architecture-production-2026
- OpenClaw memory docs — https://docs.openclaw.ai/concepts/memory
- OpenClaw SQLite RAG —
  https://www.pingcap.com/blog/local-first-rag-using-sqlite-ai-agent-memory-openclaw/
- Hermes Agent memory —
  https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
- Hermes memory explained — https://vectorize.io/articles/hermes-agent-memory-explained
- Hermes memory deep dive —
  https://www.glukhov.org/ai-systems/hermes/hermes-agent-memory-system/
- agentsge —
  https://dev.to/reapollo/agentsmd-is-not-enough-building-project-memory-for-ai-coding-agents-1o01
- aide-memory — https://www.aide-memory.dev/
- akm workflows — https://dev.to/itlackey/agents-that-remember-where-they-were-1koe
- Filesystem-based agent state —
  https://www.agentic-patterns.com/patterns/filesystem-based-agent-state/
- "Sessions are disposable" —
  https://dev.to/danielbutlerirl/designing-agentic-workflows-the-core-loop-166d
- Git worktrees for parallel agents —
  https://www.augmentcode.com/guides/git-worktrees-parallel-ai-agent-execution
- Aider conventions — https://aider.chat/docs/usage/conventions.html
- Inngest durable execution + AI —
  https://www.inngest.com/blog/durable-execution-key-to-harnessing-ai-agents
