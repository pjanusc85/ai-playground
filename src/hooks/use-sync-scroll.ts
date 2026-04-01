"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export function useSyncScroll(panelCount: number) {
  const [enabled, setEnabled] = useState(false);
  const scrollRefs = useRef<(HTMLDivElement | null)[]>(
    Array(panelCount).fill(null)
  );
  const isScrollingRef = useRef(false);

  const setRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      scrollRefs.current[index] = el;
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = (sourceIndex: number) => () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;

      const source = scrollRefs.current[sourceIndex];
      if (!source) {
        isScrollingRef.current = false;
        return;
      }

      const scrollTop = source.scrollTop;

      scrollRefs.current.forEach((ref, i) => {
        if (i !== sourceIndex && ref) {
          ref.scrollTop = scrollTop;
        }
      });

      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    const handlers = scrollRefs.current.map((ref, i) => {
      const handler = handleScroll(i);
      ref?.addEventListener("scroll", handler, { passive: true });
      return { ref, handler };
    });

    return () => {
      handlers.forEach(({ ref, handler }) => {
        ref?.removeEventListener("scroll", handler);
      });
    };
  }, [enabled]);

  return { enabled, setEnabled, setRef };
}
