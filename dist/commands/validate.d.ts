import { RipplegraphError } from '../graph/types.js';
export declare class MissingWorkflowRootError extends RipplegraphError {
    constructor(rootPath: string);
}
export interface ValidateResponse {
    status: 'ok' | 'errors';
    rootPath: string;
    workNodeCount: number;
    subgraphCount: number;
    errors?: string[];
}
export declare function runValidateCommand(opts?: {
    workflowRoot?: string;
}): Promise<ValidateResponse>;
