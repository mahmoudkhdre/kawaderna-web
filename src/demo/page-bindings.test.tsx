import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ManagerInboxPage } from '../pages/ManagerInbox/ManagerInboxPage';
import { HRFinalDecisionPage } from '../pages/HRFinalDecision/HRFinalDecisionPage';
import { createDemoController } from './controller';
import { DEMO_COPY } from './copy';
import { DEMO_PASSWORD } from './session';
import { createBaselineRequests } from './state';

describe('T009/T010 controlled and standalone page bindings', () => {
  it('preserves both standalone defaults', () => {
    expect(renderToStaticMarkup(<ManagerInboxPage />)).toContain('LV-2026-102');
    expect(renderToStaticMarkup(<HRFinalDecisionPage />)).toContain('LV-2026-001');
    expect(renderToStaticMarkup(<HRFinalDecisionPage />)).toContain('موافقة نهائية');
  });
  it('renders baseline HR empty with no invented record or decision controls', () => {
    const owner = createDemoController(null);
    owner.getSnapshot().login('hr-demo', DEMO_PASSWORD);
    const html = renderToStaticMarkup(<HRFinalDecisionPage binding={owner.getSnapshot().hr!} />);
    expect(html).toContain(DEMO_COPY.hrEmpty);
    expect(html).not.toMatch(/LV-2026-001|LV-2026-106|<button/);
  });
  it('guards empty, mismatched and nonactionable selections and wrong roles', () => {
    const binding = { requests: createBaselineRequests(), actor: { id: 'HR-1', role: 'hr' as const }, requestId: 'LV-2026-106', onDecide: vi.fn() };
    for (const invalid of [binding, { ...binding, requests: [] }, { ...binding, requestId: 'missing' }, { ...binding, actor: { id: 'MGR-2001', role: 'manager' as const } }]) {
      expect(renderToStaticMarkup(<HRFinalDecisionPage binding={invalid} />)).toContain(DEMO_COPY.hrEmpty);
    }
    const html = renderToStaticMarkup(<ManagerInboxPage binding={{ requests: createBaselineRequests(), actor: binding.actor, onApprove: vi.fn(), onReject: vi.fn() }} />);
    expect(html).not.toContain('LV-2026-102');
    expect(binding.onDecide).not.toHaveBeenCalled();
  });
  it('offers Approve review only for assigned, current Pending/Manager rows', () => {
    const requests = createBaselineRequests();
    requests[0] = { ...requests[0], isStaleVersion: true };
    requests[1] = { ...requests[1], managerId: 'other-manager' };
    const onApprove = vi.fn();
    const html = renderToStaticMarkup(<ManagerInboxPage binding={{ requests, actor: { id: 'MGR-2001', role: 'manager' }, onApprove, onReject: vi.fn() }} />);
    // Two remaining eligible requests, each in table + cards. No action executed by rendering.
    expect(html.match(/data-action="review-approve"/g)).toHaveLength(4);
    expect(html.match(/data-action="reject"/g)).toHaveLength(4);
    expect(html).not.toContain('LV-2026-102');
    for (const id of ['101', '105', '106']) {
      for (const section of html.split(`data-request-id="LV-2026-${id}"`).slice(1)) {
        expect(section.split('data-request-id=')[0]).not.toContain('data-action="review-approve"');
      }
    }
    expect(onApprove).not.toHaveBeenCalled();
  });
  it.each(['approve', 'reject'] as const)('shows the shared ID, then a read-only HR %s summary', decision => {
    const owner = createDemoController(null);
    owner.getSnapshot().login('manager-demo', DEMO_PASSWORD);
    owner.getSnapshot().manager!.onApprove('LV-2026-102', 1);
    owner.getSnapshot().logout(); owner.getSnapshot().login('hr-demo', DEMO_PASSWORD);
    const active = renderToStaticMarkup(<HRFinalDecisionPage binding={owner.getSnapshot().hr!} />);
    expect(active).toContain('LV-2026-102');
    expect(active).toContain('موافقة نهائية');
    expect(active).not.toContain('balanceBefore');
    owner.getSnapshot().hr!.onDecide('LV-2026-102', 1, decision, 'سبب واضح');
    const final = renderToStaticMarkup(<HRFinalDecisionPage binding={owner.getSnapshot().hr!} />);
    expect(final).toContain('LV-2026-102');
    expect(final).toContain('HR-1');
    expect(final).toContain(decision === 'approve' ? 'تمت الموافقة النهائية' : 'تم الرفض النهائي');
    if (decision === 'reject') expect(final).toContain('سبب واضح');
    expect(final).not.toMatch(/<button|<textarea/);
  });
});
