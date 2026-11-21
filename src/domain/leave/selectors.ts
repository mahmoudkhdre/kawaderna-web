/**
 * Kawaderna Leave MVP - Derived state and role-safe projection.
 *
 * Pure functions only. No clock access: callers pass `now` explicitly so the
 * demo stays deterministic. No UI copy: only semantic values.
 */

import { ApprovalStage, ApprovalStatus, AuditEventType, Persona, RiskSeverity } from './types';
import type { LeaveRequest, LeaveType, ProcessingStatus } from './types';

// ============================================================================
// BALANCE (derived)
// ============================================================================

/** Projected balance = available balance - requested duration. */
export const projectedBalance = (request: LeaveRequest): number =>
  request.balanceBefore - request.durationWorkingDays;

/** True when the requested duration exceeds the available balance. */
export const exceedsAvailableBalance = (request: LeaveRequest): boolean =>
  request.durationWorkingDays > request.balanceBefore;

// ============================================================================
// DUE STATE (derived)
// ============================================================================

/**
 * Overdue = an active Manager/HR stage whose stored due timestamp has passed.
 * `isDueSoon` is NOT provided: the due-soon threshold is not defined.
 */
export const isOverdue = (request: LeaveRequest, now: Date): boolean => {
  if (request.approvalStatus !== ApprovalStatus.PENDING) return false;
  if (
    request.approvalStage !== ApprovalStage.MANAGER &&
    request.approvalStage !== ApprovalStage.HR
  ) {
    return false;
  }
  return request.slaDueAt !== undefined && now.getTime() > request.slaDueAt.getTime();
};

// ============================================================================
// OWNER + NEXT ACTION (derived)
// ============================================================================

/** Active decision owner, or null when nobody owns a decision. */
export const getCurrentOwnerRole = (request: LeaveRequest): Persona | null => {
  if (request.approvalStatus !== ApprovalStatus.PENDING) return null;
  switch (request.approvalStage) {
    case ApprovalStage.MANAGER:
      return Persona.MANAGER;
    case ApprovalStage.HR:
    case ApprovalStage.ESCALATED:
      return Persona.HR;
    case ApprovalStage.REQUESTER_CLARIFICATION:
      return Persona.EMPLOYEE;
    default:
      return null;
  }
};

export const NextAction = {
  REVIEW_REQUEST: 'review_request',
  REVIEW_BALANCE_EXCEPTION: 'review_balance_exception',
} as const;

export type NextAction = typeof NextAction[keyof typeof NextAction];

/** Semantic next action only (no display copy). Null when not defined. */
export const getNextAction = (request: LeaveRequest): NextAction | null => {
  if (request.approvalStatus !== ApprovalStatus.PENDING) return null;
  if (request.approvalStage === ApprovalStage.MANAGER) return NextAction.REVIEW_REQUEST;
  if (request.approvalStage === ApprovalStage.HR) return NextAction.REVIEW_BALANCE_EXCEPTION;
  return null;
};

// ============================================================================
// ROUTE (derived read model, not a workflow engine)
// ============================================================================

export const RouteRole = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HR: 'hr',
  FINAL_DECISION: 'final_decision',
} as const;

export type RouteRole = typeof RouteRole[keyof typeof RouteRole];

export type RouteStageState = 'completed' | 'current' | 'upcoming';

export interface RouteStage {
  role: RouteRole;
  state: RouteStageState;
}

/**
 * Routine:     Employee -> Manager -> Final Decision
 * Low balance: Employee -> Manager -> HR -> Final Decision
 * A Draft has no stored path yet, so its route is derived from the balance.
 */
export const getRoute = (request: LeaveRequest): RouteStage[] => {
  const isDraft = request.approvalStatus === ApprovalStatus.DRAFT;
  const reviewers: Array<'manager' | 'hr'> = isDraft
    ? exceedsAvailableBalance(request)
      ? ['manager', 'hr']
      : ['manager']
    : request.approvalPath.map((step) => step.ownerRole);

  const currentRole = getCurrentOwnerRole(request);
  const decided =
    request.approvalStatus === ApprovalStatus.APPROVED ||
    request.approvalStatus === ApprovalStatus.REJECTED;

  const reviewerStages = reviewers.map((role, index): RouteStage => {
    const step = request.approvalPath[index];
    if (!isDraft && step?.status === 'approved') return { role, state: 'completed' };
    if (!isDraft && request.approvalStatus === ApprovalStatus.PENDING && currentRole === role) {
      return { role, state: 'current' };
    }
    if (!isDraft && step?.status === 'rejected') return { role, state: 'completed' };
    return { role, state: 'upcoming' };
  });

  return [
    { role: RouteRole.EMPLOYEE, state: isDraft ? 'current' : 'completed' },
    ...reviewerStages,
    { role: RouteRole.FINAL_DECISION, state: decided ? 'completed' : 'upcoming' },
  ];
};

