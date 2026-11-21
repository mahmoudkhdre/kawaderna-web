import { describe, expect, it } from 'vitest';
import { Persona } from '../../domain/leave/types';
import { deriveGuide, derivePhase } from './derive';
import { guideText, summaryContent } from './copy';
import type { GuideFacts, GuidePhase } from './types';

const facts = (patch: Partial<GuideFacts>): GuideFacts => ({
  requestId: 'LV-2026-107', status: 'pending', stage: 'manager', terminalReason: null,
  hasHrStep: true, managerStep: 'pending', hrStep: 'pending', ...patch,
});
const SCENES: Record<string, GuideFacts> = {
  awaitingManagerExceptional: facts({}),
  awaitingManagerRoutine: facts({ hasHrStep: false, hrStep: 'none' }),
  awaitingHr: facts({ stage: 'hr', managerStep: 'approved' }),
  approvedRoutine: facts({ status: 'approved', stage: 'none', hasHrStep: false, hrStep: 'none', managerStep: 'approved' }),
  approvedAfterHr: facts({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' }),
  rejectedManager: facts({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' }),
  rejectedHr: facts({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_hr', managerStep: 'approved', hrStep: 'rejected' }),
};

describe('derivePhase: the tour step comes from real request state', () => {
  it.each<[string, string | null, GuideFacts | null, GuidePhase]>([
    ['no tracked request', null, null, 'no_request'],
    ['tracked id that no longer exists', 'LV-2026-107', null, 'missing'],
    ['pending at manager', 'LV-2026-107', SCENES.awaitingManagerExceptional, 'awaiting_manager'],
    ['pending at manager, routine', 'LV-2026-107', SCENES.awaitingManagerRoutine, 'awaiting_manager'],
    ['pending at HR', 'LV-2026-107', SCENES.awaitingHr, 'awaiting_hr'],
    ['routine approved by manager (final)', 'LV-2026-107', SCENES.approvedRoutine, 'approved_routine'],
    ['approved after HR', 'LV-2026-107', SCENES.approvedAfterHr, 'approved_after_hr'],
    ['rejected by manager', 'LV-2026-107', SCENES.rejectedManager, 'rejected_manager'],
    ['rejected by HR', 'LV-2026-107', SCENES.rejectedHr, 'rejected_hr'],
    ['an unexpected stage is never guessed', 'LV-2026-107', facts({ stage: 'requester_clarification' }), 'unknown'],
    ['approved without a recognisable path is never guessed', 'LV-2026-107', facts({ status: 'approved', stage: 'none', managerStep: 'pending' }), 'unknown'],
    ['a rejection without a terminal reason is never guessed', 'LV-2026-107', facts({ status: 'rejected', stage: 'none' }), 'unknown'],
  ])('%s', (_name, id, f, expected) => expect(derivePhase(id, f)).toBe(expected));
});

describe('deriveGuide: stepper, next action and outcome per persona', () => {
  it('start: employee creates the request, others are pointed at the employee account', () => {
    expect(deriveGuide(null, null, Persona.EMPLOYEE).action).toEqual({ kind: 'none' });
    for (const persona of [Persona.MANAGER, Persona.HR]) {
      expect(deriveGuide(null, null, persona).action).toEqual({ kind: 'switch', target: Persona.EMPLOYEE });
    }
    expect(deriveGuide(null, null, Persona.EMPLOYEE).stages.map(s => s.state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('exceptional path: manager current, HR upcoming; after approval HR is current', () => {
    const at = deriveGuide('LV-2026-107', SCENES.awaitingManagerExceptional, Persona.MANAGER);
    expect(at.stages.map(s => s.state)).toEqual(['completed', 'current', 'upcoming', 'upcoming']);
    expect(at.action).toEqual({ kind: 'none' });
    expect(at.progress).toEqual({ done: 1, total: 4 });
    const next = deriveGuide('LV-2026-107', SCENES.awaitingHr, Persona.MANAGER);
    expect(next.stages.map(s => s.state)).toEqual(['completed', 'completed', 'current', 'upcoming']);
    expect(next.action).toEqual({ kind: 'switch', target: Persona.HR });
  });

  it('routine path: HR is not applicable and is never required', () => {
    const model = deriveGuide('LV-2026-107', SCENES.awaitingManagerRoutine, Persona.MANAGER);
    expect(model.stages.find(s => s.id === 'hr')!.state).toBe('not_applicable');
    expect(model.progress.total).toBe(3);
    expect(model.path).toBe('routine');
    const done = deriveGuide('LV-2026-107', SCENES.approvedRoutine, Persona.EMPLOYEE);
    expect(done.outcome).toBe('approved');
    expect(done.stages.find(s => s.id === 'hr')!.state).toBe('not_applicable');
    expect(done.phase).toBe('approved_routine');
  });

  it('manager rejection ends at the manager: HR not applicable, outcome rejected, never drawn as approval', () => {
    const model = deriveGuide('LV-2026-107', SCENES.rejectedManager, Persona.EMPLOYEE);
    expect(model.rejectedAt).toBe('manager');
    expect(model.outcome).toBe('rejected');
    expect(model.stages.map(s => [s.state, s.outcome])).toEqual([
      ['completed', null], ['completed', 'rejected'], ['not_applicable', null], ['completed', 'rejected'],
    ]);
  });

  it('HR rejection keeps the manager approval and records the HR rejection', () => {
    const model = deriveGuide('LV-2026-107', SCENES.rejectedHr, Persona.EMPLOYEE);
    expect(model.rejectedAt).toBe('hr');
    expect(model.stages.map(s => s.outcome)).toEqual([null, 'approved', 'rejected', 'rejected']);
  });

  // Owner decision D8 (2026-11-17): the result completes for EVERY role once a real final decision is recorded.
  const roles = [Persona.EMPLOYEE, Persona.MANAGER, Persona.HR];
  it.each<[string, GuideFacts, string[], string, { done: number; total: number }]>([
    ['HR final approval completes the exceptional path', SCENES.approvedAfterHr, ['completed', 'completed', 'completed', 'completed'], 'approved', { done: 4, total: 4 }],
    ['HR rejection completes the rejection path (no approval claim)', SCENES.rejectedHr, ['completed', 'completed', 'completed', 'completed'], 'rejected', { done: 4, total: 4 }],
    ['Manager rejection completes at the Manager; HR is not applicable, never a phantom stage', SCENES.rejectedManager, ['completed', 'completed', 'not_applicable', 'completed'], 'rejected', { done: 3, total: 3 }],
    ['routine request completes at its approved final state; HR is not applicable', SCENES.approvedRoutine, ['completed', 'completed', 'not_applicable', 'completed'], 'approved', { done: 3, total: 3 }],
  ])('D8: %s, for every role', (_name, f, states, outcome, progress) => {
    for (const persona of roles) {
      const model = deriveGuide('LV-2026-107', f, persona);
      expect(model.stages.map(s => s.state), persona).toEqual(states);
      expect(model.stages.find(s => s.id === 'result')!.outcome, persona).toBe(outcome);
      expect(model.progress, persona).toEqual(progress);
      expect(model.terminal).toBe(true);
    }
  });

  it('D8: a pending, missing or unknown request is never shown as complete, for any role', () => {
    const open = [SCENES.awaitingManagerExceptional, SCENES.awaitingManagerRoutine, SCENES.awaitingHr, null, facts({ stage: 'escalated' }), facts({ status: 'approved', stage: 'none', managerStep: 'pending' })];
    for (const f of open) for (const persona of roles) {
      const model = deriveGuide('LV-2026-107', f, persona);
      expect(model.stages.find(s => s.id === 'result')!.state, `${f?.stage}/${persona}`).not.toBe('completed');
      expect(model.terminal).toBe(false);
    }
    // not-yet-started tour: nothing is complete either
    expect(deriveGuide(null, null, Persona.EMPLOYEE).stages.every(s => s.state !== 'completed')).toBe(true);
  });

  it('D8: the derived stages do not depend on who is signed in (no "employee has seen it" rule), and the Manager/HR next-step action is still a suggestion to read the employee view', () => {
    for (const f of Object.values(SCENES)) {
      const [e, m, h] = roles.map(persona => deriveGuide('LV-2026-107', f, persona).stages);
      expect(m).toEqual(e);
      expect(h).toEqual(e);
    }
    for (const persona of [Persona.MANAGER, Persona.HR]) {
      expect(deriveGuide('LV-2026-107', SCENES.approvedAfterHr, persona).action).toEqual({ kind: 'switch', target: Persona.EMPLOYEE });
    }
  });

  it('D8: no guide text claims the employee has seen or opened the decision (no documented event proves it)', () => {
    const claim = /(اطّلع|اطلع|شاهد|رأى|قرأ|فتح)\s+(الموظف|الموظفة)|(الموظف|الموظفة)\s+(اطّلع|اطلع|شاهد|رأى|قرأ|فتح)|تم الاطلاع/;
    for (const f of [null, ...Object.values(SCENES)]) for (const persona of roles) {
      const model = deriveGuide(f?.requestId ?? null, f, persona);
      const text = guideText(model, persona, { requestId: f?.requestId ?? null, employeeBalance: 3 });
      const summary = summaryContent(model);
      const all = [text.title, text.body, text.why, text.routineHint ?? '', summary?.title ?? '', ...(summary?.lines ?? []), summary?.note ?? ''].join(' ');
      expect(all, `${model.phase}/${persona}`).not.toMatch(claim);
    }
  });

  it('a missing request offers a restart and never selects another request', () => {
    const model = deriveGuide('LV-2026-107', null, Persona.EMPLOYEE);
    expect(model.phase).toBe('missing');
    expect(model.action).toEqual({ kind: 'restart' });
    expect(model.terminal).toBe(false);
  });

  it('every phase × persona produces a valid, bounded model', () => {
    const scenes = [null, ...Object.values(SCENES), facts({ stage: 'escalated' })];
    for (const f of scenes) for (const persona of [Persona.EMPLOYEE, Persona.MANAGER, Persona.HR]) {
      const model = deriveGuide(f ? f.requestId : null, f, persona);
      expect(model.stages).toHaveLength(4);
      expect(model.progress.done).toBeLessThanOrEqual(model.progress.total);
      expect(model.progress.total).toBeGreaterThan(0);
      expect(['none', 'switch', 'restart']).toContain(model.action.kind);
      if (model.action.kind === 'switch') expect(model.action.target).not.toBe(persona);
    }
  });

  it('multiple requests: the tracked id decides, another request in the list is irrelevant', () => {
    const tracked = facts({ requestId: 'LV-2026-107' });
    const model = deriveGuide('LV-2026-107', tracked, Persona.MANAGER);
    expect(model.phase).toBe('awaiting_manager');
    // The caller resolves facts by id; a different id with different facts is simply not passed in.
    const other = facts({ requestId: 'LV-2026-108', status: 'approved', stage: 'none', hasHrStep: false, managerStep: 'approved', hrStep: 'none' });
    expect(deriveGuide('LV-2026-107', tracked, Persona.MANAGER)).toEqual(model);
    expect(deriveGuide('LV-2026-108', other, Persona.MANAGER).phase).toBe('approved_routine');
  });
});
