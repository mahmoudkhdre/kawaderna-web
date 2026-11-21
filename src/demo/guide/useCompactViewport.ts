import { useSyncExternalStore } from 'react';

/** The phone layout of the guide (O-2). Same breakpoint as the mobile rules in `guide.css` and the app's `md:` switch. */
export const COMPACT_QUERY = '(max-width: 767px)';

const mediaQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(COMPACT_QUERY) : null;

const subscribe = (notify: () => void) => {
  const query = mediaQuery();
  if (!query) return () => {};
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};

/** Event driven (no timers). Without `matchMedia` (tests, old engines) the full layout is used. */
export const useCompactViewport = (): boolean =>
  useSyncExternalStore(subscribe, () => mediaQuery()?.matches ?? false, () => false);
