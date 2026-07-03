"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 280;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive:   true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function scrollToTop() {
    const start = window.scrollY;
    if (start <= 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      window.scrollTo(0, 0);
      return;
    }

    // Duration scales with distance so short and long scrolls both feel natural.
    const duration = Math.min(585, Math.max(228, start * 0.39));
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      window.scrollTo(0, start * (1 - easeInOutCubic(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={scrollToTop}
      className={cn(
        "fixed left-1/2 z-40 hidden size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-white/95 text-slate-600 shadow-md backdrop-blur-sm transition-[transform,opacity] duration-300 ease-out hover:bg-white hover:text-slate-900 lg:flex",
        // Center within the main content column, ignoring the desktop sidebar (w-60).
        "lg:left-[calc(50%+7.5rem)] lg:bottom-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ArrowUp className="size-4" strokeWidth={2.25} />
    </button>
  );
}