// ============================================================================
// VERSION
// ============================================================================

/** A rejected current version is read-only. */
export const isVersionReadOnly = (request: LeaveRequest): boolean =>
  request.approvalStatus === ApprovalStatus.REJECTED;

// ============================================================================
// ROLE-SAFE PROJECTION
// ============================================================================

export const BalanceSufficiency = {
  SUFFICIENT: 'sufficient',
  INSUFFICIENT: 'insufficient',
} as const;

export type BalanceSufficiency = typeof BalanceSufficiency[keyof typeof BalanceSufficiency];

/** Manager view: no exact balance number (`balanceBefore` is removed). */
export type ManagerLeaveRequestView = Omit<LeaveRequest, 'balanceBefore'> & {
  balanceSufficiency: BalanceSufficiency;
};

export const toManagerView = (request: LeaveRequest): ManagerLeaveRequestView => {
  const { balanceBefore: _protected, ...rest } = request;
  return {
    ...rest,
    balanceSufficiency: exceedsAvailableBalance(request)
      ? BalanceSufficiency.INSUFFICIENT
      : BalanceSufficiency.SUFFICIENT,
  };
};

// ============================================================================
// MANAGER INBOX (Gap 1)
// ============================================================================

/**
 * Read-model flag only. Transitions (`checkManager`) re-validate every action.
 * Clarification and escalated/HR stages are never Manager-decidable.
 */
export const canManagerDecide = (request: LeaveRequest, managerId: string): boolean =>
  request.managerId === managerId &&
  !request.isStaleVersion &&
  request.approvalStatus === ApprovalStatus.PENDING &&
  request.approvalStage === ApprovalStage.MANAGER;

export interface ManagerInboxRow {
  requestId: string;
  version: number;
  employeeName: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  isPartialDay: boolean;
  durationWorkingDays: number;
  approvalStatus: ApprovalStatus;
  approvalStage: ApprovalStage;
  currentOwnerRole: Persona | null;
  nextAction: NextAction | null;
  risk: { severity: RiskSeverity; code: string } | null;
  balanceSufficiency: BalanceSufficiency;
  isOverdue: boolean;
  canApprove: boolean;
  canReject: boolean;
}

const RISK_ORDER: RiskSeverity[] = [
  RiskSeverity.BLOCKED,
  RiskSeverity.WARNING,
  RiskSeverity.REVIEW,
  RiskSeverity.INFO,
];

const topRisk = (request: LeaveRequest): ManagerInboxRow['risk'] => {
  const top = [...request.riskFlags].sort(
    (a, b) => RISK_ORDER.indexOf(a.severity) - RISK_ORDER.indexOf(b.severity),
  )[0];
  return top ? { severity: top.severity, code: top.code } : null;
};

/** Explicit allowlist: no spread of the request, so protected fields cannot leak. */
export const toManagerInboxRow = (request: LeaveRequest, now: Date): ManagerInboxRow => {
  const canDecide = canManagerDecide(request, request.managerId);
  return {
    requestId: request.requestId,
    version: request.version,
    employeeName: request.employeeName,
    leaveType: request.leaveType,
    startDate: request.startDate,
    endDate: request.endDate,
    isPartialDay: request.isPartialDay,
    durationWorkingDays: request.durationWorkingDays,
    approvalStatus: request.approvalStatus,
    approvalStage: request.approvalStage,
    currentOwnerRole: getCurrentOwnerRole(request),
    // Action available to the viewing Manager only; HR-owned requests have none here.
    nextAction: getCurrentOwnerRole(request) === Persona.MANAGER ? getNextAction(request) : null,
    risk: topRisk(request),
    balanceSufficiency: exceedsAvailableBalance(request)
      ? BalanceSufficiency.INSUFFICIENT
      : BalanceSufficiency.SUFFICIENT,
    isOverdue: isOverdue(request, now),
    canApprove: canDecide,
    canReject: canDecide,
  };
};

/** The manager's own direct reports only. */
export const selectManagerInbox = (
  requests: LeaveRequest[],
  managerId: string,
  now: Date,
): ManagerInboxRow[] =>
  requests.filter((r) => r.managerId === managerId).map((r) => toManagerInboxRow(r, now));

// ============================================================================
// MANAGER REQUEST DETAIL (Gap 2, read-only)
// ============================================================================

export interface ManagerDetailRisk {
  severity: RiskSeverity;
  code: string;
  explanationAr: string;
  routeConsequence: string;
}

export interface ManagerDetailPolicy {
  ruleCode: string;
  passed: boolean;
  requiresAcknowledgement: boolean;
  requiresElevatedReview: boolean;
  explanationAr: string;
}

export interface ManagerDetailPathStep {
  order: number;
  ownerRole: 'manager' | 'hr';
  ownerName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decidedAt?: Date;
}

export interface ManagerDetailAuditEvent {
  eventType: AuditEventType;
  actorRole: Persona;
  timestamp: Date;
  decision?: 'approved' | 'rejected';
}

