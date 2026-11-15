import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { INBOX_NOW, lowBalancePendingHR } from '../../domain/leave/fixtures';
import { decideAsHr, validateHrReason } from '../../domain/leave/hrFinalDecision';
import { selectHrReview } from '../../domain/leave/hrReview';
import { countReasonCodePoints } from '../../domain/leave/rejectionReason';
import { Persona } from '../../domain/leave/types';
import type { LeaveRequest } from '../../domain/leave/types';
import { formatDateRange, formatDateTime, formatDays, formatNumber } from '../../lib/format';
import { tokens } from '../../lib/tokens';
import type { HrDecisionBinding } from '../../demo/contracts';
import { DEMO_COPY } from '../../demo/copy';
import { selectHrSubject } from '../../demo/state';

const actor = { id: 'HR-1', role: Persona.HR };
// Gap 4-local button/error colours; values mirror the approved Gap 2/3 Figma variables (not shared tokens).
const C = { primary: '#1D4ED8', destructive: '#DC2626', foreground: '#09090B', border: '#D4D4D8', disabledBg: '#F4F4F5', disabledText: '#52525B' };
const btnBase: CSSProperties = { minHeight: 44, borderRadius: 8, border: '1px solid', padding: '8px 16px', fontWeight: 500, cursor: 'pointer' };
const btn = {
  primary: { ...btnBase, background: C.primary, borderColor: C.primary, color: '#FFFFFF' },
  destructiveOutline: { ...btnBase, background: '#FFFFFF', borderColor: C.destructive, color: C.destructive },
  destructive: { ...btnBase, background: C.destructive, borderColor: C.destructive, color: '#FFFFFF' },
  secondary: { ...btnBase, background: '#FFFFFF', borderColor: C.border, color: C.foreground },
  disabled: { ...btnBase, background: C.disabledBg, borderColor: C.border, color: C.disabledText, cursor: 'not-allowed' },
} satisfies Record<string, CSSProperties>;
const errors: Record<string, string> = {
  not_found: 'الطلب غير متاح.', unauthorized: 'ليست لديك صلاحية لاتخاذ هذا القرار.',
  stale_version: 'تغير الطلب. راجع النسخة الحالية قبل اتخاذ القرار.',
  invalid_state: 'لم يعد هذا الطلب متاحًا لقرار الموارد البشرية.',
  reason_required: 'اكتب سببًا واضحًا للرفض.', reason_too_long: 'السبب يتجاوز ٥٠٠ حرف Unicode.',
};

export interface HRFinalDecisionPageProps { binding?: HrDecisionBinding }

// Changing selection/actor/version discards an old confirmation and rejection draft before rendering.
export const HRFinalDecisionPage = ({ binding }: HRFinalDecisionPageProps = {}) =>
  <HRFinalDecisionContent key={binding ? `${binding.actor.role}:${binding.actor.id}:${binding.requestId}:${binding.requests.find(item => item.requestId === binding.requestId)?.version}` : 'standalone'} binding={binding} />;

