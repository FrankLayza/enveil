import { useEffect, useRef } from "react";

/**
 * Adds `.in-view` to the element when it scrolls into view, triggering the
 * `.stagger` fade-up animation. One-shot (unobserves after firing).
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
