## Round 1

- **[F1.1] Addressed** — Narrowed the `zod` peer dependency to `^3.25.0`
  (previously `^3.25.0 || ^4.0.0`) so the documented support range matches
  what the resolver's internal-shape introspection (`_def.typeName`,
  `_def.checks[].kind`) actually understands. Cross-Zod-4 support is
  out-of-scope for v0 and can be added later via a parallel detection path
  if/when a consumer needs it. `package.json` peerDependencies updated.

- **[F1.2] Addressed** — Transcript now records the full lifecycle.
  Added `run_created` emission in `state-store.ts:loadOrInitRun` after the
  initial state/active.json/transcript are written. Added
  `subgraph_entered` and `subgraph_exited` emission in
  `runtime/advance.ts` at the descend (push __start__) and pop (apply
  outputMap + follow parent edge) sites. `advanceStructural` now takes a
  required `AdvanceContext { rootPath, runId }` so it can append; state
  and step commands pass it through. E2E test no longer filters these
  events out — it asserts all 11 expected event types appear and that
  the structural pairs (`subgraph_entered`/`subgraph_exited`,
  `entry_proposed`/`entry_confirmed`, `run_created`/`workflow_completed`,
  `validation_failed`/`workflow_completed`) occur in the right relative
  order.

- **[F1.3] Addressed** — `free_entries` is now a structured top-level
  field on both `StateResponseWork` and `StepResponseWork`, populated
  from the active graph's entries via `locate(graph, currentPath)`.
  Hosts can read `response.free_entries` (an array of
  `{ id, target, description, mode }`) directly to know what jumps are
  available without parsing the markdown overview. The protocol template
  (`templates/AGENT.md.tmpl`) and example template (`examples/minimal/AGENT.md`)
  updated to point at `free_entries` instead of `state.overview.free_entries`.

## Round 2

- **[F2.1] Addressed** — `advanceStructural` now treats `__end__` at
  any depth uniformly via a depth-based modal-pop check. When the leaf is
  `__end__`, it inspects the top of `state.stack`; if the frame's
  resume depth (path length minus one) matches the current `__end__`'s
  depth (number of ancestor subgraphs), it pops the frame and resumes
  the deferred position. Only when no matching frame is present does it
  fall through to the normal "root → complete" or "subgraph exit + parent
  edge" paths. This means a modal entry declared inside a subgraph now
  pops correctly at the subgraph's `__end__` instead of being mistaken
  for a normal subgraph exit. Added `tests/unit/advance.test.ts` with a
  scenario where a modal target inside a subgraph reaches the
  subgraph's `__end__` — the test asserts the deferred sibling node
  (`beta`) is restored before the subgraph exits.

- **[F2.2] Addressed** — `confirmJump`'s `replace` branch now
  explicitly pops one frame off `state.stack` so a replace approved
  while inside a modal abandons that modal frame (matching the design's
  "replace abandons the current frame" semantics). When no modal is
  active the pop is a no-op. Added a unit case in
  `tests/unit/free-entry.test.ts` that simulates being inside a modal,
  approves a replace jump, and asserts the stack ends empty (the
  original frame is discarded, not restored on a later END).

Verification: typecheck clean; all 30 tests pass (parser 7, state-store 6,
neighborhood 6, free-entry 9, advance 1, e2e 1).
