import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from './fixtures';
import {
  BalanceSufficiency, getNextAction, selectManagerRequestDetail, toManagerRequestDetail,
} from './selectors';
import { ApprovalStage, AuditEventType, Persona } from './types';
import type { LeaveRequest } from './types';

const detail = (r: LeaveRequest) => toManagerRequestDetail(r, INBOX_NOW);
const all = Object.values(f);

describe('toManagerRequestDetail allowlist', () => {
  it('exposes only the approved top-level and context keys', () => {
    const d = detail(f.lowBalance);
    expect(Object.keys(d).sort()).toEqual(
      ['audit', 'balance', 'context', 'path', 'policies', 'risks', 'route', 'summary'],
    );
    expect(Object.keys(d.context).sort()).toEqual(
      ['durationWorkingDays', 'employeeName', 'endDate', 'isPartialDay', 'leaveType', 'managerName',
        'requestId', 'startDate', 'submittedAt', 'version'],
    );
  });

  it('never serializes protected or internal fields, or any due-soon concept', () => {
    for (const r of all) {
      const json = JSON.stringify(detail(r));
      for (const forbidden of ['balanceBefore', 'affectedFields', 'explanationEn', 'EMP-', 'MGR-', 'dueSoon', 'slaDueAt']) {
        expect(json).not.toContain(forbidden);
      }
    }
  });

  it('low balance shows insufficiency without any balance number', () => {
    const d = detail(f.lowBalance);
    expect(d.balance.sufficiency).toBe(BalanceSufficiency.INSUFFICIENT);
    expect(Object.keys(d.balance).sort()).toEqual(['lowBalanceAcknowledged', 'sufficiency']);
    expect(detail(f.routine).balance.sufficiency).toBe(BalanceSufficiency.SUFFICIENT);
  });

  it('keeps status, stage and processing as independent axes', () => {
    const s = detail(f.waitingClarification).summary;
    expect(s.approvalStatus).toBe('pending');
    expect(s.approvalStage).toBe('requester_clarification');
    expect(s.processingStatus).toBe('not_started');
    expect(s.currentOwnerRole).toBe(Persona.EMPLOYEE);
  });

  it('derives overdue from the injected clock', () => {
    expect(detail(f.overdue).summary.isOverdue).toBe(true);
    expect(detail(f.routine).summary.isOverdue).toBe(false);
  });

  it('route: routine has no HR step, low balance does', () => {
    expect(detail(f.routine).route.map((s) => s.role)).toEqual(['employee', 'manager', 'final_decision']);
    expect(detail(f.lowBalance).route.map((s) => [s.role, s.state])).toEqual([
      ['employee', 'completed'], ['manager', 'current'], ['hr', 'upcoming'], ['final_decision', 'upcoming'],
    ]);
  });

  it('route: escalated shows Manager completed and HR as the current step', () => {
    expect(detail(f.escalatedHr).route.map((s) => [s.role, s.state])).toEqual([
      ['employee', 'completed'], ['manager', 'completed'], ['hr', 'current'], ['final_decision', 'upcoming'],
    ]);
  });

  it('audit: only approved, manager-visible events, with no raw details', () => {
    const hostile: LeaveRequest = {
      ...f.lowBalance,
      auditHistory: [
        ...f.lowBalance.auditHistory,
        { eventType: AuditEventType.PROCESSING, actor: 'SYS', actorRole: Persona.HR, timestamp: new Date('2026-01-17T12:00:00+03:00'), details: { secret: 'x' }, visibilityLevel: 'public' },
        { eventType: AuditEventType.DECISION, actor: 'HR-1', actorRole: Persona.HR, timestamp: new Date('2026-01-17T13:00:00+03:00'), details: { decision: 'approved', balanceBefore: 3 }, visibilityLevel: 'hr' },
        { eventType: AuditEventType.DECISION, actor: 'MGR-2001', actorRole: Persona.MANAGER, timestamp: new Date('2026-01-17T14:00:00+03:00'), details: { decision: 'rejected', reason: 'private', balanceBefore: 3 }, visibilityLevel: 'public' },
      ],
    };
    const audit = detail(hostile).audit;
    expect(audit.map((e) => e.eventType)).toEqual([
      AuditEventType.SUBMISSION, AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT, AuditEventType.DECISION,
    ]);
    expect(audit[2].decision).toBe('rejected');
    const json = JSON.stringify(audit);
    expect(json).not.toContain('private');
    expect(json).not.toContain('balanceBefore');
    expect(json).not.toContain('secret');
  });
});

describe('detail nextAction is Manager-viewer scoped', () => {
  it('Manager stage keeps the manager action', () => {
    const d = detail(f.routine);
    expect(d.summary.approvalStage).toBe(ApprovalStage.MANAGER);
    expect(d.summary.nextAction).toBe('review_request');
  });
  it('HR stage returns null in the detail while the shared selector is unchanged', () => {
    const hr = { ...f.lowBalance, approvalStage: ApprovalStage.HR };
    expect(detail(hr).summary.currentOwnerRole).toBe(Persona.HR);
    expect(detail(hr).summary.nextAction).toBeNull();
    expect(getNextAction(hr)).toBe('review_balance_exception');
  });
  it('ESCALATED stage returns null', () => {
    expect(detail(f.escalatedHr).summary.approvalStage).toBe(ApprovalStage.ESCALATED);
    expect(detail(f.escalatedHr).summary.nextAction).toBeNull();
  });
});

describe('selectManagerRequestDetail', () => {
  it('returns the detail for a direct report, null otherwise', () => {
    expect(selectManagerRequestDetail(all, 'LV-2026-102', 'MGR-2001', INBOX_NOW)?.context.requestId).toBe('LV-2026-102');
    expect(selectManagerRequestDetail(all, 'LV-2026-102', 'MGR-9999', INBOX_NOW)).toBeNull();
    expect(selectManagerRequestDetail(all, 'NOPE', 'MGR-2001', INBOX_NOW)).toBeNull();
  });
});
