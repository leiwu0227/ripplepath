import { runStateCommand } from './commands/state.js';
import { runStepCommand } from './commands/step.js';
import { runValidateCommand } from './commands/validate.js';
import { runInitCommand } from './commands/init.js';
import { RipplegraphError } from './graph/types.js';

interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = '', ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }
  return { command, flags };
}

function getStringFlag(flags: ParsedArgs['flags'], name: string): string | undefined {
  const v = flags[name];
  return typeof v === 'string' ? v : undefined;
}

function emitJson(payload: unknown): void {
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
}

function emitError(err: unknown): void {
  if (err instanceof RipplegraphError) {
    process.stderr.write(
      JSON.stringify({ status: 'error', code: err.code, message: err.message }, null, 2) + '\n',
    );
  } else {
    const e = err as Error;
    process.stderr.write(
      JSON.stringify({ status: 'error', code: 'E_INTERNAL', message: e.message, stack: e.stack }, null, 2) + '\n',
    );
  }
}

const HELP = `ripplegraph — host-agent-driven workflow runtime

Commands:
  state                              Read current state (auto-inits on first call)
    --workflow-root <path>           Workflow root (default: cwd)

  step                               Submit work or confirm a pending jump
    --output <json>                  Validated output for the current work node
    --exec-used inline|spawn         Which mode the host used (required with --output)
    --confirm <proposal_id>          Confirm or reject a pending free-entry jump
    --decision approved|rejected     Required with --confirm
    --workflow-root <path>           Workflow root (default: cwd)

  validate                           Parse the graph and resolve every node folder
    --workflow-root <path>

  init                               Scaffold AGENT.md, workflow.json, runs/
    [--update]                       Refresh the protocol section while preserving
                                     consumer-appendix content between markers
`;

async function main(argv: string[]): Promise<void> {
  const { command, flags } = parseArgs(argv);

  if (!command || command === 'help' || command === '--help' || flags['help']) {
    process.stdout.write(HELP);
    return;
  }

  switch (command) {
    case 'state': {
      const response = await runStateCommand({
        workflowRoot: getStringFlag(flags, 'workflow-root'),
      });
      emitJson(response);
      return;
    }
    case 'step': {
      const rawOutput = getStringFlag(flags, 'output');
      const output =
        rawOutput !== undefined
          ? (() => {
              try {
                return JSON.parse(rawOutput);
              } catch (e) {
                throw new RipplegraphError('E_BAD_JSON', `--output is not valid JSON: ${(e as Error).message}`);
              }
            })()
          : undefined;
      const execUsedRaw = getStringFlag(flags, 'exec-used');
      const execUsed =
        execUsedRaw === 'inline' || execUsedRaw === 'spawn' ? execUsedRaw : undefined;
      const decisionRaw = getStringFlag(flags, 'decision');
      const decision =
        decisionRaw === 'approved' || decisionRaw === 'rejected' ? decisionRaw : undefined;
      const response = await runStepCommand({
        workflowRoot: getStringFlag(flags, 'workflow-root'),
        output,
        execUsed,
        confirm: getStringFlag(flags, 'confirm'),
        decision,
      });
      emitJson(response);
      return;
    }
    case 'validate': {
      const response = await runValidateCommand({
        workflowRoot: getStringFlag(flags, 'workflow-root'),
      });
      emitJson(response);
      return;
    }
    case 'init': {
      const response = await runInitCommand({
        targetDir: getStringFlag(flags, 'target') ?? getStringFlag(flags, 'workflow-root'),
        update: flags['update'] === true,
      });
      emitJson(response);
      return;
    }
    default: {
      process.stderr.write(`unknown command: ${command}\n\n${HELP}`);
      process.exit(2);
    }
  }
}

main(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch((err) => {
    emitError(err);
    process.exit(1);
  });
