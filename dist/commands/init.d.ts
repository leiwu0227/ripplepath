import { RipplepathError } from '../graph/types.js';
export declare class TemplateNotFoundError extends RipplepathError {
    constructor(templatePath: string);
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
export declare function runInitCommand(opts?: InitOptions): Promise<InitResponse>;
