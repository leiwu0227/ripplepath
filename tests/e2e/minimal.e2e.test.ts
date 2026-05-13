import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runStubHost, type StepScriptEntry } from './stub-host.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXAMPLE_SRC = path.join(REPO_ROOT, 'examples', 'minimal');

let workflowRoot: string;

// Run inside REPO_ROOT/.e2e-tmp so node_modules resolution from schema.ts
// imports walks up to the repo's node_modules. Using os.tmpdir() puts the
// workflow root outside the package, breaking tsx's `import 'zod'` lookup.
beforeEach(() => {
  workflowRoot = fs.mkdtempSync(path.join(REPO_ROOT, '.e2e-'));
  fs.cpSync(EXAMPLE_SRC, workflowRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(workflowRoot, { recursive: true, force: true });
});

function readActiveStateFile(): {
  state: Record<string, unknown>;
  transcript: string;
} {
  const activePath = path.join(workflowRoot, 'runs', 'active.json');
  const active = JSON.parse(fs.readFileSync(activePath, 'utf8')) as { run_id: string };
  const runDir = path.join(workflowRoot, 'runs', active.run_id);
  const state = JSON.parse(fs.readFileSync(path.join(runDir, 'state.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  const transcript = fs.readFileSync(path.join(runDir, 'transcript.md'), 'utf8');
  return { state, transcript };
}

describe('minimal workflow e2e', () => {
  it(
    'drives kickoff → analyze(explore→refine) → finish (with modal jump and schema retry)',
    () => {
      const script: StepScriptEntry[] = [
        {
          expected_node_id: 'kickoff',
          exec_used: 'inline',
          output: {
            topic: 'ripplepath rollout',
            intent: 'plan rollout sequence',
            handoff_summary:
              'Captured topic "ripplepath rollout" and intent "plan rollout sequence" for downstream analysis.',
          },
        },
        {
          expected_node_id: 'explore',
          exec_used: 'inline',
          // Intentionally invalid (missing required fields) to exercise retry
          output: {},
          on_validation_error: {
            approaches: [
              { name: 'pilot', rationale: 'try on one CLI first', tradeoffs: ['slow start'] },
              { name: 'big bang', rationale: 'flip everything at once', tradeoffs: ['high risk'] },
              { name: 'gradual', rationale: 'roll per team', tradeoffs: ['coordination cost'] },
            ],
            handoff_summary:
              'Surfaced three rollout approaches (pilot, big-bang, gradual) with rationale and tradeoffs for refine.',
          },
        },
        {
          expected_node_id: 'refine',
          exec_used: 'spawn',
          output: {
            findings: {
              chosen: 'gradual',
              justification:
                'Gradual rollout limits blast radius while still moving forward; tradeoff is coordination cost which is manageable.',
            },
            handoff_summary:
              'Chose gradual rollout over pilot and big-bang because blast radius matters more than launch speed here.',
          },
        },
        // After refine, the analyze subgraph reaches END, outputMap surfaces
        // findings to parent.outputs.analyze. Next we land at finish.
        // Finish proposes a fix_first jump.
        {
          expected_node_id: 'finish',
          exec_used: 'inline',
          output: {
            conclusion:
              'Rollout will proceed gradually across teams, monitoring each cohort before expanding.',
            handoff_summary:
              'Workflow concluded with a gradual rollout plan; the user also asked for an urgent hotfix to be queued.',
            proposed_jump: {
              entry_id: 'fix_first',
              reason: 'user mentioned an urgent hotfix that must be captured before completing',
            },
          },
        },
        // After modal jump approved we land at hotfix
        {
          expected_node_id: 'hotfix',
          exec_used: 'inline',
          output: {
            fix: 'patch the off-by-one in queue indexing',
            justification: 'unblocks the gradual rollout once a team is ready',
            handoff_summary:
              'Captured a hotfix proposal (off-by-one in queue indexing) and its justification for the rollout owner.',
          },
        },
      ];

      const result = runStubHost({
        workflowRoot,
        script,
        confirmDecisions: [{ decision: 'approved' }],
        maxIterations: 30,
      });

      expect(result.finalStatus).toBe('complete');

      const { state, transcript } = readActiveStateFile();

      // Final outputs in root scope
      expect(state['outputs']).toMatchObject({
        kickoff: { topic: 'ripplepath rollout' },
        analyze: { findings: { chosen: 'gradual' } },
        finish: { conclusion: expect.any(String) },
        hotfix: { fix: expect.any(String) },
      });

      // Subgraph internal state
      const subgraphs = state['subgraphs'] as Record<string, Record<string, unknown>>;
      expect(subgraphs['analyze']).toBeDefined();
      expect((subgraphs['analyze']!['outputs'] as Record<string, unknown>)['explore']).toBeDefined();
      expect((subgraphs['analyze']!['outputs'] as Record<string, unknown>)['refine']).toBeDefined();
      expect((subgraphs['analyze']!['input'] as Record<string, unknown>)['topic']).toBe(
        'ripplepath rollout',
      );

      // Modal stack should be empty at end (pushed for hotfix, popped on hotfix END)
      expect(state['stack']).toEqual([]);

      // No leftover pending confirmation
      expect(state['pending_confirmation']).toBeUndefined();

      // Every required lifecycle event must appear at least once
      const requiredEvents = [
        'run_created',
        'state_read',
        'step_submitted',
        'exec_audit',
        'transition',
        'subgraph_entered',
        'subgraph_exited',
        'validation_failed',
        'entry_proposed',
        'entry_confirmed',
        'workflow_completed',
      ];
      for (const evt of requiredEvents) {
        expect(transcript, `transcript missing event "${evt}"`).toContain(evt);
      }
      // And the structural pairs must occur in the right relative order
      const orderedPairs: Array<[string, string]> = [
        ['run_created', 'workflow_completed'],
        ['subgraph_entered', 'subgraph_exited'],
        ['entry_proposed', 'entry_confirmed'],
        ['validation_failed', 'workflow_completed'],
      ];
      for (const [before, after] of orderedPairs) {
        expect(
          transcript.indexOf(before),
          `${before} should appear before ${after}`,
        ).toBeLessThan(transcript.indexOf(after));
      }
    },
    60_000,
  );
});
