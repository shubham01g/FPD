/**
 * Settings → Danger Zone tools, backed by /admin/settings/danger
 * (supabase/functions/server/routes/dangerZone.ts, super admin only).
 *
 *  - Remove test accounts: match emails by pattern, tick, type DELETE.
 *  - Purge inactive users: no sign-in for N days, tick, type DELETE.
 *  - Rotate encryption key: re-encrypt stored processor credentials and
 *    enterprise API key secrets with ENTERPRISE_KEY_ENCRYPTION_SECRET_NEXT.
 *
 * Previews never change anything. Accounts with a paid subscription or payout
 * records are listed but can't be ticked; admins are never listed.
 */
import React, { useState } from "react";
import { AlertTriangle, Search, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";

interface Candidate {
  id: string; email: string; full_name: string | null; plan: string;
  created_at: string; last_sign_in_at: string | null; protectedReason: string | null;
}

const BOX: React.CSSProperties = { background: "rgba(252,129,129,0.03)", border: "1px solid rgba(252,129,129,0.12)", borderRadius: 12, padding: 14 };
const INPUT: React.CSSProperties = { background: "#141B2E", border: "1px solid rgba(91,110,225,0.3)", color: "#FFFFFF", fontSize: 14, outline: "none", borderRadius: 10, padding: "8px 12px" };
const BTN = (color: string, disabled = false): React.CSSProperties => ({
  background: `${color}1A`, color, border: `1px solid ${color}4D`, borderRadius: 10, padding: "8px 14px",
  fontSize: 12.5, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  display: "inline-flex", alignItems: "center", gap: 6,
});
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "never";

function AccountPicker({ title, desc, controls, load }: {
  title: string; desc: string;
  controls: (busy: boolean, run: () => void) => React.ReactNode;
  load: () => Promise<Candidate[]>;
}) {
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState("");

  async function preview() {
    setBusy(true);
    try {
      const rows = await load();
      setList(rows);
      setPicked(new Set(rows.filter(r => !r.protectedReason).map(r => r.id)));
      setConfirm("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not load accounts"); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (confirm !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    setBusy(true);
    try {
      const res = await adminApi.post<{ deleted: number; failed: { id: string; error: string }[] }>("/settings/danger/delete", { ids: [...picked], confirm });
      if (res.failed.length) toast.error(`${res.deleted} deleted, ${res.failed.length} refused: ${res.failed[0].error}`);
      else toast.success(`${res.deleted} account${res.deleted === 1 ? "" : "s"} permanently deleted`);
      setList(null); setPicked(new Set()); setConfirm("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setBusy(false); }
  }

  return (
    <div style={BOX} className="space-y-3">
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#E8EDF5" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#8A9AB8" }}>{desc}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{controls(busy, () => void preview())}</div>
      {list && (
        list.length === 0 ? <div style={{ fontSize: 13, color: "#8A9AB8" }}>No accounts match.</div> : (
          <>
            <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              {list.map(a => (
                <label key={a.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: a.protectedReason ? "not-allowed" : "pointer" }}>
                  <input type="checkbox" disabled={!!a.protectedReason} checked={picked.has(a.id)}
                    onChange={e => setPicked(p => { const n = new Set(p); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; })}/>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: "#E8EDF5", fontSize: 13 }}>{a.email}</span>
                    <span style={{ color: "#8A9AB8", fontSize: 12 }}> · {a.plan} · last sign-in {fmt(a.last_sign_in_at)}</span>
                  </span>
                  {a.protectedReason && <span style={{ fontSize: 11, color: "#F6AD55" }}>kept — {a.protectedReason}</span>}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span style={{ fontSize: 12, color: "#FC8181" }}>{picked.size} selected — deletes the account, its files and data permanently.</span>
              <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE" style={{ ...INPUT, width: 130 }}/>
              <button onClick={() => void remove()} disabled={busy || picked.size === 0 || confirm !== "DELETE"} style={BTN("#FC8181", busy || picked.size === 0 || confirm !== "DELETE")}>
                {busy ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>} Delete {picked.size}
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}

export function TestAccountCleanup() {
  const [pattern, setPattern] = useState("%@mailinator.com");
  return (
    <AccountPicker
      title="Remove test accounts"
      desc="Find accounts by email pattern (% matches anything), review them, then delete the ones you tick."
      load={async () => (await adminApi.post<{ accounts: Candidate[] }>("/settings/danger/test/preview", { pattern })).accounts}
      controls={(busy, run) => (<>
        <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="%@mailinator.com" style={{ ...INPUT, width: 240 }}/>
        <button onClick={run} disabled={busy} style={BTN("#D9A55E", busy)}><Search size={12}/> Find accounts</button>
      </>)}
    />
  );
}

export function InactivePurge() {
  const [days, setDays] = useState(365);
  return (
    <AccountPicker
      title="Purge inactive users"
      desc="Member accounts with no sign-in for the chosen number of days. Paying accounts and payout recipients are always kept."
      load={async () => (await adminApi.post<{ accounts: Candidate[] }>("/settings/danger/inactive/preview", { days })).accounts}
      controls={(busy, run) => (<>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={INPUT}>
          {[90, 180, 365, 730].map(d => <option key={d} value={d}>No sign-in for {d} days</option>)}
        </select>
        <button onClick={run} disabled={busy} style={BTN("#FC8181", busy)}><Search size={12}/> Preview</button>
      </>)}
    />
  );
}

export function RotateEncryptionKey() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function rotate() {
    setBusy(true);
    try {
      const res = await adminApi.post<{ rotated: { processors: number; apiKeys: number }; next: string }>("/settings/danger/rotate-key", { confirm });
      toast.success(`Re-encrypted ${res.rotated.processors} processor configs and ${res.rotated.apiKeys} API keys. ${res.next}`, { duration: 15000 });
      setConfirm("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Rotation failed", { duration: 12000 }); }
    finally { setBusy(false); }
  }
  return (
    <div style={BOX} className="space-y-3">
      <div style={{ fontSize: 12.5, color: "#8A9AB8", lineHeight: 1.6 }}>
        Payment-processor credentials and Enterprise API key secrets are encrypted with the server secret
        <code style={{ color: "#E8EDF5" }}> ENTERPRISE_KEY_ENCRYPTION_SECRET</code>. To rotate it: set the new value as
        <code style={{ color: "#E8EDF5" }}> ENTERPRISE_KEY_ENCRYPTION_SECRET_NEXT</code>, redeploy the server, run this,
        then make the new value the main secret and remove the _NEXT one.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type ROTATE" style={{ ...INPUT, width: 130 }}/>
        <button onClick={() => void rotate()} disabled={busy || confirm !== "ROTATE"} style={BTN("#FC8181", busy || confirm !== "ROTATE")}>
          {busy ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} Rotate encryption key
        </button>
        <AlertTriangle size={12} color="#F6AD55"/><span style={{ fontSize: 11.5, color: "#F6AD55" }}>Super admin only</span>
      </div>
    </div>
  );
}
