import { useEffect } from "react";

/**
 * Closes an overlay when Escape is pressed.
 *
 * Modals across the app each rolled their own dismissal, so some could only be
 * closed by finding the ✕ — this keeps the behaviour identical everywhere.
 *
 * @param active  whether the overlay is currently open
 * @param onClose called once per Escape press while open
 */
export function useEscapeKey(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}
