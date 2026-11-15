import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from '../../domain/leave/fixtures';
import { selectManagerInbox } from '../../domain/leave/selectors';
import { InboxCards } from './InboxCards';
import { InboxTable } from './InboxTable';
import { ManagerInboxPage } from './ManagerInboxPage';

const rows = selectManagerInbox(Object.values(f), 'MGR-2001', INBOX_NOW);
const html = {
  table: renderToStaticMarkup(<InboxTable rows={rows} />),
  cards: renderToStaticMarkup(<InboxCards rows={rows} />),
  page: renderToStaticMarkup(<ManagerInboxPage />),
};
const section = (markup: string, id: string) =>
  markup.split('data-request-id="').find((s) => s.startsWith(id)) ?? '';

describe.each(['table', 'cards'] as const)('%s layout', (kind) => {
  const markup = html[kind];
  it('renders all six fixture requests from selector output', () => {
    for (const r of Object.values(f)) expect(markup).toContain(`data-request-id="${r.requestId}"`);
  });
  it('has no decision controls and no links (rows are rendered without an open handler)', () => {
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('<a ');
  });
  it('marks overdue only for the overdue request', () => {
    expect(section(markup, 'LV-2026-104')).toContain('data-overdue="true"');
    for (const id of ['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-105', 'LV-2026-106']) {
      expect(section(markup, id)).not.toContain('data-overdue');
    }
  });
  it('shows the actionable mark only for manager-decidable rows', () => {
    for (const id of ['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-104']) {
      expect(section(markup, id)).toContain('data-actionable="true"');
    }
    for (const id of ['LV-2026-105', 'LV-2026-106']) {
      expect(section(markup, id)).not.toContain('data-actionable');
    }
  });
  it('shows low-balance and clarification risk text', () => {
    expect(section(markup, 'LV-2026-102')).toContain('يحتاج مراجعة • يتجاوز الرصيد المتاح');
    expect(section(markup, 'LV-2026-105')).toContain('يحتاج مراجعة • معلومات ناقصة');
    expect(section(markup, 'LV-2026-101')).toContain('لا توجد مشكلة');
  });
});

describe('open-detail trigger', () => {
  it.each([InboxTable, InboxCards])('renders one open-detail button per request when onOpen is given', (Layout) => {
    const markup = renderToStaticMarkup(<Layout rows={rows} onOpen={() => {}} />);
    expect(markup.match(/data-open-detail="true"/g)).toHaveLength(rows.length);
    expect(markup.match(/<button/g)).toHaveLength(rows.length);
    expect(markup).not.toMatch(/data-action=|الموافقة<|>رفض</);
  });
});

describe('page', () => {
  it('renders both layouts and no due-soon UI or exact balance', () => {
    expect(html.page).toContain('data-layout="table"');
    expect(html.page).toContain('data-layout="cards"');
    expect(html.page).not.toMatch(/due.?soon|isDueSoon/i);
    expect(html.page).not.toContain('balanceBefore');
    expect(html.page).not.toContain('الرصيد المتاح: ');
  });
});
