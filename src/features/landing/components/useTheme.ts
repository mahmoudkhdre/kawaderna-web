import { useCallback, useState } from 'react';

export type LandingTheme = 'light' | 'dark';

const STORAGE_KEY = 'ld-theme';

/** Stored choice only. Browsers can block storage, so every access is guarded; the default is always Light. */
const readStored = (): LandingTheme => {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

/**
 * Landing-only theme. The value is applied as `data-theme` on the `.ld` root, never on `<html>`,
 * so the demo and the rest of the app are unaffected.
 */
export function useLandingTheme() {
  const [theme, setTheme] = useState<LandingTheme>(readStored);
  const toggle = useCallback(() => {
    setTheme(current => {
      const next: LandingTheme = current === 'dark' ? 'light' : 'dark';
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked: the choice lasts for this visit only */ }
      return next;
    });
  }, []);
  return { theme, toggle };
}
