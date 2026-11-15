import { isHrEscalatedRequest } from './hrFinalDecision';
import { Persona } from './types';
import type { LeaveRequest } from './types';
import type { Actor } from './transitions';

/** Explicit allowlist; no raw request, balance, attachments or private audit details cross this boundary. */
export const selectHrReview = (requests: LeaveRequest[], requestId: string, actor: Actor) => {
  if (actor.role !== Persona.HR || !actor.id.trim()) return null;
  const request = requests.find(item => item.requestId === requestId);
  if (!request || request.isStaleVersion || !isHrEscalatedRequest(request)) return null;
  return {
    requestId: request.requestId, version: request.version, employeeName: request.employeeName,
    leaveType: request.leaveType, startDate: request.startDate, endDate: request.endDate,
    durationWorkingDays: request.durationWorkingDays, approvalStatus: request.approvalStatus,
    approvalStage: request.approvalStage,
    route: request.approvalPath.map(step => ({ role: step.ownerRole, status: step.status, decidedAt: step.decidedAt })),
    history: request.auditHistory.filter(event => event.eventType === 'escalation')
      .map(event => ({ eventType: event.eventType, actor: event.actor, timestamp: event.timestamp }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
  };
};
