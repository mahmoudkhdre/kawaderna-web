import { describe, expect, it } from 'vitest';
import { approveDemoAsManager, createBaselineState, decideDemoAsHr } from './state';
import { DEMO_ACCOUNTS } from './session';
import { selectEmployeeDemoRequests, submitEmployeeDemoRequest } from './employee';
import { loadDemoSnapshot, serializeDemoSnapshot } from './snapshot';
import { createDemoController } from './controller';

const employee = DEMO_ACCOUNTS[2];
const manager = DEMO_ACCOUNTS[0];
const hr = DEMO_ACCOUNTS[1];
const state = () => ({ ...createBaselineState(), session: employee });
const input = (durationWorkingDays = 5, acknowledgeLowBalance = true) => ({
  startDate: '2026-02-02', endDate: '2026-02-06', durationWorkingDays, acknowledgeLowBalance,
});

describe('employee controller and HR selection', () => {
  it('retains new requests across logout/reload and selects the requested HR subject explicitly', () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; }, removeItem: () => { raw = null; } };
    const controller = createDemoController(storage);
    expect(controller.getSnapshot().login(employee.loginId, 'Demo2026!').ok).toBe(true);
    const first = controller.getSnapshot().employee!.onSubmit(input());
    const second = controller.getSnapshot().employee!.onSubmit(input());
    if (!first.ok || !second.ok) throw new Error('Expected two submissions');
    controller.getSnapshot().logout();
    expect(createDemoController(storage).getSnapshot().requests).toHaveLength(createBaselineState().requests.length + 2);
    controller.getSnapshot().login(manager.loginId, 'Demo2026!');
    expect(controller.getSnapshot().manager!.onApprove(first.request.requestId, 1).ok).toBe(true);
    expect(controller.getSnapshot().manager!.onApprove(second.request.requestId, 1).ok).toBe(true);
    controller.getSnapshot().logout();
    controller.getSnapshot().login(hr.loginId, 'Demo2026!');
    expect(controller.getSnapshot().hr!.selectableRequests?.map(item => item.requestId)).toEqual([first.request.requestId, second.request.requestId]);
    expect(controller.getSnapshot().hr!.requestId).toBe(first.request.requestId);
    expect(controller.getSnapshot().hr!.onDecide(first.request.requestId, 1, 'approve').ok).toBe(true);
    expect(controller.getSnapshot().hr!.requestId).toBe(first.request.requestId);
    expect(controller.getSnapshot().requests.find(item => item.requestId === second.request.requestId)?.approvalStatus).toBe('pending');
    controller.getSnapshot().hr!.onSelectRequest?.(second.request.requestId);
    expect(controller.getSnapshot().hr!.requestId).toBe(second.request.requestId);
    expect(controller.getSnapshot().hr!.onDecide(second.request.requestId, 1, 'approve').ok).toBe(true);
    expect(controller.getSnapshot().hr!.requestId).toBe(second.request.requestId);
    expect(controller.getSnapshot().hr!.selectableRequests?.at(-1)?.decided).toBe(true);
    expect(controller.getSnapshot().hr!.onDecide(second.request.requestId, 1, 'approve')).toEqual({ ok: false, error: 'invalid_state' });
    controller.getSnapshot().hr!.onSelectRequest?.('NOPE');
    expect(controller.getSnapshot().hr!.requestId).toBe(second.request.requestId);
  });
});

