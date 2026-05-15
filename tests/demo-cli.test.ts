import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const cli = path.join(repoRoot, 'src', 'demo-cli.ts');

function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-demo-cli-'));
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
                properties: { decision: { type: 'string', enum: ['proceed', 'stop'] } },
              },
              edges: [{ to: 'done', when: { decision: 'stop' } }],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        },
        mockcopy: {
          entry: 'plan',
          nodes: {
            plan: {
              purpose: 'Plan mockcopy run',
              instructions: 'Submit the plan.',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['plan'],
                properties: { plan: { type: 'string' } },
              },
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

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('ripplegraph-demo cli', () => {
  it('renders an active run and submits output with concise guidance', () => {
    const root = makeRoot();
    try {
      expect(run(['start', 'daily', '--run', 'daily-a', '--workflow-root', root]).stdout).toContain('Current run: daily-a');
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('Node: review');
      expect(status).toContain('decision: proceed | stop');
      expect(status).toContain('ripplegraph-demo submit');
      expect(run(['submit', '{"decision":"stop"}', '--workflow-root', root]).stdout).toContain('Run completed: daily-a');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders available graphs, resumable runs, and run summaries', () => {
    const root = makeRoot();
    try {
      const noFocus = run(['status', '--workflow-root', root]).stdout;
      expect(noFocus).toContain('No focused run.');
      expect(noFocus).toContain('daily');
      expect(noFocus).toContain('mockcopy');

      run(['start', 'mockcopy', '--run', 'mock-a', '--workflow-root', root]);
      run(['pause', 'pause mockcopy', '--workflow-root', root]);
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('mock-a  suspended  mockcopy  plan');
      expect(status).toContain('ripplegraph-demo resume mock-a');

      const runs = run(['runs', '--workflow-root', root]).stdout;
      expect(runs).toContain('Focused run: none');
      expect(runs).toContain('mock-a  suspended  mockcopy  plan');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
