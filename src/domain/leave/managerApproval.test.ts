import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from './fixtures';
import { ApprovalFailure, approveAsManager } from './managerApproval';
import {
  BalanceSufficiency, getCurrentOwnerRole, getNextAction, selectManagerInbox, toManagerRequestDetail,
} from './selectors';
import { ApprovalStage, ApprovalStatus, AuditEventType, Persona, ProcessingStatus } from './types';
import type { LeaveRequest } from './types';

const MANAGER = { id: 'MGR-2001', role: Persona.MANAGER } as const;
const all = (): LeaveRequest[] => Object.values(f);
const approve = (id: string, over: Partial<{ actor: typeof MANAGER | { id: string; role: Persona }; version: number; list: LeaveRequest[] }> = {}) =>
  approveAsManager(over.list ?? all(), id, over.actor ?? MANAGER, INBOX_NOW, over.version ?? 1);

describe('approveAsManager: routine', () => {
  it('approves: Approved, stage none, no owner, DECISION audit, processing untouched', () => {
    const r = approve('LV-2026-101');
    if (!r.ok) throw new Error(r.error);
    expect(r.request.approvalStatus).toBe(ApprovalStatus.APPROVED);
    expect(r.request.approvalStage).toBe(ApprovalStage.NONE);
    expect(getCurrentOwnerRole(r.request)).toBeNull();
    expect(r.request.processingStatus).toBe(ProcessingStatus.NOT_STARTED);
    const last = r.request.auditHistory.at(-1);
    expect(last?.eventType).toBe(AuditEventType.DECISION);
    expect(last?.details).toEqual({ decision: 'approved' });
    expect(r.request.approvalPath[0].status).toBe('approved');
  });

  it('replaces only the target request and does not mutate the input list', () => {
    const list = all();
    const before = JSON.stringify(list);
    const r = approve('LV-2026-101', { list });
    if (!r.ok) throw new Error(r.error);
    expect(JSON.stringify(list)).toBe(before);
    expect(r.requests).toHaveLength(list.length);
    expect(r.requests.filter((x) => x.requestId !== 'LV-2026-101')).toEqual(list.filter((x) => x.requestId !== 'LV-2026-101'));
  });

  it('processing failure state is independent of a recorded approval', () => {
    const failed = { ...f.routine, processingStatus: ProcessingStatus.FAILED };
    const r = approve('LV-2026-101', { list: [failed] });
    if (!r.ok) throw new Error(r.error);
    expect(r.request.approvalStatus).toBe(ApprovalStatus.APPROVED);
    expect(r.request.processingStatus).toBe(ProcessingStatus.FAILED);
  });
});

describe('approveAsManager: low balance', () => {
  const run = () => {
    const r = approve('LV-2026-102');
    if (!r.ok) throw new Error(r.error);
    return r;
  };
  it('stays Pending, moves to HR, owner is HR, Manager step approved', () => {
    const { request } = run();
    expect(request.approvalStatus).toBe(ApprovalStatus.PENDING);
    expect(request.approvalStage).toBe(ApprovalStage.HR);
    expect(getCurrentOwnerRole(request)).toBe(Persona.HR);
    expect(request.approvalPath.map((s) => [s.ownerRole, s.status])).toEqual([['manager', 'approved'], ['hr', 'pending']]);
  });
  it('appends ESCALATION (not a DECISION) and keeps processing independent', () => {
    const { request } = run();
    const last = request.auditHistory.at(-1);
    expect(last?.eventType).toBe(AuditEventType.ESCALATION);
    expect(request.auditHistory.some((e) => e.eventType === AuditEventType.DECISION)).toBe(false);
    expect(request.processingStatus).toBe(ProcessingStatus.NOT_STARTED);
    expect(request.terminalReason).toBeUndefined();
  });
  it('leaves HR actions out of the Manager view and out of the Manager inbox actions', () => {
    const { request, requests } = run();
    const d = toManagerRequestDetail(request, INBOX_NOW);
    expect(d.summary.nextAction).toBeNull();
    expect(d.summary.canApprove).toBe(false);
    const row = selectManagerInbox(requests, 'MGR-2001', INBOX_NOW).find((x) => x.requestId === 'LV-2026-102');
    expect(row?.canApprove).toBe(false);
    expect(row?.nextAction).toBeNull();
    expect(getNextAction(request)).toBe('review_balance_exception'); // employee/HR selector unchanged
  });
  it('cannot be approved a second time by the Manager', () => {
    const first = run();
    const again = approve('LV-2026-102', { list: first.requests });
    expect(again).toEqual({ ok: false, error: ApprovalFailure.INVALID_STATE });
  });
});

