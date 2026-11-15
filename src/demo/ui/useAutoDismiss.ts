import { useEffect, useRef } from 'react';

/**
 * Auto-dismiss timer that survives pauses: a new `resetKey` restarts the full duration, `paused` freezes the
 * remaining time and resumes with what is left (hover or focus-within). Presentation-only; no domain state.
 */
export const useAutoDismiss = (resetKey: number | null, durationMs: number, paused: boolean, onElapsed: () => void) => {
  const remaining = useRef(durationMs);
  const lastKey = useRef<number | null>(null);
  const elapsed = useRef(onElapsed);
  useEffect(() => { elapsed.current = onElapsed; });
  useEffect(() => {
    if (resetKey === null) { lastKey.current = null; return; }
    if (lastKey.current !== resetKey) { lastKey.current = resetKey; remaining.current = durationMs; }
    if (paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => elapsed.current(), remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt)); };
  }, [resetKey, durationMs, paused]);
};
