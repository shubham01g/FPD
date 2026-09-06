/**
 * useConfirmDelete — one confirmation dialog for every "remove this record"
 * button in the app.
 *
 * Most Life Records screens shipped with no delete at all, so the only way
 * to remove a row was to run SQL by hand. The few screens that did have a
 * delete fired it straight from the icon with no confirmation, which is a
 * bad fit for records nobody has a backup of.
 *
 * Deliberately self-styled with inline styles rather than the `.modal` /
 * `.backdrop` classes: those are defined separately inside each screen's
 * own injected CSS, so a shared component relying on them would render
 * differently — or unstyled — depending on where it was mounted.
 *
 * Usage:
 *
 *     const { requestDelete, confirmDialog } = useConfirmDelete();
 *     ...
 *     <button onClick={() => requestDelete({
 *       label: job.title,
 *       onConfirm: () => removeJob(job.id),
 *     })}><Trash2 size={14}/></button>
 *     ...
 *     {confirmDialog}
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useEscapeKey } from "../hooks/useEscapeKey";

interface DeleteRequest {
  /** Shown in quotes so the user can see what they are about to lose. */
  label: string;
  /** What kind of thing this is, e.g. "job". Defaults to "record". */
  noun?: string;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDelete() {
  const [pending, setPending] = useState<DeleteRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => { if (!busy) setPending(null); }, [busy]);
  useEscapeKey(pending !== null, close);

  // Cancel is focused rather than Delete, so a stray Enter dismisses
  // instead of destroying.
  useEffect(() => { if (pending) cancelRef.current?.focus(); }, [pending]);

  const requestDelete = useCallback((req: DeleteRequest) => setPending(req), []);

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.onConfirm();
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  const confirmDialog = pending ? (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(6,10,18,0.72)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "max(16px, env(safe-area-inset-left))",
      }}>
      <div role="alertdialog" aria-modal="true" aria-label={`Delete ${pending.noun ?? "record"}`}
        style={{
          width: "min(420px, 100%)", borderRadius: 18, overflow: "hidden",
          background: "#141B2D", border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}>
        <div style={{ display: "flex", gap: 13, padding: "22px 22px 6px" }}>
          <div style={{
            flexShrink: 0, width: 38, height: 38, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(252,129,129,0.12)",
          }}>
            <AlertTriangle size={18} color="#FC8181" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#EFF2F9", fontSize: 17.5, fontWeight: 600 }}>
              Delete this {pending.noun ?? "record"}?
            </div>
            <div style={{ color: "#A3ADC9", fontSize: 15, lineHeight: 1.55, marginTop: 6, overflowWrap: "anywhere" }}>
              {pending.label ? <><strong style={{ color: "#EFF2F9", fontWeight: 600 }}>{pending.label}</strong> will be permanently removed. </> : null}
              This cannot be undone.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", padding: "18px 22px 22px" }}>
          <button
            ref={cancelRef}
            onClick={close}
            disabled={busy}
            style={{
              minHeight: 44, padding: "0 18px", borderRadius: 12, cursor: "pointer",
              background: "transparent", color: "#BCC5DA",
              border: "1px solid rgba(255,255,255,0.14)", fontSize: 15, fontWeight: 600,
            }}>
            Cancel
          </button>
          <button
            onClick={() => void confirm()}
            disabled={busy}
            style={{
              minHeight: 44, padding: "0 18px", borderRadius: 12,
              cursor: busy ? "wait" : "pointer", border: "none",
              background: "#C25454", color: "#fff", fontSize: 15, fontWeight: 600,
              opacity: busy ? 0.7 : 1,
            }}>
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { requestDelete, confirmDialog };
}
