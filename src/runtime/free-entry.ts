import { randomUUID } from 'node:crypto';
import {
  type ParsedGraph,
  type RunState,
  type FreeEntry,
  type PendingConfirmation,
  RipplepathError,
} from '../graph/types.js';
import { locate } from './graph-walk.js';

export const MODAL_STACK_DEPTH_CAP = 2;

export class UnknownEntryError extends RipplepathError {
  constructor(entryId: string) {
    super('E_UNKNOWN_ENTRY', `no free entry with id "${entryId}" in the active graph`);
  }
}

export class ModalDepthCapError extends RipplepathError {
  constructor(depth: number) {
    super(
      'E_MODAL_DEPTH_CAP',
      `cannot push modal frame: stack already at depth ${depth} (cap is ${MODAL_STACK_DEPTH_CAP})`,
    );
  }
}

export class NoMatchingProposalError extends RipplepathError {
  constructor(givenId: string) {
    super(
      'E_NO_MATCHING_PROPOSAL',
      `confirm requested for proposal_id "${givenId}" but state has no matching pending_confirmation`,
    );
  }
}

export interface JumpProposal {
  entry_id: string;
  reason: string;
}

export function proposeJump(
  state: RunState,
  proposal: JumpProposal,
  root: ParsedGraph,
): PendingConfirmation {
  const located = locate(root, state.current.path);
  const entry = located.graph.entries.find((e) => e.id === proposal.entry_id);
  if (!entry) {
    throw new UnknownEntryError(proposal.entry_id);
  }

  const pending: PendingConfirmation = {
    proposal_id: randomUUID(),
    entry_id: entry.id,
    reason: proposal.reason,
    message: `Agent proposes jumping to "${entry.id}" (${entry.mode}): ${proposal.reason}. Approve?`,
  };
  state.pending_confirmation = pending;
  return pending;
}

function findEntryById(graph: ParsedGraph, id: string): FreeEntry | null {
  return graph.entries.find((e) => e.id === id) ?? null;
}

export function confirmJump(
  state: RunState,
  proposalId: string,
  decision: 'approved' | 'rejected',
  root: ParsedGraph,
): { applied: boolean; mode?: 'modal' | 'replace' } {
  const pending = state.pending_confirmation;
  if (!pending || pending.proposal_id !== proposalId) {
    throw new NoMatchingProposalError(proposalId);
  }

  if (decision === 'rejected') {
    state.pending_confirmation = undefined;
    return { applied: false };
  }

  const located = locate(root, state.current.path);
  const entry = findEntryById(located.graph, pending.entry_id);
  if (!entry) {
    // Defensive: the graph changed between proposal and confirm
    state.pending_confirmation = undefined;
    throw new UnknownEntryError(pending.entry_id);
  }

  const targetPath = [...located.ancestorIds, entry.target];

  if (entry.mode === 'modal') {
    if (state.stack.length >= MODAL_STACK_DEPTH_CAP) {
      throw new ModalDepthCapError(state.stack.length);
    }
    state.stack.push({ path: state.current.path, attempt: state.current.attempt });
  }
  // For 'replace', we simply discard the current frame (do not push)

  state.current.path = targetPath;
  state.current.attempt = 0;
  state.pending_confirmation = undefined;
  return { applied: true, mode: entry.mode };
}

export function popFrame(state: RunState): { popped: boolean } {
  const frame = state.stack.pop();
  if (!frame) {
    return { popped: false };
  }
  state.current.path = frame.path;
  state.current.attempt = frame.attempt;
  return { popped: true };
}
