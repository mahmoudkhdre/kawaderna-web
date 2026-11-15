import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { EmployeeBinding } from '../../demo/contracts';
import { formatDateRange, formatDateTime, formatDays, formatNumber } from '../../lib/format';
import './employee.css';

const errors = {
  unauthorized: 'انتهت جلسة الموظف. سجّل الدخول مجددًا.',
  invalid_dates: 'أدخل تاريخ بداية ونهاية صحيحين، ولا تجعل النهاية قبل البداية.',
  invalid_duration: 'أدخل عدد أيام صحيحًا لا يتجاوز الفترة المحددة.',
  acknowledgement_required: 'أكّد اطلاعك على تنبيه الرصيد قبل إرسال الطلب.',
};
const statusText = { draft: 'مسودة', pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض', withdrawn: 'مسحوب', expired: 'منتهي' };
const stageText = { none: '', manager: 'بانتظار المدير', hr: 'بانتظار الموارد البشرية', requester_clarification: 'بانتظار إيضاح', escalated: 'تم التصعيد' };
const eventText = { submission: 'أُرسل الطلب', low_balance_acknowledgement: 'أُقرّ تنبيه الرصيد', decision: 'سُجّل القرار', escalation: 'حُوّل إلى الموارد البشرية', clarification: 'طُلب إيضاح', withdrawal: 'سُحب الطلب', route_change: 'تغير المسار', processing: 'تحديث المعالجة', revalidation: 'أُعيد التحقق' };

export const EmployeeLeavePage = ({ binding }: { binding: EmployeeBinding }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submitRef = useRef<HTMLButtonElement>(null);
  // A new validation message grows the form; keep the submit action visible inside the mobile scroll area.
  useEffect(() => { if (error) submitRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [error]);
  const lowBalance = Number(duration) > binding.balance;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = binding.onSubmit({ startDate, endDate, durationWorkingDays: Number(duration), acknowledgeLowBalance: acknowledged });
    if (!result.ok) { setError(errors[result.error]); setSuccess(''); return; }
    setError('');
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
          <div className="employee-field"><label htmlFor="employee-start">تاريخ البداية</label><input id="employee-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required /></div>
          <div className="employee-field"><label htmlFor="employee-end">تاريخ النهاية</label><input id="employee-end" type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} required /></div>
          <div className="employee-field"><label htmlFor="employee-duration">عدد أيام الإجازة المطلوبة</label><input id="employee-duration" type="number" inputMode="numeric" min="1" step="1" value={duration} onChange={event => setDuration(event.target.value)} required /><p>أدخل عدد أيام العمل ضمن الفترة المحددة.</p></div>
          {lowBalance && <div className="employee-warning" id="employee-balance-warning">
            <p>المدة المطلوبة تتجاوز الرصيد التجريبي. بعد موافقة المدير، يُحال الطلب إلى الموارد البشرية.</p>
            <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> أقرّ باطلاعي على تنبيه الرصيد</label>
          </div>}
          {error && <p role="alert" className="employee-error">{error}</p>}
          {success && <p role="status" className="employee-success">أُرسل الطلب <bdi dir="ltr">{success}</bdi> إلى المدير.</p>}
          <button ref={submitRef} type="submit" className="employee-submit">إرسال الطلب</button>
        </form>
      </section>
      <section className="employee-card" aria-labelledby="employee-history-title">
        <h2 id="employee-history-title">طلباتي</h2>
        {binding.requests.length === 0 ? <p className="employee-empty">لا توجد طلبات مقدّمة بعد.</p> :
          <ol className="employee-requests">{[...binding.requests].reverse().map(request => <li key={request.requestId} className="employee-request">
            <div className="employee-request__head"><strong dir="ltr">{request.requestId}</strong><span>{statusText[request.approvalStatus]}</span></div>
            <p>{formatDateRange(request.startDate, request.endDate)} · {formatDays(request.durationWorkingDays)}</p>
            {stageText[request.approvalStage] && <p>{stageText[request.approvalStage]}</p>}
            <h3>مسار الموافقة</h3>
            <ol>{request.approvalPath.map(step => <li key={step.order}>{step.ownerRole === 'manager' ? 'المدير' : 'الموارد البشرية'}: {step.status === 'pending' ? 'بانتظار القرار' : step.status === 'approved' ? 'وافق' : step.status === 'rejected' ? 'رفض' : 'تجاوز'}</li>)}</ol>
            <h3>السجل</h3>
            <ol>{request.auditHistory.map((event, index) => <li key={`${event.eventType}-${index}`}>{eventText[event.eventType]} · <bdi>{formatDateTime(event.timestamp)}</bdi></li>)}</ol>
            {request.rejectionReason && <p className="employee-reason">سبب الرفض: {request.rejectionReason}</p>}
            <span className="employee-sr">الإصدار {formatNumber(request.version)}</span>
          </li>)}</ol>}
      </section>
    </div>
  </main>;
};
