import type { DemoState } from './contracts';
import { DEMO_COPY } from './copy';
import { getDemoNavigation } from './navigation';
import { authenticateDemoPersona } from './session';
import { EMPLOYEE_DEMO_BALANCE, selectEmployeeDemoRequests, submitEmployeeDemoRequest } from './employee';
import { isHrEscalatedRequest } from '../domain/leave/hrFinalDecision';
import { AuditEventType, Persona } from '../domain/leave/types';
import { getSessionStorage, loadDemoSnapshot, saveDemoSnapshot } from './snapshot';
import type { DemoStorage } from './snapshot';
import {
  approveDemoAsManager, decideDemoAsHr, logoutDemoSession, rejectDemoAsManager, resetDemo, selectHrSubject,
} from './state';
import { UNAVAILABLE_TOAST_BEHAVIOR } from './ui-contract';
import type { DemoEntry, UnavailableNotice } from './ui-contract';

/** One app-owned collection. Instantiate once via useDemo; no singleton, replay, or second page store.
 * Synchronous commits make logout/reset and successive callbacks observe the latest state.
 * The controller is also usable without React for deterministic integration tests. */
export const createDemoController = (storage: DemoStorage | null = getSessionStorage()) => {
  const hydrated = loadDemoSnapshot(storage);
  let state = hydrated.state;
  let showRecovery = hydrated.showRecoveryNotice;
  let persistence: DemoEntry['persistence'] = hydrated.storageAvailable ? 'available' : 'memory-only';
  let resetRequested = false;
  let notice: UnavailableNotice | null = null;
  let noticeId = 0;
  let selectedHrRequestId: string | null = null;
  const listeners = new Set<() => void>();
  const navigation = getDemoNavigation();
  let entry: DemoEntry;
  const publish = () => { entry = view(); listeners.forEach(listener => listener()); };
  const commit = (next: DemoState) => {
    state = next;
    // Even after a failed save, try to replace/remove an older snapshot on subsequent changes.
    persistence = saveDemoSnapshot(state, storage).ok ? 'saved' : 'memory-only';
    publish();
  };
  const approve: NonNullable<DemoEntry['manager']>['onApprove'] = (requestId, expectedVersion) => {
    const result = approveDemoAsManager(state, requestId, expectedVersion);
    if (result.ok) commit({ ...state, requests: result.requests });
    return result;
  };
  const reject: NonNullable<DemoEntry['manager']>['onReject'] = (requestId, expectedVersion, category, details) => {
    const result = rejectDemoAsManager(state, requestId, expectedVersion, category, details);
    if (result.ok) commit({ ...state, requests: result.requests });
    return result;
  };
  const decide: NonNullable<DemoEntry['hr']>['onDecide'] = (requestId, expectedVersion, decision, reason) => {
    const result = decideDemoAsHr(state, requestId, expectedVersion, decision, reason);
    if (result.ok) {
      // Keep the decided subject visible even if another request remains actionable.
      selectedHrRequestId = requestId;
      commit({ ...state, requests: result.requests });
    }
    return result;
  };
  const submit: NonNullable<DemoEntry['employee']>['onSubmit'] = input => {
    const result = submitEmployeeDemoRequest(state, input);
    if (result.ok) commit({ ...state, requests: result.requests });
    return result;
  };
  const hrOptions = () => state.requests.filter(request => isHrEscalatedRequest(request) ||
    request.auditHistory.some(event => event.eventType === AuditEventType.DECISION && event.actorRole === Persona.HR))
    .map(request => ({ requestId: request.requestId, employeeName: request.employeeName, decided: !isHrEscalatedRequest(request) }));
  const selectHrRequest = (requestId: string) => {
    if (state.session?.persona !== Persona.HR || !hrOptions().some(option => option.requestId === requestId)) return;
    selectedHrRequestId = requestId;
    publish();
  };
  const login: DemoEntry['login'] = (loginId, password) => {
    // Login is a logged-out entry point; an active persona cannot be switched through this API.
    if (state.session) return { ok: false, error: 'invalid_credentials' };
    const result = authenticateDemoPersona(loginId, password);
    if (result.ok) { showRecovery = false; commit({ ...state, session: result.session }); }
    return result;
  };
  const logout = () => { resetRequested = false; notice = null; selectedHrRequestId = null; commit(logoutDemoSession(state)); };
  const requestReset = () => { if (state.session) { resetRequested = true; publish(); } };
  const cancelReset = () => { resetRequested = false; publish(); };
  const confirmReset = () => {
    if (!resetRequested) return;
    resetRequested = false; notice = null; showRecovery = false; selectedHrRequestId = null;
    commit(resetDemo(state, true));
  };
  const dismissRecovery = () => { showRecovery = false; publish(); };
  const notifyUnavailable = (itemId: string) => {
    if (!state.session) return;
    const item = [...navigation.sidebar, ...navigation.mobile].find(item => item.id === itemId);
    if (!item || item.available) return;
    notice = { id: ++noticeId, title: DEMO_COPY.unavailableTitle, message: DEMO_COPY.unavailableMessage };
    publish();
  };
  const dismissToast = (id: number) => { if (notice?.id === id) { notice = null; publish(); } };
  const view = (): DemoEntry => ({
    ...state, persistence, resetRequested,
    hydration: { source: hydrated.source, recoveryReason: hydrated.recoveryReason },
    recoveryNotice: showRecovery ? DEMO_COPY.recovery : null,
    storageNotice: persistence === 'memory-only' ? DEMO_COPY.storageUnavailable : null,
    login, logout, requestReset, cancelReset, confirmReset, dismissRecovery, navigation, notifyUnavailable,
    toast: { notice, behavior: UNAVAILABLE_TOAST_BEHAVIOR, onDismiss: dismissToast },
    manager: state.session?.persona === 'manager' ? {
      requests: state.requests, actor: { id: state.session.actorId, role: state.session.persona }, onApprove: approve, onReject: reject,
    } : null,
    hr: state.session?.persona === 'hr' ? {
      requests: state.requests, actor: { id: state.session.actorId, role: state.session.persona },
      requestId: hrOptions().some(option => option.requestId === selectedHrRequestId)
        ? selectedHrRequestId : selectHrSubject(state.requests)?.requestId ?? null,
      selectableRequests: hrOptions(), onSelectRequest: selectHrRequest, onDecide: decide,
    } : null,
    employee: state.session?.persona === Persona.EMPLOYEE ? {
      requests: selectEmployeeDemoRequests(state), balance: EMPLOYEE_DEMO_BALANCE, onSubmit: submit,
    } : null,
  });
  entry = view();
  return {
    getSnapshot: () => entry,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
};
