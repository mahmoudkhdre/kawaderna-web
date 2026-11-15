import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { DemoResetConfirmationProps } from '../ui-contract';
import { DEMO_COPY } from '../copy';
import './demo-ui.css';

/** Alert-dialog pattern: Cancel takes initial focus (the safe action), Tab is trapped, Escape/backdrop/Cancel cancel,
 * focus returns to the opener, and the rest of the page is inert. Presentation only: no reset logic here. */
export const DemoResetConfirmation = ({ open, onConfirm, onCancel }: DemoResetConfirmationProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelHandler = useRef(onCancel);
  useEffect(() => { cancelHandler.current = onCancel; });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const dialogRoot = dialogRef.current?.closest('[data-reset-root]');
    const inerted = Array.from(document.body.children).filter(el => el !== dialogRoot && !(el as HTMLElement).inert) as HTMLElement[];
    inerted.forEach(el => { el.inert = true; });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelHandler.current(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      inerted.forEach(el => { el.inert = false; });
      document.body.style.overflow = overflow;
      const canFocus = (element: HTMLElement | null): element is HTMLElement =>
        !!element?.isConnected && element.tabIndex >= 0 && !element.closest('[inert]') &&
        !element.matches(':disabled') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      // The mobile menu item may already be gone; viewport changes can also hide
      // an otherwise connected opener. Never focus a hidden desktop/mobile copy.
      const fallback = Array.from(document.querySelectorAll<HTMLElement>('[data-account-menu-trigger], [data-demo-header] [data-action="reset"]')).find(canFocus);
      const target = canFocus(opener) ? opener : fallback;
      target?.focus();
    };
  }, [open]);

  if (!open) return null;

  const trap = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const content: ReactNode = (
    <div className="kd kd-dialog-backdrop" dir="rtl" data-reset-root="true" data-reset-backdrop="true"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          // Avoid the backdrop's default mouse focus replacing restored focus.
          event.preventDefault();
          onCancel();
        }
      }}>
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="kd-reset-title" aria-describedby="kd-reset-desc"
        className="kd-dialog" onKeyDown={trap} data-reset-dialog="true">
        <h2 id="kd-reset-title" className="kd-dialog__title">{DEMO_COPY.resetTitle}</h2>
        <p id="kd-reset-desc" className="kd-dialog__desc">{DEMO_COPY.resetDescription}</p>
        <div className="kd-dialog__actions">
          <button ref={cancelRef} type="button" className="kd-btn kd-btn--secondary" data-action="reset-cancel" onClick={onCancel}>{DEMO_COPY.resetCancel}</button>
          <button type="button" className="kd-btn kd-btn--primary" style={{ width: 'auto' }} data-action="reset-confirm" onClick={onConfirm}>{DEMO_COPY.resetConfirm}</button>
        </div>
      </div>
    </div>
  );
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
};
