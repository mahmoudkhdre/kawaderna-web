import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { BalanceSufficiency } from '../../domain/leave/selectors';
import type { ManagerRequestDetail } from '../../domain/leave/selectors';
import { formatDateRange, formatDateTime, formatDays } from '../../lib/format';
import { tokens } from '../../lib/tokens';
import {
  auditEventLabel, balanceLabel, decisionLabel, leaveTypeLabel, LOW_BALANCE_HR_PATH,
  NO_AUDIT_LABEL, NO_RISK_DETAIL, NO_VALUE, nextActionLabel, ownerLabel, processingLabel,
  routeConsequenceLabel, routeRoleLabel, routeStateLabel, sectionTitle, severityLabel,
  stageLabel, statusLabel, STALE_LABEL, summaryFieldLabel,
} from './labels';
import { OverdueBadge, RequestId } from './RowParts';

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section aria-labelledby={id} data-section={id} className="flex flex-col gap-2 py-4"
    style={{ borderBottom: `1px solid ${tokens.colors.border.base}` }}>
    <h3 id={id} className="m-0" style={{ fontSize: tokens.fontSizes.base, fontWeight: tokens.fontWeights.bold }}>
      {title}
    </h3>
    {children}
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-wrap justify-between gap-x-3">
    <dt style={{ color: tokens.colors.text.secondary }}>{label}</dt>
    <dd className="m-0 min-w-0" style={{ fontWeight: tokens.fontWeights.medium }}>{children}</dd>
  </div>
);

const Fields = ({ children }: { children: ReactNode }) => (
  <dl className="m-0 flex flex-col gap-2" style={{ fontSize: tokens.fontSizes.sm }}>{children}</dl>
);

export const ContextSection = ({ d }: { d: ManagerRequestDetail }) => (
  <Section id="context" title={sectionTitle.context}>
    <Fields>
      <Field label="الموظف">{d.context.employeeName}</Field>
      <Field label="رقم الطلب"><RequestId id={d.context.requestId} /></Field>
      <Field label="نوع الإجازة">{leaveTypeLabel[d.context.leaveType]}</Field>
      <Field label="التواريخ">{formatDateRange(d.context.startDate, d.context.endDate)}</Field>
      <Field label="المدة">
        {formatDays(d.context.durationWorkingDays)}
        {d.context.isPartialDay ? ' (جزء من يوم)' : ''}
      </Field>
      {d.context.submittedAt && <Field label="تاريخ التقديم">{formatDateTime(d.context.submittedAt)}</Field>}
    </Fields>
  </Section>
);

export const SummarySection = ({ d }: { d: ManagerRequestDetail }) => {
  const s = d.summary;
  return (
    <Section id="summary" title={sectionTitle.summary}>
      <Fields>
        <Field label={summaryFieldLabel.status}>{statusLabel[s.approvalStatus]}</Field>
        <Field label={summaryFieldLabel.stage}>{stageLabel[s.approvalStage]}</Field>
        <Field label={summaryFieldLabel.processing}>{processingLabel[s.processingStatus]}</Field>
        <Field label={summaryFieldLabel.owner}>{s.currentOwnerRole ? ownerLabel[s.currentOwnerRole] : NO_VALUE}</Field>
        <Field label={summaryFieldLabel.nextAction}>{s.nextAction ? nextActionLabel[s.nextAction] : NO_VALUE}</Field>
      </Fields>
      {(s.isOverdue || s.isStale) && (
        <div className="flex flex-wrap gap-3">
          {s.isOverdue && <OverdueBadge />}
          {s.isStale && (
            <span data-stale="true" style={{ color: tokens.colors.destructive.base, fontWeight: tokens.fontWeights.medium }}>
              {STALE_LABEL}
            </span>
          )}
        </div>
      )}
    </Section>
  );
};

