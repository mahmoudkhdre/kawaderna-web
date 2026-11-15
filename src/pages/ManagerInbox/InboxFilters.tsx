import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { formatNumber } from '../../lib/format';
import { tokens } from '../../lib/tokens';
import { ALL, NO_FILTERS, SLA_OPTIONS, countActiveFilters } from './filterLogic';
import type { InboxFilterOptions, InboxFilters as Filters, SlaFilter } from './filterLogic';

/**
 * Gap 1 filter controls: Search, Status, Risk, SLA (Figma 2086:736). On mobile the same
 * controls open from the single «تصفية وبحث» button (Figma 2090:736).
 */
export const FILTER_TOGGLE_LABEL = 'تصفية وبحث';
export const FILTER_EMPTY_TEXT = 'لا توجد طلبات مطابقة للتصفية الحالية';
export const FILTER_CLEAR_LABEL = 'مسح التصفية';

const ALL_LABEL = 'الكل';

const control = {
  width: '100%',
  minHeight: 44,
  padding: '0 12px',
  border: `1px solid ${tokens.colors.border.strong}`,
  borderRadius: tokens.radius.lg,
  background: tokens.colors.background.primary,
  color: tokens.colors.text.primary,
  font: 'inherit',
  fontSize: tokens.fontSizes.sm,
} as const;

const labelStyle = { color: tokens.colors.text.secondary, fontSize: tokens.fontSizes.sm, fontWeight: tokens.fontWeights.medium } as const;

export interface InboxFiltersProps {
  filters: Filters;
  options: InboxFilterOptions;
  total: number;
  shown: number;
  onChange: (next: Filters) => void;
}

export const InboxFilters = ({ filters, options, total, shown, onChange }: InboxFiltersProps) => {
  const ids = { search: useId(), status: useId(), risk: useId(), sla: useId(), panel: useId() };
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const select = (key: 'status' | 'risk') => (event: ChangeEvent<HTMLSelectElement>) => set(key, event.target.value);

  return (
    <section aria-label={FILTER_TOGGLE_LABEL} className="mb-4" data-filters="true">
      <button
        type="button"
        data-filter-toggle="true"
        aria-expanded={open}
        aria-controls={ids.panel}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 border px-4 md:hidden"
        style={{
          minHeight: 44,
          // Figma «Filter Button» 2090:736: primary/50 fill with the standard border.
          background: '#EFF6FF',
          borderColor: tokens.colors.border.base,
          borderRadius: tokens.radius.lg,
          color: tokens.colors.text.primary,
          font: 'inherit',
          fontWeight: tokens.fontWeights.medium,
          cursor: 'pointer',
        }}
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal size={16} aria-hidden="true" />
          {FILTER_TOGGLE_LABEL}
        </span>
        {active > 0 && <span data-filter-count="true" style={{ color: tokens.colors.text.secondary }}>{formatNumber(active)}</span>}
      </button>

      <div
        id={ids.panel}
        role="search"
        className={`${open ? 'grid' : 'hidden'} mt-3 gap-3 md:mt-0 md:grid md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] md:items-end`}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.search} style={labelStyle}>بحث</label>
          <input
            id={ids.search}
            type="search"
            data-filter="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="اسم الموظف أو رقم الطلب"
            value={filters.query}
            onChange={(event) => set('query', event.target.value)}
            style={control}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.status} style={labelStyle}>الحالة</label>
          <select id={ids.status} data-filter="status" value={filters.status} onChange={select('status')} style={control}>
            <option value={ALL}>{ALL_LABEL}</option>
            {options.status.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.risk} style={labelStyle}>المخاطر</label>
          <select id={ids.risk} data-filter="risk" value={filters.risk} onChange={select('risk')} style={control}>
            <option value={ALL}>{ALL_LABEL}</option>
            {options.risk.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.sla} style={labelStyle}>الاستحقاق</label>
          <select id={ids.sla} data-filter="sla" value={filters.sla} onChange={(event) => set('sla', event.target.value as SlaFilter)} style={control}>
            <option value={ALL}>{ALL_LABEL}</option>
            {SLA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {active > 0 && (
          <button
            type="button"
            data-filter-clear="true"
            onClick={() => onChange(NO_FILTERS)}
            className="border px-4"
            style={{
              minHeight: 44,
              background: tokens.colors.background.primary,
              borderColor: tokens.colors.border.strong,
              borderRadius: tokens.radius.lg,
              color: tokens.colors.text.primary,
              font: 'inherit',
              fontSize: tokens.fontSizes.sm,
              cursor: 'pointer',
            }}
          >
            {FILTER_CLEAR_LABEL}
          </button>
        )}
      </div>

      <p
        role="status"
        aria-live="polite"
        data-filter-summary="true"
        className="m-0 mt-2"
        style={{ color: tokens.colors.text.secondary, fontSize: tokens.fontSizes.sm, minHeight: '1.25rem' }}
      >
        {active > 0 ? `النتائج: ${formatNumber(shown)} من ${formatNumber(total)}` : ''}
      </p>
    </section>
  );
};
