import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures } from '../../domain/leave/fixtures';
import { selectManagerInbox, toManagerRequestDetail } from '../../domain/leave/selectors';
import { InboxCards } from './InboxCards';
import { InboxTable } from './InboxTable';
import { RequestDetail } from './RequestDetail';

const rows = selectManagerInbox(Object.values(managerInboxFixtures), 'MGR-2001', INBOX_NOW);

describe('narrow Inbox Reject integration', () => {
  it.each([['table', InboxTable], ['cards', InboxCards]] as const)('%s adds Reject only for four eligible items while retaining Detail for six', (_name, Component) => {
    const markup = renderToStaticMarkup(<Component rows={rows} onOpen={() => {}} onReject={() => {}} />);
    expect(markup.match(/data-action="reject"/g)).toHaveLength(4);
    expect(markup.match(/data-open-detail="true"/g)).toHaveLength(6);
    expect(markup).not.toContain('balanceBefore');
    expect(markup).not.toContain('data-action="approve"');
    for (const id of ['LV-2026-105', 'LV-2026-106']) {
      const item = markup.split(`data-request-id="${id}"`)[1]?.split('data-request-id=')[0];
      expect(item).not.toContain('data-action="reject"');
    }
  });

  it('keeps the closed detail Drawer Approve-only', () => {
    const detail = toManagerRequestDetail(managerInboxFixtures.routine, INBOX_NOW);
    const markup = renderToStaticMarkup(<RequestDetail detail={detail} onClose={() => {}} onApprove={() => ({ ok: false, error: 'invalid_state' })} />);
    expect(markup).toContain('data-action="approve"');
    expect(markup).not.toContain('data-action="reject"');
    expect(markup).not.toContain('طلب توضيح');
  });
});
