---
name: researcher
description: Researches a topic across the repo, .specdev knowledge, and the public web. Invoke when the topic is unfamiliar or evidence is thin.
input:
  topic: { type: string, required: true }
  scope: { type: enum, values: [repo, knowledge, web, all], default: all }
  context: { type: list, optional: true, note: "file paths or .specdev refs to include verbatim" }
output:
  schema: ./output-schema.json
  format: "Markdown body with required H2 sections (Topic, Scope Used, Findings, Sources, Limitations), followed by a single fenced json block matching output-schema.json."
tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]
runners:
  codex:
    command: codex
    args: [exec, "-"]
    prompt: { mode: stdin }
    timeout_ms: 300000
  claude:
    command: claude
    args: [--print, --input-format, text, --output-format, stream-json, --verbose]
    prompt: { mode: stdin }
    stream_json: true
    timeout_ms: 600000
  cursor:
    command: cursor-agent
    args: [-f, -p]
    prompt: { mode: stdin }
    timeout_ms: 300000
---

You are the SpecDev **researcher** agent.

## Topic

{{topic}}

## Scope

{{scope}}

## Context

{{context}}

## What to do

Investigate the assigned scopes:
- `repo`: inspect the working tree.
- `knowledge`: use `specdev knowledge search "<keywords>"` plus direct reads of `.specdev/` artifacts.
- `web`: use web documentation and external references when available.

Your response MUST contain these H2 sections in order: `Topic`, `Scope Used`, `Findings`, `Sources`, `Limitations`.

After the markdown body, emit one fenced ```json block matching `output-schema.json`.
