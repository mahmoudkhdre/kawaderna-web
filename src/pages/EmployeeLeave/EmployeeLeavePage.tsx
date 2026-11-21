import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { AlertCircle, CheckCircle2, FilePlus2 } from 'lucide-react';
import type { EmployeeBinding } from '../../demo/contracts';
import { DEMO_COPY } from '../../demo/copy';
import { employeeDurationLimit } from '../../demo/employee';
import { EmptyState } from '../../demo/ui/EmptyState';
import { countRequests } from '../../lib/arabicPlural';
import { formatDateRange, formatDateTime, formatDays, formatNumber } from '../../lib/format';
import './employee.css';

const errors = {
  unauthorized: 'انتهت جلسة الموظف. سجّل الدخول مجددًا.',
  invalid_dates: 'أدخل تاريخ بداية ونهاية صحيحين، ولا تجعل النهاية قبل البداية.',
  invalid_duration: 'أدخل عدد أيام صحيحًا لا يتجاوز الفترة المحددة.',
  acknowledgement_required: 'أكّد اطلاعك على تنبيه الرصيد قبل إرسال الطلب.',
};
type Field = 'start' | 'end' | 'duration' | 'ack';
type FieldErrors = Partial<Record<Field, string>>;
const ERROR_ID = 'employee-error';
const HINT_ID = 'employee-duration-hint';
const FIELD_ORDER: Field[] = ['start', 'end', 'duration', 'ack'];
const errorId = (field: Field) => `employee-${field}-error`;
/** Form-level summary (O-3): it names no field and repeats no field message, so it can never contradict one. */
const SUMMARY = 'لم يُرسل الطلب. راجع رسالة الخطأ تحت الحقل المعني.';

/** O-3: each message belongs to the field it is about. The refusal code is the domain's; only the wording is chosen here. */
const messagesFor = (code: keyof typeof errors, values: { startDate: string; endDate: string; duration: string }): FieldErrors => {
  if (code === 'invalid_duration') return { duration: durationMessage(values) };
  if (code === 'acknowledgement_required') return { ack: errors.acknowledgement_required };
  if (code === 'invalid_dates') {
    const found: FieldErrors = {};
    if (!values.startDate) found.start = 'أدخل تاريخ البداية.';
    if (!values.endDate) found.end = 'أدخل تاريخ النهاية.';
    else if (values.startDate && values.endDate < values.startDate) found.end = 'تاريخ النهاية يسبق تاريخ البداية. اختر تاريخًا في يوم البداية أو بعده.';
    return Object.keys(found).length ? found : { start: 'أدخل تاريخ بداية صحيحًا.', end: 'أدخل تاريخ نهاية صحيحًا.' };
  }
  return {};
};

/** Names the real limit (the period's length, from the same rule the submit uses) and why the entry was refused. */
const durationMessage = (values: { startDate: string; endDate: string; duration: string }): string => {
  const limit = employeeDurationLimit(values.startDate, values.endDate);
  if (limit === null) return errors.invalid_duration;
  const entered = Number(values.duration);
  return Number.isInteger(entered) && entered > limit
    ? `عدد الأيام يتجاوز الفترة المحددة. الحد الأقصى لهذه الفترة هو ${formatDays(limit)}.`
    : `أدخل عدد أيام صحيحًا من يوم واحد إلى ${formatDays(limit)}، وهو الحد الأقصى للفترة المحددة.`;
};

