import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RipplepathError } from '../graph/types.js';

const MARKER_BEGIN = '<!-- BEGIN workflow-specific guidance -->';
const MARKER_END = '<!-- END workflow-specific guidance -->';

export class TemplateNotFoundError extends RipplepathError {
  constructor(templatePath: string) {
    super('E_NO_TEMPLATE', `template not found: ${templatePath}`);
  }
}

function templatesDir(): string {
  // dist/commands/init.js → ../../templates
  // src/commands/init.ts during tsx → ../../templates relative to source
  const here = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), '..', '..', 'templates');
}

function readTemplate(name: string): string {
  const p = path.join(templatesDir(), name);
  if (!fs.existsSync(p)) {
    throw new TemplateNotFoundError(p);
  }
  return fs.readFileSync(p, 'utf8');
}

function extractAppendix(existing: string): string {
  const startIdx = existing.indexOf(MARKER_BEGIN);
  const endIdx = existing.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return '';
  return existing.slice(startIdx + MARKER_BEGIN.length, endIdx);
}

function spliceAppendix(template: string, appendix: string): string {
  const startIdx = template.indexOf(MARKER_BEGIN);
  const endIdx = template.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1) return template;
  return template.slice(0, startIdx + MARKER_BEGIN.length) + appendix + template.slice(endIdx);
}

export interface InitOptions {
  targetDir?: string;
  update?: boolean;
}

export interface InitResponse {
  status: 'created' | 'updated';
  targetDir: string;
  filesWritten: string[];
}

export async function runInitCommand(opts: InitOptions = {}): Promise<InitResponse> {
  const target = opts.targetDir
    ? path.isAbsolute(opts.targetDir)
      ? opts.targetDir
      : path.resolve(process.cwd(), opts.targetDir)
    : process.cwd();
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(path.join(target, 'runs'), { recursive: true });

  const agentTemplate = readTemplate('AGENT.md.tmpl');
  const workflowTemplate = readTemplate('workflow.json.tmpl');

  const agentMdPath = path.join(target, 'AGENT.md');
  const workflowJsonPath = path.join(target, 'workflow.json');

  const written: string[] = [];

  if (opts.update) {
    if (!fs.existsSync(agentMdPath)) {
      throw new RipplepathError(
        'E_NOTHING_TO_UPDATE',
        `--update was passed but no AGENT.md exists at ${agentMdPath}`,
      );
    }
    const existing = fs.readFileSync(agentMdPath, 'utf8');
    const appendix = extractAppendix(existing);
    const refreshed = spliceAppendix(agentTemplate, appendix);
    fs.writeFileSync(agentMdPath, refreshed, 'utf8');
    written.push(agentMdPath);
    return { status: 'updated', targetDir: target, filesWritten: written };
  }

  if (fs.existsSync(agentMdPath)) {
    throw new RipplepathError(
      'E_ALREADY_INITIALIZED',
      `${agentMdPath} already exists; pass --update to refresh the protocol section`,
    );
  }

  fs.writeFileSync(agentMdPath, agentTemplate, 'utf8');
  written.push(agentMdPath);
  if (!fs.existsSync(workflowJsonPath)) {
    fs.writeFileSync(workflowJsonPath, workflowTemplate, 'utf8');
    written.push(workflowJsonPath);
  }
  return { status: 'created', targetDir: target, filesWritten: written };
}
