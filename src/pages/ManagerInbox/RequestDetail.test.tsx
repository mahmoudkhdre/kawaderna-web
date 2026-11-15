import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from '../../domain/leave/fixtures';
import { toManagerRequestDetail } from '../../domain/leave/selectors';
import { RequestDetail } from './RequestDetail';
import { sectionTitle } from './labels';

const render = (r: typeof f.routine) =>
  renderToStaticMarkup(<RequestDetail detail={toManagerRequestDetail(r, INBOX_NOW)} onClose={() => {}} />);

describe('RequestDetail (read-only)', () => {
  it('renders the six sections in the documented order', () => {
    const html = render(f.routine);
    const order = ['context', 'summary', 'risk', 'balance', 'path', 'audit'].map((k) => html.indexOf(`data-section="${k}"`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const t of Object.values(sectionTitle)) expect(html).toContain(t);
  });

  it('shows the read-only version and a dialog container', () => {
    const html = render(f.routine);
    expect(html).toContain('data-version="1"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });

  it('without an approve handler it stays read-only: only the close button exists', () => {
    const html = render(f.lowBalance);
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toContain('data-action=');
    for (const label of ['>موافقة<', '>رفض<', '>الموافقة<', '>الرفض<', 'طلب توضيح']) expect(html).not.toContain(label);
  });

  describe('Approve-only action', () => {
    const withApprove = (r: typeof f.routine) =>
      renderToStaticMarkup(
        <RequestDetail detail={toManagerRequestDetail(r, INBOX_NOW)} onClose={() => {}} onApprove={() => ({ ok: false, error: 'invalid_state' })} />,
      );
    it.each([['routine', f.routine], ['lowBalance', f.lowBalance], ['dueSoon', f.dueSoon], ['overdue', f.overdue]])(
      'shows exactly one Approve and no Reject / Clarification for %s', (_n, r) => {
        const html = withApprove(r);
        expect(html.match(/data-action="approve"/g)).toHaveLength(1);
        expect(html.match(/<button/g)).toHaveLength(2); // close + approve
        expect(html).toContain('>موافقة<');
        for (const label of ['رفض', 'طلب توضيح', 'data-action="reject"', 'data-action="clarify"']) expect(html).not.toContain(label);
      },
    );
    it.each([['waitingClarification', f.waitingClarification], ['escalatedHr', f.escalatedHr]])(
      'shows no decision action for %s', (_n, r) => {
        const html = withApprove(r);
        expect(html).not.toContain('data-action=');
        expect(html.match(/<button/g)).toHaveLength(1);
      },
    );
    it('shows no action for a stale request, and surfaces the stale label', () => {
      const html = withApprove({ ...f.routine, isStaleVersion: true });
      expect(html).not.toContain('data-action=');
      expect(html).toContain('data-stale="true"');
    });
    it('does not expose a numeric balance with the action present', () => {
      const html = withApprove(f.lowBalance);
      expect(html).not.toContain('balanceBefore');
    });
  });

  it('low balance communicates the exception and HR path with no numeric balance', () => {
    const html = render(f.lowBalance);
    expect(html).toContain('data-low-balance-path="true"');
    expect(html).toContain('الموارد البشرية');
    expect(html).toContain('data-route-role="hr"');
    const start = html.lastIndexOf('<section', html.indexOf('data-section="balance"'));
    const section = html.slice(start, html.indexOf('<section', start + 1));
    expect(section).toContain('data-balance="insufficient"');
    // Visible text only: markup attributes legitimately contain digits (inline CSS such as `1px`).
    const visibleText = section.replace(/<[^>]*>/g, ' ');
    expect(visibleText).not.toMatch(/[0-9٠-٩]/);
  });

  it('routine has no low-balance message; overdue shows its badge; no due-soon UI', () => {
    expect(render(f.routine)).not.toContain('data-low-balance-path');
    expect(render(f.overdue)).toContain('data-overdue="true"');
    expect(render(f.dueSoon)).not.toMatch(/due.?soon/i);
    expect(render(f.dueSoon)).not.toContain('data-overdue');
  });
});
