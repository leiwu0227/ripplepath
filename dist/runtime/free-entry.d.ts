import { type ParsedGraph, type RunState, type PendingConfirmation, RipplepathError } from '../graph/types.js';
export declare const MODAL_STACK_DEPTH_CAP = 2;
export declare class UnknownEntryError extends RipplepathError {
    constructor(entryId: string);
}
export declare class ModalDepthCapError extends RipplepathError {
    constructor(depth: number);
}
export declare class NoMatchingProposalError extends RipplepathError {
    constructor(givenId: string);
}
export interface JumpProposal {
    entry_id: string;
    reason: string;
}
export declare function proposeJump(state: RunState, proposal: JumpProposal, root: ParsedGraph, resume: {
    path: string[];
    attempt: number;
}): PendingConfirmation;
export declare function confirmJump(state: RunState, proposalId: string, decision: 'approved' | 'rejected', root: ParsedGraph): {
    applied: boolean;
    mode?: 'modal' | 'replace';
};
export declare function popFrame(state: RunState): {
    popped: boolean;
};
