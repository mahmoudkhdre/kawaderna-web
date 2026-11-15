import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert, X } from 'lucide-react';
import type { ManagerInboxRow } from '../../domain/leave/selectors';
import type { ManagerRejectionResult, RejectionFailure } from '../../domain/leave/managerRejection';
import { countReasonCodePoints, REJECTION_CATEGORIES, REJECTION_LABELS, validateRejectionReason } from '../../domain/leave/rejectionReason';
import type { RejectionCategory } from '../../domain/leave/rejectionReason';
import { formatDate, formatDays, formatNumber } from '../../lib/format';
import { tokens } from '../../lib/tokens';
import { leaveTypeLabel } from './labels';
import { REJECT_COLORS } from './rejectionColors';
import {
  REJECT_BUSY, REJECT_CANCEL, REJECT_CATEGORY_LABEL, REJECT_CLOSE, REJECT_CONFIRM, REJECT_DETAILS_HINT,
  REJECT_DETAILS_LABEL, REJECT_ERROR, REJECT_GENERIC_ERROR, REJECT_REFRESH, REJECT_SUMMARY_LABEL,
  REJECT_SUMMARY_TITLE, REJECT_TITLE, REJECT_WARNING,
} from './rejectionLabels';

const SummaryRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-wrap justify-between gap-x-3">
    <dt style={{ color: tokens.colors.text.secondary }}>{label}</dt>
    <dd className="m-0 min-w-0" style={{ fontWeight: tokens.fontWeights.medium }}>{children}</dd>
  </div>
);

interface Props {
  row: ManagerInboxRow;
  opener: HTMLElement | null;
  onClose: () => void;
  onConfirm: (category: RejectionCategory, details: string) => ManagerRejectionResult | Promise<ManagerRejectionResult>;
  onSuccess: () => void;
  onReconcile: () => boolean;
}

const fieldForError = (error: string): 'category' | 'details' | null =>
  error === 'category_required' || error === 'invalid_category' ? 'category'
    : error === 'details_required' || error === 'details_too_long' ? 'details' : null;

