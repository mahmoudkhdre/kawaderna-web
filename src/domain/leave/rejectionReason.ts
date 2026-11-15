import type { RejectionReason } from './types';

export type RejectionCategory = RejectionReason['category'];

export const REJECTION_CATEGORIES = [
  'insufficient_balance', 'coverage_issue', 'policy_violation', 'timing_conflict', 'other',
] as const satisfies readonly RejectionCategory[];

export const REJECTION_LABELS: Record<RejectionCategory, string> = {
  insufficient_balance: 'عدم كفاية رصيد الإجازات',
  coverage_issue: 'عدم توفر تغطية العمل',
  policy_violation: 'عدم استيفاء متطلبات سياسة الإجازات',
  timing_conflict: 'تعارض مع جدول العمل',
  other: 'أخرى',
};

export const ReasonFailure = {
  CATEGORY_REQUIRED: 'category_required',
  INVALID_CATEGORY: 'invalid_category',
  DETAILS_REQUIRED: 'details_required',
  DETAILS_TOO_LONG: 'details_too_long',
} as const;
export type ReasonFailure = typeof ReasonFailure[keyof typeof ReasonFailure];
export type ReasonValidation = { ok: true } | { ok: false; error: ReasonFailure };
export type ReasonFormat = { ok: true; reason: string } | { ok: false; error: ReasonFailure };

export const countReasonCodePoints = (value: string): number => Array.from(value).length;

const isCategory = (value: unknown): value is RejectionCategory =>
  typeof value === 'string' && (REJECTION_CATEGORIES as readonly string[]).includes(value);

export const validateRejectionReason = (category: unknown, details: unknown): ReasonValidation => {
  if (category === undefined || category === null || category === '' || (Array.isArray(category) && category.length === 0)) {
    return { ok: false, error: ReasonFailure.CATEGORY_REQUIRED };
  }
  if (!isCategory(category)) return { ok: false, error: ReasonFailure.INVALID_CATEGORY };
  if (typeof details !== 'string') return { ok: false, error: ReasonFailure.DETAILS_REQUIRED };
  if (countReasonCodePoints(details) > 500) return { ok: false, error: ReasonFailure.DETAILS_TOO_LONG };
  if (category === 'other' && details.trim() === '') return { ok: false, error: ReasonFailure.DETAILS_REQUIRED };
  return { ok: true };
};

export const formatRejectionReason = (category: unknown, details: unknown): ReasonFormat => {
  const valid = validateRejectionReason(category, details);
  if (!valid.ok) return valid;
  const selected = category as RejectionCategory;
  const text = details as string;
  return { ok: true, reason: text.trim() === '' ? REJECTION_LABELS[selected] : `${REJECTION_LABELS[selected]}: ${text}` };
};
