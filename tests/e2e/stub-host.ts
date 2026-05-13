import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI_BIN = path.join(REPO_ROOT, 'bin', 'ripplegraph');

export interface StepScriptEntry {
  expected_node_id: string;
  exec_used: 'inline' | 'spawn';
  output: unknown;
  // If the response is validation_error, retry with this output instead.
  on_validation_error?: unknown;
}

export interface ConfirmDecision {
  decision: 'approved' | 'rejected';
}

export interface StubHostOptions {
  workflowRoot: string;
  script: StepScriptEntry[];
  // Queue of decisions consumed in order each time the runtime returns
  // pending_confirmation. If the queue is empty when one arrives, we fail.
  confirmDecisions?: ConfirmDecision[];
  // Optional cap on total CLI invocations (safety).
  maxIterations?: number;
}

export interface RunResult {
  finalStatus: 'complete';
  iterations: number;
  events: string[];
}

function runCli(args: string[]): SpawnSyncReturns<string> {
  return spawnSync('node', [CLI_BIN, ...args], { encoding: 'utf8' });
}

function parseStdout(stdout: string): { status: string; [k: string]: unknown } {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('cli produced empty stdout');
  return JSON.parse(trimmed);
}

export function runStubHost(opts: StubHostOptions): RunResult {
  const decisions = [...(opts.confirmDecisions ?? [])];
  const script = [...opts.script];
  const events: string[] = [];
  const maxIter = opts.maxIterations ?? 50;
  let iterations = 0;

  while (iterations < maxIter) {
    iterations++;
    const stateProc = runCli(['state', '--workflow-root', opts.workflowRoot]);
    if (stateProc.status !== 0) {
      throw new Error(
        `state call failed (exit ${stateProc.status}): ${stateProc.stderr || stateProc.stdout}`,
      );
    }
    const stateResp = parseStdout(stateProc.stdout);
    events.push(`state:${stateResp['status']}`);

    if (stateResp['status'] === 'complete') {
      return { finalStatus: 'complete', iterations, events };
    }

    if (stateResp['status'] === 'pending_confirmation') {
      const decision = decisions.shift();
      if (!decision) {
        throw new Error('pending_confirmation arrived but no decision in queue');
      }
      const proposal = stateResp['proposal'] as { proposal_id: string };
      const stepProc = runCli([
        'step',
        '--confirm',
        proposal.proposal_id,
        '--decision',
        decision.decision,
        '--workflow-root',
        opts.workflowRoot,
      ]);
      if (stepProc.status !== 0) {
        throw new Error(
          `confirm step failed (exit ${stepProc.status}): ${stepProc.stderr || stepProc.stdout}`,
        );
      }
      events.push(`confirm:${decision.decision}`);
      continue;
    }

    if (stateResp['status'] !== 'work') {
      throw new Error(`unexpected state response: ${JSON.stringify(stateResp)}`);
    }

    const nodeId = stateResp['current_node_id'] as string;
    const entry = script.shift();
    if (!entry) {
      throw new Error(`script exhausted at node "${nodeId}"`);
    }
    if (entry.expected_node_id !== nodeId) {
      throw new Error(
        `script mismatch: expected node "${entry.expected_node_id}" but state at "${nodeId}"`,
      );
    }

    const stepProc = runCli([
      'step',
      '--output',
      JSON.stringify(entry.output),
      '--exec-used',
      entry.exec_used,
      '--workflow-root',
      opts.workflowRoot,
    ]);
    if (stepProc.status !== 0 && stepProc.stderr) {
      throw new Error(
        `step failed (exit ${stepProc.status}): ${stepProc.stderr}`,
      );
    }
    const stepResp = parseStdout(stepProc.stdout);
    events.push(`step:${stepResp['status']}:${nodeId}`);

    if (stepResp['status'] === 'validation_error' && entry.on_validation_error !== undefined) {
      const retryProc = runCli([
        'step',
        '--output',
        JSON.stringify(entry.on_validation_error),
        '--exec-used',
        entry.exec_used,
        '--workflow-root',
        opts.workflowRoot,
      ]);
      if (retryProc.status !== 0 && retryProc.stderr) {
        throw new Error(
          `retry step failed (exit ${retryProc.status}): ${retryProc.stderr}`,
        );
      }
      const retryResp = parseStdout(retryProc.stdout);
      events.push(`retry:${retryResp['status']}:${nodeId}`);
    }
  }

  throw new Error(`hit max iterations (${maxIter}) without reaching complete`);
}
