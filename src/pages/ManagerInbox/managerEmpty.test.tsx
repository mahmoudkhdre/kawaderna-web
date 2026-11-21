import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ManagerInboxBinding } from '../../demo/contracts';
import { DEMO_COPY } from '../../demo/copy';
import { Persona } from '../../domain/leave/types';
import { ManagerInboxPage } from './ManagerInboxPage';

/** Owner decision E (2026-11-17): the Manager empty state. Reachable here by binding an empty request list. */
const emptyBinding: ManagerInboxBinding = {
  requests: [],
  actor: { id: 'MGR-2001', role: Persona.MANAGER },
  onApprove: () => ({ ok: false, error: 'not_found' }) as never,
  onReject: () => ({ ok: false, error: 'not_found' }) as never,
};

describe('Manager empty state', () => {
  it('shows the owner wording as the title, with the default explanation and no table, cards or filters', () => {
    const html = renderToStaticMarkup(<ManagerInboxPage binding={emptyBinding} />);
    expect(DEMO_COPY.managerEmpty).toBe('لا توجد طلبات بانتظار قرارك حاليًا');
    expect(html).toContain('data-empty-state="manager"');
    expect(html).toContain(DEMO_COPY.managerEmpty);
    expect(html).toContain(DEMO_COPY.managerEmptyBody);
    expect(html).not.toContain('data-layout="table"');
    expect(html).not.toContain('data-layout="cards"');
    expect(html).not.toContain('data-filters');
  });

  it('never claims a request is elsewhere or still pending in the default text', () => {
    const html = renderToStaticMarkup(<ManagerInboxPage binding={emptyBinding} />);
    expect(html).not.toMatch(/عند الموظف|لدى الموظف|عند الموارد البشرية|ما زال|LV-2026/);
  });

  it('renders the guide-aware empty state when one is provided, and only then', () => {
    const custom = <section data-empty-state="manager-custom">مخصص</section>;
    const withSlot = renderToStaticMarkup(<ManagerInboxPage binding={emptyBinding} empty={custom} />);
    expect(withSlot).toContain('data-empty-state="manager-custom"');
    expect(withSlot).not.toContain(DEMO_COPY.managerEmptyBody);
  });

  it('the slot never replaces a real list: with requests present the standalone page shows rows, not the empty state', () => {
    const html = renderToStaticMarkup(<ManagerInboxPage empty={<section data-empty-state="manager-custom" />} />);
    expect(html).not.toContain('manager-custom');
    expect(html).toContain('data-request-id');
  });
});
