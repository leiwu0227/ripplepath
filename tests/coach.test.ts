import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendTransition,
  ensureWorkflowRoot,
  loadWorkflow,
  readCheckpoint,
  readCurrent,
  writeCheckpoint,
  writeCurrent,
  writeNodeOutput,
} from '../src/index.js';

describe('coach runtime storage', () => {
  it('loads a multi-graph workflow and persists the focused run files', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-storage-'));
    try {
      fs.writeFileSync(
        path.join(root, 'workflow.json'),
        JSON.stringify({
          id: 'demo',
          version: '0.1.0',
          graphs: {
            daily: {
              entry: 'review',
              nodes: {
                review: {
                  purpose: 'Review generated intents',
                  instructions: 'Submit a decision.',
                  exec: 'inline',
                  outputSchema: {
                    type: 'object',
                    required: ['decision'],
                    properties: {
                      decision: { type: 'string', enum: ['proceed', 'stop'] },
                    },
                  },
                  edges: [{ to: 'done', when: { decision: 'proceed' } }],
                },
                done: { purpose: 'Complete', terminal: true },
              },
            },
          },
        }),
        'utf8',
      );

      const workflow = loadWorkflow(root);
      expect(Object.keys(workflow.graphs)).toEqual(['daily']);

      ensureWorkflowRoot(root);
      writeCurrent(root, { focusedRunId: 'run-a' });
      writeCheckpoint(root, {
        runId: 'run-a',
        status: 'active',
        rootGraph: 'daily',
        workflow: { id: 'demo', version: '0.1.0' },
        position: { graph: 'daily', node: 'review' },
        createdAt: '2026-05-15T00:00:00.000Z',
        updatedAt: '2026-05-15T00:00:00.000Z',
        outputs: {},
      });
      writeNodeOutput(root, 'run-a', 'review', { decision: 'proceed' });
      appendTransition(root, 'run-a', {
        ts: '2026-05-15T00:00:00.000Z',
        op: 'start',
        runId: 'run-a',
        from: null,
        to: { graph: 'daily', node: 'review' },
        actor: 'agent',
        input: null,
        output: null,
        validation: { ok: true },
        gateDecision: null,
        reason: null,
        error: null,
      });

      expect(readCurrent(root)).toEqual({ focusedRunId: 'run-a' });
      expect(readCheckpoint(root, 'run-a').position).toEqual({ graph: 'daily', node: 'review' });
      expect(
        JSON.parse(fs.readFileSync(path.join(root, 'runs', 'run-a', 'artifacts', 'review', 'output.json'), 'utf8')),
      ).toEqual({ decision: 'proceed' });
      expect(fs.readFileSync(path.join(root, 'runs', 'run-a', 'transition-log.jsonl'), 'utf8').trim()).toContain(
        '"op":"start"',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

