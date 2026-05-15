# Proposal — reference demo CLI

Build `ripplegraph-demo` as a small reference consumer CLI on top of the core Ripplegraph runtime. Assignment 4 proved that strong and weak coding agents can drive the low-level JSON CLI, but the raw output is verbose, run discovery is manual, and runtime files currently sit directly in the workflow root.

This assignment should keep the runtime generic while demonstrating how a consumer CLI can provide compact agent-facing commands, friendlier summaries, and a cleaner `.ripplegraph/` state directory. The goal is not to build SpecDev, Oceanlive, or a complete authoring system; it is to create a concrete pattern that those CLIs can copy.
