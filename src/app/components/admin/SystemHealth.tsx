import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity, XCircle, Database, Lock, HardDrive, Server, Shield,
  RefreshCw, AlertTriangle, Info,
} from "lucide-react";
import { supabase } from "../../services/supabase";
import { adminApi } from "../../services/adminApi";

/* ─────────────────────────────────────────────────────────────────────
   SYSTEM HEALTH — real checks only.

   Every number on this screen comes from a request this browser actually
   made: each service is probed on load and every CHECK_INTERVAL_MS, and the
   latency shown is the measured round-trip time. History is the checks made
   since the page opened — there is no server-side monitor, APM, incident
   table or on-call roster, so those sections say so instead of inventing data.
   ───────────────────────────────────────────────────────────────────── */

const T = {
  card:"#101728", text:"#E8EDF5", sub:"#8A9AB8", border:"rgba(91,110,225,0.16)",
  primary:"#5B6EE1", green:"#48BB78", amber:"#F6AD55", red:"#FC8181",
};
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily:"var(--font-display)" };
const CARD: React.CSSProperties = { background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:22 };

const CHECK_INTERVAL_MS = 30_000;
const HISTORY_LEN = 20;
const SLOW_MS = 1500;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type Status = "up" | "slow" | "down" | "checking";

interface Check { at: number; ok: boolean; ms: number; detail?: string }

interface ServiceDef {
  id: string; name: string; description: string; icon: React.ReactNode;
  /** Resolves when the service answered correctly; throws otherwise. */
  probe: () => Promise<void>;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function expectOk(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

const SERVICES: ServiceDef[] = [
  {
    id:"database", name:"Database (PostgREST)", icon:<Database size={16}/>,
    description:"Reads subscription_plans through the Supabase REST API.",
    probe: async () => {
      const { error } = await supabase.from("subscription_plans").select("id", { head:true, count:"exact" });
      if (error) throw new Error(error.message);
    },
  },
  {
    id:"auth", name:"Authentication", icon:<Lock size={16}/>,
    description:"Supabase Auth health endpoint.",
    probe: async () => {
      await expectOk(await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: ANON_KEY ?? "" } }));
    },
  },
  {
    id:"storage", name:"File Storage", icon:<HardDrive size={16}/>,
    description:"Lists the private record-photos bucket as the signed-in admin.",
    probe: async () => {
      const { error } = await supabase.storage.from("record-photos").list("", { limit:1 });
      if (error) throw new Error(error.message);
    },
  },
  {
    id:"edge", name:"Backend Edge Function", icon:<Server size={16}/>,
    description:"The server function's public /health route.",
    probe: async () => {
      await expectOk(await fetch(`${SUPABASE_URL}/functions/v1/server/make-server-b5ad85e0/health`, {
        headers: { apikey: ANON_KEY ?? "", ...(await authHeader()) },
      }));
    },
  },
  {
    id:"admin_api", name:"Admin API (authorized)", icon:<Shield size={16}/>,
    description:"An admin-only request, proving your session passes the admin check end to end.",
    probe: async () => { await adminApi.get("/analytics/overview"); },
  },
];

function statusOf(history: Check[]): Status {
  const last = history[history.length - 1];
  if (!last) return "checking";
  if (!last.ok) return "down";
  return last.ms > SLOW_MS ? "slow" : "up";
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  up:       { label:"OPERATIONAL", color:T.green },
  slow:     { label:"SLOW",        color:T.amber },
  down:     { label:"FAILING",     color:T.red },
  checking: { label:"CHECKING",    color:T.sub },
};

function Sparkline({ data, color, width = 90, height = 26 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }}/>;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display:"block" }} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"/>
    </svg>
  );
}

