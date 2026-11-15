import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from './fixtures';
import { approveAsManager } from './managerApproval';
import { rejectAsManager } from './managerRejection';
import { REJECTION_CATEGORIES, REJECTION_LABELS } from './rejectionReason';
import { getCurrentOwnerRole, getNextAction, isVersionReadOnly } from './selectors';
import { ApprovalStage, ApprovalStatus, AuditEventType, Persona, ProcessingStatus, TerminalReason } from './types';
import type { LeaveRequest } from './types';

const manager = { id: 'MGR-2001', role: Persona.MANAGER } as const;
const run = (request: LeaveRequest, category: unknown = 'coverage_issue', details = '') =>
  rejectAsManager([request], request.requestId, manager, INBOX_NOW, request.version, category, details);

describe('rejectAsManager', () => {
  it.each(REJECTION_CATEGORIES)('persists one attributable decision for %s', (category) => {
    const before = f.routine;
    const original = JSON.stringify(before);
    const result = run(before, category, category === 'other' ? 'سبب آخر' : '');
    if (!result.ok) throw new Error(result.error);
    const request = result.request;
    const reason = category === 'other' ? 'أخرى: سبب آخر' : REJECTION_LABELS[category];
    expect(request.requestId).toBe(before.requestId);
    expect(request.version).toBe(before.version);
    expect(request.approvalStatus).toBe(ApprovalStatus.REJECTED);
    expect(request.approvalStage).toBe(ApprovalStage.NONE);
    expect(request.terminalReason).toBe(TerminalReason.REJECTED_BY_MANAGER);
    expect(request.processingStatus).toBe(before.processingStatus);
    expect(request.riskFlags).toEqual(before.riskFlags);
    expect(getCurrentOwnerRole(request)).toBeNull();
    expect(getNextAction(request)).toBeNull();
    expect(isVersionReadOnly(request)).toBe(true);
    expect(request.approvalPath[0]).toMatchObject({ status: 'rejected', reason, decidedAt: INBOX_NOW });
    expect(request.auditHistory.slice(0, -1)).toEqual(before.auditHistory);
    expect(request.auditHistory).toHaveLength(before.auditHistory.length + 1);
    expect(request.auditHistory.at(-1)).toMatchObject({ eventType: AuditEventType.DECISION, actor: manager.id, actorRole: Persona.MANAGER, timestamp: INBOX_NOW, details: { decision: 'rejected', reason } });
    expect(JSON.stringify(before)).toBe(original);
    expect(run(request, category)).toEqual({ ok: false, error: 'invalid_state' });
  });

  it('explicit low-balance rejection does not alter approval escalation', () => {
    const rejected = run(f.lowBalance, 'insufficient_balance');
    if (!rejected.ok) throw new Error(rejected.error);
    expect(rejected.request.approvalStatus).toBe(ApprovalStatus.REJECTED);
    expect(rejected.request.auditHistory.at(-1)?.eventType).toBe(AuditEventType.DECISION);
    const approved = approveAsManager([f.lowBalance], f.lowBalance.requestId, manager, INBOX_NOW, 1);
    if (!approved.ok) throw new Error(approved.error);
    expect(approved.request.approvalStatus).toBe(ApprovalStatus.PENDING);
    expect(approved.request.approvalStage).toBe(ApprovalStage.HR);
    expect(approved.request.auditHistory.at(-1)?.eventType).toBe(AuditEventType.ESCALATION);
  });

  it('replaces only one item without resubmission or new version', () => {
    const list = Object.values(f);
    const result = rejectAsManager(list, f.routine.requestId, manager, INBOX_NOW, 1, 'other', 'السبب');
    if (!result.ok) throw new Error(result.error);
    expect(result.requests).toHaveLength(list.length);
    expect(result.requests.filter((r) => r.requestId !== f.routine.requestId)).toEqual(list.filter((r) => r.requestId !== f.routine.requestId));
    expect(result.request.previousVersionId).toBeUndefined();
    expect(result.request.processingStatus).toBe(ProcessingStatus.NOT_STARTED);
  });

  it.each([
    ['missing', [f.routine], 'NOPE', manager, 1, 'coverage_issue', '', 'not_found'],
    ['other manager', [f.routine], f.routine.requestId, { id: 'MGR-OTHER', role: Persona.MANAGER }, 1, 'coverage_issue', '', 'unauthorized'],
    ['wrong role', [f.routine], f.routine.requestId, { id: manager.id, role: Persona.HR }, 1, 'coverage_issue', '', 'unauthorized'],
    ['version changed', [f.routine], f.routine.requestId, manager, 2, 'coverage_issue', '', 'stale_version'],
    ['stale flag', [{ ...f.routine, isStaleVersion: true }], f.routine.requestId, manager, 1, 'coverage_issue', '', 'stale_version'],
    ['clarification', [f.waitingClarification], f.waitingClarification.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['HR owner', [f.escalatedHr], f.escalatedHr.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['draft', [{ ...f.routine, approvalStatus: ApprovalStatus.DRAFT }], f.routine.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['approved', [{ ...f.routine, approvalStatus: ApprovalStatus.APPROVED }], f.routine.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['rejected', [{ ...f.routine, approvalStatus: ApprovalStatus.REJECTED }], f.routine.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['withdrawn', [{ ...f.routine, approvalStatus: ApprovalStatus.WITHDRAWN }], f.routine.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['expired', [{ ...f.routine, approvalStatus: ApprovalStatus.EXPIRED }], f.routine.requestId, manager, 1, 'coverage_issue', '', 'invalid_state'],
    ['no category', [f.routine], f.routine.requestId, manager, 1, undefined, '', 'category_required'],
    ['unknown category', [f.routine], f.routine.requestId, manager, 1, 'bogus', '', 'invalid_category'],
    ['multiple categories', [f.routine], f.routine.requestId, manager, 1, ['other', 'coverage_issue'], '', 'invalid_category'],
    ['blank other', [f.routine], f.routine.requestId, manager, 1, 'other', ' \n ', 'details_required'],
    ['501 points', [f.routine], f.routine.requestId, manager, 1, 'coverage_issue', '😀'.repeat(501), 'details_too_long'],
  ] as const)('%s fails with no mutation or payload', (_name, list, id, actor, version, category, details, error) => {
    const before = JSON.stringify(list);
    expect(rejectAsManager([...list], id, actor, INBOX_NOW, version, category, details)).toEqual({ ok: false, error });
    expect(JSON.stringify(list)).toBe(before);
  });

  it('requires recorded, timely low-balance acknowledgement', () => {
    const noAck = { ...f.lowBalance, auditHistory: f.lowBalance.auditHistory.filter((e) => e.eventType !== AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT) };
    expect(run(noAck)).toEqual({ ok: false, error: 'acknowledgement_required' });
    const future = { ...f.lowBalance, auditHistory: f.lowBalance.auditHistory.map((e) => e.eventType === AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT ? { ...e, timestamp: new Date(INBOX_NOW.getTime() + 1000) } : e) };
    expect(run(future)).toEqual({ ok: false, error: 'invalid_state' });
  });
});
