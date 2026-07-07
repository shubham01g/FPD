// Single app-wide pointer tracker for the `.glow-surface` spotlight utility
// (see src/styles/globals.css). Sets CSS custom properties once on :root so
// any number of glow-surface elements can share one listener instead of
// each registering its own.
export function initGlowCursor() {
  const root = document.documentElement;

  const syncPointer = (e: PointerEvent) => {
    const { clientX: x, clientY: y } = e;
    root.style.setProperty("--x", x.toFixed(2));
    root.style.setProperty("--xp", (x / window.innerWidth).toFixed(4));
    root.style.setProperty("--y", y.toFixed(2));
    root.style.setProperty("--yp", (y / window.innerHeight).toFixed(4));
  };

  document.addEventListener("pointermove", syncPointer, { passive: true });
  return () => document.removeEventListener("pointermove", syncPointer);
}