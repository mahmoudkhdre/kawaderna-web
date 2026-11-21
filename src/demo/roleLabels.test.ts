import { describe, expect, it } from 'vitest';
import { actorLabel } from './roleLabels';

describe('actorLabel (DF-02)', () => {
  it('maps confirmed demo actors to a role label with the display name', () => {
    expect(actorLabel('MGR-2001')).toBe('المدير (فاطمة علي)');
    expect(actorLabel('HR-1')).toBe('الموارد البشرية (هند الدوسري)');
    expect(actorLabel('EMP-1201')).toBe('الموظف (مريم صالح)');
  });
  it('never shows an unconfirmed internal id', () => {
    expect(actorLabel('EMP-9999')).toBe('مستخدم النظام');
    expect(actorLabel('')).toBe('مستخدم النظام');
  });
});
