/**
 * Site-wide mowed-lawn background. Fixed to the viewport; the stripe layer is
 * one tile taller than the screen and slides by --lawn-shift (set by ScrollFx),
 * so it drifts slower than the page and never shows an edge.
 */
export function LawnBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-lawn-base">
      <div
        className="lawn-tiles absolute inset-x-0 top-0 will-change-transform"
        style={{ height: "calc(100% + var(--lawn-tile))" }}
      />
      <div className="lawn-grain absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(20_45_25/0.45)_100%)]" />
    </div>
  );
}
