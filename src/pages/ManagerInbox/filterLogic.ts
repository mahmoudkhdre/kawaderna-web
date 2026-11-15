import type { ManagerInboxRow } from '../../domain/leave/selectors';
import { ApprovalStage, ApprovalStatus, RiskSeverity } from '../../domain/leave/types';
import { riskText, stageLabel, statusLabel, statusStageText } from './labels';

/**
 * Manager Inbox filters (Gap 1: Search / Status / Risk / SLA).
 *
 * Pure display logic over rows the selector already produced; it adds no business rule
 * and reads no field outside `ManagerInboxRow`. The option lists are the values the table
 * already prints (status • stage, risk text, overdue flag), so no new taxonomy is invented.
 *
 * Open point, not implemented on purpose: a "due soon" SLA choice. The project has no
 * approved due-soon threshold (see fixtures.ts, CLAUDE.md §24), so SLA filters only on the
 * derived `isOverdue` flag.
 */

export const ALL = 'all';
export type SlaFilter = typeof ALL | 'overdue' | 'not_overdue';

export interface InboxFilters {
  query: string;
  status: string;
  risk: string;
  sla: SlaFilter;
}

export interface FilterOption { value: string; label: string }
export interface InboxFilterOptions { status: FilterOption[]; risk: FilterOption[] }

export const NO_FILTERS: InboxFilters = { query: '', status: ALL, risk: ALL, sla: ALL };

export const SLA_OPTIONS: FilterOption[] = [
  { value: 'overdue', label: 'متأخر' },
  { value: 'not_overdue', label: 'غير متأخر' },
];

const NO_RISK_KEY = 'none';
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Case, diacritics, alef/yaa variants and Arabic-Indic digits must not hide a match. */
export const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();

const statusKey = (row: ManagerInboxRow): string => `${row.approvalStatus}:${row.approvalStage}`;
const riskKey = (row: ManagerInboxRow): string => (row.risk ? row.risk.code : NO_RISK_KEY);

/** Same severity order the selector uses to pick a row's top risk (most severe first). */
const SEVERITY_ORDER = [RiskSeverity.BLOCKED, RiskSeverity.WARNING, RiskSeverity.REVIEW, RiskSeverity.INFO];

const STATUS_ORDER = Object.keys(statusLabel) as ApprovalStatus[];
const STAGE_ORDER = Object.keys(stageLabel) as ApprovalStage[];
const statusRank = (row: ManagerInboxRow): number =>
  STATUS_ORDER.indexOf(row.approvalStatus) * 100 + STAGE_ORDER.indexOf(row.approvalStage);

/** Options come from the rows present, in a fixed domain order, so every option has a result. */
export const buildFilterOptions = (rows: ManagerInboxRow[]): InboxFilterOptions => {
  const status = new Map<string, { rank: number; label: string }>();
  const risk = new Map<string, { rank: number; label: string }>();
  for (const row of rows) {
    if (!status.has(statusKey(row))) status.set(statusKey(row), { rank: statusRank(row), label: statusStageText(row) });
    if (!risk.has(riskKey(row))) {
      risk.set(riskKey(row), { rank: row.risk ? SEVERITY_ORDER.indexOf(row.risk.severity) + 1 : 0, label: riskText(row.risk) });
    }
  }
  return {
    status: [...status.entries()]
      .sort((a, b) => a[1].rank - b[1].rank)
      .map(([value, { label }]) => ({ value, label })),
    risk: [...risk.entries()]
      .sort((a, b) => a[1].rank - b[1].rank || a[1].label.localeCompare(b[1].label, 'ar'))
      .map(([value, { label }]) => ({ value, label })),
  };
};

/** A choice whose rows have all gone (for example after a decision) falls back to "all". */
export const reconcileFilters = (filters: InboxFilters, options: InboxFilterOptions): InboxFilters => ({
  ...filters,
  status: filters.status === ALL || options.status.some((o) => o.value === filters.status) ? filters.status : ALL,
  risk: filters.risk === ALL || options.risk.some((o) => o.value === filters.risk) ? filters.risk : ALL,
});

export const countActiveFilters = (filters: InboxFilters): number =>
  [normalizeSearch(filters.query) !== '', filters.status !== ALL, filters.risk !== ALL, filters.sla !== ALL]
    .filter(Boolean).length;

/** Keeps the incoming order: filtering never reorders the Inbox. */
export const applyInboxFilters = (rows: ManagerInboxRow[], filters: InboxFilters): ManagerInboxRow[] => {
  const query = normalizeSearch(filters.query);
  return rows.filter((row) => {
    if (query && !normalizeSearch(`${row.employeeName} ${row.requestId}`).includes(query)) return false;
    if (filters.status !== ALL && statusKey(row) !== filters.status) return false;
    if (filters.risk !== ALL && riskKey(row) !== filters.risk) return false;
    if (filters.sla === 'overdue' && !row.isOverdue) return false;
    if (filters.sla === 'not_overdue' && row.isOverdue) return false;
    return true;
  });
};
