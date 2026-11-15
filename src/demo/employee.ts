import { INBOX_NOW, lowBalanceDraft, routineDraft } from '../domain/leave/fixtures';
import { selectEmployeeRejectionReason } from '../domain/leave/employeeRejection';
import { exceedsAvailableBalance } from '../domain/leave/selectors';
import { acknowledgeLowBalance, submitLeaveRequest } from '../domain/leave/transitions';
import { Persona } from '../domain/leave/types';
import type { ApprovalPathStep, AuditEvent, LeaveRequest } from '../domain/leave/types';
import type { DemoState } from './contracts';
import { restoreSession } from './session';

// Fixed fictional demo balance, taken from the existing low-balance scenario.
export const EMPLOYEE_DEMO_BALANCE = lowBalanceDraft.balanceBefore;
export interface EmployeeRequestInput {
  startDate: string;
  endDate: string;
  durationWorkingDays: number;
  acknowledgeLowBalance: boolean;
}
export type EmployeeSubmitResult =
  | { ok: true; requests: LeaveRequest[]; request: LeaveRequest }
  | { ok: false; error: 'unauthorized' | 'invalid_dates' | 'invalid_duration' | 'acknowledgement_required' };

const parseRiyadhDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+03:00`);
  return Number.isFinite(date.getTime()) &&
    new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))).toISOString().slice(0, 10) === value
    ? date : null;
};

const nextRequestId = (requests: LeaveRequest[]): string => {
  const existing = requests.map(request => /^LV-2026-(\d+)$/.exec(request.requestId))
    .filter((match): match is RegExpExecArray => !!match)
    .map(match => Number(match[1]));
  return `LV-2026-${Math.max(106, ...existing) + 1}`;
};

/** The existing draft scenarios supply policy/risk inputs; transitions own every workflow change. */
export const submitEmployeeDemoRequest = (state: DemoState, input: EmployeeRequestInput): EmployeeSubmitResult => {
  const account = state.session && restoreSession(state.session.persona, state.session.loginId);
  if (!account || account.persona !== Persona.EMPLOYEE) return { ok: false, error: 'unauthorized' };
  const startDate = parseRiyadhDate(input.startDate);
  const endDate = parseRiyadhDate(input.endDate);
  if (!startDate || !endDate || endDate < startDate) return { ok: false, error: 'invalid_dates' };
  const span = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (!Number.isInteger(input.durationWorkingDays) || input.durationWorkingDays < 1 || input.durationWorkingDays > span) {
    return { ok: false, error: 'invalid_duration' };
  }
  const actor = { id: account.actorId, role: Persona.EMPLOYEE };
  const template = input.durationWorkingDays > EMPLOYEE_DEMO_BALANCE ? lowBalanceDraft : routineDraft;
  let draft: LeaveRequest = {
    ...structuredClone(template), requestId: nextRequestId(state.requests), employeeId: account.actorId,
    employeeName: account.displayIdentity, managerId: 'MGR-2001', managerName: 'فاطمة علي',
    startDate, endDate, effectiveDate: startDate, durationWorkingDays: input.durationWorkingDays,
    balanceBefore: EMPLOYEE_DEMO_BALANCE, createdAt: INBOX_NOW, updatedAt: INBOX_NOW,
  };
  if (exceedsAvailableBalance(draft)) {
    if (!input.acknowledgeLowBalance) return { ok: false, error: 'acknowledgement_required' };
    const acknowledged = acknowledgeLowBalance(draft, actor, INBOX_NOW);
    if (!acknowledged.ok) return { ok: false, error: 'unauthorized' };
    draft = acknowledged.request;
  }
  const submitted = submitLeaveRequest(draft, actor, INBOX_NOW);
  if (!submitted.ok) return { ok: false, error: submitted.error === 'acknowledgement_required' ? 'acknowledgement_required' : 'unauthorized' };
  return { ok: true, request: submitted.request, requests: [...state.requests, submitted.request] };
};

export interface EmployeeRequestView {
  requestId: string;
  version: number;
  startDate: Date;
  endDate: Date;
  durationWorkingDays: number;
  approvalStatus: LeaveRequest['approvalStatus'];
  approvalStage: LeaveRequest['approvalStage'];
  approvalPath: Pick<ApprovalPathStep, 'order' | 'ownerRole' | 'status'>[];
  auditHistory: Pick<AuditEvent, 'eventType' | 'timestamp'>[];
  rejectionReason: string | null;
}

/** Owning employee sees only their own requests and public audit entries. */
export const selectEmployeeDemoRequests = (state: DemoState): EmployeeRequestView[] => {
  const account = state.session && restoreSession(state.session.persona, state.session.loginId);
  if (!account || account.persona !== Persona.EMPLOYEE) return [];
  return state.requests.filter(request => request.employeeId === account.actorId).map(request => ({
    requestId: request.requestId, version: request.version, startDate: request.startDate, endDate: request.endDate,
    durationWorkingDays: request.durationWorkingDays, approvalStatus: request.approvalStatus,
    approvalStage: request.approvalStage,
    approvalPath: request.approvalPath.map(({ order, ownerRole, status }) => ({ order, ownerRole, status })),
    auditHistory: request.auditHistory.filter(event => event.visibilityLevel === 'public')
      .map(({ eventType, timestamp }) => ({ eventType, timestamp })),
    rejectionReason: selectEmployeeRejectionReason(state.requests, request.requestId, { id: account.actorId, role: Persona.EMPLOYEE })?.reason ?? null,
  }));
};
