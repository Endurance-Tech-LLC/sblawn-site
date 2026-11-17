"use client";

import { useEffect, useRef } from "react";

/**
 * A full-width strip between home-page sections. As the strip scrolls up the
 * screen, the mower drives across (`direction`) and leaves a freshly cut stripe
 * behind it. `tone` alternates light/dark rows down the page, like real mowing.
 *
 * Progress is written to --mow (0 → 1) on the element; layout is pure CSS.
 * While the mower is actually moving, the row gets `is-mowing`, which turns on
 * the engine rumble and the spray of grass clippings (see globals.css).
 */

/** Clippings thrown out the back of the deck: drift (px), peak height (px), spin, delay, color. */
const CLIPPINGS = [
  { dx: -50, dy: -30, r: 220, d: 0, c: "#1f5a24" },
  { dx: -78, dy: -20, r: -160, d: 0.05, c: "#d9f5d2" },
  { dx: -34, dy: -40, r: 300, d: 0.1, c: "#2f7a33" },
  { dx: -64, dy: -34, r: -260, d: 0.15, c: "#b9ecb0" },
  { dx: -42, dy: -16, r: 180, d: 0.2, c: "#1f5a24" },
  { dx: -86, dy: -28, r: -320, d: 0.25, c: "#d9f5d2" },
  { dx: -28, dy: -26, r: 140, d: 0.3, c: "#2f7a33" },
  { dx: -58, dy: -44, r: -200, d: 0.35, c: "#b9ecb0" },
  { dx: -72, dy: -12, r: 260, d: 0.4, c: "#1f5a24" },
  { dx: -46, dy: -36, r: -120, d: 0.45, c: "#d9f5d2" },
  { dx: -92, dy: -22, r: 340, d: 0.5, c: "#2f7a33" },
  { dx: -36, dy: -30, r: -280, d: 0.55, c: "#b9ecb0" },
];
export function MowRow({ tone, direction }: { tone: "light" | "dark"; direction: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const toLeft = direction === "left";
  // Mower's left edge as --mow goes 0 → 1: it starts fully off one side of the
  // screen, drives in, crosses, and exits fully off the other side.
  const mowerLeft = toLeft
    ? "100% - var(--mow) * (100% + var(--mower-w))"
    : "var(--mow) * (100% + var(--mower-w)) - var(--mower-w)";
  // Cut stripe runs from just under the mower back to the edge it started from.
  const cut = toLeft
    ? { left: `calc(${mowerLeft} + var(--mower-w) * 0.62)`, right: 0 }
    : { left: 0, width: `calc(${mowerLeft} + var(--mower-w) * 0.38)` };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--mow", "1");
      return;
    }

    let frame = 0;
    let last = -1;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      // Start when the strip enters near the bottom; finish ~25% from the top.
      const p = Math.max(0, Math.min(1, (vh * 0.95 - top) / (vh * 0.7)));
      el.style.setProperty("--mow", p.toFixed(4));
      // Engine + clippings only while the mower is moving mid-row.
      if (last >= 0 && p !== last && p > 0 && p < 1) {
        el.classList.add("is-mowing");
        clearTimeout(idle);
        idle = setTimeout(() => el.classList.remove("is-mowing"), 220);
      }
      last = p;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      clearTimeout(idle);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`mow-row mow-row--${tone} relative my-10 h-24 sm:my-16 overflow-hidden [--mow:0] [--mower-w:150px] sm:h-28 sm:[--mower-w:180px]`}
    >
      <div className="mow-row__cut absolute inset-y-0" style={cut} />
      {/* The SVG faces right; flip the whole rig when driving left so the roller
          and clippings always trail behind. */}
      <div
        className={`absolute bottom-1 aspect-[5/3] w-[var(--mower-w)] ${toLeft ? "-scale-x-100" : ""}`}
        style={{ left: `calc(${mowerLeft})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
        <img
          src="/mower.svg"
          alt=""
          width={400}
          height={240}
          className="mow-row__mower h-full w-full max-w-none drop-shadow-[0_10px_8px_rgb(15_40_20/0.45)]"
        />
        {/* Discharge point at the back of the deck. */}
        <div className="absolute left-[36%] top-[70%]">
          {CLIPPINGS.map((k, i) => (
            <span
              key={i}
              className="mow-row__clip"
              style={
                {
                  "--dx": `${k.dx}px`,
                  "--dy": `${k.dy}px`,
                  "--r": `${k.r}deg`,
                  animationDelay: `${k.d}s`,
                  background: k.c,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