const HRFinalDecisionContent = ({ binding }: HRFinalDecisionPageProps) => {
  const [localRequests, setRequests] = useState<LeaveRequest[]>(() => binding ? [] : [structuredClone(lowBalancePendingHR)]);
  const requests = binding?.requests ?? localRequests;
  const currentActor = binding?.actor ?? actor;
  const requestId = binding ? binding.requestId : lowBalancePendingHR.requestId;
  const latest = useRef(requests);
  useEffect(() => { latest.current = requests; }, [requests]);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const outcomeRef = useRef<HTMLHeadingElement>(null);
  const confirmRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const candidate = requests.find(item => item.requestId === requestId);
  const request = currentActor.role === Persona.HR && candidate
    ? binding ? selectHrSubject([candidate]) : candidate
    : null;
  const finalEvent = request?.auditHistory.findLast(event => event.eventType === 'decision' && event.actorRole === Persona.HR);
  const escalationEvent = request?.auditHistory.find(event => event.eventType === 'escalation');
  const review = request ? selectHrReview(requests, request.requestId, currentActor) : null;
  const count = countReasonCodePoints(reason);
  const reasonError = reason ? validateHrReason(reason) : null;

  useEffect(() => {
    if (!confirm) return;
    if (confirm === 'reject') reasonRef.current?.focus({ preventScroll: true });
    // Bring the whole confirmation (including the Confirm button) into view, not only the text box.
    confirmRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [confirm]);

  // The confirming button disappears with the decision; continue from the recorded outcome instead of losing focus.
  useEffect(() => { if (notice && !noticeIsError) outcomeRef.current?.focus(); }, [notice, noticeIsError]);

  const confirmDisabled = busy || (confirm === 'reject' && !!validateHrReason(reason));

  const decide = () => {
    if (!confirm || busy || !request || !review) return;
    setBusy(true);
    // The in-memory list is re-read at the service boundary before either transition.
    const result = binding ? binding.onDecide(request.requestId, request.version, confirm, reason)
      : decideAsHr(latest.current, request.requestId, currentActor, INBOX_NOW, request.version, confirm, reason);
    if (result.ok) {
      latest.current = result.requests;
      if (!binding) setRequests(result.requests);
      setNoticeIsError(false);
      setNotice(confirm === 'approve' ? 'تمت الموافقة النهائية وتسجيل القرار.' : 'تم الرفض النهائي وتسجيل السبب.');
      setConfirm(null);
      setReason('');
    } else {
      setNoticeIsError(true);
      setNotice(errors[result.error]);
      if (result.error === 'stale_version' || result.error === 'invalid_state') setConfirm(null);
    }
    setBusy(false);
  };

  return <main dir="rtl" className="mx-auto w-full px-4 py-6 md:px-6" style={{ maxWidth: 900, color: tokens.colors.text.primary }}>
    <h1 className="text-2xl font-bold">قرار الموارد البشرية النهائي</h1>
    <p className="mb-3" style={{ color: tokens.colors.text.secondary }}>مراجعة طلب إجازة واحد تم تحويله من المدير بسبب عدم كفاية الرصيد.</p>
    {binding?.selectableRequests && binding.selectableRequests.length > 0 && <div className="mb-4">
      <label htmlFor="hr-request-selection" className="mb-1 block font-bold">اختر طلبًا للمراجعة</label>
      <select id="hr-request-selection" value={binding.requestId ?? ''} onChange={event => binding.onSelectRequest?.(event.target.value)}
        className="min-h-11 w-full rounded-lg border bg-white p-2" style={{ borderColor: C.border, color: C.foreground }}>
        {binding.selectableRequests.map(option => <option key={option.requestId} value={option.requestId}>
          {option.requestId} — {option.employeeName}{option.decided ? ' — قرار مسجل' : ''}
        </option>)}
      </select>
    </div>}
    <p role="status" aria-live="polite" className={notice && noticeIsError ? 'mb-3' : 'sr-only'} style={noticeIsError ? { color: C.destructive } : undefined}>{notice}</p>
    {review ? <article className="rounded-xl border p-4 md:p-6" style={{ background: tokens.colors.background.primary }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="m-0 text-xl font-bold">طلب {review.employeeName}</h2>
        <span className="ltr-isolated" dir="ltr">{review.requestId}</span>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><dt className="font-bold">مدة الإجازة</dt><dd className="m-0">{formatDays(review.durationWorkingDays)}</dd></div>
        <div><dt className="font-bold">نوع الإجازة</dt><dd className="m-0">{review.leaveType === 'annual' ? 'سنوية' : review.leaveType === 'sick' ? 'مرضية' : 'إجازة'}</dd></div>
        <div><dt className="font-bold">الفترة</dt><dd className="m-0">{formatDateRange(review.startDate, review.endDate)}</dd></div>
        <div><dt className="font-bold">المالك الحالي</dt><dd className="m-0">الموارد البشرية</dd></div>
        <div><dt className="font-bold">حالة الطلب</dt><dd className="m-0">قيد الانتظار</dd></div>
      </dl>
      <h3 className="mt-5 font-bold">مسار الموافقة</h3>
      <ol className="list-inside list-decimal">
        {review.route.map(step => <li key={step.role}>{step.role === 'manager' ? 'المدير' : 'الموارد البشرية'} — {step.status === 'approved' ? 'تمت الموافقة' : 'بانتظار القرار'}</li>)}
      </ol>
      <h3 className="mt-5 font-bold">سجل التحويل</h3>
      {review.history.length ? <ol className="list-inside list-disc">{review.history.map((event, index) => <li key={index}>تحويل إلى الموارد البشرية بواسطة <bdi dir="ltr" className="whitespace-nowrap">{event.actor}</bdi> — <bdi>{formatDateTime(event.timestamp)}</bdi></li>)}</ol> : <p>سجل التحويل غير متاح.</p>}
      <div className="mt-6 flex flex-wrap gap-3 max-sm:flex-col">
        <button type="button" style={btn.primary} onClick={() => { setNotice(''); setConfirm('approve'); }}>موافقة نهائية</button>
        <button type="button" style={btn.destructiveOutline} onClick={() => { setNotice(''); setConfirm('reject'); }}>رفض الطلب</button>
      </div>
      {confirm && <section ref={confirmRef} aria-label="تأكيد القرار" className="mt-5 scroll-mb-4 rounded-lg border p-4">
        <h3 className="m-0 font-bold">{confirm === 'approve' ? 'تأكيد الموافقة النهائية' : 'تأكيد الرفض النهائي'}</h3>
        {confirm === 'reject' && <>
          <label htmlFor="hr-reason" className="mt-3 block">سبب الرفض للموظف</label>
          <textarea id="hr-reason" ref={reasonRef} value={reason} onChange={event => setReason(event.target.value)} aria-describedby="hr-reason-count hr-reason-error" aria-invalid={!!reasonError} className="mt-1 min-h-28 w-full rounded-lg border p-3" style={{ borderColor: reasonError ? C.destructive : C.border, color: C.foreground }} />
          <p id="hr-reason-count">{formatNumber(count)} / {formatNumber(500)}</p>
          <p id="hr-reason-error" role="alert" style={{ color: C.destructive }}>{reasonError ? errors[reasonError] : ''}</p>
        </>}
        <div className="mt-3 flex flex-wrap gap-3 max-sm:flex-col">
          <button type="button" disabled={confirmDisabled} onClick={decide} style={confirmDisabled ? btn.disabled : confirm === 'reject' ? btn.destructive : btn.primary}>{busy ? 'جارٍ حفظ القرار…' : 'تأكيد القرار'}</button>
          <button type="button" disabled={busy} onClick={() => setConfirm(null)} style={busy ? btn.disabled : btn.secondary}>إلغاء</button>
        </div>
      </section>}
    </article> : request ? <section className="rounded-xl border p-4 md:p-6"><h2 ref={outcomeRef} tabIndex={-1} className="font-bold">{request.approvalStatus === 'approved' ? 'تمت الموافقة النهائية' : request.approvalStatus === 'rejected' ? 'تم الرفض النهائي' : 'الطلب غير متاح'}</h2>
      <p>رقم الطلب: <span className="ltr-isolated" dir="ltr">{request.requestId}</span></p>
      {request.approvalStatus !== 'pending' && <p>تم تسجيل قرار الموارد البشرية في سجل الطلب.</p>}
      {escalationEvent && <p>تحويل من المدير إلى الموارد البشرية — <bdi>{formatDateTime(escalationEvent.timestamp)}</bdi></p>}
      {finalEvent && <p>قرار الموارد البشرية بواسطة <bdi dir="ltr" className="whitespace-nowrap">{finalEvent.actor}</bdi> — <bdi>{formatDateTime(finalEvent.timestamp)}</bdi></p>}
      {request.approvalStatus === 'rejected' && typeof finalEvent?.details.reason === 'string' && <p style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>سبب الرفض: {finalEvent.details.reason}</p>}
    </section> : <section className="rounded-lg border p-4 text-center md:p-6" style={{ background: tokens.colors.background.primary, borderColor: tokens.colors.border.base, color: tokens.colors.text.secondary }}>{DEMO_COPY.hrEmpty}</section>}
  </main>;
};
