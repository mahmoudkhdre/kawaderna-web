/**
 * Kawaderna Leave MVP - Deterministic transitions.
 *
 * Only the approved routine / low-balance paths:
 *   Draft -> Pending/Manager -> Approved | Rejected
 *   Draft -> Pending/Manager -> Pending/HR -> Approved | Rejected
 *
 * Pure functions: input request in, new request out. Time (`at`) is supplied
 * by the caller. Errors are semantic codes, never UI copy.
 * Clarification, stale refresh, processing, withdrawal and expiry are NOT here.
 */

import {
  ApprovalStage,
  ApprovalStatus,
  AuditEventType,
  Persona,
  ProcessingStatus,
  TerminalReason,
} from './types';
import type { ApprovalPathStep, AuditEvent, LeaveRequest } from './types';
import { exceedsAvailableBalance } from './selectors';

export interface Actor {
  id: string;
  role: Persona;
}

export const TransitionError = {
  STALE_VERSION: 'stale_version',
  INVALID_STATE: 'invalid_state',
  UNAUTHORIZED: 'unauthorized',
  REASON_REQUIRED: 'reason_required',
  ACKNOWLEDGEMENT_REQUIRED: 'acknowledgement_required',
} as const;

export type TransitionError = typeof TransitionError[keyof typeof TransitionError];

export type TransitionResult =
  | { ok: true; request: LeaveRequest }
  | { ok: false; error: TransitionError };

const fail = (error: TransitionError): TransitionResult => ({ ok: false, error });
const succeed = (request: LeaveRequest): TransitionResult => ({ ok: true, request });

const isStale = (request: LeaveRequest, expectedVersion: number): boolean =>
  request.isStaleVersion || request.version !== expectedVersion;

const event = (
  eventType: AuditEventType,
  actor: Actor,
  at: Date,
  details: Record<string, unknown>,
  visibilityLevel: AuditEvent['visibilityLevel'],
): AuditEvent => ({ eventType, actor: actor.id, actorRole: actor.role, timestamp: at, details, visibilityLevel });

// ----------------------------------------------------------------------------
// Employee
// ----------------------------------------------------------------------------

/** Employee acknowledges the low-balance warning while the request is a Draft. */
export const acknowledgeLowBalance = (request: LeaveRequest, actor: Actor, at: Date): TransitionResult => {
  if (actor.role !== Persona.EMPLOYEE || actor.id !== request.employeeId) return fail(TransitionError.UNAUTHORIZED);
  if (request.approvalStatus !== ApprovalStatus.DRAFT || !exceedsAvailableBalance(request)) {
    return fail(TransitionError.INVALID_STATE);
  }
  return succeed({ ...request, lowBalanceAcknowledged: true, updatedAt: at });
};

/**
 * Draft -> Pending / Manager. Low-balance requests need a prior acknowledgement,
 * which is recorded as its own audit event, separate from any Manager decision.
 */
export const submitLeaveRequest = (request: LeaveRequest, actor: Actor, at: Date): TransitionResult => {
  if (actor.role !== Persona.EMPLOYEE || actor.id !== request.employeeId) return fail(TransitionError.UNAUTHORIZED);
  if (request.approvalStatus !== ApprovalStatus.DRAFT) return fail(TransitionError.INVALID_STATE);

  const lowBalance = exceedsAvailableBalance(request);
  if (lowBalance && !request.lowBalanceAcknowledged) return fail(TransitionError.ACKNOWLEDGEMENT_REQUIRED);

  const approvalPath: ApprovalPathStep[] = [
    { order: 1, ownerRole: 'manager', ownerName: request.managerName, status: 'pending' },
    ...(lowBalance ? [{ order: 2, ownerRole: 'hr', status: 'pending' } satisfies ApprovalPathStep] : []),
  ];

  const auditHistory: AuditEvent[] = [
    ...request.auditHistory,
    event(AuditEventType.SUBMISSION, actor, at, { action: 'submitted' }, 'public'),
    ...(lowBalance
      ? [event(AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT, actor, at, { acknowledged: true }, 'public')]
      : []),
  ];

  return succeed({
    ...request,
    approvalStatus: ApprovalStatus.PENDING,
    approvalStage: ApprovalStage.MANAGER,
    processingStatus: ProcessingStatus.NOT_STARTED,
    approvalPath,
    submittedAt: at,
    updatedAt: at,
    auditHistory,
  });
};

// ----------------------------------------------------------------------------
// Manager
// ----------------------------------------------------------------------------

const checkManager = (request: LeaveRequest, actor: Actor, at: Date, expectedVersion: number): TransitionError | null => {
  if (isStale(request, expectedVersion)) return TransitionError.STALE_VERSION;
  if (request.approvalStatus !== ApprovalStatus.PENDING || request.approvalStage !== ApprovalStage.MANAGER) {
    return TransitionError.INVALID_STATE;
  }
  if (actor.role !== Persona.MANAGER || actor.id !== request.managerId) return TransitionError.UNAUTHORIZED;

  // Invariant: no Manager decision before the low-balance acknowledgement.
  if (exceedsAvailableBalance(request)) {
    const acknowledgement = request.auditHistory.find(
      (e) => e.eventType === AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT,
    );
    if (!acknowledgement) return TransitionError.ACKNOWLEDGEMENT_REQUIRED;
    if (acknowledgement.timestamp.getTime() > at.getTime()) return TransitionError.INVALID_STATE;
  }
  return null;
};

