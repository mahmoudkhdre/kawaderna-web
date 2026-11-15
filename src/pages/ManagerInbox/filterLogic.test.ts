import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from '../../domain/leave/fixtures';
import { selectManagerInbox } from '../../domain/leave/selectors';
import {
  ALL, NO_FILTERS, applyInboxFilters, buildFilterOptions, countActiveFilters, normalizeSearch, reconcileFilters,
} from './filterLogic';
import type { InboxFilters } from './filterLogic';

const rows = selectManagerInbox(Object.values(f), 'MGR-2001', INBOX_NOW);
const ids = (filters: Partial<InboxFilters>) =>
  applyInboxFilters(rows, { ...NO_FILTERS, ...filters }).map((r) => r.requestId);
const ALL_IDS = ['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-104', 'LV-2026-105', 'LV-2026-106'];

describe('normalizeSearch', () => {
  it('ignores case, spacing, diacritics, alef and yaa variants, and Arabic-Indic digits', () => {
    expect(normalizeSearch('  LV-2026-101 ')).toBe('lv-2026-101');
    expect(normalizeSearch('أَحْمَد')).toBe('احمد');
    expect(normalizeSearch('إيمان آل')).toBe('ايمان ال');
    expect(normalizeSearch('لـيـلـى')).toBe('ليلي');
    expect(normalizeSearch('LV-٢٠٢٦-١٠٢')).toBe('lv-2026-102');
  });
});

describe('applyInboxFilters', () => {
  it('returns every row, in the original order, when no filter is set', () => {
    expect(ids({})).toEqual(ALL_IDS);
    expect(applyInboxFilters(rows, NO_FILTERS)).toEqual(rows);
  });

  it('does not mutate or reorder its input', () => {
    const before = rows.map((r) => r.requestId);
    applyInboxFilters(rows, { ...NO_FILTERS, status: 'pending:manager', sla: 'overdue' });
    expect(rows.map((r) => r.requestId)).toEqual(before);
  });

  describe('search', () => {
    it('matches the employee name', () => {
      expect(ids({ query: 'سارة' })).toEqual(['LV-2026-102']);
      expect(ids({ query: 'العتيبي' })).toEqual(['LV-2026-103']);
    });
    it('matches the request ID, also typed with Arabic-Indic digits and without hyphens kept in order', () => {
      expect(ids({ query: 'lv-2026-104' })).toEqual(['LV-2026-104']);
      expect(ids({ query: 'LV-٢٠٢٦-١٠٥' })).toEqual(['LV-2026-105']);
      expect(ids({ query: '106' })).toEqual(['LV-2026-106']);
    });
    it('matches names written without hamza or diacritics', () => {
      expect(ids({ query: 'احمد' })).toEqual(['LV-2026-101']);
      expect(ids({ query: 'ليلى' })).toEqual(['LV-2026-106']);
    });
    it('treats a whitespace-only query as no filter and a missing name as no match', () => {
      expect(ids({ query: '   ' })).toEqual(ALL_IDS);
      expect(ids({ query: 'لا أحد' })).toEqual([]);
    });
  });

  describe('status', () => {
    it('filters by approval status and stage together', () => {
      expect(ids({ status: 'pending:manager' })).toEqual(['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-104']);
      expect(ids({ status: 'pending:requester_clarification' })).toEqual(['LV-2026-105']);
      expect(ids({ status: 'pending:escalated' })).toEqual(['LV-2026-106']);
    });
  });

  describe('risk', () => {
    it('separates no risk, low balance and missing information', () => {
      expect(ids({ risk: 'none' })).toEqual(['LV-2026-101', 'LV-2026-103', 'LV-2026-104', 'LV-2026-106']);
      expect(ids({ risk: 'LEAVE_LOW_BALANCE' })).toEqual(['LV-2026-102']);
      expect(ids({ risk: 'LEAVE_MISSING_INFORMATION' })).toEqual(['LV-2026-105']);
    });
  });

  describe('SLA', () => {
    it('uses only the derived overdue flag; due soon is not invented', () => {
      expect(ids({ sla: 'overdue' })).toEqual(['LV-2026-104']);
      expect(ids({ sla: 'not_overdue' })).toEqual(['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-105', 'LV-2026-106']);
    });
  });

  it('combines filters with AND', () => {
    expect(ids({ status: 'pending:manager', risk: 'none', sla: 'not_overdue' })).toEqual(['LV-2026-101', 'LV-2026-103']);
    expect(ids({ query: 'نورة', sla: 'overdue' })).toEqual(['LV-2026-104']);
    expect(ids({ query: 'نورة', sla: 'not_overdue' })).toEqual([]);
    expect(ids({ risk: 'LEAVE_LOW_BALANCE', sla: 'overdue' })).toEqual([]);
  });
});

describe('buildFilterOptions', () => {
  it('offers only the status and risk values present, with the labels the table prints', () => {
    const options = buildFilterOptions(rows);
    expect(options.status).toEqual([
      { value: 'pending:manager', label: 'قيد المراجعة • المدير' },
      { value: 'pending:requester_clarification', label: 'قيد المراجعة • بانتظار توضيح الموظف' },
      { value: 'pending:escalated', label: 'قيد المراجعة • مُصعَّد إلى الموارد البشرية' },
    ]);
    expect(options.risk.map((o) => o.value)).toEqual(['none', 'LEAVE_LOW_BALANCE', 'LEAVE_MISSING_INFORMATION']);
    expect(options.risk[0].label).toBe('لا توجد مشكلة');
  });

  it('is independent of row order', () => {
    expect(buildFilterOptions([...rows].reverse())).toEqual(buildFilterOptions(rows));
  });

  it('gives every offered option at least one result', () => {
    const options = buildFilterOptions(rows);
    for (const o of options.status) expect(ids({ status: o.value }).length).toBeGreaterThan(0);
    for (const o of options.risk) expect(ids({ risk: o.value }).length).toBeGreaterThan(0);
  });
});

describe('reconcileFilters', () => {
  it('resets a status or risk choice whose rows no longer exist, and keeps the rest', () => {
    const options = buildFilterOptions(rows.filter((r) => r.approvalStage !== 'escalated'));
    const stale = reconcileFilters({ query: 'x', status: 'pending:escalated', risk: 'none', sla: 'overdue' }, options);
    expect(stale).toEqual({ query: 'x', status: ALL, risk: 'none', sla: 'overdue' });
  });
});

describe('countActiveFilters', () => {
  it('counts only meaningful filters', () => {
    expect(countActiveFilters(NO_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...NO_FILTERS, query: '   ' })).toBe(0);
    expect(countActiveFilters({ query: 'أ', status: 'pending:manager', risk: ALL, sla: 'overdue' })).toBe(3);
  });
});