describe('employee demo submission', () => {
  it('creates a fresh low-balance request through the existing transitions and carries it to HR', () => {
    const created = submitEmployeeDemoRequest(state(), input());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.request).toMatchObject({ requestId: 'LV-2026-107', version: 1, employeeId: 'EMP-1201', managerId: 'MGR-2001',
      approvalStatus: 'pending', approvalStage: 'manager', balanceBefore: 3, durationWorkingDays: 5 });
    expect(created.request.auditHistory.map(event => event.eventType)).toEqual(['submission', 'low_balance_acknowledgement']);
    for (const event of created.request.auditHistory) {
      expect(event).toMatchObject({ actor: 'EMP-1201', actorRole: 'employee', timestamp: created.request.createdAt });
    }
    const progressed = approveDemoAsManager({ session: manager, requests: created.requests }, created.request.requestId, 1);
    expect(progressed.ok).toBe(true);
    if (!progressed.ok) return;
    expect(progressed.request.approvalStage).toBe('hr');
    expect(progressed.request.version).toBe(1);
    expect(progressed.request.auditHistory.at(-1)).toMatchObject({ actor: 'MGR-2001', actorRole: 'manager', eventType: 'escalation' });
    const decided = decideDemoAsHr({ session: hr, requests: progressed.requests }, created.request.requestId, 1, 'reject', 'سبب واضح');
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.request.auditHistory.at(-1)).toMatchObject({ actor: 'HR-1', actorRole: 'hr', eventType: 'decision' });
    const visible = selectEmployeeDemoRequests({ session: employee, requests: decided.requests });
    expect(visible).toHaveLength(1);
    expect(visible[0].rejectionReason).toBe('سبب واضح');
    expect(visible[0].auditHistory.map(event => event.eventType)).toEqual(['submission', 'low_balance_acknowledgement', 'decision']);
    for (const privateField of ['balanceBefore', 'details', 'visibilityLevel', 'managerId']) {
      expect(JSON.stringify(visible)).not.toContain(privateField);
    }
  });

  it('keeps a routine request at Manager and allocates unique sequential IDs', () => {
    const first = submitEmployeeDemoRequest(state(), input(2, false));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.request.auditHistory.map(event => event.eventType)).toEqual(['submission']);
    const next = submitEmployeeDemoRequest({ session: employee, requests: first.requests }, input(3, false));
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.request.requestId).toBe('LV-2026-108');
    const approved = approveDemoAsManager({ session: manager, requests: next.requests }, first.request.requestId, 1);
    expect(approved.ok && approved.request.approvalStage).toBe('none');
  });

  it('rejects invalid dates, durations, missing acknowledgement and non-employee callers without mutation', () => {
    const original = state();
    for (const bad of [
      { ...input(), startDate: '2026-02-31' }, { ...input(), endDate: '2026-02-01' },
      { ...input(), durationWorkingDays: 6 }, { ...input(), durationWorkingDays: 0 },
      { ...input(), durationWorkingDays: 1.5 },
    ]) expect(submitEmployeeDemoRequest(original, bad).ok).toBe(false);
    expect(submitEmployeeDemoRequest(original, input(5, false))).toEqual({ ok: false, error: 'acknowledgement_required' });
    expect(submitEmployeeDemoRequest({ ...original, session: manager }, input())).toEqual({ ok: false, error: 'unauthorized' });
    expect(original.requests).toHaveLength(createBaselineState().requests.length);
  });

  it('round-trips new nested Dates in v2 and accepts a valid v1 Manager snapshot', () => {
    const created = submitEmployeeDemoRequest(state(), input());
    if (!created.ok) throw new Error('Expected submission');
    const raw = serializeDemoSnapshot({ session: employee, requests: created.requests });
    expect(JSON.parse(raw).schemaVersion).toBe(2);
    const storage = { getItem: () => raw, setItem: () => {}, removeItem: () => {} };
    const restored = loadDemoSnapshot(storage);
    expect(restored.source).toBe('snapshot');
    expect(restored.state.requests.at(-1)?.auditHistory[0].timestamp).toBeInstanceOf(Date);
    const legacy = JSON.stringify({ ...JSON.parse(serializeDemoSnapshot({ session: manager, requests: createBaselineState().requests })), schemaVersion: 1 });
    expect(loadDemoSnapshot({ ...storage, getItem: () => legacy }).state.session).toEqual(manager);
    const invalidLegacyEmployee = JSON.stringify({ ...JSON.parse(raw), schemaVersion: 1 });
    expect(loadDemoSnapshot({ ...storage, getItem: () => invalidLegacyEmployee }).source).toBe('recovery');
  });
});