const decideStep = (
  path: ApprovalPathStep[],
  role: 'manager' | 'hr',
  status: 'approved' | 'rejected',
  at: Date,
  reason?: string,
): ApprovalPathStep[] =>
  path.map((step) =>
    step.ownerRole === role ? { ...step, status, decidedAt: at, ...(reason ? { reason } : {}) } : step,
  );

/**
 * Manager approval. Routine: Pending/Manager -> Approved.
 * Low balance: Pending/Manager -> Pending/HR (escalation; NOT final approval).
 */
export const managerApprove = (
  request: LeaveRequest,
  actor: Actor,
  at: Date,
  expectedVersion: number,
): TransitionResult => {
  const error = checkManager(request, actor, at, expectedVersion);
  if (error) return fail(error);

  if (exceedsAvailableBalance(request)) {
    return succeed({
      ...request,
      approvalStatus: ApprovalStatus.PENDING,
      approvalStage: ApprovalStage.HR,
      approvalPath: decideStep(request.approvalPath, 'manager', 'approved', at),
      updatedAt: at,
      auditHistory: [
        ...request.auditHistory,
        event(AuditEventType.ESCALATION, actor, at, { from: 'manager', to: 'hr', managerDecision: 'approved' }, 'manager'),
      ],
    });
  }

  return succeed({
    ...request,
    approvalStatus: ApprovalStatus.APPROVED,
    approvalStage: ApprovalStage.NONE,
    approvalPath: decideStep(request.approvalPath, 'manager', 'approved', at),
    updatedAt: at,
    auditHistory: [...request.auditHistory, event(AuditEventType.DECISION, actor, at, { decision: 'approved' }, 'public')],
  });
};

/** Manager rejection requires a reason. Pending/Manager -> Rejected. */
export const managerReject = (
  request: LeaveRequest,
  actor: Actor,
  at: Date,
  expectedVersion: number,
  reason: string,
): TransitionResult => {
  const error = checkManager(request, actor, at, expectedVersion);
  if (error) return fail(error);
  if (reason.trim() === '') return fail(TransitionError.REASON_REQUIRED);

  return succeed({
    ...request,
    approvalStatus: ApprovalStatus.REJECTED,
    approvalStage: ApprovalStage.NONE,
    terminalReason: TerminalReason.REJECTED_BY_MANAGER,
    approvalPath: decideStep(request.approvalPath, 'manager', 'rejected', at, reason),
    updatedAt: at,
    auditHistory: [
      ...request.auditHistory,
      event(AuditEventType.DECISION, actor, at, { decision: 'rejected', reason }, 'public'),
    ],
  });
};

// ----------------------------------------------------------------------------
// HR
// ----------------------------------------------------------------------------

const checkHr = (request: LeaveRequest, actor: Actor, expectedVersion: number): TransitionError | null => {
  if (isStale(request, expectedVersion)) return TransitionError.STALE_VERSION;
  if (request.approvalStatus !== ApprovalStatus.PENDING || request.approvalStage !== ApprovalStage.HR) {
    return TransitionError.INVALID_STATE;
  }
  if (actor.role !== Persona.HR) return TransitionError.UNAUTHORIZED;
  return null;
};

/** HR final approval. Pending/HR -> Approved. */
export const hrApprove = (
  request: LeaveRequest,
  actor: Actor,
  at: Date,
  expectedVersion: number,
): TransitionResult => {
  const error = checkHr(request, actor, expectedVersion);
  if (error) return fail(error);

  return succeed({
    ...request,
    approvalStatus: ApprovalStatus.APPROVED,
    approvalStage: ApprovalStage.NONE,
    approvalPath: decideStep(request.approvalPath, 'hr', 'approved', at),
    updatedAt: at,
    auditHistory: [...request.auditHistory, event(AuditEventType.DECISION, actor, at, { decision: 'approved' }, 'public')],
  });
};

/** HR final rejection requires a reason. Pending/HR -> Rejected. */
export const hrReject = (
  request: LeaveRequest,
  actor: Actor,
  at: Date,
  expectedVersion: number,
  reason: string,
): TransitionResult => {
  const error = checkHr(request, actor, expectedVersion);
  if (error) return fail(error);
  if (reason.trim() === '') return fail(TransitionError.REASON_REQUIRED);

  return succeed({
    ...request,
    approvalStatus: ApprovalStatus.REJECTED,
    approvalStage: ApprovalStage.NONE,
    terminalReason: TerminalReason.REJECTED_BY_HR,
    approvalPath: decideStep(request.approvalPath, 'hr', 'rejected', at, reason),
    updatedAt: at,
    auditHistory: [
      ...request.auditHistory,
      event(AuditEventType.DECISION, actor, at, { decision: 'rejected', reason }, 'public'),
    ],
  });
};
