/**
 * Reading-progress bar under the header: a little mower drives across and
 * leaves freshly striped grass behind it. Driven by --scroll-progress.
 */
export function MowProgress() {
  return (
    <div aria-hidden className="relative h-2 bg-turf-800/25">
      <div
        className="stripe-rule absolute inset-y-0 left-0"
        style={{ height: "100%", width: "calc(var(--scroll-progress, 0) * (100% - 38px) + 19px)" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative SVG */}
      <img
        src="/mower.svg"
        alt=""
        width={38}
        height={23}
        className="absolute bottom-0 h-[23px] w-[38px] max-w-none"
        style={{ left: "calc(var(--scroll-progress, 0) * (100% - 38px))" }}
      />
    </div>
  );
}
