import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { DEMO_COPY } from '../../demo/copy';
import { EmptyState } from '../../demo/ui/EmptyState';
import { INBOX_NOW, managerInboxFixtures } from '../../domain/leave/fixtures';
import { approveAsManager } from '../../domain/leave/managerApproval';
import { rejectAsManager } from '../../domain/leave/managerRejection';
import { canManagerDecide, selectManagerInbox, selectManagerRequestDetail } from '../../domain/leave/selectors';
import type { ManagerInboxRow } from '../../domain/leave/selectors';
import { Persona } from '../../domain/leave/types';
import type { LeaveRequest } from '../../domain/leave/types';
import { tokens } from '../../lib/tokens';
import { InboxCards } from './InboxCards';
import { FILTER_EMPTY_TEXT, InboxFilters } from './InboxFilters';
import { NO_FILTERS, applyInboxFilters, buildFilterOptions, reconcileFilters } from './filterLogic';
import type { InboxFilters as InboxFilterState } from './filterLogic';
import { InboxTable } from './InboxTable';
import { RequestDetail } from './RequestDetail';
import { RejectReasonModal } from './RejectReasonModal';
import { PAGE_SUBTITLE, PAGE_TITLE } from './labels';
import { REJECT_SUCCESS } from './rejectionLabels';
import type { ManagerInboxBinding } from '../../demo/contracts';

// Demo context: fixtures + injected clock. Persona switching is not authentication.
const DEMO_MANAGER_ID = 'MGR-2001';

export interface ManagerInboxPageProps {
  binding?: ManagerInboxBinding;
  /** 006: replaces the default empty state with one that knows the guide context. Never changes the list or any decision. */
  empty?: ReactNode;
}

export const ManagerInboxPage = ({ binding, empty }: ManagerInboxPageProps = {}) => {
  // Standalone fixtures remain available; controlled mode owns no duplicate request list.
  const [localRequests, setRequests] = useState<LeaveRequest[]>(() => binding ? [] : structuredClone(Object.values(managerInboxFixtures)));
  const requests = binding?.requests ?? localRequests;
  const managerId = binding?.actor.id ?? DEMO_MANAGER_ID;
  const authorized = !binding || binding.actor.role === Persona.MANAGER;
  const latest = useRef(requests);
  const rows = authorized ? selectManagerInbox(requests, managerId, INBOX_NOW) : [];
  const [filters, setFilters] = useState<InboxFilterState>(NO_FILTERS);
  const filterOptions = buildFilterOptions(rows);
  const effectiveFilters = reconcileFilters(filters, filterOptions);
  const visibleRows = applyInboxFilters(rows, effectiveFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejection, setRejection] = useState<{ row: ManagerInboxRow; opener: HTMLElement } | null>(null);
  const [rejectionNotice, setRejectionNotice] = useState('');
  const activeRejection = authorized && rejection && (() => {
    const current = requests.find((r) => r.requestId === rejection.row.requestId);
    return current && current.version === rejection.row.version && canManagerDecide(current, managerId) ? rejection : null;
  })();
  const detail = authorized && selectedId
    ? selectManagerRequestDetail(requests, selectedId, managerId, INBOX_NOW,
      import.meta.env.VITE_MANAGER_ANNUAL_BALANCE === 'true')
    : null;
  const approve = (requestId: string, expectedVersion: number) => {
    if (!authorized) return { ok: false as const, error: 'unauthorized' as const };
    const result = binding ? binding.onApprove(requestId, expectedVersion) : approveAsManager(
      latest.current, requestId, { id: managerId, role: Persona.MANAGER }, INBOX_NOW, expectedVersion,
    );
    if (result.ok) {
      latest.current = result.requests;
      if (!binding) setRequests(result.requests);
    }
    return result;
  };
  const openRejection = (row: ManagerInboxRow, opener: HTMLElement) => {
    if (selectedId || activeRejection || !row.canReject) return;
    setRejectionNotice('');
    setRejection({ row, opener });
  };
  const confirmRejection = (category: Parameters<typeof rejectAsManager>[5], details: string) => {
    if (!activeRejection) return { ok: false as const, error: 'not_found' as const };
    const result = binding ? binding.onReject(activeRejection.row.requestId, activeRejection.row.version, category, details) : rejectAsManager(
      latest.current, activeRejection.row.requestId, { id: managerId, role: Persona.MANAGER },
      INBOX_NOW, activeRejection.row.version, category, details,
    );
    if (result.ok) {
      latest.current = result.requests;
      if (!binding) setRequests(result.requests);
    }
    return result;
  };
  return (
    <main className="mx-auto w-full px-4 py-6 md:px-6" style={{ maxWidth: 1360, color: tokens.colors.text.primary }}>
      <header className="mb-4">
        <h1 tabIndex={-1} className="m-0 text-2xl font-bold md:text-3xl">{PAGE_TITLE}</h1>
        <p className="m-0 mt-1" style={{ color: tokens.colors.text.secondary }}>{PAGE_SUBTITLE}</p>
      </header>
      {rows.length === 0 ? (
        empty ?? <EmptyState icon={ClipboardCheck} title={DEMO_COPY.managerEmpty} body={DEMO_COPY.managerEmptyBody} hint={DEMO_COPY.managerEmptyHint} testId="manager" />
      ) : (
        <>
          <InboxFilters filters={effectiveFilters} options={filterOptions} total={rows.length} shown={visibleRows.length} onChange={setFilters} />
          {visibleRows.length === 0 ? (
            <p data-filter-empty="true" className="m-0 py-6 text-center" style={{ color: tokens.colors.text.secondary }}>{FILTER_EMPTY_TEXT}</p>
          ) : (
            <>
              <InboxTable rows={visibleRows} onOpen={(id) => { if (!activeRejection) setSelectedId(id); }} onReviewApprove={(id) => { if (!activeRejection) setSelectedId(id); }} onReject={openRejection} />
              <InboxCards rows={visibleRows} onOpen={(id) => { if (!activeRejection) setSelectedId(id); }} onReviewApprove={(id) => { if (!activeRejection) setSelectedId(id); }} onReject={openRejection} />
            </>
          )}
        </>
      )}
      {detail && selectedId && (
        <RequestDetail
          detail={detail}
          onClose={() => setSelectedId(null)}
          onApprove={(expectedVersion) => approve(selectedId, expectedVersion)}
        />
      )}
      <div role="status" aria-live="polite" data-rejection-notice="true">{rejectionNotice}</div>
      {activeRejection && <RejectReasonModal
        key={`${activeRejection.row.requestId}:${activeRejection.row.version}`}
        row={activeRejection.row}
        opener={activeRejection.opener}
        onClose={() => setRejection(null)}
        onConfirm={confirmRejection}
        onSuccess={() => { setRejection(null); setRejectionNotice(REJECT_SUCCESS); }}
        onReconcile={() => {
          const current = (binding?.requests ?? latest.current).find((r) => r.requestId === activeRejection.row.requestId);
          return Boolean(current && current.version === activeRejection.row.version && canManagerDecide(current, managerId));
        }}
      />}
    </main>
  );
};
