import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { ManagerInboxRow } from '../../domain/leave/selectors';
import { tokens } from '../../lib/tokens';
import { ACTIONABLE_LABEL, OPEN_DETAIL_LABEL, OVERDUE_LABEL, riskText } from './labels';

export const RequestId = ({ id }: { id: string }) => (
  <span className="ltr-isolated" style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.text.secondary, whiteSpace: 'nowrap' }}>
    {id}
  </span>
);

export const RiskIndicator = ({ risk }: { risk: ManagerInboxRow['risk'] }) => {
  const Icon = risk ? AlertTriangle : CheckCircle2;
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ fontWeight: tokens.fontWeights.medium, color: risk ? tokens.colors.text.primary : tokens.colors.text.secondary }}
      data-risk={risk ? risk.code : 'none'}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{riskText(risk)}</span>
    </span>
  );
};

export const OverdueBadge = () => (
  <span
    className="inline-flex items-center gap-1"
    style={{ color: tokens.colors.destructive.base, fontWeight: tokens.fontWeights.medium }}
    data-overdue="true"
  >
    <Clock size={16} aria-hidden="true" />
    <span>{OVERDUE_LABEL}</span>
  </span>
);

export const ActionableMark = () => (
  <span style={{ color: tokens.colors.primary.base, fontWeight: tokens.fontWeights.medium }} data-actionable="true">
    {ACTIONABLE_LABEL}
  </span>
);

/** Opens the read-only detail. Looks like the plain name it replaces (Gap 1 visuals unchanged). */
export const OpenDetailButton = ({ name, requestId, onOpen }: {
  name: string; requestId: string; onOpen?: (requestId: string) => void;
}) =>
  onOpen ? (
    <button
      type="button"
      data-open-detail="true"
      aria-label={`${OPEN_DETAIL_LABEL}: ${name} رقم ${requestId}`}
      onClick={() => onOpen(requestId)}
      className="m-0 border-0 bg-transparent p-0 text-start max-md:inline-flex max-md:min-h-11 max-md:items-center"
      style={{ font: 'inherit', fontWeight: 'inherit', color: 'inherit', cursor: 'pointer' }}
    >
      {name}
    </button>
  ) : (
    <>{name}</>
  );
