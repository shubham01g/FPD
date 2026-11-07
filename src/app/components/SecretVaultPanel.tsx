/**
 * Secret Vault — opened from the Digital File Cabinet's "Secret Vault"
 * folder. Asks for a PIN (or to create one), then lists the vault's
 * documents. Everything goes through services/secretVault.ts; the database
 * refuses direct reads of these rows and files (migration 049).
 *
 * Inline styles on purpose, like ConfirmDelete: each screen defines its own
 * .modal/.backdrop classes, so a shared overlay can't rely on them.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Unlock, Upload, Download, Eye, Trash2, X, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { secretVault, SecretVaultError, type SecretDoc } from "../services/secretVault";
import { checkUpload, showQuotaRefusal } from "../utils/storageQuota";
import { useConfirmDelete } from "./ConfirmDelete";

const C = {
  bg: "var(--card, #0E1526)", border: "var(--border, rgba(255,255,255,0.1))",
  text: "var(--foreground, #E8EDF5)", muted: "var(--muted-foreground, #8A9AB8)",
  red: "#D06B6B", accent: "var(--primary, #5B6EE1)",
};
const INPUT: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
  background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 20, letterSpacing: "0.3em",
  textAlign: "center", outline: "none", fontFamily: "var(--font-mono)",
};
const BTN: React.CSSProperties = {
  padding: "11px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15,
  background: "linear-gradient(135deg,#D06B6B,#A04848)", color: "#fff",
};
const GHOST: React.CSSProperties = {
  padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.border}`, cursor: "pointer", fontWeight: 600,
  fontSize: 14, background: "transparent", color: C.text,
};

type Stage =
  | { kind: "loading" }
  | { kind: "create" }
  | { kind: "unlock"; lockedUntil: string | null }
  | { kind: "forgot"; sent: boolean }
  | { kind: "change" }
  | { kind: "open" };

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 8);

export function SecretVaultPanel({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<SecretDoc[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { requestDelete, confirmDialog } = useConfirmDelete();

  const reset = () => { setPin(""); setPin2(""); setCode(""); };

  const loadDocs = useCallback(async () => {
    try {
      const { docs } = await secretVault.list();
      setDocs(docs);
      setStage({ kind: "open" });
    } catch (err) {
      if (err instanceof SecretVaultError && err.code === "pin_required") setStage({ kind: "unlock", lockedUntil: null });
      else toast.error(err instanceof Error ? err.message : "Could not open the Secret Vault");
    }
  }, []);

  useEffect(() => {
    secretVault.status().then((s) => {
      if (!s.hasPin) setStage({ kind: "create" });
      else if (s.unlockedUntil) void loadDocs();
      else setStage({ kind: "unlock", lockedUntil: s.lockedUntil });
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not reach the Secret Vault");
      onClose();
    });
  }, [loadDocs, onClose]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (err) { toast.error(err instanceof Error ? err.message : "Something went wrong"); }
    setBusy(false);
  };

  const create = () => run(async () => {
    if (pin.length < 4) throw new Error("Use 4 to 8 digits.");
    if (pin !== pin2) throw new Error("The two PINs don't match.");
    await secretVault.setPin(pin);
    reset(); toast.success("Secret Vault PIN set");
    await loadDocs();
  });

  const unlock = () => run(async () => {
    await secretVault.unlock(pin);
    reset();
    await loadDocs();
  });

  const change = () => run(async () => {
    if (pin2.length < 4) throw new Error("Use 4 to 8 digits for the new PIN.");
    await secretVault.setPin(pin2, pin);
    reset(); toast.success("PIN changed");
    setStage({ kind: "open" });
  });

  const sendCode = () => run(async () => {
    await secretVault.forgotStart();
    toast.success("We emailed you a 6-digit code");
    setStage({ kind: "forgot", sent: true });
  });

  const finishForgot = () => run(async () => {
    if (pin.length < 4) throw new Error("Use 4 to 8 digits for the new PIN.");
    if (pin !== pin2) throw new Error("The two PINs don't match.");
    await secretVault.forgotFinish(code, pin);
    reset(); toast.success("New PIN set");
    await loadDocs();
  });

  const lock = () => run(async () => { await secretVault.lock(); setDocs([]); onClose(); });

  const upload = (files: FileList | null) => run(async () => {
    if (!files?.length) return;
    const total = Array.from(files).reduce((s, f) => s + f.size, 0);
    const quota = await checkUpload(total);
    if (quota && !quota.allowed) { showQuotaRefusal(quota.reason); return; }
    for (const f of Array.from(files)) {
      const doc = await secretVault.upload(f);
      toast.success(`"${f.name}" added to the Secret Vault`);
      setDocs((d) => [{ ...doc, viewUrl: null, downloadUrl: null }, ...d]);
    }
    await loadDocs(); // fresh signed links
  });

  const open = (url: string | null) => {
    if (!url) { void loadDocs(); toast.message("Links refreshed — try again"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const pinField = (value: string, set: (v: string) => void, label: string, autoFocus = false) => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", color: C.muted, fontSize: 12.5, fontFamily: "var(--font-mono)", marginBottom: 6 }}>{label}</span>
      <input type="password" inputMode="numeric" autoComplete="off" value={value} autoFocus={autoFocus}
        onChange={(e) => set(digits(e.target.value))} style={INPUT}/>
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Secret Vault"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(5,8,14,0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div style={{ width: "100%", maxWidth: stage.kind === "open" ? 720 : 420, maxHeight: "90vh", overflowY: "auto",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, color: C.text }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(208,107,107,0.16)" }}>
            {stage.kind === "open" ? <Unlock size={18} color={C.red}/> : <Lock size={18} color={C.red}/>}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 21 }}>Secret Vault</div>
            <div style={{ color: C.muted, fontSize: 13 }}>Protected by your PIN · locks again after 15 minutes</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={18}/></button>
        </div>

        {stage.kind === "loading" && <p style={{ color: C.muted }}>Checking…</p>}

        {stage.kind === "create" && (
          <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <p style={{ color: C.muted, fontSize: 15, marginBottom: 16 }}>
              Choose a 4-8 digit PIN. You'll enter it each time you open the Secret Vault. If you forget it, we can email you a code to set a new one; your files are kept.
            </p>
            {pinField(pin, setPin, "NEW PIN", true)}
            {pinField(pin2, setPin2, "CONFIRM PIN")}
            <button type="submit" disabled={busy} style={{ ...BTN, width: "100%", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Set PIN"}</button>
          </form>
        )}

        {stage.kind === "unlock" && (
          <form onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
            {stage.lockedUntil && (
              <div style={{ display: "flex", gap: 8, padding: 10, borderRadius: 10, background: "rgba(208,107,107,0.12)", color: C.red, fontSize: 14, marginBottom: 12 }}>
                <ShieldAlert size={16}/> Too many wrong PINs. Try again after {new Date(stage.lockedUntil).toLocaleTimeString()}, or use Forgot PIN.
              </div>
            )}
            {pinField(pin, setPin, "ENTER YOUR PIN", true)}
            <button type="submit" disabled={busy || pin.length < 4} style={{ ...BTN, width: "100%", opacity: busy || pin.length < 4 ? 0.6 : 1 }}>{busy ? "Checking…" : "Unlock"}</button>
            <button type="button" onClick={() => { reset(); setStage({ kind: "forgot", sent: false }); }}
              style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: C.muted, textDecoration: "underline", cursor: "pointer" }}>
              Forgot PIN?
            </button>
          </form>
        )}

        {stage.kind === "forgot" && (
          <form onSubmit={(e) => { e.preventDefault(); void (stage.sent ? finishForgot() : sendCode()); }}>
            <p style={{ color: C.muted, fontSize: 15, marginBottom: 16 }}>
              {stage.sent
                ? "Enter the 6-digit code we emailed you, then choose a new PIN. Your files stay as they are."
                : "We'll email a 6-digit code to the address you sign in with. Your files are kept."}
            </p>
            {stage.sent && (
              <>
                <label style={{ display: "block", marginBottom: 12 }}>
                  <span style={{ display: "block", color: C.muted, fontSize: 12.5, fontFamily: "var(--font-mono)", marginBottom: 6 }}>EMAILED CODE</span>
                  <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={INPUT} autoFocus/>
                </label>
                {pinField(pin, setPin, "NEW PIN")}
                {pinField(pin2, setPin2, "CONFIRM NEW PIN")}
              </>
            )}
            <button type="submit" disabled={busy} style={{ ...BTN, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Working…" : stage.sent ? "Set new PIN" : "Email me a code"}
            </button>
            <button type="button" onClick={() => { reset(); setStage({ kind: "unlock", lockedUntil: null }); }}
              style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: C.muted, textDecoration: "underline", cursor: "pointer" }}>
              Back
            </button>
          </form>
        )}

        {stage.kind === "change" && (
          <form onSubmit={(e) => { e.preventDefault(); void change(); }}>
            {pinField(pin, setPin, "CURRENT PIN", true)}
            {pinField(pin2, setPin2, "NEW PIN")}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => { reset(); setStage({ kind: "open" }); }} style={GHOST}>Cancel</button>
              <button type="submit" disabled={busy} style={{ ...BTN, flex: 1, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Change PIN"}</button>
            </div>
          </form>
        )}

        {stage.kind === "open" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ ...BTN, display: "inline-flex", alignItems: "center", gap: 6, opacity: busy ? 0.6 : 1 }}>
                <Upload size={15}/> {busy ? "Working…" : "Add files"}
              </button>
              <button onClick={() => { reset(); setStage({ kind: "change" }); }} style={{ ...GHOST, display: "inline-flex", alignItems: "center", gap: 6 }}><KeyRound size={14}/> Change PIN</button>
              <button onClick={() => void lock()} style={{ ...GHOST, display: "inline-flex", alignItems: "center", gap: 6 }}><Lock size={14}/> Lock now</button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => { void upload(e.target.files); e.target.value = ""; }}/>
            </div>
            {docs.length === 0 ? (
              <p style={{ color: C.muted, padding: "30px 0", textAlign: "center" }}>Nothing in your Secret Vault yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {docs.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>
                        {(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB · {new Date(d.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => open(d.viewUrl)} aria-label={`View ${d.name}`} style={GHOST}><Eye size={14}/></button>
                    <button onClick={() => open(d.downloadUrl)} aria-label={`Download ${d.name}`} style={GHOST}><Download size={14}/></button>
                    <button aria-label={`Delete ${d.name}`} style={{ ...GHOST, color: C.red }}
                      onClick={() => requestDelete({
                        label: d.name,
                        noun: "document",
                        onConfirm: async () => {
                          await secretVault.remove(d.id);
                          setDocs((x) => x.filter((y) => y.id !== d.id));
                          toast.success("Deleted");
                        },
                      })}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
