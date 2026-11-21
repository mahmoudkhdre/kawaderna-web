import { Persona } from '../../domain/leave/types';
import type { GuideAction, GuideFacts, GuideModel, GuidePath, GuidePhase, GuideStageView } from './types';

/**
 * Pure derivation: the tour step is a function of the tracked request's REAL state and who is signed in.
 * Nothing here is stored, so a reload, a role switch or a Reset can never leave a stale step behind.
 *
 * `trackedId` is the request the owner chose to follow. `facts` is that request's state, or `null` when it
 * does not exist (never fall back to another request).
 */
export const derivePhase = (trackedId: string | null, facts: GuideFacts | null): GuidePhase => {
  if (!trackedId) return 'no_request';
  if (!facts) return 'missing';
  if (facts.status === 'pending' && facts.stage === 'manager') return 'awaiting_manager';
  if (facts.status === 'pending' && facts.stage === 'hr') return 'awaiting_hr';
  if (facts.status === 'approved') {
    if (facts.hrStep === 'approved') return 'approved_after_hr';
    if (!facts.hasHrStep && facts.managerStep === 'approved') return 'approved_routine';
    return 'unknown';
  }
  if (facts.status === 'rejected') {
    if (facts.terminalReason === 'rejected_by_manager') return 'rejected_manager';
    if (facts.terminalReason === 'rejected_by_hr') return 'rejected_hr';
  }
  return 'unknown';
};

const TERMINAL: readonly GuidePhase[] = ['approved_routine', 'approved_after_hr', 'rejected_manager', 'rejected_hr'];

export const derivePath = (phase: GuidePhase, facts: GuideFacts | null): GuidePath =>
  !facts || phase === 'missing' || phase === 'no_request' || phase === 'unknown' ? 'unknown' : facts.hasHrStep ? 'exceptional' : 'routine';

const stage = (id: GuideStageView['id'], state: GuideStageView['state'], outcome: GuideStageView['outcome'] = null): GuideStageView => ({ id, state, outcome });

/**
 * Owner decision D8 (2026-11-17): «النتيجة» completes for EVERY role as soon as a real final decision is recorded on the
 * request (a terminal phase). It never depends on the employee opening the result, and nothing here claims the employee
 * has seen it: that would need a documented event, and none exists. A pending, missing or unknown request never completes it.
 */
export const deriveStages = (phase: GuidePhase, path: GuidePath): GuideStageView[] => {
  const resultSeen = 'completed';
  switch (phase) {
    case 'no_request':
      return [stage('employee', 'current'), stage('manager', 'upcoming'), stage('hr', 'upcoming'), stage('result', 'upcoming')];
    case 'awaiting_manager':
      return [stage('employee', 'completed'), stage('manager', 'current'),
        stage('hr', path === 'routine' ? 'not_applicable' : 'upcoming'), stage('result', 'upcoming')];
    case 'awaiting_hr':
      return [stage('employee', 'completed'), stage('manager', 'completed', 'approved'), stage('hr', 'current'), stage('result', 'upcoming')];
    case 'approved_routine':
      return [stage('employee', 'completed'), stage('manager', 'completed', 'approved'), stage('hr', 'not_applicable'), stage('result', resultSeen, 'approved')];
    case 'approved_after_hr':
      return [stage('employee', 'completed'), stage('manager', 'completed', 'approved'), stage('hr', 'completed', 'approved'), stage('result', resultSeen, 'approved')];
    case 'rejected_manager':
      return [stage('employee', 'completed'), stage('manager', 'completed', 'rejected'), stage('hr', 'not_applicable'), stage('result', resultSeen, 'rejected')];
    case 'rejected_hr':
      return [stage('employee', 'completed'), stage('manager', 'completed', 'approved'), stage('hr', 'completed', 'rejected'), stage('result', resultSeen, 'rejected')];
    default:
      return [stage('employee', 'upcoming'), stage('manager', 'upcoming'), stage('hr', 'upcoming'), stage('result', 'upcoming')];
  }
};

const NONE: GuideAction = { kind: 'none' };
const to = (target: Persona): GuideAction => ({ kind: 'switch', target });

/** Which account the tour wants next. Used for the sign-in screen too, where nobody is signed in yet. */
export const recommendedPersona = (phase: GuidePhase): Persona => {
  if (phase === 'awaiting_manager') return Persona.MANAGER;
  if (phase === 'awaiting_hr') return Persona.HR;
  return Persona.EMPLOYEE; // start, terminal (the outcome is read as the employee), missing, unknown
};

/** The next thing that makes sense for THIS persona. Switching always means "sign out, then pick the account yourself". */
export const deriveAction = (phase: GuidePhase, persona: Persona): GuideAction => {
  if (phase === 'missing') return { kind: 'restart' };
  if (phase === 'unknown') return NONE;
  const next = recommendedPersona(phase);
  return persona === next ? NONE : to(next);
};

export const deriveGuide = (trackedId: string | null, facts: GuideFacts | null, persona: Persona): GuideModel => {
  const phase = derivePhase(trackedId, facts);
  const path = derivePath(phase, facts);
  const stages = deriveStages(phase, path);
  const applicable = stages.filter(item => item.state !== 'not_applicable');
  const terminal = TERMINAL.includes(phase);
  return {
    phase, path, stages,
    progress: { done: applicable.filter(item => item.state === 'completed').length, total: applicable.length },
    action: deriveAction(phase, persona),
    terminal,
    outcome: !terminal ? null : phase === 'rejected_manager' || phase === 'rejected_hr' ? 'rejected' : 'approved',
    rejectedAt: phase === 'rejected_manager' ? 'manager' : phase === 'rejected_hr' ? 'hr' : null,
  };
};
