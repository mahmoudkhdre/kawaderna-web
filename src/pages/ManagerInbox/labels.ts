/** Arabic display labels keyed by existing domain values. No business rules here. */

import { NextAction, RouteRole } from '../../domain/leave/selectors';
import type { RouteStageState } from '../../domain/leave/selectors';
import type { ManagerInboxRow } from '../../domain/leave/selectors';
import {
  ApprovalStage, ApprovalStatus, AuditEventType, LeaveType, Persona, ProcessingStatus,
} from '../../domain/leave/types';

export const PAGE_TITLE = 'طلبات الإجازات';
export const PAGE_SUBTITLE = 'طلبات تحتاج إلى مراجعتك';
export const EMPTY_TEXT = 'لا توجد طلبات تحتاج إلى مراجعتك';
export const OVERDUE_LABEL = 'متأخر';
export const ACTIONABLE_LABEL = 'بانتظار قرارك';
export const NO_VALUE = '—';

export const leaveTypeLabel: Record<LeaveType, string> = {
  [LeaveType.ANNUAL]: 'إجازة سنوية',
  [LeaveType.SICK]: 'إجازة مرضية',
  [LeaveType.UNPAID]: 'إجازة بدون راتب',
  [LeaveType.EMERGENCY]: 'إجازة اضطرارية',
  [LeaveType.MATERNITY]: 'إجازة وضع',
  [LeaveType.PATERNITY]: 'إجازة أبوة',
};

export const statusLabel: Record<ApprovalStatus, string> = {
  [ApprovalStatus.DRAFT]: 'مسودة',
  [ApprovalStatus.PENDING]: 'قيد المراجعة',
  [ApprovalStatus.APPROVED]: 'تمت الموافقة',
  [ApprovalStatus.REJECTED]: 'مرفوض',
  [ApprovalStatus.WITHDRAWN]: 'مسحوب',
  [ApprovalStatus.EXPIRED]: 'منتهي',
};

export const stageLabel: Record<ApprovalStage, string> = {
  [ApprovalStage.NONE]: NO_VALUE,
  [ApprovalStage.MANAGER]: 'المدير',
  [ApprovalStage.HR]: 'الموارد البشرية',
  [ApprovalStage.REQUESTER_CLARIFICATION]: 'بانتظار توضيح الموظف',
  [ApprovalStage.ESCALATED]: 'مُصعَّد إلى الموارد البشرية',
};

export const ownerLabel: Record<Persona, string> = {
  [Persona.MANAGER]: 'المدير',
  [Persona.HR]: 'الموارد البشرية',
  [Persona.EMPLOYEE]: 'الموظف',
};

export const nextActionLabel: Record<NextAction, string> = {
  [NextAction.REVIEW_REQUEST]: 'مراجعة الطلب',
  [NextAction.REVIEW_BALANCE_EXCEPTION]: 'مراجعة استثناء الرصيد',
};

export const balanceLabel = {
  sufficient: 'الرصيد كافٍ',
  insufficient: 'يتجاوز الرصيد المتاح',
} as const;

export const NO_ISSUE_LABEL = 'لا توجد مشكلة';
const NEEDS_REVIEW = 'يحتاج مراجعة';

const riskDetail: Record<string, string> = {
  LEAVE_LOW_BALANCE: 'يتجاوز الرصيد المتاح',
  LEAVE_MISSING_INFORMATION: 'معلومات ناقصة',
};

export const riskText = (risk: ManagerInboxRow['risk']): string => {
  if (!risk) return NO_ISSUE_LABEL;
  const detail = riskDetail[risk.code];
  return detail ? `${NEEDS_REVIEW} • ${detail}` : NEEDS_REVIEW;
};

export const statusStageText = (row: ManagerInboxRow): string =>
  row.approvalStage === ApprovalStage.NONE
    ? statusLabel[row.approvalStatus]
    : `${statusLabel[row.approvalStatus]} • ${stageLabel[row.approvalStage]}`;

// ============================================================================
// Request detail (Gap 2, read-only). Copy is provisional until approved.
// ============================================================================

