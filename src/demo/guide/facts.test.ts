import { describe, expect, it } from 'vitest';
import { createBaselineRequests } from '../state';
import { Persona } from '../../domain/leave/types';
import type { LeaveRequest } from '../../domain/leave/types';
import { lowBalanceDraft, routineDraft } from '../../domain/leave/fixtures';
import { acknowledgeLowBalance, managerApprove, managerReject, submitLeaveRequest } from '../../domain/leave/transitions';
import { findGuideFacts, selectGuideReason, selectTrackable, toGuideFacts } from './facts';
import { deriveGuide } from './derive';

const NOW = new Date('2026-01-18T07:00:00Z');
const EMP = { id: 'EMP-1201', role: Persona.EMPLOYEE };
const MGR = { id: 'MGR-2001', role: Persona.MANAGER };
const HR = { id: 'HR-1', role: Persona.HR };

/** Builds a real submitted request through the real transitions (no hand-made state). */
const submitted = (id: string, exceptional: boolean): LeaveRequest => {
  let draft: LeaveRequest = { ...structuredClone(exceptional ? lowBalanceDraft : routineDraft), requestId: id, employeeId: EMP.id, employeeName: 'مريم صالح', managerId: MGR.id };
  if (exceptional) {
    const ack = acknowledgeLowBalance(draft, EMP, NOW);
    if (!ack.ok) throw new Error('ack');
    draft = ack.request;
  }
  const result = submitLeaveRequest(draft, EMP, NOW);
  if (!result.ok) throw new Error('submit');
  return result.request;
};
const ok = (result: { ok: boolean; request?: LeaveRequest }): LeaveRequest => { if (!result.ok || !result.request) throw new Error('transition'); return result.request; };

describe('guide facts reflect the real transitions', () => {
  it('exceptional: submit → manager approve → HR', () => {
    const req = submitted('LV-2026-107', true);
    expect(deriveGuide(req.requestId, toGuideFacts(req), Persona.MANAGER).phase).toBe('awaiting_manager');
    const approved = ok(managerApprove(req, MGR, NOW, req.version));
    const model = deriveGuide(req.requestId, toGuideFacts(approved), Persona.MANAGER);
    expect(model.phase).toBe('awaiting_hr');
    expect(model.path).toBe('exceptional');
  });
  it('routine: manager approval is final and HR is not applicable', () => {
    const req = submitted('LV-2026-108', false);
    const done = ok(managerApprove(req, MGR, NOW, req.version));
    const model = deriveGuide(req.requestId, toGuideFacts(done), Persona.EMPLOYEE);
    expect(model.phase).toBe('approved_routine');
    expect(model.stages.find(s => s.id === 'hr')!.state).toBe('not_applicable');
  });
  it('manager rejection ends the path without HR', () => {
    const req = submitted('LV-2026-109', true);
    const done = ok(managerReject(req, MGR, NOW, req.version, 'سبب'));
    expect(deriveGuide(req.requestId, toGuideFacts(done), Persona.EMPLOYEE).phase).toBe('rejected_manager');
  });
  it('facts carry no names, reasons or balance', () => {
    const req = submitted('LV-2026-107', true);
    const keys = Object.keys(toGuideFacts(req)).sort();
    expect(keys).toEqual(['hasHrStep', 'hrStep', 'managerStep', 'requestId', 'stage', 'status', 'terminalReason']);
  });
  it('findGuideFacts returns null for an unknown id and never another request', () => {
    const list = [submitted('LV-2026-107', true), submitted('LV-2026-108', false)];
    expect(findGuideFacts(list, 'LV-2026-999')).toBeNull();
    expect(findGuideFacts(list, null)).toBeNull();
    expect(findGuideFacts(list, 'LV-2026-108')!.hasHrStep).toBe(false);
  });
});

describe('selectTrackable: a role only lists what its own screens already show', () => {
  const baseline = createBaselineRequests();
  const mine = submitted('LV-2026-107', true);
  const routine = submitted('LV-2026-108', false);
  const all = [...baseline, mine, routine];
  it('employee: own requests only; baseline fixtures are not trackable', () => {
    expect(selectTrackable(all, { persona: Persona.EMPLOYEE, actorId: EMP.id }, EMP.id)).toEqual(['LV-2026-107', 'LV-2026-108']);
  });
  it('manager: requests assigned to the manager', () => {
    expect(selectTrackable(all, { persona: Persona.MANAGER, actorId: MGR.id }, EMP.id)).toEqual(['LV-2026-107', 'LV-2026-108']);
    expect(selectTrackable(all, { persona: Persona.MANAGER, actorId: 'MGR-9999' }, EMP.id)).toEqual([]);
  });
  it('HR: nothing until a request is escalated (no early disclosure), then only that one', () => {
    expect(selectTrackable(all, { persona: Persona.HR, actorId: HR.id }, EMP.id)).toEqual([]);
    const escalated = ok(managerApprove(mine, MGR, NOW, mine.version));
    expect(selectTrackable([...baseline, escalated, routine], { persona: Persona.HR, actorId: HR.id }, EMP.id)).toEqual(['LV-2026-107']);
  });
  it('no session → nothing', () => expect(selectTrackable(all, null, EMP.id)).toEqual([]));
});

describe('selectGuideReason', () => {
  it('shows a rejection reason only to the role that owns it, never to the other role or the employee path', () => {
    const req = submitted('LV-2026-107', true);
    const rejected = ok(managerReject(req, MGR, NOW, req.version, 'السبب المكتوب'));
    expect(selectGuideReason(rejected, Persona.MANAGER)).toBe('السبب المكتوب');
    expect(selectGuideReason(rejected, Persona.HR)).toBeNull();
    expect(selectGuideReason(rejected, Persona.EMPLOYEE)).toBeNull(); // employee uses the permissioned binding
    expect(selectGuideReason(req, Persona.MANAGER)).toBeNull();
    expect(selectGuideReason(undefined, Persona.MANAGER)).toBeNull();
  });
});
