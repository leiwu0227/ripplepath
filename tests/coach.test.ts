import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendTransition,
  ensureWorkflowRoot,
  getState,
  loadWorkflow,
  readCheckpoint,
  readCurrent,
  resumeRun,
  startRun,
  stepRun,
  suspendRun,
  writeCheckpoint,
  writeCurrent,
  writeNodeOutput,
} from '../src/index.js';

function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-coach-'));
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
              edges: [
                { to: 'execute', when: { decision: 'proceed' } },
                { to: 'done', when: { decision: 'stop' } },
              ],
            },
            execute: {
              purpose: 'Record execution result',
              instructions: 'Submit the execution summary.',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['summary'],
                properties: { summary: { type: 'string' } },
              },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        },
        mockcopy: {
          entry: 'plan',
          nodes: {
            plan: {
              purpose: 'Plan mockcopy run',
              instructions: 'Submit the mockcopy plan.',
              exec: 'inline',
              outputSchema: { type: 'object' },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        },
      },
    }),
    'utf8',
  );
  return root;
}

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

describe('coach operations', () => {
  it('starts, suspends, and resumes exactly one focused run', () => {
    const root = makeRoot();
    try {
      expect(getState({ workflowRoot: root }).status).toBe('no_focused_run');

      const started = startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      expect(started.run.id).toBe('daily-a');
      expect(() => startRun({ workflowRoot: root, graph: 'mockcopy', runId: 'mock-a' })).toThrow(
        /focused run/,
      );

      const suspended = suspendRun({ workflowRoot: root, note: 'daily execution preempted' });
      expect(suspended.run.status).toBe('suspended');
      expect(readCurrent(root)).toEqual({ focusedRunId: null });

      startRun({ workflowRoot: root, graph: 'mockcopy', runId: 'mock-a' });
      suspendRun({ workflowRoot: root });
      const resumed = resumeRun({ workflowRoot: root, runId: 'daily-a' });
      expect(resumed.position).toEqual({ graph: 'daily', node: 'review' });
      expect(readCheckpoint(root, 'daily-a').status).toBe('active');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('steps through a branch and completes at a terminal node', () => {
    const root = makeRoot();
    try {
      startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      const next = stepRun({ workflowRoot: root, output: { decision: 'stop' } });
      expect(next.status).toBe('completed');
      expect(readCheckpoint(root, 'daily-a').position).toEqual({ graph: 'daily', node: 'done' });
      expect(readCheckpoint(root, 'daily-a').status).toBe('completed');
      expect(readCurrent(root)).toEqual({ focusedRunId: null });
      const logEntries = fs
        .readFileSync(path.join(root, 'runs', 'daily-a', 'transition-log.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { op: string; input?: { artifact?: string } });
      expect(logEntries.map((entry) => entry.op)).toEqual(['start', 'step']);
      expect(logEntries[1]?.input?.artifact).toBe('artifacts/review/output.json');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid output without advancing the checkpoint', () => {
    const root = makeRoot();
    try {
      startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      const response = stepRun({ workflowRoot: root, output: { decision: 'maybe' } });
      expect(response.status).toBe('validation_error');
      expect(readCheckpoint(root, 'daily-a').position).toEqual({ graph: 'daily', node: 'review' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
