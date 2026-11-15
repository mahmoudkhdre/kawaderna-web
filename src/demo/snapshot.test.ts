import { describe, expect, it, vi } from 'vitest';
import { INBOX_NOW } from '../domain/leave/fixtures';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './session';
import { createBaselineState } from './state';
import {
  DEMO_STORAGE_KEY, getSessionStorage, loadDemoSnapshot, saveDemoSnapshot, serializeDemoSnapshot,
} from './snapshot';
import type { SerializedDemoSnapshot } from './snapshot';
import { memoryStorage } from './test-support';

const fixture = () => ({ ...createBaselineState(), session: DEMO_ACCOUNTS[0] });
const wire = (): SerializedDemoSnapshot => JSON.parse(serializeDemoSnapshot(fixture()));
describe('T006 versioned date-safe snapshots', () => {
  it('round-trips the complete baseline, derives identity and stores exactly persona/loginId', () => {
    const storage = memoryStorage();
    const state = fixture();
    expect(saveDemoSnapshot(state, storage)).toEqual({ ok: true });
    expect(loadDemoSnapshot(storage)).toMatchObject({ state, source: 'snapshot', showRecoveryNotice: false });
    const raw = storage.values.get(DEMO_STORAGE_KEY)!;
    expect(JSON.parse(raw).session).toEqual({ persona: 'manager', loginId: 'manager-demo' });
    expect(raw).not.toContain(DEMO_PASSWORD);
    expect(JSON.parse(raw).session.actorId).toBeUndefined();
    expect(loadDemoSnapshot(storage).state.session).toEqual(DEMO_ACCOUNTS[0]);
  });
  it('round-trips every nested declared Date, including optional route/attachment fields', () => {
    const state = fixture();
    state.requests[0] = {
      ...state.requests[0], submittedAt: INBOX_NOW, slaDueAt: INBOX_NOW,
      partialDayDetails: { startTime: '09:00', endTime: '12:00', hours: 3 },
      attachmentMetadata: [{ id: 'sample', filename: 'sample.pdf', size: 42, uploadedAt: INBOX_NOW, visibilityLevel: 'hr' }],
      approvalPath: [{ order: 1, ownerRole: 'manager', status: 'approved', decidedAt: INBOX_NOW }],
    };
    const storage = memoryStorage();
    expect(saveDemoSnapshot(state, storage).ok).toBe(true);
    const restored = loadDemoSnapshot(storage).state;
    expect(restored).toEqual(state);
    let dates = 0;
    const assertDates = (original: unknown, decoded: unknown) => {
      if (original instanceof Date) { expect(decoded).toBeInstanceOf(Date); expect(decoded).toEqual(original); dates++; }
      else if (Array.isArray(original)) original.forEach((item, i) => assertDates(item, (decoded as unknown[])[i]));
      else if (original && typeof original === 'object') for (const [key, value] of Object.entries(original)) {
        assertDates(value, (decoded as Record<string, unknown>)[key]);
      }
    };
    assertDates(state, restored);
    expect(dates).toBeGreaterThan(40);
  });
  it.each([
    ['unsupported version', (value: SerializedDemoSnapshot) => Object.assign(value, { schemaVersion: 99 })],
    ['unknown persona', (value: SerializedDemoSnapshot) => Object.assign(value.session!, { persona: 'auditor' })],
    ['employee persona mismatch', (value: SerializedDemoSnapshot) => Object.assign(value.session!, { persona: 'employee' })],
    ['unknown login ID', (value: SerializedDemoSnapshot) => Object.assign(value.session!, { loginId: 'unknown' })],
    ['persona mismatch', (value: SerializedDemoSnapshot) => Object.assign(value.session!, { persona: 'hr' })],
    ['persisted actor injection', (value: SerializedDemoSnapshot) => Object.assign(value.session!, { actorId: 'other' })],
    ['persisted password', (value: SerializedDemoSnapshot) => Object.assign(value.session!, { password: DEMO_PASSWORD })],
    ['empty list', (value: SerializedDemoSnapshot) => { value.requests = []; }],
    ['duplicate IDs', (value: SerializedDemoSnapshot) => { value.requests[1].requestId = value.requests[0].requestId; }],
    ['missing field', (value: SerializedDemoSnapshot) => { Reflect.deleteProperty(value.requests[0], 'approvalPath'); }],
    ['unknown field / future Date guard', (value: SerializedDemoSnapshot) => { Object.assign(value.requests[0], { futureDate: INBOX_NOW }); }],
    ['bad savedAt', (value: SerializedDemoSnapshot) => { value.savedAt = 'not a date'; }],
    ['invalid date', (value: SerializedDemoSnapshot) => { value.requests[1].updatedAt = '2026-02-30T07:00:00.000Z'; }],
    ['nested invalid date', (value: SerializedDemoSnapshot) => { value.requests[0].auditHistory[0].timestamp = 'invalid'; }],
  ])('recovers the whole snapshot on %s', (_name, corrupt) => {
    const value = wire(); corrupt(value);
    const storage = memoryStorage(); storage.values.set(DEMO_STORAGE_KEY, JSON.stringify(value));
    expect(loadDemoSnapshot(storage)).toMatchObject({
      state: createBaselineState(), source: 'recovery', recoveryReason: 'invalid_snapshot', showRecoveryNotice: true,
    });
  });
  it('handles malformed JSON, missing snapshot and unavailable reads without partial hydration', () => {
    const storage = memoryStorage();
    expect(loadDemoSnapshot(storage)).toMatchObject({ source: 'baseline', state: createBaselineState() });
    storage.values.set(DEMO_STORAGE_KEY, '{');
    expect(loadDemoSnapshot(storage)).toMatchObject({ source: 'recovery', recoveryReason: 'malformed_json', state: createBaselineState() });
    expect(loadDemoSnapshot(null)).toMatchObject({ storageAvailable: false, state: createBaselineState() });
    expect(loadDemoSnapshot({ ...storage, getItem: () => { throw new Error('denied'); } })).toMatchObject({ storageAvailable: false });
  });
  it('reports quota/blocked writes, removes a stale snapshot if possible, and rejects uncovered Dates', () => {
    const storage = memoryStorage();
    saveDemoSnapshot(fixture(), storage);
    const unavailable = { ...storage, setItem: () => { throw new Error('quota'); } };
    expect(saveDemoSnapshot(fixture(), unavailable)).toEqual({ ok: false, error: 'storage_unavailable' });
    expect(storage.values.has(DEMO_STORAGE_KEY)).toBe(false);
    expect(saveDemoSnapshot(fixture(), null).ok).toBe(false);
    const state = fixture();
    state.requests[0].auditHistory[0].details = { futureDate: INBOX_NOW };
    expect(saveDemoSnapshot(state, storage)).toEqual({ ok: false, error: 'invalid_state' });
  });
  it('guards access to a throwing browser sessionStorage getter', () => {
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('blocked'); } });
    try { expect(getSessionStorage()).toBeNull(); } finally { vi.unstubAllGlobals(); }
  });
});