export interface ManagerRequestDetail {
  context: {
    requestId: string;
    version: number;
    employeeName: string;
    managerName: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    isPartialDay: boolean;
    partialDayHours?: number;
    durationWorkingDays: number;
    submittedAt?: Date;
  };
  summary: {
    approvalStatus: ApprovalStatus;
    approvalStage: ApprovalStage;
    processingStatus: ProcessingStatus;
    currentOwnerRole: Persona | null;
    nextAction: NextAction | null;
    isOverdue: boolean;
    isStale: boolean;
    isVersionReadOnly: boolean;
    /** Read-model flag only: `approveAsManager` re-validates at execution time. */
    canApprove: boolean;
  };
  risks: ManagerDetailRisk[];
  policies: ManagerDetailPolicy[];
  balance: { sufficiency: BalanceSufficiency; lowBalanceAcknowledged: boolean; annualBalanceBeforeDays?: number };
  route: RouteStage[];
  path: ManagerDetailPathStep[];
  audit: ManagerDetailAuditEvent[];
}

/** Audit event types approved for Manager visibility (spec: submitted, acknowledged, routed, decisions). */
const MANAGER_AUDIT_TYPES: AuditEventType[] = [
  AuditEventType.SUBMISSION,
  AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT,
  AuditEventType.ESCALATION,
  AuditEventType.DECISION,
];

const projectAuditEvents = (request: LeaveRequest): ManagerDetailAuditEvent[] =>
  request.auditHistory
    .filter(
      (e) =>
        (e.visibilityLevel === 'public' || e.visibilityLevel === 'manager') &&
        MANAGER_AUDIT_TYPES.includes(e.eventType),
    )
    .map((e): ManagerDetailAuditEvent => {
      const decision = e.eventType === AuditEventType.DECISION ? e.details.decision : undefined;
      return {
        eventType: e.eventType,
        actorRole: e.actorRole,
        timestamp: e.timestamp,
        ...(decision === 'approved' || decision === 'rejected' ? { decision } : {}),
      };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

/** Explicit allowlist: every field is copied by name. Never spread the request or `toManagerView`. */
export const toManagerRequestDetail = (request: LeaveRequest, now: Date): ManagerRequestDetail => ({
  context: {
    requestId: request.requestId,
    version: request.version,
    employeeName: request.employeeName,
    managerName: request.managerName,
    leaveType: request.leaveType,
    startDate: request.startDate,
    endDate: request.endDate,
    isPartialDay: request.isPartialDay,
    ...(request.partialDayDetails ? { partialDayHours: request.partialDayDetails.hours } : {}),
    durationWorkingDays: request.durationWorkingDays,
    submittedAt: request.submittedAt,
  },
  summary: {
    approvalStatus: request.approvalStatus,
    approvalStage: request.approvalStage,
    processingStatus: request.processingStatus,
    currentOwnerRole: getCurrentOwnerRole(request),
    nextAction: getCurrentOwnerRole(request) === Persona.MANAGER ? getNextAction(request) : null,
    isOverdue: isOverdue(request, now),
    isStale: request.isStaleVersion,
    isVersionReadOnly: isVersionReadOnly(request),
    canApprove: canManagerDecide(request, request.managerId),
  },
  risks: request.riskFlags.map((r) => ({
    severity: r.severity,
    code: r.code,
    explanationAr: r.explanationAr,
    routeConsequence: r.routeConsequence,
  })),
  policies: request.policyResults.map((p) => ({
    ruleCode: p.ruleCode,
    passed: p.passed,
    requiresAcknowledgement: p.requiresAcknowledgement,
    requiresElevatedReview: p.requiresElevatedReview,
    explanationAr: p.explanationAr,
  })),
  balance: {
    sufficiency: exceedsAvailableBalance(request)
      ? BalanceSufficiency.INSUFFICIENT
      : BalanceSufficiency.SUFFICIENT,
    lowBalanceAcknowledged: request.lowBalanceAcknowledged,
  },
  route: getRoute(request),
  path: request.approvalPath.map((s) => ({
    order: s.order,
    ownerRole: s.ownerRole,
    ownerName: s.ownerName,
    status: s.status,
    decidedAt: s.decidedAt,
  })),
  audit: projectAuditEvents(request),
});

/** Direct reports only: returns null for an unknown id or another manager's request. */
export const selectManagerRequestDetail = (
  requests: LeaveRequest[],
  requestId: string,
  managerId: string,
  now: Date,
  showAnnualBalance = false,
): ManagerRequestDetail | null => {
  const request = requests.find((r) => r.requestId === requestId && r.managerId === managerId);
  if (!request) return null;
  const detail = toManagerRequestDetail(request, now);
  if (showAnnualBalance === true && request.leaveType === 'annual') {
    detail.balance.annualBalanceBeforeDays = request.balanceBefore;
  }
  return detail;
};
