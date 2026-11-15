import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Bell, Crown, LogOut, MapPin, RotateCcw, User } from 'lucide-react';
import type { DemoSessionControlsProps } from '../ui-contract';
import { HEADER_TEXT } from './text';
import './demo-ui.css';

const Brand = ({ size, mobile }: { size: number; mobile?: boolean }) => (
  <div className="kd-brand">
    <span className="kd-logo" style={{ width: size, height: size }} aria-hidden="true"><Crown size={size === 52 ? 32 : 20} /></span>
    <div style={{ minWidth: 0 }}>
      <p className="kd-brand__title">{HEADER_TEXT.product}</p>
      {!mobile && (
        <div className="kd-brand__sub">
          <span><MapPin size={14} aria-hidden="true" />{HEADER_TEXT.city}</span>
          <span>{HEADER_TEXT.tagline}</span>
        </div>
      )}
    </div>
  </div>
);

/** Decorative per DV-09: no count, not a button, not focusable, hidden from assistive technology. */
const DecorativeBell = ({ size }: { size: number }) => (
  <span className="kd-bell" aria-hidden="true" data-decorative-bell="true"><Bell size={size} /></span>
);

const MobileAccountMenu = ({ session, onLogout, onRequestReset }: DemoSessionControlsProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: PointerEvent) => { if (!wrapRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = (returnFocus: boolean) => { setOpen(false); if (returnFocus) triggerRef.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent) => {
    const items = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') setOpen(false);
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && items.length) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
  };
  // Hand the dialog a stable opener before the menu item unmounts. Focusing the
  // avatar does not activate it, so cancellation leaves the menu closed.
  const act = (action: () => void) => () => { close(true); action(); };

  return (
    <div className="kd-menu-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      <button ref={triggerRef} type="button" className="kd-avatar-btn" aria-haspopup="menu" aria-expanded={open}
        aria-controls={open ? menuId : undefined} aria-label={session.displayIdentity} data-account-menu-trigger="true"
        onClick={() => setOpen(value => !value)}>
        <span className="kd-avatar" aria-hidden="true"><User size={18} /></span>
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={session.displayIdentity} className="kd-menu" data-account-menu="true">
          <button type="button" role="menuitem" className="kd-menu__item" data-action="logout" onClick={act(onLogout)}>
            <LogOut size={16} aria-hidden="true" />{HEADER_TEXT.logout}
          </button>
          <button type="button" role="menuitem" className="kd-menu__item" data-action="reset" onClick={act(onRequestReset)}>
            <RotateCcw size={16} aria-hidden="true" />{HEADER_TEXT.reset}
          </button>
        </div>
      )}
    </div>
  );
};

/** Desktop Header (>=768) and mobile top bar (<768); CSS switches them, the hidden one leaves the a11y tree. */
export const DemoHeader = (props: DemoSessionControlsProps) => {
  const { session, onLogout, onRequestReset } = props;
  return (
    <>
      <header className="kd kd-header kd-header--desktop" dir="rtl" data-demo-header="desktop">
        <Brand size={52} />
        <div className="kd-header__end">
          <DecorativeBell size={20} />
          <div className="kd-user" data-demo-identity="true">
            <span className="kd-avatar" aria-hidden="true"><User size={16} /></span>
            <span>{session.displayIdentity}</span>
          </div>
          <button type="button" className="kd-btn kd-btn--secondary kd-btn--sm" data-action="logout" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" />{HEADER_TEXT.logout}
          </button>
          <button type="button" className="kd-btn kd-btn--secondary kd-btn--sm" data-action="reset" onClick={onRequestReset}>
            <RotateCcw size={16} aria-hidden="true" />{HEADER_TEXT.reset}
          </button>
        </div>
      </header>
      <header className="kd kd-header kd-header--mobile" dir="rtl" data-demo-header="mobile">
        <Brand size={36} mobile />
        <div className="kd-header__end" style={{ gap: 4 }}>
          <DecorativeBell size={20} />
          <MobileAccountMenu session={session} onLogout={onLogout} onRequestReset={onRequestReset} />
        </div>
      </header>
    </>
  );
};