describe('approveAsManager: denials never mutate', () => {
  it('unauthorized: other manager, wrong role', () => {
    expect(approve('LV-2026-101', { actor: { id: 'MGR-9999', role: Persona.MANAGER } })).toEqual({ ok: false, error: ApprovalFailure.UNAUTHORIZED });
    expect(approve('LV-2026-101', { actor: { id: 'MGR-2001', role: Persona.HR } })).toEqual({ ok: false, error: ApprovalFailure.UNAUTHORIZED });
    expect(approve('LV-2026-101', { actor: { id: 'EMP-1101', role: Persona.EMPLOYEE } })).toEqual({ ok: false, error: ApprovalFailure.UNAUTHORIZED });
  });
  it('wrong stage: waiting clarification, escalated, already approved', () => {
    for (const id of ['LV-2026-105', 'LV-2026-106']) {
      expect(approve(id)).toEqual({ ok: false, error: ApprovalFailure.INVALID_STATE });
    }
    const done = approve('LV-2026-101');
    if (!done.ok) throw new Error(done.error);
    expect(approve('LV-2026-101', { list: done.requests })).toEqual({ ok: false, error: ApprovalFailure.INVALID_STATE });
  });
  it('stale: flagged stale or version mismatch', () => {
    expect(approve('LV-2026-101', { list: [{ ...f.routine, isStaleVersion: true }] })).toEqual({ ok: false, error: ApprovalFailure.STALE_VERSION });
    expect(approve('LV-2026-101', { version: 0 })).toEqual({ ok: false, error: ApprovalFailure.STALE_VERSION });
  });
  it('unknown request', () => {
    expect(approve('NOPE')).toEqual({ ok: false, error: ApprovalFailure.NOT_FOUND });
  });
  it('low balance without acknowledgement is rejected by the transition', () => {
    const noAck = { ...f.lowBalance, auditHistory: f.lowBalance.auditHistory.filter((e) => e.eventType !== AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT) };
    expect(approve('LV-2026-102', { list: [noAck] })).toEqual({ ok: false, error: ApprovalFailure.ACKNOWLEDGEMENT_REQUIRED });
  });
});

describe('privacy after approval', () => {
  it('Manager detail of every resulting state carries no exact balance', () => {
    for (const id of ['LV-2026-101', 'LV-2026-102']) {
      const r = approve(id);
      if (!r.ok) throw new Error(r.error);
      const json = JSON.stringify(toManagerRequestDetail(r.request, INBOX_NOW));
      for (const forbidden of ['balanceBefore', 'affectedFields', 'explanationEn', 'EMP-', 'MGR-', 'slaDueAt']) {
        expect(json).not.toContain(forbidden);
      }
      expect(Object.keys(toManagerRequestDetail(r.request, INBOX_NOW).balance).sort()).toEqual(['lowBalanceAcknowledged', 'sufficiency']);
    }
    expect(toManagerRequestDetail(f.lowBalance, INBOX_NOW).balance.sufficiency).toBe(BalanceSufficiency.INSUFFICIENT);
  });
  it('the service result is the only place the exact balance lives (domain object), never the detail', () => {
    const r = approve('LV-2026-102');
    if (!r.ok) throw new Error(r.error);
    expect(JSON.stringify(toManagerRequestDetail(r.request, INBOX_NOW))).not.toMatch(/"balanceBefore"/);
  });
});
