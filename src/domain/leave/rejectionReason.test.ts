import { describe, expect, it } from 'vitest';
import { countReasonCodePoints, formatRejectionReason, REJECTION_CATEGORIES, REJECTION_LABELS, validateRejectionReason } from './rejectionReason';

describe('rejection reason policy', () => {
  it('uses the five existing identifiers with exact approved Arabic labels', () => {
    expect(REJECTION_CATEGORIES).toEqual(['insufficient_balance', 'coverage_issue', 'policy_violation', 'timing_conflict', 'other']);
    expect(REJECTION_LABELS).toEqual({
      insufficient_balance: 'عدم كفاية رصيد الإجازات',
      coverage_issue: 'عدم توفر تغطية العمل',
      policy_violation: 'عدم استيفاء متطلبات سياسة الإجازات',
      timing_conflict: 'تعارض مع جدول العمل',
      other: 'أخرى',
    });
  });

  it.each([undefined, null, '', [], ['coverage_issue', 'other'], 'unknown'])('rejects missing, multiple or unknown selection: %j', (category) => {
    expect(validateRejectionReason(category, 'details').ok).toBe(false);
  });

  it.each(REJECTION_CATEGORIES.slice(0, 4))('%s accepts empty optional details', (category) => {
    expect(formatRejectionReason(category, '')).toEqual({ ok: true, reason: REJECTION_LABELS[category] });
    expect(formatRejectionReason(category, ' \n ')).toEqual({ ok: true, reason: REJECTION_LABELS[category] });
  });

  it('requires meaningful Other details', () => {
    expect(validateRejectionReason('other', '')).toEqual({ ok: false, error: 'details_required' });
    expect(validateRejectionReason('other', ' \n\t ')).toEqual({ ok: false, error: 'details_required' });
    expect(formatRejectionReason('other', ' سبب واضح ')).toEqual({ ok: true, reason: 'أخرى:  سبب واضح ' });
  });

  it('counts raw Unicode code points including whitespace and combining marks', () => {
    expect(countReasonCodePoints('')).toBe(0);
    expect(countReasonCodePoints('😀')).toBe(1);
    expect(countReasonCodePoints('a\u0301')).toBe(2);
    expect(countReasonCodePoints(' ')).toBe(1);
    expect(validateRejectionReason('other', '😀'.repeat(500))).toEqual({ ok: true });
    expect(validateRejectionReason('other', '😀'.repeat(501))).toEqual({ ok: false, error: 'details_too_long' });
    expect(validateRejectionReason('coverage_issue', ' '.repeat(500))).toEqual({ ok: true });
    expect(validateRejectionReason('coverage_issue', ' '.repeat(501))).toEqual({ ok: false, error: 'details_too_long' });
  });

  it('formats deterministically without normalizing or trimming meaningful raw details', () => {
    const details = '  سبب\nثانٍ  ';
    const expected = `تعارض مع جدول العمل: ${details}`;
    expect(formatRejectionReason('timing_conflict', details)).toEqual({ ok: true, reason: expected });
    expect(formatRejectionReason('timing_conflict', details)).toEqual({ ok: true, reason: expected });
  });
});
