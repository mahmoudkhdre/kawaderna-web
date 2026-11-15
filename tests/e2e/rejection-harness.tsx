import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { INBOX_NOW, managerInboxFixtures } from '../../src/domain/leave/fixtures';
import type { ManagerRejectionResult } from '../../src/domain/leave/managerRejection';
import { toManagerInboxRow } from '../../src/domain/leave/selectors';
import { RejectReasonModal } from '../../src/pages/ManagerInbox/RejectReasonModal';
import '../../src/index.css';

const mode = new URLSearchParams(location.search).get('mode');
const initialRow = toManagerInboxRow(managerInboxFixtures.routine, INBOX_NOW);

export const Harness = () => {
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [calls, setCalls] = useState(0);
  const [notice, setNotice] = useState('');
  const [row, setRow] = useState(initialRow);
  const confirm = (): ManagerRejectionResult | Promise<ManagerRejectionResult> => {
    setCalls((value) => value + 1);
    if (mode === 'delayed') return new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: 'acknowledgement_required' }), 600));
    if (mode === 'stale') return { ok: false, error: 'stale_version' };
    if (mode === 'unauthorized') return { ok: false, error: 'unauthorized' };
    if (mode === 'generic' || mode === 'generic_changed') throw new Error('simulated uncertain result');
    return { ok: false, error: 'invalid_state' };
  };
  return <>
    <main><h1 tabIndex={-1}>اختبار الرفض</h1><button type="button" onClick={(event) => { setOpener(event.currentTarget); setOpen(true); }}>فتح الرفض</button><button type="button" onClick={() => setRow(toManagerInboxRow(managerInboxFixtures.dueSoon, INBOX_NOW))}>تغيير الطلب</button></main>
    <output data-call-count="true">{calls}</output><output data-notice="true">{notice}</output>
    {open && <RejectReasonModal key={`${row.requestId}:${row.version}`} row={row} opener={opener} onClose={() => setOpen(false)} onConfirm={confirm} onSuccess={() => { setOpen(false); setNotice('نجاح'); }} onReconcile={() => mode !== 'generic_changed'} />}
  </>;
};

createRoot(document.getElementById('root')!).render(<Harness />);