export const RiskSection = ({ d }: { d: ManagerRequestDetail }) => (
  <Section id="risk" title={sectionTitle.risk}>
    {d.risks.length === 0 ? (
      <p className="m-0" style={{ fontSize: tokens.fontSizes.sm }}>{NO_RISK_DETAIL}</p>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-2 p-0" style={{ fontSize: tokens.fontSizes.sm }}>
        {d.risks.map((r) => (
          <li key={r.code} data-risk={r.code} className="flex items-start gap-2">
            <AlertTriangle size={16} aria-hidden="true" className="mt-1 shrink-0" />
            <span>
              <strong>{severityLabel[r.severity]}</strong> • {r.explanationAr}
              {routeConsequenceLabel[r.routeConsequence] && (
                <> • {routeConsequenceLabel[r.routeConsequence]}</>
              )}
            </span>
          </li>
        ))}
      </ul>
    )}
    {d.policies.length > 0 && (
      <ul className="m-0 flex list-none flex-col gap-1 p-0" style={{ fontSize: tokens.fontSizes.sm, color: tokens.colors.text.secondary }}>
        {d.policies.map((p) => <li key={p.ruleCode}>{p.explanationAr}</li>)}
      </ul>
    )}
  </Section>
);

export const BalanceSection = ({ d }: { d: ManagerRequestDetail }) => {
  const insufficient = d.balance.sufficiency === BalanceSufficiency.INSUFFICIENT;
  return (
    <Section id="balance" title={sectionTitle.balance}>
      <p className="m-0" data-balance={d.balance.sufficiency} style={{ fontSize: tokens.fontSizes.sm, fontWeight: tokens.fontWeights.medium }}>
        {balanceLabel[d.balance.sufficiency]}
      </p>
      {insufficient && (
        <p className="m-0" data-low-balance-path="true" style={{ fontSize: tokens.fontSizes.sm }}>
          {LOW_BALANCE_HR_PATH}
        </p>
      )}
    </Section>
  );
};

export const PathSection = ({ d }: { d: ManagerRequestDetail }) => (
  <Section id="path" title={sectionTitle.path}>
    <ol className="m-0 flex list-none flex-col gap-2 p-0" style={{ fontSize: tokens.fontSizes.sm }}>
      {d.route.map((stage) => {
        const Icon = stage.state === 'completed' ? CheckCircle2 : stage.state === 'current' ? CircleDot : Circle;
        return (
          <li key={stage.role} data-route-role={stage.role} data-route-state={stage.state} className="flex items-center gap-2">
            <Icon size={16} aria-hidden="true" className="shrink-0" />
            <span style={{ fontWeight: stage.state === 'current' ? tokens.fontWeights.bold : tokens.fontWeights.regular }}>
              {routeRoleLabel[stage.role]}
            </span>
            <span style={{ color: tokens.colors.text.secondary }}>• {routeStateLabel[stage.state]}</span>
          </li>
        );
      })}
    </ol>
  </Section>
);

export const AuditSection = ({ d }: { d: ManagerRequestDetail }) => (
  <Section id="audit" title={sectionTitle.audit}>
    {d.audit.length === 0 ? (
      <p className="m-0" style={{ fontSize: tokens.fontSizes.sm }}>{NO_AUDIT_LABEL}</p>
    ) : (
      <ol className="m-0 flex list-none flex-col gap-3 p-0" style={{ fontSize: tokens.fontSizes.sm }}>
        {d.audit.map((e, i) => (
          <li key={i} data-audit-type={e.eventType} className="flex flex-col">
            <span style={{ fontWeight: tokens.fontWeights.medium }}>
              {auditEventLabel[e.eventType]}
              {e.decision ? ` • ${decisionLabel[e.decision]}` : ''}
            </span>
            <span style={{ color: tokens.colors.text.secondary }}>
              {ownerLabel[e.actorRole]} • {formatDateTime(e.timestamp)}
            </span>
          </li>
        ))}
      </ol>
    )}
  </Section>
);
