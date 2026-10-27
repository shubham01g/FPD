/**
 * White Glove session timing and billing.
 *
 * Billing rules (charged by the server, routes/whiteGlove.ts):
 *   - time is billed in 30-minute blocks, rounded up (1–30 min = 1 block)
 *   - at the catalog's session price ($25 per block)
 *   - to the card the client saved when paying the setup fee
 *
 * WGSessionTimer — for concierge specialists during a live session. It times
 *   the session and logs it; an admin charges it from Admin → White Glove
 *   (specialists can't charge cards).
 * WGBillingHistory — admin console: a client's session charges, and the form
 *   that charges a session.
 */
import React, { useEffect, useRef, useState } from "react";
import { Play, Square, Clock, DollarSign, CheckCircle, RefreshCw, Pause } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../services/adminApi";
import { useProducts } from "../utils/planCatalog";
import { useWGBilling } from "./WGCardOnFile";

const BLOCK_MINUTES = 30;
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const BOX: React.CSSProperties = { background: "rgba(91,110,225,0.03)", border: "1px solid rgba(91,110,225,0.12)" };
const INPUT: React.CSSProperties = { background: "#141B2E", border: "1px solid rgba(91,167,214,0.3)", color: "#FFFFFF", fontSize: 15, outline: "none", borderRadius: 10, padding: "8px 10px", width: "100%" };

const blocksFor = (minutes: number) => Math.max(1, Math.ceil(minutes / BLOCK_MINUTES));

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useBlockPrice(): number {
  return (useProducts().wg_session_block?.amountCents ?? 2500) / 100;
}

