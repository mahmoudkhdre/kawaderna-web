import { isHrEscalatedRequest } from '../../domain/leave/hrFinalDecision';
import { AuditEventType, Persona } from '../../domain/leave/types';
import type { LeaveRequest } from '../../domain/leave/types';
import type { GuideFacts } from './types';

type StepStatus = GuideFacts['managerStep'];

const stepOf = (request: LeaveRequest, role: 'manager' | 'hr'): StepStatus =>
  request.approvalPath.find(step => step.ownerRole === role)?.status ?? 'none';

/** The single reading point: everything the guide may know about a request. */
export const toGuideFacts = (request: LeaveRequest): GuideFacts => ({
  requestId: request.requestId,
  status: request.approvalStatus,
  stage: request.approvalStage,
  terminalReason: request.terminalReason ?? null,
  hasHrStep: request.approvalPath.some(step => step.ownerRole === 'hr'),
  managerStep: stepOf(request, 'manager'),
  hrStep: stepOf(request, 'hr'),
});

export const findGuideFacts = (requests: readonly LeaveRequest[], requestId: string | null): GuideFacts | null => {
  const request = requestId ? requests.find(item => item.requestId === requestId) : undefined;
  return request ? toGuideFacts(request) : null;
};

export interface TrackableSession { persona: Persona; actorId: string }

/**
 * Requests this role may legitimately be pointed at by the guide. Only requests of the demo employee are
 * trackable (baseline fixtures belong to the existing scenarios, not to the tour), and a role only lists what
 * it can already see in its own screens, so the picker never reveals another role's data.
 */
export const selectTrackable = (requests: readonly LeaveRequest[], session: TrackableSession | null, demoEmployeeId: string): string[] => {
  if (!session) return [];
  return requests.filter(request => {
    if (request.employeeId !== demoEmployeeId) return false;
    if (session.persona === Persona.EMPLOYEE) return request.employeeId === session.actorId;
    if (session.persona === Persona.MANAGER) return request.managerId === session.actorId;
    if (session.persona === Persona.HR) {
      return isHrEscalatedRequest(request) ||
        request.auditHistory.some(event => event.eventType === AuditEventType.DECISION && event.actorRole === Persona.HR);
    }
    return false;
  }).map(request => request.requestId);
};

/** The decision reason is shown only to roles that already own it in their screens (never stored by the guide). */
export const selectGuideReason = (request: LeaveRequest | undefined, persona: Persona): string | null => {
  if (!request || request.approvalStatus !== 'rejected') return null;
  const byManager = request.terminalReason === 'rejected_by_manager';
  const step = request.approvalPath.find(item => item.ownerRole === (byManager ? 'manager' : 'hr'));
  const reason = step?.reason ?? null;
  if (!reason) return null;
  // The employee's own reason comes from the permissioned employee binding, not from here.
  if (persona === Persona.EMPLOYEE) return null;
  return (byManager && persona === Persona.MANAGER) || (!byManager && persona === Persona.HR) ? reason : null;
};
