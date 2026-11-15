/**
 * Kawaderna Leave MVP - Deterministic Fixtures
 *
 * ONE canonical demo request (LV-2026-001, version 1, annual leave) in
 * different states. Routine and low-balance are scenarios of the same request,
 * not separate requests.
 *
 * Derived values (projected balance, exceeds-available-balance, current owner,
 * next action, overdue, route) are NOT stored here: see selectors.ts.
 */

import {
  ApprovalStage,
  ApprovalStatus,
  AuditEventType,
  LeaveType,
  Persona,
  ProcessingStatus,
  RiskSeverity,
  TerminalReason,
} from './types';
import type { LeaveRequest, PolicyResult, RiskFlag } from './types';

// Base timestamp for deterministic dates
const baseDate = new Date('2026-01-15T09:00:00+03:00');

const addDays = (days: number) => new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
const addHours = (hours: number) => new Date(baseDate.getTime() + hours * 60 * 60 * 1000);

const REQUEST_ID = 'LV-2026-001';
const REJECTION_REASON = 'متطلبات العمل';

const routinePolicy: PolicyResult = {
  ruleCode: 'LEAVE_ROUTINE',
  passed: true,
  requiresAcknowledgement: false,
  requiresElevatedReview: false,
  explanationAr: 'طلب روتيني',
};

const lowBalanceRisk: RiskFlag = {
  severity: RiskSeverity.WARNING,
  code: 'LEAVE_LOW_BALANCE',
  explanationAr: 'الرصيد سيصبح منخفضًا بعد هذا الطلب',
  explanationEn: 'Balance will be low after this request',
  affectedFields: ['balanceBefore', 'durationWorkingDays'],
  routeConsequence: 'requires_hr_review',
};

const lowBalancePolicy: PolicyResult = {
  ruleCode: 'LEAVE_LOW_BALANCE',
  passed: false,
  requiresAcknowledgement: true,
  requiresElevatedReview: true,
  explanationAr: 'الرصيد سيصبح منخفضًا - يتطلب موافقة الموارد البشرية',
};

// ============================================================================
// ROUTINE: 20-22 January 2026, 3 days, available 18 -> projected 15
// ============================================================================

export const routineDraft: LeaveRequest = {
  requestId: REQUEST_ID,
  version: 1,
  employeeId: 'EMP-1001',
  employeeName: 'أحمد محمد',
  managerId: 'MGR-2001',
  managerName: 'فاطمة علي',
  leaveType: LeaveType.ANNUAL,
  startDate: new Date('2026-01-20T00:00:00+03:00'),
  endDate: new Date('2026-01-22T00:00:00+03:00'),
  isPartialDay: false,
  durationWorkingDays: 3,
  approvalStatus: ApprovalStatus.DRAFT,
  approvalStage: ApprovalStage.NONE,
  processingStatus: ProcessingStatus.NOT_STARTED,
  approvalPath: [],
  balanceBefore: 18,
  lowBalanceAcknowledged: false,
  riskFlags: [],
  policyResults: [routinePolicy],
  effectiveDate: new Date('2026-01-20T00:00:00+03:00'),
  createdAt: addHours(-3),
  updatedAt: addHours(-3),
  auditHistory: [],
  isStaleVersion: false,
};

// Pending / Manager / Not started
export const routinePending: LeaveRequest = {
  ...routineDraft,
  approvalStatus: ApprovalStatus.PENDING,
  approvalStage: ApprovalStage.MANAGER,
  approvalPath: [{ order: 1, ownerRole: 'manager', ownerName: 'فاطمة علي', status: 'pending' }],
  submittedAt: addHours(-2),
  slaDueAt: addDays(2),
  updatedAt: addHours(-2),
  auditHistory: [
    {
      eventType: AuditEventType.SUBMISSION,
      actor: 'EMP-1001',
      actorRole: Persona.EMPLOYEE,
      timestamp: addHours(-2),
      details: { action: 'submitted' },
      visibilityLevel: 'public',
    },
  ],
};

// Approved / None / Not started
export const routineApproved: LeaveRequest = {
  ...routineDraft,
  approvalStatus: ApprovalStatus.APPROVED,
  approvalStage: ApprovalStage.NONE,
  approvalPath: [
    { order: 1, ownerRole: 'manager', ownerName: 'فاطمة علي', status: 'approved', decidedAt: addHours(-1) },
  ],
  submittedAt: addHours(-2),
  updatedAt: addHours(-1),
  auditHistory: [
    {
      eventType: AuditEventType.SUBMISSION,
      actor: 'EMP-1001',
      actorRole: Persona.EMPLOYEE,
      timestamp: addHours(-2),
      details: { action: 'submitted' },
      visibilityLevel: 'public',
    },
    {
      eventType: AuditEventType.DECISION,
      actor: 'MGR-2001',
      actorRole: Persona.MANAGER,
      timestamp: addHours(-1),
      details: { decision: 'approved' },
      visibilityLevel: 'public',
    },
  ],
};

