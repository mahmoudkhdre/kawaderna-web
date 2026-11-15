import { INBOX_NOW, managerInboxFixtures } from '../domain/leave/fixtures';
import { approveAsManager } from '../domain/leave/managerApproval';
import { rejectAsManager } from '../domain/leave/managerRejection';
import { decideAsHr, isHrEscalatedRequest } from '../domain/leave/hrFinalDecision';
import { AuditEventType, Persona } from '../domain/leave/types';
import type { LeaveRequest } from '../domain/leave/types';
import type { DemoState } from './contracts';
import { restoreSession } from './session';

export const createBaselineRequests = (): LeaveRequest[] => structuredClone(Object.values(managerInboxFixtures));
export const createBaselineState = (): DemoState => ({ session: null, requests: createBaselineRequests() });
export const logoutDemoSession = (state: DemoState): DemoState => ({ ...state, session: null });
export const resetDemo = (state: DemoState, confirmed: boolean): DemoState => confirmed ? createBaselineState() : state;

/** Selection only; action eligibility remains exclusively in the existing domain service. */
export const selectHrSubject = (requests: LeaveRequest[]): LeaveRequest | null =>
  requests.find(isHrEscalatedRequest) ?? requests.find(request =>
    request.auditHistory.some(event => event.eventType === AuditEventType.DECISION && event.actorRole === Persona.HR),
  ) ?? null;

const actorFor = (state: DemoState, role: 'manager' | 'hr') => {
  const account = state.session && restoreSession(state.session.persona, state.session.loginId);
  return account?.persona === role ? { id: account.actorId, role: account.persona } : null;
};

export const approveDemoAsManager = (state: DemoState, requestId: string, expectedVersion?: number) => {
  const actor = actorFor(state, Persona.MANAGER);
  if (!actor) return { ok: false as const, error: 'unauthorized' as const };
  const version = expectedVersion ?? state.requests.find(item => item.requestId === requestId)?.version ?? 0;
  return approveAsManager(state.requests, requestId, actor, INBOX_NOW, version);
};
export const rejectDemoAsManager = (
  state: DemoState, requestId: string, expectedVersion: number, category: unknown, details: unknown,
) => {
  const actor = actorFor(state, Persona.MANAGER);
  if (!actor) return { ok: false as const, error: 'unauthorized' as const };
  return rejectAsManager(state.requests, requestId, actor, INBOX_NOW, expectedVersion, category, details);
};
export const decideDemoAsHr = (
  state: DemoState, requestId: string, expectedVersion: number, decision: 'approve' | 'reject', reason = '',
) => {
  const actor = actorFor(state, Persona.HR);
  if (!actor) return { ok: false as const, error: 'unauthorized' as const };
  return decideAsHr(state.requests, requestId, actor, INBOX_NOW, expectedVersion, decision, reason);
};
