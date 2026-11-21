import { useSyncExternalStore } from 'react';
import { getSessionStorage } from '../snapshot';
import type { DemoStorage } from '../snapshot';
import { clearGuideStorage, loadGuide, saveGuide } from './storage';
import type { GuideStored } from './types';

/**
 * Owner of the guide preference. Framework-free so it can be tested like the demo controller.
 * It never touches the demo controller, the session or the requests: it only remembers
 * "guided or free", "which request", and "panel collapsed".
 */
export const createGuideStore = (storage: DemoStorage | null = getSessionStorage()) => {
  let state: GuideStored = loadGuide(storage);
  const listeners = new Set<() => void>();
  const set = (next: GuideStored) => {
    if (next === state) return;
    state = next;
    saveGuide(state, storage);
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Start or resume the tour. Does not create a request, sign anyone in or touch existing requests. */
    start: () => set({ ...state, mode: 'guided' }),
    /** Hide the guide only (free exploration, or skipping). The tracked request is kept so resuming returns to it. */
    skip: () => set({ ...state, mode: 'free' }),
    /** Follow exactly this request. Explicit choice only. */
    track: (requestId: string) => set({ ...state, mode: 'guided', requestId }),
    /**
     * Called with a request that was just created successfully. Captured only while the tour is on and nothing
     * is tracked yet, so a second request never silently steals the tour.
     */
    captureSubmitted: (requestId: string) => { if (state.mode === 'guided' && state.requestId === null) set({ ...state, requestId }); },
    /** "Try another path": forget the tracked request, keep the tour on. Requests themselves are untouched. */
    clearTracking: () => set({ ...state, mode: 'guided', requestId: null }),
    setCollapsed: (collapsed: boolean) => set({ ...state, collapsed }),
    /** Only after a CONFIRMED demo reset. Removes the key, so the entry choice is offered again. */
    reset: () => {
      state = { v: 1, mode: null, requestId: null, collapsed: false };
      clearGuideStorage(storage);
      listeners.forEach(listener => listener());
    },
  };
};

export type GuideStore = ReturnType<typeof createGuideStore>;

export const useGuideStore = (store: GuideStore): GuideStored => useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
