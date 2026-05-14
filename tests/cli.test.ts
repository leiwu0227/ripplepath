import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const cli = path.join(repoRoot, 'src', 'cli.ts');

function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-cli-'));
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
      },
    }),
    'utf8',
  );
  return root;
}

function run(args: string[]): { status: number | null; json: Record<string, unknown>; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    json: JSON.parse(result.stdout || '{}') as Record<string, unknown>,
    stderr: result.stderr,
  };
}

describe('reference cli', () => {
  it('starts, reads, steps, suspends, and resumes with JSON commands', () => {
    const root = makeRoot();
    try {
      expect(run(['validate', '--workflow-root', root]).json.status).toBe('ok');
      expect(run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-a']).json.status).toBe('ok');
      expect(run(['state', '--workflow-root', root]).json.position).toEqual({ graph: 'daily', node: 'review' });
      expect(run(['step', '--workflow-root', root, '--output', '{"decision":"maybe"}']).json.status).toBe(
        'validation_error',
      );
      expect(run(['step', '--workflow-root', root, '--output', '{"decision":"stop"}']).json.status).toBe(
        'completed',
      );
      expect(run(['state', '--workflow-root', root]).json.status).toBe('no_focused_run');
      expect(run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-b']).json.status).toBe('ok');
      expect(run(['suspend', '--workflow-root', root, '--note', 'pause']).json.run).toMatchObject({
        id: 'daily-b',
        status: 'suspended',
      });
      expect(run(['resume', '--workflow-root', root, '--run-id', 'daily-b']).json.run).toMatchObject({
        id: 'daily-b',
        status: 'active',
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

