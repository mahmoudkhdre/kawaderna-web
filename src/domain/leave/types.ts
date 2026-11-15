/**
 * Kawaderna Leave MVP - Domain Types
 * Locked status model: Approval Status, Approval Stage, Processing Status
 */

// ============================================================================
// ENUMS - Approval Status
// ============================================================================

export const ApprovalStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
} as const;

export type ApprovalStatus = typeof ApprovalStatus[keyof typeof ApprovalStatus];

// ============================================================================
// ENUMS - Approval Stage
// ============================================================================

export const ApprovalStage = {
  NONE: 'none',
  MANAGER: 'manager',
  HR: 'hr',
  REQUESTER_CLARIFICATION: 'requester_clarification',
  ESCALATED: 'escalated',
} as const;

export type ApprovalStage = typeof ApprovalStage[keyof typeof ApprovalStage];

// ============================================================================
// ENUMS - Processing Status
// ============================================================================

export const ProcessingStatus = {
  NOT_STARTED: 'not_started',
  NOT_REQUIRED: 'not_required',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  RETRYING: 'retrying',
  RECONCILED: 'reconciled',
} as const;

export type ProcessingStatus = typeof ProcessingStatus[keyof typeof ProcessingStatus];

// ============================================================================
// ENUMS - Terminal Reason
// ============================================================================

export const TerminalReason = {
  USER_WITHDREW: 'user_withdrew',
  REJECTED_BY_MANAGER: 'rejected_by_manager',
  REJECTED_BY_HR: 'rejected_by_hr',
  SLA_EXPIRED: 'sla_expired',
  POLICY_BLOCKED: 'policy_blocked',
} as const;

export type TerminalReason = typeof TerminalReason[keyof typeof TerminalReason];

// ============================================================================
// ENUMS - Leave Type
// ============================================================================

export const LeaveType = {
  ANNUAL: 'annual',
  SICK: 'sick',
  UNPAID: 'unpaid',
  EMERGENCY: 'emergency',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
} as const;

export type LeaveType = typeof LeaveType[keyof typeof LeaveType];

// ============================================================================
// ENUMS - Risk Severity
// ============================================================================

export const RiskSeverity = {
  BLOCKED: 'blocked',
  WARNING: 'warning',
  REVIEW: 'review',
  INFO: 'info',
} as const;

export type RiskSeverity = typeof RiskSeverity[keyof typeof RiskSeverity];

// ============================================================================
// ENUMS - Persona
// ============================================================================

export const Persona = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HR: 'hr',
} as const;

export type Persona = typeof Persona[keyof typeof Persona];

// ============================================================================
// ENUMS - Audit Event Type
// ============================================================================

export const AuditEventType = {
  SUBMISSION: 'submission',
  DECISION: 'decision',
  CLARIFICATION: 'clarification',
  WITHDRAWAL: 'withdrawal',
  ROUTE_CHANGE: 'route_change',
  PROCESSING: 'processing',
  REVALIDATION: 'revalidation',
  ESCALATION: 'escalation',
  LOW_BALANCE_ACKNOWLEDGEMENT: 'low_balance_acknowledgement',
} as const;

export type AuditEventType = typeof AuditEventType[keyof typeof AuditEventType];

// ============================================================================
// DOMAIN MODELS
// ============================================================================

export interface RiskFlag {
  severity: RiskSeverity;
  code: string;
  explanationAr: string;
  explanationEn: string;
  affectedFields: string[];
  routeConsequence: string;
}

export interface PolicyResult {
  ruleCode: string;
  passed: boolean;
  requiresAcknowledgement: boolean;
  requiresElevatedReview: boolean;
  explanationAr: string;
}

export interface ApprovalPathStep {
  order: number;
  ownerRole: 'manager' | 'hr';
  ownerName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decidedAt?: Date;
  reason?: string;
}

export interface AuditEvent {
  eventType: AuditEventType;
  actor: string;
  actorRole: Persona;
  timestamp: Date;
  details: Record<string, unknown>;
  visibilityLevel: 'public' | 'manager' | 'hr';
}

export interface PartialDayDetails {
  startTime?: string;
  endTime?: string;
  hours: number;
}

export interface AttachmentMetadata {
  id: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  visibilityLevel: 'public' | 'manager' | 'hr';
}

// ============================================================================
// CORE LEAVE REQUEST
// ============================================================================

export interface LeaveRequest {
  // Identity
  requestId: string;
  version: number;

  // Actors
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;

  // Leave Details
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  isPartialDay: boolean;
  partialDayDetails?: PartialDayDetails;
  durationWorkingDays: number;
  note?: string;
  attachmentMetadata?: AttachmentMetadata[];

  // Status Axes (CRITICAL: Keep independent)
  approvalStatus: ApprovalStatus;
  approvalStage: ApprovalStage;
  processingStatus: ProcessingStatus;
  terminalReason?: TerminalReason;

  // Routing (current owner, next action and route are DERIVED - see selectors.ts)
  approvalPath: ApprovalPathStep[];

  // Balance & Policy
  // balanceBefore = available balance; durationWorkingDays = requested.
  // Projected balance and "exceeds available balance" are DERIVED (selectors.ts).
  balanceBefore: number;
  lowBalanceAcknowledged: boolean;
  riskFlags: RiskFlag[];
  policyResults: PolicyResult[];

  // SLA & Timing
  // Overdue is DERIVED from slaDueAt + a supplied "now" (selectors.ts).
  // Due-soon is intentionally absent: its threshold is not defined.
  submittedAt?: Date;
  effectiveDate: Date;
  slaDueAt?: Date;

  // Audit & Tracking
  createdAt: Date;
  updatedAt: Date;
  auditHistory: AuditEvent[];

  // Version Control
  previousVersionId?: string;
  isStaleVersion: boolean;
}

// ============================================================================
// REJECTION REASON
// ============================================================================

export interface RejectionReason {
  category: 'insufficient_balance' | 'coverage_issue' | 'policy_violation' | 'timing_conflict' | 'other';
  customText?: string;
  isRequesterVisible: boolean;
}