// Rejected / None / Not started (current version is read-only)
export const routineRejected: LeaveRequest = {
  ...routineDraft,
  approvalStatus: ApprovalStatus.REJECTED,
  approvalStage: ApprovalStage.NONE,
  terminalReason: TerminalReason.REJECTED_BY_MANAGER,
  approvalPath: [
    {
      order: 1,
      ownerRole: 'manager',
      ownerName: 'فاطمة علي',
      status: 'rejected',
      decidedAt: addHours(-1),
      reason: REJECTION_REASON,
    },
  ],
  submittedAt: addHours(-2),
  updatedAt: addHours(-1),
  auditHistory: [
    {
      eventType: AuditEventType.SUBMISSION,
      actor: 'EMP-1001',
      actorRole: Persona.EMPLOYEE,
      timestamp: addHours(-2),
      details: { action: 'submitted' },
      visibilityLevel: 'public',
    },
    {
      eventType: AuditEventType.DECISION,
      actor: 'MGR-2001',
      actorRole: Persona.MANAGER,
      timestamp: addHours(-1),
      details: { decision: 'rejected', reason: REJECTION_REASON },
      visibilityLevel: 'public',
    },
  ],
};

// ============================================================================
// LOW BALANCE: 20-24 January 2026, 5 days, available 3 -> projected -2
// ============================================================================

// Draft: warning shown, acknowledgement not yet given
export const lowBalanceDraft: LeaveRequest = {
  ...routineDraft,
  endDate: new Date('2026-01-24T00:00:00+03:00'),
  durationWorkingDays: 5,
  balanceBefore: 3,
  riskFlags: [lowBalanceRisk],
  policyResults: [lowBalancePolicy],
};

// Pending / Manager / Not started (acknowledged by the employee)
export const lowBalancePendingManager: LeaveRequest = {
  ...lowBalanceDraft,
  approvalStatus: ApprovalStatus.PENDING,
  approvalStage: ApprovalStage.MANAGER,
  approvalPath: [
    { order: 1, ownerRole: 'manager', ownerName: 'فاطمة علي', status: 'pending' },
    { order: 2, ownerRole: 'hr', status: 'pending' },
  ],
  lowBalanceAcknowledged: true,
  submittedAt: addHours(-4),
  slaDueAt: addDays(1),
  updatedAt: addHours(-4),
  auditHistory: [
    {
      eventType: AuditEventType.SUBMISSION,
      actor: 'EMP-1001',
      actorRole: Persona.EMPLOYEE,
      timestamp: addHours(-4),
      details: { action: 'submitted' },
      visibilityLevel: 'public',
    },
    {
      eventType: AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT,
      actor: 'EMP-1001',
      actorRole: Persona.EMPLOYEE,
      timestamp: addHours(-4),
      details: { acknowledged: true },
      visibilityLevel: 'public',
    },
  ],
};

// Pending / HR / Not started (Manager escalated; this is NOT final approval)
export const lowBalancePendingHR: LeaveRequest = {
  ...lowBalancePendingManager,
  approvalStage: ApprovalStage.HR,
  approvalPath: [
    { order: 1, ownerRole: 'manager', ownerName: 'فاطمة علي', status: 'approved', decidedAt: addHours(-3) },
    { order: 2, ownerRole: 'hr', status: 'pending' },
  ],
  slaDueAt: addDays(3),
  updatedAt: addHours(-3),
  auditHistory: [
    ...lowBalancePendingManager.auditHistory,
    {
      eventType: AuditEventType.ESCALATION,
      actor: 'MGR-2001',
      actorRole: Persona.MANAGER,
      timestamp: addHours(-3),
      details: { from: 'manager', to: 'hr', managerDecision: 'approved' },
      visibilityLevel: 'manager',
    },
  ],
};

// ============================================================================
// MANAGER INBOX (Gap 1): six state families, distinct fixed request IDs.
// Overdue / owner / next action / balance sufficiency are NOT stored: they are
// derived in selectors.ts. `slaDueAt` is explicit input; no due-soon rule exists.
// ============================================================================

/** Fixed "now" for inbox derivation (injected into selectors; never read from the system). */
export const INBOX_NOW = new Date('2026-01-18T10:00:00+03:00');

