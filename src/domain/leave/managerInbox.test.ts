import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from './fixtures';
import { getNextAction, selectManagerInbox, toManagerInboxRow } from './selectors';
import { managerApprove, managerReject, TransitionError } from './transitions';
import { ApprovalStage, ApprovalStatus, Persona, RiskSeverity } from './types';
import type { LeaveRequest } from './types';

const manager = { id: 'MGR-2001', role: Persona.MANAGER };
const at = new Date('2026-01-18T10:00:00+03:00');
const row = (r: LeaveRequest, now = INBOX_NOW) => toManagerInboxRow(r, now);

describe('manager inbox fixtures', () => {
  it('has six families with unique fixed IDs', () => {
    const ids = Object.values(f).map((r) => r.requestId);
    expect(ids).toEqual(['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-104', 'LV-2026-105', 'LV-2026-106']);
    expect(INBOX_NOW.toISOString()).toBe('2026-01-18T07:00:00.000Z');
  });

  // R-2 (owner decision): every inbox request was submitted 17 Jan 2026 09:00 Riyadh.
  it('stamps submittedAt and the SUBMISSION event at 17 Jan 09:00 and keeps the chronology consistent', () => {
    const SUBMITTED = '2026-01-17T06:00:00.000Z';
    for (const r of Object.values(f)) {
      expect(r.submittedAt!.toISOString()).toBe(SUBMITTED);
      const submissions = r.auditHistory.filter((e) => e.eventType === 'submission');
      expect(submissions).toHaveLength(1);
      expect(submissions[0].timestamp.toISOString()).toBe(SUBMITTED);
      const times = r.auditHistory.map((e) => e.timestamp.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(Math.min(...times)).toBeGreaterThanOrEqual(r.submittedAt!.getTime());
      expect(r.createdAt.getTime()).toBeLessThanOrEqual(r.submittedAt!.getTime());
      expect(r.updatedAt.getTime()).toBeGreaterThanOrEqual(r.submittedAt!.getTime());
    }
  });

  it('keeps audit event types and counts unchanged per family', () => {
    const types = (r: LeaveRequest) => r.auditHistory.map((e) => e.eventType);
    expect(types(f.routine)).toEqual(['submission']);
    expect(types(f.lowBalance)).toEqual(['submission', 'low_balance_acknowledgement']);
    expect(types(f.escalatedHr)).toEqual(['submission', 'escalation']);
    expect(f.escalatedHr.auditHistory[1].timestamp.toISOString()).toBe('2026-01-17T09:00:00.000Z');
  });
});

describe('routine', () => {
  it('manager owns, review next, no risk, sufficient, actionable', () => {
    const r = row(f.routine);
    expect(r.currentOwnerRole).toBe(Persona.MANAGER);
    expect(r.nextAction).toBe('review_request');
    expect(r.risk).toBeNull();
    expect(r.balanceSufficiency).toBe('sufficient');
    expect(r.isOverdue).toBe(false);
    expect(r.canApprove && r.canReject).toBe(true);
  });
});

describe('low balance', () => {
  it('is a warning risk with insufficient balance, still manager-owned', () => {
    const r = row(f.lowBalance);
    expect(r.risk).toEqual({ severity: RiskSeverity.WARNING, code: 'LEAVE_LOW_BALANCE' });
    expect(r.balanceSufficiency).toBe('insufficient');
    expect(r.currentOwnerRole).toBe(Persona.MANAGER);
    expect(r.canApprove).toBe(true);
  });

  it('keeps contract: manager approval escalates to HR, not final approval', () => {
    const res = managerApprove(f.lowBalance, manager, at, 1);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.request.approvalStatus).toBe(ApprovalStatus.PENDING);
      expect(res.request.approvalStage).toBe(ApprovalStage.HR);
    }
  });
});

describe('due soon', () => {
  it('is not overdue, actionable, and exposes no invented due-soon field', () => {
    const r = row(f.dueSoon);
    expect(r.isOverdue).toBe(false);
    expect(r.canApprove).toBe(true);
    expect('isDueSoon' in r).toBe(false);
    expect('dueSoon' in r).toBe(false);
  });
});

