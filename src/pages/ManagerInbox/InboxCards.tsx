import type { ManagerInboxRow } from '../../domain/leave/selectors';
import { formatDateRange, formatDays } from '../../lib/format';
import { tokens } from '../../lib/tokens';
import {
  leaveTypeLabel, nextActionLabel, NO_VALUE, ownerLabel, statusStageText,
} from './labels';
import { REJECT_COLORS } from './rejectionColors';
import { isActionable } from './rowState';
import { ActionableMark, OpenDetailButton, OverdueBadge, RequestId, RiskIndicator } from './RowParts';

export const InboxCards = ({ rows, onOpen, onReviewApprove, onReject }: { rows: ManagerInboxRow[]; onOpen?: (requestId: string) => void; onReviewApprove?: (requestId: string) => void; onReject?: (row: ManagerInboxRow, opener: HTMLElement) => void }) => (
  <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden" data-layout="cards">
    {rows.map((row) => (
      <li
        key={row.requestId}
        data-request-id={row.requestId}
        data-muted={isActionable(row) ? undefined : 'true'}
        className="flex min-w-0 flex-col gap-2 p-4"
        style={{
          border: `1px solid ${tokens.colors.border.base}`,
          borderRadius: tokens.radius.xl,
          background: tokens.colors.background.primary,
          // Non-actionable rows use the secondary text colour, not opacity: opacity drove IDs to 2.19:1.
          color: isActionable(row) ? undefined : tokens.colors.text.secondary,
          fontSize: tokens.fontSizes.sm,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div style={{ fontWeight: tokens.fontWeights.bold, fontSize: tokens.fontSizes.base }}>
              <OpenDetailButton name={row.employeeName} requestId={row.requestId} onOpen={onOpen} />
            </div>
            <RequestId id={row.requestId} />
          </div>
          {row.isOverdue && <OverdueBadge />}
        </div>
        <div>
          {leaveTypeLabel[row.leaveType]} • {formatDays(row.durationWorkingDays)}
          {row.isPartialDay ? ' (جزء من يوم)' : ''}
        </div>
        <div style={{ color: tokens.colors.text.secondary }}>{formatDateRange(row.startDate, row.endDate)}</div>
        <div style={{ color: tokens.colors.text.secondary }}>{statusStageText(row)}</div>
        <div style={{ color: tokens.colors.text.secondary }}>
          المسؤول: {row.currentOwnerRole ? ownerLabel[row.currentOwnerRole] : NO_VALUE}
        </div>
        <RiskIndicator risk={row.risk} />
        <div>
          الإجراء التالي: {row.nextAction ? nextActionLabel[row.nextAction] : NO_VALUE}
          {isActionable(row) && <> • <ActionableMark /></>}
        </div>
        <div className="flex flex-wrap gap-2">
          {onReviewApprove && row.canApprove && <button type="button" data-action="review-approve" aria-label={`موافقة على طلب ${row.employeeName} رقم ${row.requestId} — مراجعة التفاصيل`} onClick={() => onReviewApprove(row.requestId)} className="min-h-11 rounded-lg border px-4 py-2" style={{ borderColor: '#1D4ED8', color: tokens.colors.text.inverse, background: '#1D4ED8', cursor: 'pointer' }}>موافقة</button>}
          {onReject && row.canReject && <button type="button" data-action="reject" aria-label={`رفض طلب ${row.employeeName} رقم ${row.requestId}`} onClick={(event) => onReject(row, event.currentTarget)} className="min-h-11 rounded-lg border px-4 py-2" style={{ borderColor: REJECT_COLORS.destructive, color: REJECT_COLORS.destructive, background: tokens.colors.background.primary, cursor: 'pointer' }}>رفض</button>}
        </div>
      </li>
    ))}
  </ul>
);