export function WGSessionTimer({ clientName }: { clientId: string; clientName: string; specialistName: string }) {
  const [state, setState] = useState<"idle" | "running" | "paused" | "ended">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rate = useBlockPrice();

  useEffect(() => {
    if (state === "running") timer.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [state]);

  const minutes = Math.max(1, Math.ceil(elapsed / 60));
  const blocks = blocksFor(minutes);

  return (
    <div className="rounded-2xl overflow-hidden" style={BOX}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(91,110,225,0.08)", background: "rgba(91,110,225,0.04)" }}>
        <Clock size={14} color="#FFFFFF"/>
        <span style={{ color: "#6E90C9", fontSize: 15, fontWeight: 700, ...MONO }}>SESSION TIMER</span>
      </div>
      <div className="p-4 space-y-3">
        {state === "idle" && (<>
          <div style={{ color: "#8A9AB8", fontSize: 15, lineHeight: 1.6 }}>
            Time the session with {clientName}. Sessions are billed in 30-minute blocks (${rate.toFixed(2)} each), charged to the client's saved card by an admin.
          </div>
          <button onClick={() => { setElapsed(0); setStartedAt(new Date()); setState("running"); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: "#F0F4FA" }}>
            <Play size={14}/> Start Session Timer
          </button>
        </>)}

        {(state === "running" || state === "paused") && (<>
          <div className="text-center" style={{ fontSize: 40, color: "#E8EDF5", fontWeight: 700, ...MONO }}>{formatTime(elapsed)}</div>
          <div className="text-center" style={{ color: "#8A9AB8", fontSize: 14 }}>{blocks} block{blocks === 1 ? "" : "s"} so far · ${(blocks * rate).toFixed(2)}</div>
          <div className="flex gap-2">
            <button onClick={() => setState(state === "running" ? "paused" : "running")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(91,110,225,0.1)", color: "#AEB9F5" }}>
              {state === "running" ? <><Pause size={13}/> Pause</> : <><Play size={13}/> Resume</>}
            </button>
            <button onClick={() => setState("ended")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(252,129,129,0.12)", color: "#FC8181" }}>
              <Square size={13}/> End Session
            </button>
          </div>
        </>)}

        {state === "ended" && (<>
          <div className="flex items-start gap-2" style={{ color: "#C9D3E6", fontSize: 15, lineHeight: 1.6 }}>
            <CheckCircle size={16} color="#6FAE8B" style={{ marginTop: 3, flexShrink: 0 }}/>
            <span>
              Session logged: {startedAt?.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}, {minutes} min
              = {blocks} block{blocks === 1 ? "" : "s"} (${(blocks * rate).toFixed(2)}). Tell your admin; they charge it from Admin → White Glove.
            </span>
          </div>
          <button onClick={() => { setState("idle"); setElapsed(0); setStartedAt(null); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold" style={{ background: "rgba(91,110,225,0.1)", color: "#AEB9F5" }}>
            <RefreshCw size={13}/> New Session
          </button>
        </>)}
      </div>
    </div>
  );
}

/** Admin: a client's session charges, plus "Charge a session". */
export function WGBillingHistory({ clientId }: { clientId?: string }) {
  if (!clientId) {
    return (
      <div className="p-4 rounded-2xl" style={BOX}>
        <span style={{ color: "#8A9AB8", fontSize: 15 }}>Open a client to see and charge their White Glove sessions.</span>
      </div>
    );
  }
  return <ClientSessionBilling clientId={clientId}/>;
}

function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ClientSessionBilling({ clientId }: { clientId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { card, sessions, error, loaded } = useWGBilling(clientId, refreshKey);
  const rate = useBlockPrice();
  const [startedAt, setStartedAt] = useState(() => localInput(new Date(Date.now() - 45 * 60_000)));
  const [minutes, setMinutes] = useState("45");
  const [sessionType, setSessionType] = useState<"phone" | "video" | "in_person">("video");
  const [notes, setNotes] = useState("");
  const [sessionKey, setSessionKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);

  const mins = Math.max(1, Math.round(Number(minutes) || 0));
  const blocks = blocksFor(mins);

  const charge = async () => {
    const start = new Date(startedAt);
    if (isNaN(start.getTime())) { toast.error("Enter when the session started"); return; }
    if (!window.confirm(`Charge ${blocks} × $${rate.toFixed(2)} = $${(blocks * rate).toFixed(2)} to the client's saved card?`)) return;
    setBusy(true);
    try {
      const res = await adminApi.post<{ session: Record<string, any>; invoiceStatus?: string; message?: string | null; duplicate?: boolean }>(
        `/white-glove/clients/${clientId}/charge-session`,
        { sessionKey, startedAt: start.toISOString(), endedAt: new Date(start.getTime() + mins * 60_000).toISOString(), sessionType, notes: notes || undefined });
      if (res.duplicate) toast.info("That session was already charged.");
      else if (res.invoiceStatus === "paid") toast.success(`Charged $${(blocks * rate).toFixed(2)}`);
      else toast.error(res.message ? `Charge failed: ${res.message}` : "The card was declined. Stripe will retry and the client can update their card.");
      setSessionKey(crypto.randomUUID());
      setNotes("");
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not charge the session");
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (s: string) => s === "charged" ? "#6FAE8B" : s === "failed" ? "#FC8181" : s === "refunded" ? "#D9A55E" : "#8A9AB8";

  return (
    <div className="rounded-2xl overflow-hidden" style={BOX}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(91,110,225,0.08)", background: "rgba(91,110,225,0.04)" }}>
        <DollarSign size={14} color="#FFFFFF"/>
        <span style={{ color: "#6E90C9", fontSize: 15, fontWeight: 700, ...MONO }}>SESSION BILLING</span>
      </div>
      <div className="p-4 space-y-4">
        {error && <div style={{ color: "#FC8181", fontSize: 14 }}>{error}</div>}
        {loaded && !error && (card?.card_last4 ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: "1.4fr 0.7fr 0.9fr" }}>
            <label style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO }}>STARTED
              <input type="datetime-local" value={startedAt} onChange={e => setStartedAt(e.target.value)} style={INPUT}/></label>
            <label style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO }}>MINUTES
              <input type="number" min={1} value={minutes} onChange={e => setMinutes(e.target.value)} style={INPUT}/></label>
            <label style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO }}>TYPE
              <select value={sessionType} onChange={e => setSessionType(e.target.value as typeof sessionType)} style={INPUT}>
                <option value="video">Video</option><option value="phone">Phone</option><option value="in_person">In person</option>
              </select></label>
            <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...INPUT, gridColumn: "1 / -1" }}/>
            <button onClick={() => void charge()} disabled={busy} className="py-2.5 rounded-2xl text-sm font-bold disabled:opacity-50"
              style={{ gridColumn: "1 / -1", background: "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: "#F0F4FA" }}>
              {busy ? "Charging…" : `Charge ${blocks} block${blocks === 1 ? "" : "s"}: $${(blocks * rate).toFixed(2)}`}
            </button>
          </div>
        ) : (
          <div style={{ color: "#8A9AB8", fontSize: 15 }}>No card on file yet, so sessions can't be charged. The client saves a card by paying the setup fee.</div>
        ))}

        <div className="space-y-2">
          {sessions.length === 0 && loaded && <div style={{ color: "#8A9AB8", fontSize: 14 }}>No sessions charged yet.</div>}
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "#0F1624" }}>
              <span style={{ color: "#C9D3E6", fontSize: 14, flex: 1 }}>
                {new Date(s.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {s.duration_minutes} min · {s.blocks_charged} block{s.blocks_charged === 1 ? "" : "s"}
                {s.failure_message ? ` · ${s.failure_message}` : ""}
              </span>
              <span style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 700, ...MONO }}>${Number(s.amount_charged).toFixed(2)}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${statusColor(s.status)}18`, color: statusColor(s.status), ...MONO }}>{String(s.status).toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
