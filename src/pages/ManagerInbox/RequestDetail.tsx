import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ApprovalFailure } from '../../domain/leave/managerApproval';
import type { ManagerApprovalResult } from '../../domain/leave/managerApproval';
import type { ManagerRequestDetail } from '../../domain/leave/selectors';
import { ApprovalStage, ApprovalStatus } from '../../domain/leave/types';
import { tokens } from '../../lib/tokens';
import {
  APPROVAL_FAILED_MESSAGE, APPROVAL_INVALID_MESSAGE, APPROVAL_STALE_MESSAGE, APPROVAL_UNAUTHORIZED_MESSAGE,
  APPROVE_LABEL, APPROVED_ESCALATED_MESSAGE, APPROVED_FINAL_MESSAGE, APPROVING_LABEL,
  DETAIL_CLOSE_LABEL, DETAIL_TITLE, READ_ONLY_VERSION_LABEL, versionLabel,
} from './labels';
import {
  AuditSection, BalanceSection, ContextSection, PathSection, RiskSection, SummarySection,
} from './RequestDetailSections';

interface Props {
  detail: ManagerRequestDetail;
  onClose: () => void;
  /** Runs the domain approval for the version this detail was rendered from. Absent = read-only. */
  onApprove?: (expectedVersion: number) => ManagerApprovalResult;
}

const failureMessage = (error: ApprovalFailure | 'failed' | null): string | null => {
  switch (error) {
    case null: return null;
    case ApprovalFailure.STALE_VERSION: return APPROVAL_STALE_MESSAGE;
    case ApprovalFailure.UNAUTHORIZED: return APPROVAL_UNAUTHORIZED_MESSAGE;
    case ApprovalFailure.INVALID_STATE:
    case ApprovalFailure.NOT_FOUND: return APPROVAL_INVALID_MESSAGE;
    default: return APPROVAL_FAILED_MESSAGE;
  }
};

/** Right-side drawer on desktop, full-screen sheet on mobile. Only action: Manager Approve (Gap 2). */
export const RequestDetail = ({ detail, onClose, onApprove }: Props) => {
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<ApprovalFailure | 'failed' | null>(null);
  const inFlight = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const approve = async () => {
    if (!onApprove || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await Promise.resolve();
      const result = onApprove(detail.context.version);
      if (result.ok) setApproved(true);
      else setError(result.error);
    } catch {
      setError('failed');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Success message is derived from the resulting domain state, never assumed.
  const { approvalStatus, approvalStage } = detail.summary;
  const successMessage = !approved
    ? null
    : approvalStatus === ApprovalStatus.APPROVED
      ? APPROVED_FINAL_MESSAGE
      : approvalStatus === ApprovalStatus.PENDING && approvalStage === ApprovalStage.HR
        ? APPROVED_ESCALATED_MESSAGE
        : null;
  const showButton = Boolean(onApprove) && detail.summary.canApprove && !detail.summary.isStale;
  const errorMessage = failureMessage(error);

  useEffect(() => {
    if (successMessage) resultRef.current?.focus();
  }, [successMessage]);

  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Captured before the page changes: the opening row action disappears once the request is decided.
    const fallback = document.querySelector<HTMLElement>('main h1');
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      // aria-modal promises containment: keep Tab / Shift+Tab inside the open drawer.
      const dialog = dialogRef.current;
      const focusables = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? []);
      if (!dialog || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = current instanceof HTMLElement && focusables.includes(current);
      if (e.shiftKey ? !inside || current === first : !inside || current === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
      else fallback?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-start" data-detail-root="true">
      <div
        className="absolute inset-0 hidden md:block"
        style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        data-detail="true"
        className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto md:max-w-[480px]"
        style={{ background: tokens.colors.background.primary, color: '#09090B', boxShadow: tokens.shadows.lg }}
      >
        <header
          className="sticky top-0 flex items-start justify-between gap-3 px-4 py-3"
          style={{ background: tokens.colors.background.primary, borderBottom: `1px solid ${tokens.colors.border.base}` }}
        >
          <div className="min-w-0">
            <h2 id="request-detail-title" className="m-0" style={{ fontSize: tokens.fontSizes.xl, fontWeight: tokens.fontWeights.bold }}>
              {DETAIL_TITLE}
            </h2>
            <span data-version={detail.context.version} style={{ fontSize: tokens.fontSizes.sm, color: tokens.colors.text.secondary }}>
              {versionLabel(detail.context.version)}
              {detail.summary.isVersionReadOnly ? ` • ${READ_ONLY_VERSION_LABEL}` : ''}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={DETAIL_CLOSE_LABEL}
            className="inline-flex shrink-0 items-center justify-center"
            style={{ width: 44, height: 44, border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', borderRadius: tokens.radius.lg }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="px-4 pb-6">
          <ContextSection d={detail} />
          <SummarySection d={detail} />
          <RiskSection d={detail} />
          <BalanceSection d={detail} />
          <PathSection d={detail} />
          <AuditSection d={detail} />
        </div>
        {(showButton || successMessage || errorMessage) && (
          <footer
            data-section="actions"
            className="sticky bottom-0 mt-auto flex flex-col gap-2 px-4 py-3"
            style={{ background: tokens.colors.background.primary, borderTop: `1px solid ${tokens.colors.border.base}` }}
          >
            <div ref={resultRef} tabIndex={-1} aria-live="polite" role={errorMessage ? 'alert' : 'status'}
              style={{ fontSize: tokens.fontSizes.sm, outline: 'none' }}>
              {successMessage && <p className="m-0" data-approval-result="success" style={{ fontWeight: tokens.fontWeights.medium }}>{successMessage}</p>}
              {errorMessage && <p className="m-0" data-approval-result="error" style={{ color: tokens.colors.destructive.base }}>{errorMessage}</p>}
            </div>
            {showButton && (
              <button
                type="button"
                data-action="approve"
                onClick={approve}
                disabled={busy}
                aria-busy={busy}
                className="inline-flex w-full items-center justify-center"
                style={{
                  minHeight: 44, border: 'none', borderRadius: tokens.radius.lg, fontWeight: tokens.fontWeights.medium,
                  background: '#1D4ED8', color: tokens.colors.background.primary,
                  cursor: busy ? 'progress' : 'pointer', opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? APPROVING_LABEL : APPROVE_LABEL}
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
};
