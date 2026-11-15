import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures } from '../domain/leave/fixtures';
import { isHrEscalatedRequest } from '../domain/leave/hrFinalDecision';
import type { DemoState } from './contracts';
import { DEMO_ACCOUNTS } from './session';
import {
  approveDemoAsManager, createBaselineState, decideDemoAsHr, logoutDemoSession, rejectDemoAsManager, resetDemo, selectHrSubject,
} from './state';

const managerState = (): DemoState => ({ ...createBaselineState(), session: DEMO_ACCOUNTS[0] });
describe('T003/T007 shared state adapters', () => {
  it('creates fresh deep baseline copies with Dates, route and audit, and no fabricated HR subject', () => {
    const state = createBaselineState();
    expect(state.requests).toEqual(Object.values(managerInboxFixtures));
    expect(selectHrSubject(state.requests)).toBeNull();
    expect(isHrEscalatedRequest(managerInboxFixtures.escalatedHr)).toBe(false);
    state.requests[1].approvalPath[0].status = 'rejected';
    state.requests[1].auditHistory[0].timestamp.setFullYear(2000);
    expect(createBaselineState().requests).toEqual(Object.values(managerInboxFixtures));
  });
  it('executes LV-2026-102 escalation eligibility, appends one event, preserves version and source', () => {
    const state = managerState();
    const before = structuredClone(state);
    const result = approveDemoAsManager(state, 'LV-2026-102');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(isHrEscalatedRequest(result.request)).toBe(true);
    expect(result.request).toMatchObject({ requestId: 'LV-2026-102', approvalStatus: 'pending', approvalStage: 'hr', version: 1 });
    expect(result.request.auditHistory.slice(0, -1)).toEqual(before.requests[1].auditHistory);
    expect(result.request.auditHistory.at(-1)).toMatchObject({
      eventType: 'escalation', actor: 'MGR-2001', actorRole: 'manager', timestamp: INBOX_NOW, details: { to: 'hr' },
    });
    expect(result.request.auditHistory).toHaveLength(before.requests[1].auditHistory.length + 1);
    expect(selectHrSubject(result.requests)?.requestId).toBe('LV-2026-102');
    expect(state).toEqual(before);
  });
  it('denies wrong role, missing session, wrong owner, stale flag and expected version without mutation', () => {
    const state = managerState();
    const before = structuredClone(state);
    expect(approveDemoAsManager({ ...state, session: null }, 'LV-2026-102', 1)).toEqual({ ok: false, error: 'unauthorized' });
    expect(approveDemoAsManager({ ...state, session: DEMO_ACCOUNTS[1] }, 'LV-2026-102', 1)).toEqual({ ok: false, error: 'unauthorized' });
    expect(decideDemoAsHr(state, 'LV-2026-102', 1, 'approve')).toEqual({ ok: false, error: 'unauthorized' });
    expect(approveDemoAsManager(state, 'LV-2026-102', 2)).toEqual({ ok: false, error: 'stale_version' });
    expect(state).toEqual(before);
    state.requests[1] = { ...state.requests[1], isStaleVersion: true };
    expect(approveDemoAsManager(state, 'LV-2026-102', 1)).toEqual({ ok: false, error: 'stale_version' });
    state.requests[1] = { ...state.requests[1], isStaleVersion: false, managerId: 'other' };
    expect(approveDemoAsManager(state, 'LV-2026-102', 1)).toEqual({ ok: false, error: 'unauthorized' });
  });
  it('delegates Manager rejection taxonomy/detail requirements and preserves rejection audit', () => {
    const state = managerState();
    expect(rejectDemoAsManager(state, 'LV-2026-102', 1, 'other', '').ok).toBe(false);
    const result = rejectDemoAsManager(state, 'LV-2026-102', 1, 'other', 'سبب واضح');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.request.approvalStatus).toBe('rejected');
    expect(result.request.auditHistory.at(-1)).toMatchObject({ actor: 'MGR-2001', eventType: 'decision' });
    expect(selectHrSubject(result.requests)).toBeNull();
  });
  it('logout retains exact collection; cancelled reset is identity; confirmed reset restores full baseline', () => {
    const state = managerState();
    const loggedOut = logoutDemoSession(state);
    expect(loggedOut.session).toBeNull();
    expect(loggedOut.requests).toBe(state.requests);
    expect(resetDemo(state, false)).toBe(state);
    expect(resetDemo(state, true)).toEqual(createBaselineState());
    expect(resetDemo(state, true).requests).not.toBe(state.requests);
  });
});
