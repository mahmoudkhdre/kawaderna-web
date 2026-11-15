import { useState } from 'react';
import type { FocusEvent } from 'react';
import { X } from 'lucide-react';
import type { DemoToastProps, UnavailableNotice } from '../ui-contract';
import { DEMO_COPY } from '../copy';
import { useAutoDismiss } from './useAutoDismiss';
import './demo-ui.css';

/** One instance per notice id: hover/focus state is local so a replaced or dismissed toast can never leave a stale pause. */
const ToastCard = ({ notice, behavior, onDismiss }: { notice: UnavailableNotice; behavior: DemoToastProps['behavior']; onDismiss: DemoToastProps['onDismiss'] }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useAutoDismiss(notice.id, behavior.autoDismissMs, (behavior.pauseOnHover && hovered) || (behavior.pauseOnFocusWithin && focused),
    () => onDismiss(notice.id));
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };
  return (
    <div className="kd kd-toast" data-demo-toast="true"
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={onBlur}>
      <div className="kd-toast__body">
        <p className="kd-toast__title">{notice.title}</p>
        <p className="kd-toast__msg">{notice.message}</p>
      </div>
      {behavior.dismissible && (
        <button type="button" className="kd-iconbtn" aria-label={DEMO_COPY.close} data-action="dismiss-toast" onClick={() => onDismiss(notice.id)}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

/** Unavailable-feature Toast (UX-D6/UX-D7). Non-modal, never takes focus, one instance; see UNAVAILABLE_TOAST_BEHAVIOR. */
export const DemoToast = ({ notice, behavior, onDismiss }: DemoToastProps) => (
  // The live region stays mounted so the announcement is reliable; only its content comes and goes.
  <div role={behavior.role} aria-live={behavior.ariaLive} aria-atomic="true" dir={behavior.dir} data-demo-toast-region="true">
    {notice && <ToastCard key={notice.id} notice={notice} behavior={behavior} onDismiss={onDismiss} />}
  </div>
);