/**
 * Owner decision (R-2): the six inbox requests were submitted 17 January 2026, 09:00 (Riyadh).
 * The inherited SUBMISSION event (and the acknowledgement the employee gave in the same act)
 * is re-stamped to this instant so `submittedAt` and the audit trail agree. Event types,
 * counts, order, actors and details are unchanged.
 */
const INBOX_SUBMITTED_AT = new Date('2026-01-17T09:00:00+03:00');

const restampSubmission = (events: LeaveRequest['auditHistory']): LeaveRequest['auditHistory'] =>
  events.map((e) =>
    e.eventType === AuditEventType.SUBMISSION || e.eventType === AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT
      ? { ...e, timestamp: INBOX_SUBMITTED_AT }
      : e,
  );

const inboxBase: LeaveRequest = {
  ...routinePending,
  submittedAt: INBOX_SUBMITTED_AT,
  createdAt: new Date('2026-01-17T08:00:00+03:00'),
  updatedAt: new Date('2026-01-17T09:00:00+03:00'),
  auditHistory: restampSubmission(routinePending.auditHistory),
};

const missingInformationRisk: RiskFlag = {
  severity: RiskSeverity.REVIEW,
  code: 'LEAVE_MISSING_INFORMATION',
  explanationAr: 'معلومات ناقصة',
  explanationEn: 'Missing information',
  affectedFields: ['note'],
  routeConsequence: 'requires_requester_clarification',
};

export const managerInboxFixtures = {
  routine: {
    ...inboxBase,
    requestId: 'LV-2026-101',
    employeeId: 'EMP-1101',
    employeeName: 'أحمد محمد',
    slaDueAt: new Date('2026-01-21T17:00:00+03:00'),
  } satisfies LeaveRequest,

  lowBalance: {
    ...lowBalancePendingManager,
    requestId: 'LV-2026-102',
    employeeId: 'EMP-1102',
    employeeName: 'سارة خالد',
    submittedAt: inboxBase.submittedAt,
    updatedAt: inboxBase.updatedAt,
    auditHistory: restampSubmission(lowBalancePendingManager.auditHistory),
    slaDueAt: new Date('2026-01-21T17:00:00+03:00'),
  } satisfies LeaveRequest,

  // Not overdue at INBOX_NOW. Whether it is "due soon" is an unresolved rule.
  dueSoon: {
    ...inboxBase,
    requestId: 'LV-2026-103',
    employeeId: 'EMP-1103',
    employeeName: 'خالد العتيبي',
    leaveType: LeaveType.SICK,
    slaDueAt: new Date('2026-01-18T17:00:00+03:00'),
  } satisfies LeaveRequest,

  overdue: {
    ...inboxBase,
    requestId: 'LV-2026-104',
    employeeId: 'EMP-1104',
    employeeName: 'نورة السالم',
    slaDueAt: new Date('2026-01-17T17:00:00+03:00'),
  } satisfies LeaveRequest,

  waitingClarification: {
    ...inboxBase,
    requestId: 'LV-2026-105',
    employeeId: 'EMP-1105',
    employeeName: 'يوسف الحربي',
    approvalStage: ApprovalStage.REQUESTER_CLARIFICATION,
    riskFlags: [missingInformationRisk],
    slaDueAt: new Date('2026-01-21T17:00:00+03:00'),
  } satisfies LeaveRequest,

  escalatedHr: {
    ...inboxBase,
    requestId: 'LV-2026-106',
    employeeId: 'EMP-1106',
    employeeName: 'ليلى الزهراني',
    approvalStage: ApprovalStage.ESCALATED,
    // Same escalated path shape as `lowBalancePendingHR`: Manager completed, HR pending.
    approvalPath: [
      { order: 1, ownerRole: 'manager', ownerName: 'فاطمة علي', status: 'approved', decidedAt: new Date('2026-01-17T12:00:00+03:00') },
      { order: 2, ownerRole: 'hr', status: 'pending' },
    ],
    auditHistory: [
      ...inboxBase.auditHistory,
      {
        eventType: AuditEventType.ESCALATION,
        actor: 'MGR-2001',
        actorRole: Persona.MANAGER,
        timestamp: new Date('2026-01-17T12:00:00+03:00'),
        details: { from: 'manager', to: 'hr', managerDecision: 'approved' },
        visibilityLevel: 'manager',
      },
    ],
    slaDueAt: new Date('2026-01-22T17:00:00+03:00'),
  } satisfies LeaveRequest,
};

export const fixtures = {
  routineDraft,
  routinePending,
  routineApproved,
  routineRejected,
  lowBalanceDraft,
  lowBalancePendingManager,
  lowBalancePendingHR,
};
