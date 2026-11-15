import { useEffect, useRef, useState } from 'react';

/**
 * Adds `is-visible` once the element's top edge is above 92% of the viewport height — i.e. when it
 * enters the viewport *or has already been scrolled past*.
 *
 * Position-based on purpose: an IntersectionObserver only reports threshold crossings, so an element
 * skipped by a fast scroll, a scrollbar drag or an anchor jump never fires and would stay invisible,
 * leaving a blank band. Content is visible by default if the node is missing.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) { setVisible(true); return; }
    let frame = 0;
    const check = () => {
      frame = 0;
      if (node.getBoundingClientRect().top < window.innerHeight * 0.92) { setVisible(true); cleanup(); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    function cleanup() {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    check();
    return cleanup;
  }, []);
  return { ref, visible };
}
