import type { Actor } from './transitions';
import { ApprovalStatus, AuditEventType, Persona, TerminalReason } from './types';
import type { LeaveRequest } from './types';

export interface EmployeeRejectionReason {
  requestId: string;
  version: number;
  approvalStatus: typeof ApprovalStatus.REJECTED;
  reason: string;
}

/** Employee-consumer read seam. Authorization precedes allowlisted projection. */
export const selectEmployeeRejectionReason = (
  requests: LeaveRequest[], requestId: string, actor: Actor,
): EmployeeRejectionReason | null => {
  if (actor.role !== Persona.EMPLOYEE) return null;
  const request = requests.find((r) => r.requestId === requestId);
  if (!request || request.employeeId !== actor.id) return null;
  if (request.isStaleVersion || request.approvalStatus !== ApprovalStatus.REJECTED) return null;
  const decisionRole = request.terminalReason === TerminalReason.REJECTED_BY_MANAGER ? Persona.MANAGER
    : request.terminalReason === TerminalReason.REJECTED_BY_HR ? Persona.HR : null;
  if (!decisionRole) return null;
  const decision = [...request.auditHistory].reverse().find((event) =>
    event.eventType === AuditEventType.DECISION && event.actorRole === decisionRole &&
    event.details.decision === 'rejected' && typeof event.details.reason === 'string',
  );
  if (!decision || typeof decision.details.reason !== 'string') return null;
  return { requestId: request.requestId, version: request.version, approvalStatus: ApprovalStatus.REJECTED, reason: decision.details.reason };
};
