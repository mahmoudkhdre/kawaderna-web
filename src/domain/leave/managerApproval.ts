/**
 * Kawaderna Leave MVP - Manager approval service (Gap 2, Approve only).
 *
 * UI -> this service -> guard + `managerApprove` transition -> new request list.
 * Eligibility is re-validated here at execution time, so a previously enabled
 * button can never authorize a decision. The transition is only invoked for an
 * eligible request. Pure: `now` is injected; errors are semantic codes.
 */

import { canManagerDecide } from './selectors';
import { managerApprove, TransitionError } from './transitions';
import type { Actor } from './transitions';
import { Persona } from './types';
import type { LeaveRequest } from './types';

export const ApprovalFailure = {
  NOT_FOUND: 'not_found',
  ...TransitionError,
} as const;

export type ApprovalFailure = typeof ApprovalFailure[keyof typeof ApprovalFailure];

export type ManagerApprovalResult =
  | { ok: true; requests: LeaveRequest[]; request: LeaveRequest }
  | { ok: false; error: ApprovalFailure };

const fail = (error: ApprovalFailure): ManagerApprovalResult => ({ ok: false, error });

export const approveAsManager = (
  requests: LeaveRequest[],
  requestId: string,
  actor: Actor,
  now: Date,
  expectedVersion: number,
): ManagerApprovalResult => {
  const current = requests.find((r) => r.requestId === requestId);
  if (!current) return fail(ApprovalFailure.NOT_FOUND);
  if (actor.role !== Persona.MANAGER || current.managerId !== actor.id) return fail(ApprovalFailure.UNAUTHORIZED);
  if (current.isStaleVersion || current.version !== expectedVersion) return fail(ApprovalFailure.STALE_VERSION);
  if (!canManagerDecide(current, actor.id)) return fail(ApprovalFailure.INVALID_STATE);

  const result = managerApprove(current, actor, now, expectedVersion);
  if (!result.ok) return fail(result.error);
  return {
    ok: true,
    request: result.request,
    requests: requests.map((r) => (r.requestId === requestId ? result.request : r)),
  };
};
