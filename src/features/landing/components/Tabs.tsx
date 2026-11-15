import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Keyboard handling for an ARIA tablist (automatic activation, roving tabindex).
 * RTL: the next tab sits visually to the left, so ArrowLeft/ArrowDown move forward.
 */
export function useTabKeys(count: number, active: number, onChange: (index: number) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const map: Record<string, number> = {
      ArrowLeft: (active + 1) % count, ArrowDown: (active + 1) % count,
      ArrowRight: (active - 1 + count) % count, ArrowUp: (active - 1 + count) % count,
      Home: 0, End: count - 1,
    };
    const next = map[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  };
  const register = (index: number) => (node: HTMLButtonElement | null) => { refs.current[index] = node; };
  return { onKeyDown, register };
}
