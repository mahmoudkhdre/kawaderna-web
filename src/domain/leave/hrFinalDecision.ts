import { countReasonCodePoints } from './rejectionReason';
import { exceedsAvailableBalance } from './selectors';
import { hrApprove, hrReject } from './transitions';
import type { Actor } from './transitions';
import { ApprovalStage, ApprovalStatus, AuditEventType, Persona } from './types';
import type { LeaveRequest } from './types';

export type HrFailure = 'not_found' | 'unauthorized' | 'stale_version' | 'invalid_state' | 'reason_required' | 'reason_too_long';
export type HrResult = { ok: true; requests: LeaveRequest[]; request: LeaveRequest } | { ok: false; error: HrFailure };

export const validateHrReason = (reason: string): HrFailure | null => {
  if (!reason.trim()) return 'reason_required';
  if (countReasonCodePoints(reason) > 500) return 'reason_too_long';
  return null;
};

export const isHrEscalatedRequest = (request: LeaveRequest): boolean =>
  request.approvalStatus === ApprovalStatus.PENDING &&
  request.approvalStage === ApprovalStage.HR &&
  exceedsAvailableBalance(request) &&
  request.approvalPath.some(step => step.ownerRole === 'manager' && step.status === 'approved') &&
  request.approvalPath.some(step => step.ownerRole === 'hr' && step.status === 'pending') &&
  request.auditHistory.some(event => event.eventType === AuditEventType.ESCALATION && event.details.to === 'hr');

export const decideAsHr = (
  requests: LeaveRequest[], requestId: string, actor: Actor, at: Date,
  expectedVersion: number, decision: 'approve' | 'reject', reason = '',
): HrResult => {
  const current = requests.find(request => request.requestId === requestId);
  if (!current) return { ok: false, error: 'not_found' };
  if (actor.role !== Persona.HR || !actor.id.trim()) return { ok: false, error: 'unauthorized' };
  if (current.isStaleVersion || current.version !== expectedVersion) return { ok: false, error: 'stale_version' };
  if (!isHrEscalatedRequest(current)) return { ok: false, error: 'invalid_state' };
  if (decision === 'reject') {
    const error = validateHrReason(reason);
    if (error) return { ok: false, error };
  }
  const result = decision === 'approve'
    ? hrApprove(current, actor, at, expectedVersion)
    : hrReject(current, actor, at, expectedVersion, reason);
  if (!result.ok) return { ok: false, error: result.error === 'acknowledgement_required' ? 'invalid_state' : result.error };
  return { ok: true, request: result.request, requests: requests.map(request => request.requestId === requestId ? result.request : request) };
};