export const RejectReasonModal = ({ row, opener, onClose, onConfirm, onSuccess, onReconcile }: Props) => {
  const [category, setCategory] = useState<RejectionCategory | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<RejectionFailure | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const inFlight = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRadioRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fallbackRef = useRef<HTMLElement | null>(null);
  const detailsCount = countReasonCodePoints(details);
  const fieldError = error ? fieldForError(error) : null;
  const lengthError = detailsCount > 500;

  useEffect(() => {
    const main = document.querySelector('main');
    const bodyOverflow = document.body.style.overflow;
    fallbackRef.current = document.querySelector<HTMLElement>('h1');
    if (main) main.inert = true;
    document.body.style.overflow = 'hidden';
    firstRadioRef.current?.focus();
    return () => {
      if (main) main.inert = false;
      document.body.style.overflow = bodyOverflow;
      if (opener?.isConnected) opener.focus();
      else fallbackRef.current?.focus();
    };
  }, [opener]);

  useEffect(() => {
    if (!error) return;
    const id = fieldError === 'category' ? 'reject-category-error' : fieldError === 'details' ? 'reject-details-error' : 'reject-general-error';
    document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
  }, [error, fieldError]);

  useEffect(() => {
    const onDocumentKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!inFlight.current) onClose();
      } else if (event.key === 'Tab' && !dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstRadioRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onDocumentKey);
    return () => document.removeEventListener('keydown', onDocumentKey);
  }, [onClose]);

  const dismiss = () => { if (!inFlight.current) onClose(); };

  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') ?? []);
    if (focusables.length === 0) { event.preventDefault(); dialogRef.current?.focus(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || blocked) return;
    const valid = validateRejectionReason(category, details);
    if (!valid.ok) {
      setError(valid.error);
      queueMicrotask(() => (fieldForError(valid.error) === 'category' ? firstRadioRef.current : detailsRef.current)?.focus());
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await Promise.resolve();
      const result = await onConfirm(category as RejectionCategory, details);
      if (result.ok) { onSuccess(); return; }
      if (result.error === 'stale_version' || result.error === 'not_found' || result.error === 'invalid_state' || result.error === 'unauthorized') {
        setCategory(null);
        setDetails('');
        setBlocked(true);
      }
      setError(result.error);
      const target = fieldForError(result.error);
      if (target) queueMicrotask(() => (target === 'category' ? firstRadioRef.current : detailsRef.current)?.focus());
    } catch {
      const stillCurrent = onReconcile();
      if (!stillCurrent) { setCategory(null); setDetails(''); setBlocked(true); }
      setError('failed');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 max-sm:items-end max-sm:p-0 sm:p-4" data-reject-root="true" dir="rtl">
      <div className="absolute inset-0" style={{ background: REJECT_COLORS.foreground, opacity: 0.55 }} aria-hidden="true" />
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reject-title" aria-describedby="reject-description" dir="rtl"
        onKeyDown={handleKeys} tabIndex={-1} data-reject-modal="true"
        className="relative flex w-full min-w-0 flex-col scroll-pb-24 overflow-y-auto rounded-xl border p-4 pb-0 max-sm:scroll-pb-36 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:[@media(max-height:519px)]:scroll-pb-24 sm:p-6 sm:pb-0"
        style={{ maxWidth: 520, maxHeight: 'calc(100dvh - 24px)', borderColor: REJECT_COLORS.border, background: tokens.colors.background.primary, color: REJECT_COLORS.foreground, boxShadow: tokens.shadows.lg }}
      >
        <header className="flex items-start justify-between gap-3 max-sm:-mx-4 max-sm:mb-0 max-sm:items-center max-sm:border-b max-sm:px-4 max-sm:pb-2" style={{ borderColor: REJECT_COLORS.border }}>
          <h2 id="reject-title" className="m-0 min-w-0 text-lg font-bold sm:text-2xl">{REJECT_TITLE}</h2>
          <button ref={closeRef} type="button" aria-label={REJECT_CLOSE} onClick={dismiss} disabled={busy} className="inline-flex shrink-0 items-center justify-center" style={{ width: 44, height: 44, border: 'none', borderRadius: tokens.radius.lg, background: 'transparent', color: REJECT_COLORS.foreground, cursor: 'pointer' }}><X size={20} aria-hidden="true" /></button>
        </header>
        <section aria-labelledby="reject-summary-title" className="my-4 flex flex-col gap-3 rounded-lg border p-4 max-sm:p-3" style={{ background: REJECT_COLORS.card, borderColor: REJECT_COLORS.border }}>
          <h3 id="reject-summary-title" className="m-0 text-lg font-bold max-sm:sr-only">{REJECT_SUMMARY_TITLE}</h3>
          <dl id="reject-description" className="m-0 flex flex-col gap-2 text-sm max-sm:text-xs">
            <SummaryRow label={REJECT_SUMMARY_LABEL.employee}>{row.employeeName}</SummaryRow>
            <SummaryRow label={REJECT_SUMMARY_LABEL.requestId}><bdi dir="ltr" className="ltr-isolated">{row.requestId}</bdi></SummaryRow>
            <SummaryRow label={REJECT_SUMMARY_LABEL.version}>{formatNumber(row.version)}</SummaryRow>
            <SummaryRow label={REJECT_SUMMARY_LABEL.leaveType}>{leaveTypeLabel[row.leaveType]}</SummaryRow>
            <SummaryRow label={REJECT_SUMMARY_LABEL.startDate}>{formatDate(row.startDate)}</SummaryRow>
            <SummaryRow label={REJECT_SUMMARY_LABEL.endDate}>{formatDate(row.endDate)}</SummaryRow>
            <SummaryRow label={REJECT_SUMMARY_LABEL.duration}>{formatDays(row.durationWorkingDays)}{row.isPartialDay ? ' (جزء من يوم)' : ''}</SummaryRow>
          </dl>
        </section>
        <p className="mb-4 mt-0 flex items-center gap-3 rounded-lg border p-3 text-sm max-sm:gap-2 max-sm:p-2.5 max-sm:text-xs" style={{ background: REJECT_COLORS.card, borderColor: REJECT_COLORS.border }}>
          <TriangleAlert size={20} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0">{REJECT_WARNING}</span>
        </p>
        <form onSubmit={submit} noValidate>
          <fieldset aria-describedby={fieldError === 'category' ? 'reject-category-error' : undefined} aria-invalid={fieldError === 'category'} className="m-0 border-0 p-0">
            <legend className="mb-2 font-bold">{REJECT_CATEGORY_LABEL} <span aria-hidden="true">*</span></legend>
            <div className="flex flex-col gap-2 max-sm:gap-0">
              {REJECTION_CATEGORIES.map((value, index) => (
                <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border p-2 max-sm:gap-2 max-sm:border-0 max-sm:px-0 max-sm:py-3" style={{ borderColor: category === value ? REJECT_COLORS.primary : REJECT_COLORS.border, cursor: busy ? 'wait' : 'pointer' }}>
                  <input ref={index === 0 ? firstRadioRef : undefined} type="radio" name="rejection-category" value={value} checked={category === value} onChange={() => { setCategory(value); if (fieldError === 'category') setError(null); }} disabled={busy || blocked} aria-required="true" />
                  <span>{REJECTION_LABELS[value]}</span>
                </label>
              ))}
            </div>
            {fieldError === 'category' && <p id="reject-category-error" role="alert" className="mt-2 scroll-mb-24" style={{ color: REJECT_COLORS.destructive }}>{REJECT_ERROR[error!]}</p>}
          </fieldset>
          <div className="mt-4">
            <label htmlFor="reject-details" className="font-bold">{REJECT_DETAILS_LABEL}{category === 'other' && <span aria-hidden="true" style={{ color: REJECT_COLORS.destructive }}> *</span>}</label>
            <p id="reject-details-hint" className="m-0 mt-1 text-sm" style={{ color: tokens.colors.text.secondary }}>{REJECT_DETAILS_HINT}</p>
            <textarea ref={detailsRef} id="reject-details" value={details} onChange={(event) => { setDetails(event.target.value); if (fieldError === 'details') setError(null); }} disabled={busy || blocked} required={category === 'other'} aria-invalid={fieldError === 'details' || lengthError} aria-describedby={`reject-details-hint reject-details-count${fieldError === 'details' || lengthError ? ' reject-details-error' : ''}`} rows={3} className="mt-2 w-full rounded-lg border p-3" style={{ borderColor: fieldError === 'details' || lengthError ? REJECT_COLORS.destructive : REJECT_COLORS.border, background: tokens.colors.background.primary, color: REJECT_COLORS.foreground, resize: 'vertical' }} />
            <div id="reject-details-count" aria-live="polite" className="text-sm" style={{ color: lengthError ? REJECT_COLORS.destructive : tokens.colors.text.secondary }}>{formatNumber(detailsCount)} / {formatNumber(500)}</div>
            {(fieldError === 'details' || lengthError) && <p id="reject-details-error" role="alert" className="mt-1 scroll-mb-24" style={{ color: REJECT_COLORS.destructive }}>{lengthError ? REJECT_ERROR.details_too_long : REJECT_ERROR[error!]}</p>}
          </div>
          {error && !fieldError && <p id="reject-general-error" role="alert" className="mt-3 scroll-mb-24" style={{ color: REJECT_COLORS.destructive }}>{error === 'failed' ? REJECT_GENERIC_ERROR : REJECT_ERROR[error]}</p>}
          {busy && <p role="status" aria-live="polite" className="mt-3">{REJECT_BUSY}</p>}
          <div className="sticky bottom-0 mt-5 flex flex-wrap gap-3 border-t pb-4 pt-3 max-sm:-mx-4 max-sm:flex-col max-sm:flex-nowrap max-sm:gap-2.5 max-sm:px-4 max-sm:[@media(max-height:519px)]:flex-row max-sm:[@media(max-height:519px)]:gap-3 sm:pb-6" style={{ justifyContent: 'flex-start', background: tokens.colors.background.primary, borderColor: REJECT_COLORS.border }}>
            {!blocked && <button type="submit" data-action="confirm-reject" disabled={busy} className="min-h-11 rounded-md border px-4 py-2 font-medium max-sm:w-full max-sm:[@media(max-height:519px)]:w-auto max-sm:[@media(max-height:519px)]:flex-1" style={{ borderColor: REJECT_COLORS.destructive, background: tokens.colors.background.primary, color: REJECT_COLORS.destructive, cursor: busy ? 'progress' : 'pointer' }}>{busy ? REJECT_BUSY : REJECT_CONFIRM}</button>}
            <button type="button" onClick={dismiss} disabled={busy} className="min-h-11 rounded-md border px-4 py-2 font-medium max-sm:w-full max-sm:[@media(max-height:519px)]:w-auto max-sm:[@media(max-height:519px)]:flex-1" style={{ borderColor: REJECT_COLORS.border, background: tokens.colors.background.primary, color: REJECT_COLORS.primary, cursor: 'pointer' }}>{blocked ? REJECT_REFRESH : REJECT_CANCEL}</button>
          </div>
        </form>
      </div>
    </div>, document.body,
  );
};
