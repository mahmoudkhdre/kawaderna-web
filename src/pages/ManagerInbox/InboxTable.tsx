import type { ManagerInboxRow } from '../../domain/leave/selectors';
import { formatDateRange, formatDays } from '../../lib/format';
import { tokens } from '../../lib/tokens';
import {
  leaveTypeLabel, nextActionLabel, NO_VALUE, ownerLabel, statusStageText,
} from './labels';
import { REJECT_COLORS } from './rejectionColors';
import { isActionable } from './rowState';
import { ActionableMark, OpenDetailButton, OverdueBadge, RequestId, RiskIndicator } from './RowParts';

const HEADERS = [
  'الموظف', 'نوع الإجازة', 'التواريخ', 'المدة', 'الحالة والمرحلة',
  'المسؤول', 'الإجراء التالي', 'المخاطر', 'التنبيه',
];

export const InboxTable = ({ rows, onOpen, onReviewApprove, onReject }: { rows: ManagerInboxRow[]; onOpen?: (requestId: string) => void; onReviewApprove?: (requestId: string) => void; onReject?: (row: ManagerInboxRow, opener: HTMLElement) => void }) => (
  <div className="hidden md:block" data-layout="table">
    <table className="w-full border-collapse text-start" style={{ fontSize: tokens.fontSizes.sm }}>
      <thead>
        <tr style={{ background: tokens.colors.background.secondary, color: tokens.colors.text.secondary }}>
          {HEADERS.map((h) => (
            <th
              key={h}
              scope="col"
              className="px-2 py-3 xl:px-3 text-start"
              style={{ fontWeight: tokens.fontWeights.medium, borderBottom: `1px solid ${tokens.colors.border.base}` }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.requestId}
            data-request-id={row.requestId}
            data-muted={isActionable(row) ? undefined : 'true'}
            style={{
              borderBottom: `1px solid ${tokens.colors.border.base}`,
              // Non-actionable rows use the secondary text colour, not opacity: opacity drove IDs to 2.19:1.
              color: isActionable(row) ? undefined : tokens.colors.text.secondary,
            }}
          >
            <td className="px-2 py-3 xl:px-3 align-top">
              <div style={{ fontWeight: tokens.fontWeights.bold }}>
                <OpenDetailButton name={row.employeeName} requestId={row.requestId} onOpen={onOpen} />
              </div>
              <RequestId id={row.requestId} />
            </td>
            <td className="px-2 py-3 xl:px-3 align-top">{leaveTypeLabel[row.leaveType]}</td>
            <td className="px-2 py-3 xl:px-3 align-top">{formatDateRange(row.startDate, row.endDate)}</td>
            <td className="px-2 py-3 xl:px-3 align-top">
              {formatDays(row.durationWorkingDays)}
              {row.isPartialDay ? ' (جزء من يوم)' : ''}
            </td>
            <td className="px-2 py-3 xl:px-3 align-top">{statusStageText(row)}</td>
            <td className="px-2 py-3 xl:px-3 align-top">
              {row.currentOwnerRole ? ownerLabel[row.currentOwnerRole] : NO_VALUE}
            </td>
            <td className="px-2 py-3 xl:px-3 align-top">
              {row.nextAction ? nextActionLabel[row.nextAction] : NO_VALUE}
              {isActionable(row) && <div><ActionableMark /></div>}
              <div className="mt-1 flex flex-wrap gap-2">
                {onReviewApprove && row.canApprove && <button type="button" data-action="review-approve" aria-label={`موافقة على طلب ${row.employeeName} رقم ${row.requestId} — مراجعة التفاصيل`} onClick={() => onReviewApprove(row.requestId)} className="min-h-11 rounded-lg border px-3 py-2" style={{ borderColor: '#1D4ED8', color: tokens.colors.text.inverse, background: '#1D4ED8', cursor: 'pointer' }}>موافقة</button>}
                {onReject && row.canReject && <button type="button" data-action="reject" aria-label={`رفض طلب ${row.employeeName} رقم ${row.requestId}`} onClick={(event) => onReject(row, event.currentTarget)} className="min-h-11 rounded-lg border px-3 py-2" style={{ borderColor: REJECT_COLORS.destructive, color: REJECT_COLORS.destructive, background: tokens.colors.background.primary, cursor: 'pointer' }}>رفض</button>}
              </div>
            </td>
            <td className="px-2 py-3 xl:px-3 align-top"><RiskIndicator risk={row.risk} /></td>
            <td className="px-2 py-3 xl:px-3 align-top">{row.isOverdue ? <OverdueBadge /> : NO_VALUE}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