const statusText = { draft: 'مسودة', pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض', withdrawn: 'مسحوب', expired: 'منتهي' };
const stageText = { none: '', manager: 'بانتظار المدير', hr: 'بانتظار الموارد البشرية', requester_clarification: 'بانتظار إيضاح', escalated: 'تم التصعيد' };
const eventText = { submission: 'أُرسل الطلب', low_balance_acknowledgement: 'أُقرّ تنبيه الرصيد', decision: 'سُجّل القرار', escalation: 'حُوّل إلى الموارد البشرية', clarification: 'طُلب إيضاح', withdrawal: 'سُحب الطلب', route_change: 'تغير المسار', processing: 'تحديث المعالجة', revalidation: 'أُعيد التحقق' };

/** The message sits directly under its field. Not a live region: focus moves to the field, whose description is this message. */
const FieldError = ({ id, text }: { id: string; text?: string }) => text
  ? <p id={id} className="employee-field__error" data-field-error={id}><AlertCircle size={16} aria-hidden="true" /><span>{text}</span></p>
  : null;

export interface EmployeeLeavePageProps {
  binding: EmployeeBinding;
  /** Optional next-step action shown right under the success message (the guide's role switch). */
  nextStep?: ReactNode;
}

export const EmployeeLeavePage = ({ binding, nextStep }: EmployeeLeavePageProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [formError, setFormError] = useState<{ text: string; ofFields: boolean } | null>(null);
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [focusRequest, setFocusRequest] = useState<{ field: Field; n: number } | null>(null);
  // Each refused submit re-inserts the summary once, so a second refusal is announced again (a screen reader ignores unchanged text).
  const [attempt, setAttempt] = useState(0);
  const submitRef = useRef<HTMLButtonElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const ackRef = useRef<HTMLInputElement>(null);
  // Fixing a field removes its own message; the date fields also drop the messages that depended on them
  // (the end date's order check and the duration limit are computed from the dates).
  const DEPENDENTS: Record<Field, Field[]> = { start: ['start', 'end', 'duration'], end: ['end', 'duration'], duration: ['duration'], ack: ['ack'] };
  const clear = (field: Field) => setFieldErrors(current => {
    const next = { ...current };
    for (const dependent of DEPENDENTS[field]) delete next[dependent];
    return Object.keys(next).length === Object.keys(current).length ? current : next;
  });
  // The field's own message comes first, then the existing hint/warning it was already described by.
  const aria = (field: Field, extra?: string) => ({
    'aria-invalid': shown[field] ? true : undefined,
    'aria-describedby': [shown[field] ? errorId(field) : undefined, extra].filter(Boolean).join(' ') || undefined,
  });
  // After a refused submit, focus the first field the message is about and keep its message in view (instant, no animation).
  useEffect(() => {
    if (!focusRequest) return;
    const refs: Record<Field, RefObject<HTMLInputElement | null>> = { start: startRef, end: endRef, duration: durationRef, ack: ackRef };
    const field = refs[focusRequest.field].current;
    field?.focus({ preventScroll: true });
    field?.scrollIntoView?.({ block: 'nearest' }); // honours scroll-margin-top (the sticky mobile header)
    document.getElementById(errorId(focusRequest.field))?.scrollIntoView?.({ block: 'nearest' });
  }, [focusRequest]);
  // A form-level message (expired session) grows the form; keep the submit action visible inside the mobile scroll area.
  useEffect(() => { if (formError && !formError.ofFields) submitRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [formError]);
  // After a successful submit the form shrinks; keep the confirmation and its next step in view (nearest: no jump if already visible).
  useEffect(() => { if (success) outcomeRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [success]);
  const lowBalance = Number(duration) > binding.balance;
  // The acknowledgement box only exists while the balance is exceeded; a message about it must not outlive it.
  if (!lowBalance && fieldErrors.ack) setFieldErrors(current => { const { ack: _gone, ...rest } = current; return rest; }); // adjusted during render, no effect
  const shown: FieldErrors = lowBalance ? fieldErrors : { ...fieldErrors, ack: undefined };
  const hasShownErrors = FIELD_ORDER.some(field => shown[field]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = binding.onSubmit({ startDate, endDate, durationWorkingDays: Number(duration), acknowledgeLowBalance: acknowledged });
    if (!result.ok) {
      const found = messagesFor(result.error, { startDate, endDate, duration });
      const first = FIELD_ORDER.find(field => found[field]);
      setFieldErrors(found);
      setFormError({ text: first ? SUMMARY : errors[result.error], ofFields: !!first });
      setAttempt(count => count + 1);
      setSuccess('');
      if (first) setFocusRequest(previous => ({ field: first, n: (previous?.n ?? 0) + 1 }));
      return;
    }
    setFormError(null);
    setFieldErrors({});
    setSuccess(result.request.requestId);
    setStartDate(''); setEndDate(''); setDuration(''); setAcknowledged(false);
  };
  return <main className="employee-page" dir="rtl" data-employee-page="true">
    <header className="employee-page__intro">
      <h1>طلبات إجازتي</h1>
      <p>قدّم طلب إجازة سنوية وتابع قرار المدير والموارد البشرية عند الحاجة.</p>
    </header>
    <div className="employee-page__grid">
      <section className="employee-card" aria-labelledby="employee-form-title">
        <h2 id="employee-form-title">طلب إجازة جديد</h2>
        <p className="employee-balance">الرصيد التجريبي المتاح: <strong>{formatDays(binding.balance)}</strong></p>
        <form onSubmit={submit} noValidate>
          <div className="employee-field"><label htmlFor="employee-start">تاريخ البداية</label><input id="employee-start" ref={startRef} type="date" value={startDate} onChange={event => { setStartDate(event.target.value); clear('start'); }} required {...aria('start')} /><FieldError id={errorId('start')} text={shown.start} /></div>
          <div className="employee-field"><label htmlFor="employee-end">تاريخ النهاية</label><input id="employee-end" ref={endRef} type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); clear('end'); }} required {...aria('end')} /><FieldError id={errorId('end')} text={shown.end} /></div>
          <div className="employee-field"><label htmlFor="employee-duration">عدد أيام الإجازة المطلوبة</label><input id="employee-duration" ref={durationRef} type="number" inputMode="numeric" min="1" step="1" value={duration} onChange={event => { setDuration(event.target.value); clear('duration'); }} required {...aria('duration', HINT_ID)} /><FieldError id={errorId('duration')} text={shown.duration} /><p id={HINT_ID}>أدخل عدد أيام العمل ضمن الفترة المحددة.</p></div>
          {lowBalance && <div className={`employee-warning${shown.ack ? ' employee-warning--invalid' : ''}`} id="employee-balance-warning">
            <p id="employee-balance-warning-text">المدة المطلوبة تتجاوز الرصيد التجريبي. بعد موافقة المدير، يُحال الطلب إلى الموارد البشرية.</p>
            <label><input type="checkbox" ref={ackRef} checked={acknowledged} onChange={event => { setAcknowledged(event.target.checked); clear('ack'); }} {...aria('ack', 'employee-balance-warning-text')} /> أقرّ باطلاعي على تنبيه الرصيد</label>
            <FieldError id={errorId('ack')} text={shown.ack} />
          </div>}
          {formError && (!formError.ofFields || hasShownErrors) && <p key={attempt} role="alert" id={ERROR_ID} className="employee-error" data-employee-summary="true"><AlertCircle size={18} aria-hidden="true" /><span>{formError.text}</span></p>}
          {success && <div ref={outcomeRef} className="employee-outcome">
            <p role="status" className="employee-success"><CheckCircle2 size={18} aria-hidden="true" /><span>أُرسل الطلب <bdi dir="ltr">{success}</bdi> إلى المدير.</span></p>
            {nextStep && <div className="employee-next" data-employee-next="true">{nextStep}</div>}
          </div>}
          <button ref={submitRef} type="submit" className="employee-submit">إرسال الطلب</button>
        </form>
      </section>
      <section className="employee-card" aria-labelledby="employee-history-title">
        <h2 id="employee-history-title">طلباتي</h2>
        {binding.requests.length === 0
          ? <EmptyState icon={FilePlus2} title={DEMO_COPY.employeeEmptyTitle} body={DEMO_COPY.employeeEmptyBody} testId="employee" level={3}
              action={{ label: DEMO_COPY.employeeEmptyAction, onClick: () => document.getElementById('employee-start')?.focus() }} />
          : <>
          <p className="employee-count" data-request-count="true">لديك {countRequests(binding.requests.length)}</p>
          <ol className="employee-requests">{[...binding.requests].reverse().map(request => <li key={request.requestId} className="employee-request" data-request-id={request.requestId}>
            <div className="employee-request__head"><strong dir="ltr">{request.requestId}</strong><span className="kd-pill" data-status={request.approvalStatus}>{statusText[request.approvalStatus]}</span></div>
            <p>{formatDateRange(request.startDate, request.endDate)} · {formatDays(request.durationWorkingDays)}</p>
            {stageText[request.approvalStage] && <p>{stageText[request.approvalStage]}</p>}
            <h3>مسار الموافقة</h3>
            <ol className="employee-path">{request.approvalPath.map(step => <li key={step.order} data-step-status={step.status}>{step.ownerRole === 'manager' ? 'المدير' : 'الموارد البشرية'}: {step.status === 'pending' ? 'بانتظار القرار' : step.status === 'approved' ? 'وافق' : step.status === 'rejected' ? 'رفض' : 'تجاوز'}</li>)}</ol>
            <h3>السجل</h3>
            <ol className="employee-audit">{request.auditHistory.map((event, index) => <li key={`${event.eventType}-${index}`}>{eventText[event.eventType]} · <bdi>{formatDateTime(event.timestamp)}</bdi></li>)}</ol>
            {request.rejectionReason && <p className="employee-reason">سبب الرفض: {request.rejectionReason}</p>}
            <span className="employee-sr">الإصدار {formatNumber(request.version)}</span>
          </li>)}</ol></>}
      </section>
    </div>
  </main>;
};
