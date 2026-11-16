"use client";

import { useEffect } from "react";

/** Height of one lawn tile in px; must match --lawn-tile in globals.css. */
const TILE = 260;
/** How fast the lawn moves relative to the page (0 = fixed, 1 = scrolls with content). */
const PARALLAX = 0.35;

/**
 * Publishes scroll state as CSS variables on <html> so purely-CSS pieces
 * (lawn backdrop, header mow-progress, hero mower) can react to scrolling:
 *   --lawn-shift      px offset for the parallax lawn (wraps every tile)
 *   --scroll-y        unitless scrollY (0 with reduced motion)
 *   --scroll-progress 0 → 1 through the page
 */
export function ScrollFx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll-progress", (max > 0 ? Math.min(1, y / max) : 0).toFixed(4));
      if (reduce.matches) {
        root.style.setProperty("--lawn-shift", "0px");
        root.style.setProperty("--scroll-y", "0");
      } else {
        root.style.setProperty("--lawn-shift", `${-((y * PARALLAX) % TILE)}px`);
        root.style.setProperty("--scroll-y", String(Math.round(y)));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