describe('overdue (derived from slaDueAt + injected now)', () => {
  const due = f.overdue.slaDueAt!;
  it('flips at slaDueAt and is not stored', () => {
    expect(row(f.overdue, new Date(due.getTime() - 1)).isOverdue).toBe(false);
    expect(row(f.overdue, due).isOverdue).toBe(false);
    expect(row(f.overdue, new Date(due.getTime() + 1)).isOverdue).toBe(true);
    expect('isOverdue' in f.overdue).toBe(false);
  });
  it('is overdue at INBOX_NOW and ownership stays with the manager', () => {
    const r = row(f.overdue);
    expect(r.isOverdue).toBe(true);
    expect(r.currentOwnerRole).toBe(Persona.MANAGER);
    expect(r.approvalStage).toBe(ApprovalStage.MANAGER);
    expect(r.canApprove).toBe(true);
  });
});

describe('waiting for clarification', () => {
  it('is owned by the employee, has no next action, and cannot be approved', () => {
    const r = row(f.waitingClarification);
    expect(r.currentOwnerRole).toBe(Persona.EMPLOYEE);
    expect(r.nextAction).toBeNull();
    expect(r.risk?.code).toBe('LEAVE_MISSING_INFORMATION');
    expect(r.canApprove).toBe(false);
    expect(r.canReject).toBe(false);
  });
  it('domain rejects manager decisions', () => {
    const a = managerApprove(f.waitingClarification, manager, at, 1);
    const b = managerReject(f.waitingClarification, manager, at, 1, 'x');
    expect(a).toEqual({ ok: false, error: TransitionError.INVALID_STATE });
    expect(b).toEqual({ ok: false, error: TransitionError.INVALID_STATE });
  });
});

describe('nextAction is Manager-viewer scoped', () => {
  it('Manager stage keeps the manager action', () => {
    const r = row(f.routine);
    expect(r.approvalStage).toBe(ApprovalStage.MANAGER);
    expect(r.nextAction).toBe('review_request');
  });
  it('HR stage returns null in the inbox while the shared selector is unchanged', () => {
    const hr = { ...f.lowBalance, approvalStage: ApprovalStage.HR };
    expect(row(hr).currentOwnerRole).toBe(Persona.HR);
    expect(row(hr).nextAction).toBeNull();
    expect(getNextAction(hr)).toBe('review_balance_exception');
  });
  it('ESCALATED stage returns null', () => {
    expect(row(f.escalatedHr).approvalStage).toBe(ApprovalStage.ESCALATED);
    expect(row(f.escalatedHr).nextAction).toBeNull();
  });
});

describe('escalated / HR', () => {
  it('is HR-owned with no manager approve action', () => {
    const r = row(f.escalatedHr);
    expect(r.currentOwnerRole).toBe(Persona.HR);
    expect(r.nextAction).toBeNull();
    expect(r.canApprove).toBe(false);
    expect(r.canReject).toBe(false);
  });
  it('domain rejects manager decisions', () => {
    expect(managerApprove(f.escalatedHr, manager, at, 1)).toEqual({ ok: false, error: TransitionError.INVALID_STATE });
  });
});

describe('manager-safe projection', () => {
  const all = Object.values(f);
  it('never exposes balanceBefore', () => {
    for (const r of all) {
      const out = row(r);
      expect('balanceBefore' in out).toBe(false);
      expect(JSON.stringify(out)).not.toContain('balanceBefore');
    }
  });
  it('returns only the allowlisted keys', () => {
    expect(Object.keys(row(f.routine)).sort()).toEqual(
      [
        'requestId', 'version', 'employeeName', 'leaveType', 'startDate', 'endDate', 'isPartialDay',
        'durationWorkingDays', 'approvalStatus', 'approvalStage', 'currentOwnerRole', 'nextAction',
        'risk', 'balanceSufficiency', 'isOverdue', 'canApprove', 'canReject',
      ].sort(),
    );
  });
  it('disables actions on stale versions', () => {
    expect(row({ ...f.routine, isStaleVersion: true }).canApprove).toBe(false);
  });
  it('filters to the manager’s own reports', () => {
    const other = { ...f.routine, requestId: 'LV-X', managerId: 'MGR-9999' };
    const rows = selectManagerInbox([...all, other], 'MGR-2001', INBOX_NOW);
    expect(rows.map((r) => r.requestId)).toEqual(all.map((r) => r.requestId));
  });
});
