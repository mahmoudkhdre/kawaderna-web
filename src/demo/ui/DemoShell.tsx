import { Info } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { DemoShellProps } from '../ui-contract';
import { DemoHeader } from './DemoHeader';
import { DemoMobileNav } from './DemoMobileNav';
import { DemoSidebar } from './DemoSidebar';
import { DemoToast } from './DemoToast';
import './demo-ui.css';

const SKIP_LINK_TEXT = 'تخطي إلى المحتوى الرئيسي';

/**
 * Logged-in shell: Header + collapsed right rail + mobile bottom navigation + Toast + storage notice.
 * `children` is the Manager/HR page, which renders its own <main>; the shell adds no second landmark
 * and no padding around it (Gap 1-4 pages own their layout). The Reset dialog is composed by T011b.
 */
export const DemoShell = ({ children, toast, storageNotice, session, onLogout, onRequestReset, navigation, onNotifyUnavailable }: DemoShellProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const card = shell?.querySelector<HTMLElement>('[data-demo-toast]');
    if (!shell || !card) return;
    // Reserve the measured notice plus a 16px gap on both sides. Mobile content
    // scrolls above this strip; desktop keeps its original overlay placement.
    const measure = () => shell.style.setProperty('--kd-toast-clearance', `${card.getBoundingClientRect().height + 32}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => { observer.disconnect(); shell.style.removeProperty('--kd-toast-clearance'); };
  }, [toast.notice?.id]);
  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = shellRef.current?.querySelector<HTMLElement>('main');
    if (!main) return;
    main.tabIndex = -1;
    main.focus();
  };
  return <div ref={shellRef} className="kd kd-shell" dir="rtl" data-demo-shell="true">
    <a className="kd-skip" href="#main-content" data-skip-link="true" onClick={skipToContent}>{SKIP_LINK_TEXT}</a>
    <DemoSidebar navigation={navigation} onNotifyUnavailable={onNotifyUnavailable} />
    <div className="kd-shell__main">
      <DemoHeader session={session} onLogout={onLogout} onRequestReset={onRequestReset} />
      {storageNotice && (
        <p className="kd kd-notice kd-storage" role="status" data-storage-notice="true">
          <Info size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
          <span className="kd-notice__text">{storageNotice}</span>
        </p>
      )}
      <div className="kd-shell__content">{children}</div>
      <div className="kd-shell__pad" aria-hidden="true" />
    </div>
    <DemoMobileNav navigation={navigation} onNotifyUnavailable={onNotifyUnavailable} />
    <DemoToast {...toast} />
  </div>;
};
