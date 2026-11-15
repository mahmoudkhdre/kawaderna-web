import { Fragment } from 'react';
import type { DemoNavigationProps } from '../ui-contract';
import { DEMO_COPY } from '../copy';
import { NavIcon } from './icons';
import { NAV_LABEL } from './text';
import './demo-ui.css';

/** Figma NavMobile 1525:33371: five items; active = accent color plus a "•" marker beneath the label. Mobile only (<768px). */
export const DemoMobileNav = ({ navigation, onNotifyUnavailable }: DemoNavigationProps) => (
  <nav className="kd kd-nav" dir="rtl" aria-label={NAV_LABEL} data-demo-mobile-nav="true">
    {navigation.mobile.map(item => {
      const current = item.id === navigation.activeId;
      const tipId = `kd-mtip-${item.id}`;
      return (
        <Fragment key={item.id}>
          <button type="button" className="kd-nav__item" data-nav-id={item.id}
            aria-current={current ? 'page' : undefined}
            aria-disabled={!item.available ? 'true' : undefined}
            aria-describedby={!item.available ? tipId : undefined}
            onClick={() => { if (!item.available) onNotifyUnavailable(item.id); }}>
            <NavIcon name={item.icon} size={20} />
            <span>{item.label}</span>
            {current && <span className="kd-nav__dot" aria-hidden="true">•</span>}
          </button>
          {!item.available && <span id={tipId} className="kd-sr">{DEMO_COPY.unavailableTitle}</span>}
        </Fragment>
      );
    })}
  </nav>
);
