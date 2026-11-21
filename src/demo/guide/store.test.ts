import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GUIDE, GUIDE_STORAGE_KEY, loadGuide, saveGuide } from './storage';
import { createGuideStore } from './store';
import type { DemoStorage } from '../snapshot';

const memory = (): DemoStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
};

describe('guide storage (separate minimal key, fails safe)', () => {
  it('uses its own versioned key and stores only mode, requestId and collapsed', () => {
    const storage = memory();
    const store = createGuideStore(storage);
    store.start();
    store.captureSubmitted('LV-2026-107');
    expect(GUIDE_STORAGE_KEY).toBe('kawaderna.demo.guide.v1');
    expect(Object.keys(JSON.parse(storage.data.get(GUIDE_STORAGE_KEY)!)).sort()).toEqual(['collapsed', 'mode', 'requestId', 'v']);
    expect([...storage.data.keys()]).toEqual([GUIDE_STORAGE_KEY]);
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong version', JSON.stringify({ v: 2, mode: 'guided', requestId: null, collapsed: false })],
    ['unknown mode', JSON.stringify({ v: 1, mode: 'x', requestId: null, collapsed: false })],
    ['extra field (e.g. a copied reason)', JSON.stringify({ v: 1, mode: 'guided', requestId: null, collapsed: false, reason: 'سبب' })],
    ['not a request id', JSON.stringify({ v: 1, mode: 'guided', requestId: '<script>', collapsed: false })],
    ['array', '[]'],
  ])('falls back to "nothing chosen" for %s', (_name, raw) => {
    const storage = memory();
    storage.data.set(GUIDE_STORAGE_KEY, raw);
    expect(loadGuide(storage)).toEqual(DEFAULT_GUIDE);
  });

  it('survives a throwing or missing storage without breaking the demo', () => {
    const broken: DemoStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(loadGuide(broken)).toEqual(DEFAULT_GUIDE);
    expect(saveGuide({ ...DEFAULT_GUIDE, mode: 'guided' }, broken)).toBe(false);
    const store = createGuideStore(broken);
    expect(() => { store.start(); store.reset(); }).not.toThrow();
    expect(createGuideStore(null).getSnapshot()).toEqual(DEFAULT_GUIDE);
  });

  it('restores mode and tracked request after a reload (new store over the same storage)', () => {
    const storage = memory();
    const first = createGuideStore(storage);
    first.start();
    first.captureSubmitted('LV-2026-107');
    expect(createGuideStore(storage).getSnapshot()).toEqual({ v: 1, mode: 'guided', requestId: 'LV-2026-107', collapsed: false });
  });
});

describe('guide store behaviour', () => {
  it('starting the tour changes only the preference', () => {
    const store = createGuideStore(memory());
    store.start();
    expect(store.getSnapshot()).toEqual({ v: 1, mode: 'guided', requestId: null, collapsed: false });
  });

  it('captures a new request only while guided and while nothing is tracked (never the "latest")', () => {
    const store = createGuideStore(memory());
    store.captureSubmitted('LV-2026-107'); // not guided yet
    expect(store.getSnapshot().requestId).toBeNull();
    store.start();
    store.captureSubmitted('LV-2026-107');
    store.captureSubmitted('LV-2026-108'); // second request must not steal the tour
    expect(store.getSnapshot().requestId).toBe('LV-2026-107');
    store.track('LV-2026-108'); // explicit choice only
    expect(store.getSnapshot().requestId).toBe('LV-2026-108');
  });

  it('skipping hides the guide but keeps the tracked request so resuming returns to it', () => {
    const store = createGuideStore(memory());
    store.start();
    store.captureSubmitted('LV-2026-107');
    store.skip();
    expect(store.getSnapshot()).toMatchObject({ mode: 'free', requestId: 'LV-2026-107' });
    store.start();
    expect(store.getSnapshot()).toMatchObject({ mode: 'guided', requestId: 'LV-2026-107' });
  });

  it('"try another path" forgets the tracked request and keeps the tour on', () => {
    const store = createGuideStore(memory());
    store.start();
    store.captureSubmitted('LV-2026-107');
    store.clearTracking();
    expect(store.getSnapshot()).toMatchObject({ mode: 'guided', requestId: null });
  });

  it('reset removes the key and offers the entry choice again; nothing else is touched', () => {
    const storage = memory();
    storage.data.set('kawaderna.demo.snapshot.v1', 'keep-me');
    const store = createGuideStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.start();
    store.reset();
    expect(storage.data.has(GUIDE_STORAGE_KEY)).toBe(false);
    expect(storage.data.get('kawaderna.demo.snapshot.v1')).toBe('keep-me');
    expect(store.getSnapshot()).toEqual(DEFAULT_GUIDE);
    expect(listener).toHaveBeenCalled();
  });

  it('notifies subscribers only on a real change', () => {
    const store = createGuideStore(memory());
    const listener = vi.fn();
    store.subscribe(listener);
    store.captureSubmitted('LV-2026-107'); // ignored: not guided
    expect(listener).not.toHaveBeenCalled();
    store.start();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('A: the guide is shown for the guided choice and hidden for free exploration, and respects the saved panel preference', () => {
  it('guided keeps a saved collapsed preference; free hides the guide without touching it', () => {
    const storage = memory();
    const store = createGuideStore(storage);
    store.setCollapsed(true);
    store.start();
    expect(store.getSnapshot()).toMatchObject({ mode: 'guided', collapsed: true });
    store.skip();
    expect(store.getSnapshot()).toMatchObject({ mode: 'free', collapsed: true });
    store.start();
    store.setCollapsed(false);
    expect(store.getSnapshot()).toMatchObject({ mode: 'guided', collapsed: false });
  });
  it('a fresh visit starts with the panel open, and opening or folding it never touches the tracked request', () => {
    const store = createGuideStore(memory());
    expect(store.getSnapshot()).toMatchObject({ mode: null, collapsed: false, requestId: null });
    store.start();
    store.captureSubmitted('LV-2026-107');
    store.setCollapsed(true);
    store.setCollapsed(false);
    expect(store.getSnapshot()).toMatchObject({ mode: 'guided', requestId: 'LV-2026-107', collapsed: false });
  });
});