export function SystemHealth() {
  const [history, setHistory] = useState<Record<string, Check[]>>({});
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const runningRef = useRef(false);

  const runChecks = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    const results = await Promise.all(SERVICES.map(async svc => {
      const start = performance.now();
      try {
        if (!SUPABASE_URL || !ANON_KEY) throw new Error("Supabase URL / anon key not configured");
        await svc.probe();
        return [svc.id, { at: Date.now(), ok: true, ms: Math.round(performance.now() - start) }] as const;
      } catch (err) {
        return [svc.id, { at: Date.now(), ok: false, ms: Math.round(performance.now() - start),
          detail: err instanceof Error ? err.message : "Request failed" }] as const;
      }
    }));
    setHistory(prev => {
      const next = { ...prev };
      for (const [id, check] of results) next[id] = [...(prev[id] ?? []), check].slice(-HISTORY_LEN);
      return next;
    });
    setLastRun(Date.now());
    runningRef.current = false;
    setRunning(false);
  }, []);

  useEffect(() => {
    runChecks();
    const id = setInterval(runChecks, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [runChecks]);

  const statuses = SERVICES.map(s => statusOf(history[s.id] ?? []));
  const failing = statuses.filter(s => s === "down").length;
  const slow = statuses.filter(s => s === "slow").length;
  const checked = statuses.filter(s => s !== "checking").length;
  const allChecks = Object.values(history).flat();
  const okChecks = allChecks.filter(c => c.ok);
  const successRate = allChecks.length ? Math.round((okChecks.length / allChecks.length) * 1000) / 10 : null;
  const avgMs = okChecks.length ? Math.round(okChecks.reduce((s, c) => s + c.ms, 0) / okChecks.length) : null;

  const banner = checked === 0
    ? { color:T.sub,   text:"Running first health checks…" }
    : failing > 0
      ? { color:T.red,   text:`${failing} service${failing > 1 ? "s" : ""} failing` }
      : slow > 0
        ? { color:T.amber, text:`${slow} service${slow > 1 ? "s" : ""} responding slowly (> ${SLOW_MS} ms)` }
        : { color:T.green, text:`All ${SERVICES.length} services responding` };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={15} color={T.primary}/>
          <span style={{ color:T.primary, fontSize:14, ...MONO, letterSpacing:"0.12em" }}>COMMAND CENTER · SYSTEM HEALTH</span>
        </div>
        <h2 style={{ ...DISPLAY, fontSize:27.5, color:T.text }}>System Health</h2>
        <p style={{ color:T.sub, fontSize:16, marginTop:4 }}>
          Live checks against the real backend services, run from this browser every {CHECK_INTERVAL_MS / 1000} seconds.
        </p>
      </div>

      {/* Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3.5 rounded-2xl"
        style={{ background:`${banner.color}14`, border:`1.5px solid ${banner.color}55` }}>
        <div className="flex items-center gap-3">
          <div style={{ width:10, height:10, borderRadius:"50%", background:banner.color, boxShadow:`0 0 10px ${banner.color}` }}/>
          <span style={{ color:banner.color, fontSize:17.5, fontWeight:700 }}>{banner.text}</span>
          {lastRun && <span style={{ color:T.sub, fontSize:14 }}>· last checked {new Date(lastRun).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</span>}
        </div>
        <button onClick={runChecks} disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background:"rgba(91,110,225,0.08)", color:T.primary, border:"1px solid rgba(91,110,225,0.2)", opacity: running ? 0.6 : 1 }}>
          <RefreshCw size={11} className={running ? "animate-spin" : undefined}/> {running ? "Checking…" : "Check now"}
        </button>
      </div>

      {/* KPIs — all derived from this session's checks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Services Responding", value:`${checked - failing}/${SERVICES.length}`, sub:"latest check", color: failing ? T.red : T.green },
          { label:"Check Success Rate",  value: successRate == null ? "—" : `${successRate}%`, sub:`${allChecks.length} checks this session`, color:T.primary },
          { label:"Avg Response Time",   value: avgMs == null ? "—" : `${avgMs} ms`, sub:"successful checks", color:T.primary },
          { label:"Slow Threshold",      value:`${SLOW_MS} ms`, sub:"marks a service slow", color:T.sub },
        ].map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ ...DISPLAY, fontSize:30, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ color:T.text, fontSize:16, fontWeight:500, marginTop:6 }}>{s.label}</div>
            <div style={{ color:T.sub, fontSize:14, marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Services */}
      <div style={CARD}>
        <div style={{ color:T.sub, fontSize:12.5, ...MONO, letterSpacing:"0.1em", marginBottom:12 }}>SERVICES</div>
        <div className="space-y-3">
          {SERVICES.map((svc, i) => {
            const h = history[svc.id] ?? [];
            const st = statuses[i];
            const meta = STATUS_META[st];
            const last = h[h.length - 1];
            const okCount = h.filter(c => c.ok).length;
            return (
              <div key={svc.id} className="flex items-center gap-4 flex-wrap px-4 py-3 rounded-2xl"
                style={{ background:`${meta.color}0F`, border:`1px solid ${meta.color}40` }}>
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:36, height:36, background:`${meta.color}18`, color:meta.color }}>
                  {svc.icon}
                </div>
                <div className="flex-1" style={{ minWidth:200 }}>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span style={{ color:T.text, fontSize:16, fontWeight:600 }}>{svc.name}</span>
                    <span className="px-1.5 py-0.5 rounded font-bold" style={{ background:`${meta.color}18`, color:meta.color, fontSize:10, ...MONO }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ color:T.sub, fontSize:14 }}>{svc.description}</div>
                  {last && !last.ok && (
                    <div className="flex items-center gap-1.5 mt-1" style={{ color:T.red, fontSize:13.5 }}>
                      <XCircle size={12}/> {last.detail}
                    </div>
                  )}
                </div>
                <div className="text-right" style={{ minWidth:110 }}>
                  <div style={{ color:meta.color, fontSize:15, fontWeight:700, ...MONO }}>{last ? `${last.ms} ms` : "—"}</div>
                  <div style={{ color:T.sub, fontSize:12.5, ...MONO }}>{h.length ? `${okCount}/${h.length} ok` : "no checks yet"}</div>
                </div>
                <Sparkline data={h.filter(c => c.ok).map(c => c.ms)} color={meta.color}/>
                <div className="flex gap-0.5" title="Most recent checks, oldest first">
                  {h.map(c => (
                    <div key={c.at} style={{ width:5, height:18, borderRadius:2, background: !c.ok ? T.red : c.ms > SLOW_MS ? T.amber : T.green, opacity:0.8 }}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-start gap-2 mt-4" style={{ color:T.sub, fontSize:14, lineHeight:1.6 }}>
          <Info size={13} style={{ marginTop:3, flexShrink:0 }}/>
          Response times include your own network connection, so they reflect what this browser sees, not server-side latency. History resets when you leave the page.
        </div>
      </div>

      {/* What isn't monitored */}
      <div style={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} color={T.amber}/>
          <span style={{ color:T.text, fontSize:17.5, fontWeight:600 }}>Not monitored yet</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { what:"Incidents", how:"There is no incidents table, so incidents can't be recorded or shared between admins." },
            { what:"Performance (p50/p95/p99, error rate, requests/sec)", how:"Needs server-side request metrics or an APM tool — nothing collects them today." },
            { what:"Long-term uptime history", how:"Needs a scheduled monitor that stores results; these checks only run while this page is open." },
            { what:"On-call team & alert recipients", how:"No roster table and no email/SMS provider, so alerts can't be sent." },
          ].map(item => (
            <div key={item.what} className="px-4 py-3 rounded-2xl" style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}` }}>
              <div className="flex items-center gap-1.5" style={{ color:T.text, fontSize:15, fontWeight:600 }}>
                <XCircle size={12} color={T.sub}/> {item.what}
              </div>
              <div style={{ color:T.sub, fontSize:14, marginTop:3, lineHeight:1.5 }}>{item.how}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
