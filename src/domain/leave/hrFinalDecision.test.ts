import { describe, expect, it } from 'vitest';
import { INBOX_NOW, lowBalancePendingHR } from './fixtures';
import { decideAsHr, validateHrReason } from './hrFinalDecision';
import { selectHrReview } from './hrReview';
import { selectEmployeeRejectionReason } from './employeeRejection';
import { ApprovalStage, ApprovalStatus, AuditEventType, Persona, TerminalReason } from './types';
import type { Actor } from './transitions';

const actor = { id: 'HR-1', role: Persona.HR };
const decide = (requests = [lowBalancePendingHR], kind: 'approve' | 'reject' = 'approve', reason = '', version = lowBalancePendingHR.version, who: Actor = actor) =>
  decideAsHr(requests, lowBalancePendingHR.requestId, who, INBOX_NOW, version, kind, reason);

describe('Gap 4 HR final decision', () => {
  it('approves without a reason, preserving processing and escalation', () => {
    const result = decide();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.approvalStatus).toBe(ApprovalStatus.APPROVED);
    expect(result.request.approvalStage).toBe(ApprovalStage.NONE);
    expect(result.request.processingStatus).toBe(lowBalancePendingHR.processingStatus);
    expect(result.request.auditHistory.at(-2)).toEqual(lowBalancePendingHR.auditHistory.at(-1));
    expect(result.request.auditHistory.at(-1)).toMatchObject({ eventType: AuditEventType.DECISION, actor: actor.id, actorRole: Persona.HR, details: { decision: 'approved' } });
    expect(result.request.approvalPath.at(-1)?.status).toBe('approved');
    expect(decide(result.requests)).toEqual({ ok: false, error: 'invalid_state' });
  });

  it('rejects with exact reason and allows only the owning employee to read it', () => {
    const reason = 'سبب واضح 😀';
    const result = decide([lowBalancePendingHR], 'reject', reason);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({ approvalStatus: ApprovalStatus.REJECTED, approvalStage: ApprovalStage.NONE, terminalReason: TerminalReason.REJECTED_BY_HR, processingStatus: lowBalancePendingHR.processingStatus });
    expect(result.request.approvalPath.at(-1)).toMatchObject({ status: 'rejected', reason });
    expect(result.request.auditHistory.at(-1)).toMatchObject({ eventType: AuditEventType.DECISION, actor: actor.id, details: { decision: 'rejected', reason } });
    expect(selectEmployeeRejectionReason(result.requests, result.request.requestId, { id: result.request.employeeId, role: Persona.EMPLOYEE })?.reason).toBe(reason);
    expect(selectEmployeeRejectionReason(result.requests, result.request.requestId, { id: 'OTHER', role: Persona.EMPLOYEE })).toBeNull();
    expect(selectEmployeeRejectionReason(result.requests, result.request.requestId, actor)).toBeNull();
    expect(decide(result.requests, 'reject', reason)).toEqual({ ok: false, error: 'invalid_state' });
  });

  it('validates Unicode code points without a taxonomy', () => {
    expect(validateHrReason('  ')).toBe('reason_required');
    expect(validateHrReason('😀'.repeat(500))).toBeNull();
    expect(validateHrReason('😀'.repeat(501))).toBe('reason_too_long');
    expect(validateHrReason('e\u0301'.repeat(250))).toBeNull();
    expect(validateHrReason('e\u0301'.repeat(251))).toBe('reason_too_long');
    expect(decide([lowBalancePendingHR], 'reject', '😀'.repeat(501))).toEqual({ ok: false, error: 'reason_too_long' });
  });

  it('denies wrong actor, state, version, missing request and missing escalation without mutation', () => {
    const cases = [
      decide([lowBalancePendingHR], 'approve', '', 1, { id: 'MGR-2001', role: Persona.MANAGER }),
      decide([lowBalancePendingHR], 'approve', '', 2),
      decide([]),
      decide([{ ...lowBalancePendingHR, approvalStage: ApprovalStage.MANAGER }]),
      decide([{ ...lowBalancePendingHR, auditHistory: lowBalancePendingHR.auditHistory.filter(e => e.eventType !== AuditEventType.ESCALATION) }]),
    ];
    expect(cases.map(c => c.ok ? 'success' : c.error)).toEqual(['unauthorized', 'stale_version', 'not_found', 'invalid_state', 'invalid_state']);
    expect(lowBalancePendingHR.approvalStatus).toBe(ApprovalStatus.PENDING);
  });

  it('projects only HR-safe review context', () => {
    const review = selectHrReview([lowBalancePendingHR], lowBalancePendingHR.requestId, actor);
    expect(review?.history).toHaveLength(1);
    expect(review?.route.at(-1)?.role).toBe('hr');
    expect(JSON.stringify(review)).not.toMatch(/balanceBefore|attachmentMetadata|riskFlags|auditHistory/);
    expect(selectHrReview([lowBalancePendingHR], lowBalancePendingHR.requestId, { id: 'OTHER', role: Persona.EMPLOYEE })).toBeNull();
  });
});
