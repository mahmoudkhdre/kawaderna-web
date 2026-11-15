import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DemoNavigationProps } from '../ui-contract';
import { DEMO_COPY } from '../copy';
import { NavIcon } from './icons';
import { NAV_LABEL } from './text';
import './demo-ui.css';

/** Figma sidebar sections 1..5 (design map): ids that start sections 2-5. */
const SECTION_STARTS = new Set(['employees', 'payroll', 'performance', 'assistant']);

/**
 * Collapsed 48px icon rail only (Figma 688:19200). The Expanded variant and the toggle target state are
 * NOT INSPECTED (C10), so no toggle or expanded layout is rendered. Desktop only (CSS, >=768px).
 */
export const DemoSidebar = ({ navigation, onNotifyUnavailable }: DemoNavigationProps) => {
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  useEffect(() => {
    // Escape must dismiss a pointer-hover tooltip even when focus is elsewhere.
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setTooltipDismissed(true); };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, []);
  return <nav className="kd kd-rail" dir="rtl" aria-label={NAV_LABEL} data-demo-sidebar="true" data-tooltip-dismissed={tooltipDismissed}>
    <ul className="kd-rail__list">
      {navigation.sidebar.map(item => {
        const current = item.id === navigation.activeId;
        const tipId = `kd-tip-${item.id}`;
        return (
          <li key={item.id} className={`kd-rail__li${SECTION_STARTS.has(item.id) ? ' kd-rail__group' : ''}`}
            onPointerEnter={() => setTooltipDismissed(false)} onFocusCapture={() => setTooltipDismissed(false)}>
            {current ? (
              <button type="button" className="kd-rail__item" aria-label={item.label} aria-describedby={tipId} aria-current="page" data-nav-id={item.id}>
                <NavIcon name={item.icon} size={16} />
              </button>
            ) : (
              <button type="button" className="kd-rail__item" aria-label={item.label} aria-describedby={tipId}
                aria-disabled={!item.available ? 'true' : undefined} data-nav-id={item.id} data-unavailable={!item.available ? 'true' : undefined}
                onClick={() => { if (!item.available) onNotifyUnavailable(item.id); }}>
                <NavIcon name={item.icon} size={16} />
              </button>
            )}
            <span id={tipId} role="tooltip" className="kd-tip">
              {item.label}
              {!item.available && <small>{DEMO_COPY.unavailableTitle}</small>}
            </span>
          </li>
        );
      })}
    </ul>
    <span className="kd-avatar" aria-hidden="true"><User size={16} /></span>
  </nav>;
};
