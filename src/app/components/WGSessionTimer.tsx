/**
 * WGSessionTimer — White Glove Session Timer & Billing
 *
 * Used by concierge specialists during a live session.
 * Tracks elapsed time, rounds UP to the nearest 30-minute block,
 * calculates the charge, and bills the client's card on file.
 *
 * Billing rules:
 *   - Any time used (even 1 minute) = 1 block = $25
 *   - 1–30 min  = 1 block  = $25
 *   - 31–60 min = 2 blocks = $50
 *   - 61–90 min = 3 blocks = $75
 *   - etc.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Play, Square, Clock, DollarSign, CreditCard, CheckCircle,
  AlertCircle, X, ChevronRight, RefreshCw, Phone, Video
} from "lucide-react";
import { toast } from "sonner";

const RATE_PER_BLOCK = 25;    // $ per 30-min block
const BLOCK_MINUTES  = 30;    // minutes per billing block

export interface SessionBillingRecord {
  id: string;
  clientId: string;
  clientName: string;
  specialistName: string;
  sessionType: "phone" | "video";
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  blocksCharged: number;
  amountCharged: number;
  cardLast4: string;
  status: "pending" | "charged" | "failed";
}

// Shared billing history across sessions (demo in-memory)
export const billingHistory: SessionBillingRecord[] = [
  {
    id:"BIL-001", clientId:"WG-001", clientName:"Dorothy Henderson",
    specialistName:"Marcus Williams", sessionType:"phone",
    startedAt:"Jun 20, 2026 · 11:00 AM", endedAt:"Jun 20, 2026 · 11:58 AM",
    durationMinutes:58, blocksCharged:2, amountCharged:50.00,
    cardLast4:"4821", status:"charged",
  },
  {
    id:"BIL-002", clientId:"WG-001", clientName:"Dorothy Henderson",
    specialistName:"Marcus Williams", sessionType:"phone",
    startedAt:"Jun 15, 2026 · 10:00 AM", endedAt:"Jun 15, 2026 · 10:42 AM",
    durationMinutes:42, blocksCharged:2, amountCharged:50.00,
    cardLast4:"4821", status:"charged",
  },
  {
    id:"BIL-003", clientId:"WG-002", clientName:"Walter & Edna Briggs",
    specialistName:"Patricia Chen", sessionType:"video",
    startedAt:"Jun 18, 2026 · 3:00 PM", endedAt:"Jun 18, 2026 · 3:35 PM",
    durationMinutes:35, blocksCharged:2, amountCharged:50.00,
    cardLast4:"9284", status:"charged",
  },
];

// Card on file data (demo)
export const cardsOnFile: Record<string, { last4:string; brand:string; expiry:string; name:string }> = {
  "WG-001": { last4:"4821", brand:"Visa",       expiry:"08/28", name:"Dorothy Henderson" },
  "WG-002": { last4:"9284", brand:"Mastercard", expiry:"12/27", name:"Walter Briggs" },
  "WG-003": { last4:"",     brand:"",           expiry:"",      name:"" }, // no card yet
};

function calcBlocks(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.ceil(minutes / BLOCK_MINUTES);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

interface WGSessionTimerProps {
  clientId: string;
  clientName: string;
  specialistName: string;
  onSessionEnd?: (record: SessionBillingRecord) => void;
}

type TimerState = "idle" | "running" | "paused" | "ended" | "billing" | "done";

export function WGSessionTimer({ clientId, clientName, specialistName, onSessionEnd }: WGSessionTimerProps) {
  const [state, setState]           = useState<TimerState>("idle");
  const [elapsed, setElapsed]       = useState(0); // seconds
  const [sessionType, setSessionType] = useState<"phone"|"video">("phone");
  const [startTime, setStartTime]   = useState<Date | null>(null);
  const [notes, setNotes]           = useState("");
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const card = cardsOnFile[clientId];
  const hasCard = card && card.last4 !== "";
  const elapsedMinutes = Math.ceil(elapsed / 60);
  const blocks = calcBlocks(elapsedMinutes);
  const amount = blocks * RATE_PER_BLOCK;

  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state]);

  function startSession() {
    if (!hasCard) { toast.error("No card on file. Add a payment method before starting a session."); return; }
    setElapsed(0);
    setStartTime(new Date());
    setState("running");
    toast.success(`Session started with ${clientName}`);
  }

  function pauseSession() {
    setState("paused");
  }

  function resumeSession() {
    setState("running");
  }

  function endSession() {
    setState("billing");
  }

  function confirmBilling() {
    setState("done");
    const now = new Date();
    const record: SessionBillingRecord = {
      id: `BIL-${Date.now().toString(36).toUpperCase()}`,
      clientId, clientName, specialistName, sessionType,
      startedAt: startTime?.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + startTime?.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) ?? "",
      endedAt:   now.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
      durationMinutes: elapsedMinutes,
      blocksCharged: blocks,
      amountCharged: amount,
      cardLast4: card.last4,
      status: "charged",
    };
    billingHistory.unshift(record);
    onSessionEnd?.(record);
    toast.success(`$${amount.toFixed(2)} charged to ${card.brand} ****${card.last4} — Session complete`);
  }

  function resetTimer() {
    setState("idle");
    setElapsed(0);
    setStartTime(null);
    setNotes("");
  }

  const CARD: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(91,110,225,0.1)", borderRadius:16 };
  const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  // ── Idle state ──
  if (state === "idle") {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(91,110,225,0.03)", border:"1px solid rgba(91,110,225,0.12)" }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ borderColor:"rgba(91,110,225,0.08)", background:"rgba(91,110,225,0.04)" }}>
          <Clock size={14} color="#FFFFFF"/>
          <span style={{ color:"#6E90C9", fontSize:12, fontWeight:700, ...MONO }}>SESSION TIMER & BILLING</span>
          {hasCard
            ? <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B", ...MONO }}>
                {card.brand} ****{card.last4} ON FILE
              </span>
            : <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:"rgba(252,129,129,0.1)", color:"#FC8181", ...MONO }}>
                NO CARD ON FILE
              </span>
          }
        </div>
        <div className="p-4 space-y-3">
          <div style={{ color:"#5A6A88", fontSize:12, lineHeight:1.6 }}>
            Start the timer when the session begins. Any time used bills as a full 30-min block ($25). The client's card is charged automatically when you end the session.
          </div>
          <div className="flex gap-2">
            {[["phone","📞 Phone Call"],["video","📹 Video Call"]].map(([t,label]) => (
              <button key={t} onClick={() => setSessionType(t as "phone"|"video")}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background:sessionType===t?"rgba(91,110,225,0.1)":"rgba(91,110,225,0.04)",
                  border:`1.5px solid ${sessionType===t?"#5B6EE1":"rgba(91,110,225,0.1)"}`,
                  color:sessionType===t?"#6E90C9":"#5A6A88" }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={startSession} disabled={!hasCard}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
            style={{ background:hasCard?"linear-gradient(135deg,#5B6EE1,#5B6EE1)":"rgba(91,110,225,0.15)",
              color:hasCard?"#F0F4FA":"#8A9AB8",
              boxShadow:hasCard?"0 0 20px rgba(91,110,225,0.3)":"none" }}>
            <Play size={14}/> Start Session Timer
          </button>
          {!hasCard && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl"
              style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.2)" }}>
              <AlertCircle size={12} color="#FC8181" style={{ marginTop:1, flexShrink:0 }}/>
              <span style={{ color:"#FC8181", fontSize:11 }}>
                A payment method must be on file before starting a session. Ask the client to add their card in Account Settings, or add it for them in the admin panel.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Running / Paused ──
  if (state === "running" || state === "paused") {
    const currentBlocks = calcBlocks(Math.ceil(elapsed / 60));
    const currentAmount = currentBlocks * RATE_PER_BLOCK;
    const nextBlockAt = currentBlocks * BLOCK_MINUTES * 60; // seconds
    const progressToNext = ((elapsed % (BLOCK_MINUTES * 60)) / (BLOCK_MINUTES * 60)) * 100;

    return (
      <div className="rounded-2xl overflow-hidden" style={{ background:state==="running"?"rgba(91,110,225,0.04)":"rgba(246,173,85,0.04)", border:`2px solid ${state==="running"?"rgba(91,110,225,0.25)":"rgba(246,173,85,0.35)"}` }}>
        {/* Timer display */}
        <div className="px-5 pt-5 pb-3 text-center">
          <div style={{ color:"#8A9AB8", fontSize:10, ...MONO, marginBottom:4 }}>
            {state === "running" ? "● SESSION IN PROGRESS" : "⏸ PAUSED"}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:52, fontWeight:700, color:state==="running"?"#0D1428":"#F6AD55", lineHeight:1 }}>
            {formatTime(elapsed)}
          </div>
          <div style={{ color:"#8A9AB8", fontSize:12, marginTop:4 }}>
            {sessionType === "phone" ? "📞 Phone" : "📹 Video"} · {clientName}
          </div>
        </div>

        {/* Billing meter */}
        <div className="mx-4 mb-4 p-3 rounded-xl glow-surface" style={{ background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.12)" }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ color:"#5A6A88", fontSize:11, ...MONO }}>CURRENT CHARGE</span>
            <span style={{ color:"#6E90C9", fontSize:18, fontFamily:"var(--font-display)", fontWeight:700 }}>
              ${currentAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {Array.from({length: Math.max(currentBlocks, 1)}).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex items-center justify-center rounded-lg text-xs font-bold"
                  style={{ width:44, height:28, background:i < currentBlocks?"#5B6EE1":"rgba(91,110,225,0.1)", color:i < currentBlocks?"#fff":"#8A9AB8", fontFamily:"var(--font-mono)", fontSize:10 }}>
                  {i < currentBlocks ? `$${RATE_PER_BLOCK}` : `$${RATE_PER_BLOCK}`}
                </div>
                {i < Math.max(currentBlocks,1) - 1 && <ChevronRight size={10} color="#C0CCD8"/>}
              </div>
            ))}
            <div style={{ color:"#8A9AB8", fontSize:10, marginLeft:4 }}>
              {currentBlocks} block{currentBlocks !== 1 ? "s" : ""} × ${RATE_PER_BLOCK}
            </div>
          </div>
          {/* Progress to next block */}
          <div className="h-1.5 rounded-full" style={{ background:"rgba(91,110,225,0.12)" }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width:`${progressToNext}%`, background:"#5B6EE1" }}/>
          </div>
          <div style={{ color:"#8A9AB8", fontSize:10, marginTop:3, ...MONO }}>
            {Math.ceil(elapsed / 60)} min used · Next block at {(currentBlocks) * BLOCK_MINUTES} min
          </div>
        </div>

        {/* Billing rule reminder */}
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl"
          style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.15)" }}>
          <span style={{ color:"#F6AD55", fontSize:11 }}>
            ⏱ Any time used counts as a full 30-min block ($25). Current session: {Math.ceil(elapsed/60)} min = {currentBlocks} block{currentBlocks!==1?"s":""} = <strong>${currentAmount}</strong>
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-2 px-4 pb-4">
          {state === "running" ? (
            <button onClick={pauseSession}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background:"rgba(246,173,85,0.1)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.25)" }}>
              ⏸ Pause
            </button>
          ) : (
            <button onClick={resumeSession}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9", border:"1px solid rgba(91,110,225,0.2)" }}>
              <Play size={13}/> Resume
            </button>
          )}
          <button onClick={endSession}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
            style={{ background:"linear-gradient(135deg,#E53E3E,#FC8181)", color:"#fff" }}>
            <Square size={13}/> End Session & Bill ${currentAmount.toFixed(2)}
          </button>
        </div>
      </div>
    );
  }

  // ── Billing confirmation ──
  if (state === "billing") {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(91,110,225,0.03)", border:"2px solid rgba(91,110,225,0.25)" }}>
        <div className="px-5 py-4 border-b text-center"
          style={{ borderColor:"rgba(91,110,225,0.1)", background:"rgba(91,110,225,0.05)" }}>
          <div style={{ color:"#6E90C9", fontSize:13, fontWeight:700 }}>Confirm Session Billing</div>
        </div>
        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            {[
              ["Client",       clientName],
              ["Session Type", sessionType === "phone" ? "📞 Phone Call" : "📹 Video Call"],
              ["Duration",     `${elapsedMinutes} minute${elapsedMinutes !== 1 ? "s" : ""}`],
              ["Blocks",       `${blocks} × 30 min block${blocks !== 1 ? "s" : ""} ($${RATE_PER_BLOCK} each)`],
              ["Card",         `${card.brand} ****${card.last4} (${card.expiry})`],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between py-2 border-b" style={{ borderColor:"rgba(91,110,225,0.07)" }}>
                <span style={{ color:"#5A6A88", fontSize:13 }}>{k}</span>
                <span style={{ color:"#0D1428", fontSize:13, fontWeight:500 }}>{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2">
              <span style={{ color:"#0D1428", fontSize:15, fontWeight:700 }}>Total Charge</span>
              <span style={{ color:"#6E90C9", fontSize:20, fontFamily:"var(--font-display)", fontWeight:700 }}>${amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ color:"#5A6A88", fontSize:11, fontFamily:"var(--font-mono)", display:"block", marginBottom:5 }}>
              SESSION NOTES (optional)
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Brief notes about what was accomplished this session..."
              className="w-full resize-none px-3 py-2.5 rounded-xl"
              style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.15)", color:"#0D1428", fontSize:12, outline:"none" }}/>
          </div>

          <div className="flex gap-3">
            <button onClick={confirmBilling}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 20px rgba(91,110,225,0.3)" }}>
              <CreditCard size={14}/> Charge ${amount.toFixed(2)} to Card
            </button>
            <button onClick={() => setState("running")}
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background:"rgba(91,110,225,0.06)", color:"#5A6A88" }}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ──
  return (
    <div className="rounded-2xl p-5 text-center glow-surface" style={{ background:"rgba(72,187,120,0.05)", border:"2px solid rgba(72,187,120,0.25)" }}>
      <CheckCircle size={36} color="#FFFFFF" style={{ margin:"0 auto 12px" }}/>
      <div style={{ color:"#0D1428", fontSize:15, fontWeight:700, marginBottom:4 }}>Session Complete</div>
      <div style={{ color:"#5A6A88", fontSize:13, marginBottom:12 }}>
        ${amount.toFixed(2)} charged to {card.brand} ****{card.last4}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label:"Duration",  value:`${elapsedMinutes} min` },
          { label:"Blocks",    value:`${blocks} × 30 min` },
          { label:"Charged",   value:`$${amount.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="px-2 py-2 rounded-xl"
            style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.15)" }}>
            <div style={{ color:"#D99A6B", fontSize:14, fontWeight:700, fontFamily:"var(--font-display)" }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:9, fontFamily:"var(--font-mono)" }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <button onClick={resetTimer}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold"
        style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9", border:"1px solid rgba(91,110,225,0.15)" }}>
        <RefreshCw size={12}/> Start New Session
      </button>
    </div>
  );
}

/* ── Billing History table (used in admin) ─────────────────────── */
export function WGBillingHistory({ clientId }: { clientId?: string }) {
  const records = clientId
    ? billingHistory.filter(r => r.clientId === clientId)
    : billingHistory;
  const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  if (records.length === 0) {
    return (
      <div className="py-6 text-center rounded-xl" style={{ background:"rgba(91,110,225,0.03)", border:"1px solid rgba(91,110,225,0.1)" }}>
        <DollarSign size={24} color="rgba(91,110,225,0.2)" style={{ margin:"0 auto 8px" }}/>
        <div style={{ color:"#8A9AB8", fontSize:13 }}>No billing records yet.</div>
      </div>
    );
  }

  const total = records.reduce((s, r) => s + r.amountCharged, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div style={{ color:"#5A6A88", fontSize:11, ...MONO }}>BILLING HISTORY</div>
        <div style={{ color:"#6E90C9", fontSize:13, fontWeight:700 }}>
          Total: ${total.toFixed(2)}
          <span style={{ color:"#8A9AB8", fontSize:11, fontWeight:400, marginLeft:4 }}>
            (incl. $99 setup)
          </span>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
        <div className="grid px-4 py-2.5 border-b"
          style={{ gridTemplateColumns:"auto 1fr auto auto auto auto", gap:12, background:"#EAF0FC", borderColor:"rgba(91,110,225,0.1)", alignItems:"center" }}>
          {["Date","Client","Type","Duration","Blocks","Charged"].map(h => (
            <div key={h} style={{ color:"#5A6A88", fontSize:10, ...MONO }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {records.map((r, i) => (
          <div key={r.id} className="grid px-4 py-3 border-b items-center"
            style={{ gridTemplateColumns:"auto 1fr auto auto auto auto", gap:12,
              background:i%2===0?"#fff":"#F8FAFF", borderColor:"rgba(91,110,225,0.06)" }}>
            <span style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>{r.startedAt.split(" · ")[0]}</span>
            <div>
              <div style={{ color:"#0D1428", fontSize:12, fontWeight:500 }}>{r.clientName}</div>
              <div style={{ color:"#8A9AB8", fontSize:10 }}>****{r.cardLast4}</div>
            </div>
            <span style={{ fontSize:14 }}>{r.sessionType === "phone" ? "📞" : "📹"}</span>
            <span style={{ color:"#5A6A88", fontSize:12, ...MONO }}>{r.durationMinutes} min</span>
            <span style={{ color:"#5A6A88", fontSize:12, ...MONO }}>{r.blocksCharged} × $25</span>
            <span style={{ color:"#D99A6B", fontSize:13, fontWeight:700, ...MONO }}>${r.amountCharged.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