export const DETAIL_CLOSE_LABEL = 'إغلاق التفاصيل';
export const DETAIL_TITLE = 'تفاصيل الطلب';
export const OPEN_DETAIL_LABEL = 'عرض تفاصيل الطلب';
export const STALE_LABEL = 'نسخة قديمة';
export const READ_ONLY_VERSION_LABEL = 'للقراءة فقط';
export const NO_RISK_DETAIL = 'لا توجد مخاطر على هذا الطلب';
export const LOW_BALANCE_HR_PATH =
  'استثناء الرصيد: يتجاوز الطلب الرصيد المتاح، وتتطلب الموافقة مراجعة الموارد البشرية بعد مراجعة المدير.';
export const NO_AUDIT_LABEL = 'لا توجد أحداث';

export const sectionTitle = {
  context: 'بيانات الطلب',
  summary: 'ملخص القرار',
  risk: 'المخاطر والسياسة',
  balance: 'رصيد الإجازة',
  path: 'مسار الموافقة',
  audit: 'سجل الأحداث',
} as const;

export const versionLabel = (version: number): string => `الإصدار ${version}`;

export const summaryFieldLabel = {
  status: 'حالة الموافقة',
  stage: 'مرحلة الموافقة',
  processing: 'حالة المعالجة',
  owner: 'المسؤول الحالي',
  nextAction: 'الإجراء التالي',
} as const;

export const processingLabel: Record<ProcessingStatus, string> = {
  [ProcessingStatus.NOT_STARTED]: 'لم تبدأ',
  [ProcessingStatus.NOT_REQUIRED]: 'غير مطلوبة',
  [ProcessingStatus.QUEUED]: 'في الانتظار',
  [ProcessingStatus.PROCESSING]: 'جارية',
  [ProcessingStatus.SUCCEEDED]: 'تمت',
  [ProcessingStatus.FAILED]: 'فشلت',
  [ProcessingStatus.RETRYING]: 'إعادة المحاولة',
  [ProcessingStatus.RECONCILED]: 'تمت التسوية',
};

export const routeRoleLabel: Record<RouteRole, string> = {
  [RouteRole.EMPLOYEE]: 'الموظف',
  [RouteRole.MANAGER]: 'المدير',
  [RouteRole.HR]: 'الموارد البشرية',
  [RouteRole.FINAL_DECISION]: 'القرار النهائي',
};

export const routeStateLabel: Record<RouteStageState, string> = {
  completed: 'مكتمل',
  current: 'الحالي',
  upcoming: 'التالي',
};

export const routeConsequenceLabel: Record<string, string> = {
  requires_hr_review: 'يتطلب مراجعة الموارد البشرية',
  requires_requester_clarification: 'يتطلب توضيحًا من الموظف',
};

export const auditEventLabel: Record<string, string> = {
  [AuditEventType.SUBMISSION]: 'تم تقديم الطلب',
  [AuditEventType.LOW_BALANCE_ACKNOWLEDGEMENT]: 'تم الإقرار بتنبيه الرصيد',
  [AuditEventType.ESCALATION]: 'تم التحويل إلى الموارد البشرية',
  [AuditEventType.DECISION]: 'قرار',
};

export const decisionLabel = { approved: 'تمت الموافقة', rejected: 'تم الرفض' } as const;

export const severityLabel: Record<string, string> = {
  blocked: 'مانع',
  warning: 'تحذير',
  review: 'يحتاج مراجعة',
  info: 'معلومة',
};

// ============================================================================
// Manager approval (Gap 2, Approve only). Copy is provisional until approved.
// ============================================================================

export const APPROVE_LABEL = 'موافقة';
export const APPROVING_LABEL = 'جارٍ تنفيذ الموافقة…';
export const APPROVED_FINAL_MESSAGE = 'تمت الموافقة على الطلب.';
export const APPROVED_ESCALATED_MESSAGE =
  'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية. القرار النهائي لدى الموارد البشرية.';
export const APPROVAL_STALE_MESSAGE = 'نسخة الطلب قديمة. حدّث الطلب ثم أعد المحاولة.';
export const APPROVAL_INVALID_MESSAGE = 'لم يعد الطلب قابلًا لاتخاذ قرار من المدير.';
export const APPROVAL_UNAUTHORIZED_MESSAGE = 'ليست لديك صلاحية اتخاذ قرار على هذا الطلب.';
export const APPROVAL_FAILED_MESSAGE = 'تعذر تنفيذ الموافقة. لم يتغير الطلب.';
