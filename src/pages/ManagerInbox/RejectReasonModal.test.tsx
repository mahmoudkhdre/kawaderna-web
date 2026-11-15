import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INBOX_NOW, managerInboxFixtures } from '../../domain/leave/fixtures';
import { toManagerInboxRow } from '../../domain/leave/selectors';
import { REJECTION_LABELS } from '../../domain/leave/rejectionReason';
import { RejectReasonModal } from './RejectReasonModal';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return { ...actual, createPortal: (children: ReactNode) => children };
});

describe('RejectReasonModal semantic markup', () => {
  beforeEach(() => vi.stubGlobal('document', { body: {} }));
  afterEach(() => vi.unstubAllGlobals());

  it('offers exact five labels, no selected reason and an empty details field', () => {
    const row = toManagerInboxRow(managerInboxFixtures.routine, INBOX_NOW);
    const html = renderToStaticMarkup(<RejectReasonModal row={row} opener={null} onClose={() => {}} onConfirm={() => ({ ok: false, error: 'invalid_state' })} onSuccess={() => {}} onReconcile={() => true} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('dir="rtl"');
    expect(html.match(/type="radio"/g)).toHaveLength(5);
    for (const label of Object.values(REJECTION_LABELS)) expect(html).toContain(label);
    expect(html).not.toContain('checked=""');
    expect(html).toContain('سيظهر سبب الرفض');
    expect(html).toContain('data-action="confirm-reject"');
    expect(html).toContain('aria-live="polite"');
  });
});
