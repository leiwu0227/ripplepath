import { abandonRun, getState, resumeRun, RipplegraphError, startRun, stepRun, suspendRun, validateWorkflowRoot, } from './index.js';
function parseArgs(argv) {
    const [command = '', ...rest] = argv;
    const flags = {};
    for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (!arg.startsWith('--'))
            continue;
        const key = arg.slice(2);
        const next = rest[i + 1];
        if (next === undefined || next.startsWith('--')) {
            flags[key] = true;
        }
        else {
            flags[key] = next;
            i++;
        }
    }
    return { command, flags };
}
function stringFlag(flags, name) {
    const value = flags[name];
    return typeof value === 'string' ? value : undefined;
}
function requiredFlag(flags, name) {
    const value = stringFlag(flags, name);
    if (!value)
        throw new RipplegraphError('E_MISSING_ARG', `missing --${name}`);
    return value;
}
function workflowRoot(flags) {
    return stringFlag(flags, 'workflow-root') ?? process.cwd();
}
function emitJson(payload) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
function errorPayload(error) {
    if (error instanceof RipplegraphError) {
        return { status: 'error', code: error.code, message: error.message };
    }
    const err = error;
    return { status: 'error', code: 'E_INTERNAL', message: err.message };
}
function parseOutput(raw) {
    if (!raw)
        throw new RipplegraphError('E_MISSING_ARG', 'missing --output');
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        throw new RipplegraphError('E_BAD_JSON', `--output is not valid JSON: ${error.message}`);
    }
}
const HELP = `ripplegraph — focused-run Coach runtime POC

Commands:
  validate --workflow-root <path>
  start --graph <graph-id> --run-id <id> [--workflow-root <path>]
  state [--workflow-root <path>]
  step --output <json> [--workflow-root <path>]
  suspend [--note <text>] [--workflow-root <path>]
  resume --run-id <id> [--workflow-root <path>]
  abandon [--reason <text>] [--workflow-root <path>]
`;
async function main(argv) {
    const { command, flags } = parseArgs(argv);
    if (!command || command === 'help' || command === '--help' || flags['help']) {
        process.stdout.write(HELP);
        return;
    }
    switch (command) {
        case 'validate':
            emitJson(validateWorkflowRoot(workflowRoot(flags)));
            return;
        case 'start':
            emitJson(startRun({
                workflowRoot: workflowRoot(flags),
                graph: requiredFlag(flags, 'graph'),
                runId: requiredFlag(flags, 'run-id'),
            }));
            return;
        case 'state':
            emitJson(getState({ workflowRoot: workflowRoot(flags) }));
            return;
        case 'step':
            emitJson(stepRun({ workflowRoot: workflowRoot(flags), output: parseOutput(stringFlag(flags, 'output')) }));
            return;
        case 'suspend':
            emitJson(suspendRun({ workflowRoot: workflowRoot(flags), note: stringFlag(flags, 'note') }));
            return;
        case 'resume':
            emitJson(resumeRun({ workflowRoot: workflowRoot(flags), runId: requiredFlag(flags, 'run-id') }));
            return;
        case 'abandon':
            emitJson(abandonRun({ workflowRoot: workflowRoot(flags), reason: stringFlag(flags, 'reason') }));
            return;
        default:
            throw new RipplegraphError('E_UNKNOWN_COMMAND', `unknown command: ${command}`);
    }
}
main(process.argv.slice(2)).catch((error) => {
    emitJson(errorPayload(error));
    process.exit(1);
});
