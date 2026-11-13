import React, { useState, useEffect } from "react";
import {
  ShieldAlert, ShieldOff, Shield, Clock, AlertTriangle,
  CheckCircle, X, Lock, Unlock, Activity, ChevronDown, ChevronRight, Zap, Search, Key
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, AdminApiError } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";
import { useAuth } from "../../context/AuthContext";
import { useAdminMe } from "../../hooks/useAdminMe";
import { supabase } from "../../services/supabase";
import {
  challengeFactor, checkEmailCode, getLocalTwoFactorSettings, startEmailCode, verifyChallenge, verifyFactor,
} from "../../services/twoFactor";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.16)", borderRadius:20 };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* Granting a bypass releases a user's entire vault, so it is written by the
   service-role backend (routes/entitlements.ts) against disaster_recovery_state
   — never by the browser. This used to be a shared localStorage key that the
   user-facing screen also wrote, which let any user open their own window. */

/* ── types ───────────────────────────────────────────────────────── */
type BypassStatus = "none" | "active" | "expired";

interface UserBypass {
  userId:      string;
  userName:    string;
  email:       string;
  plan:        string;
  status:      BypassStatus;
  activatedAt: number | null;
  expiresAt:   number | null;
  activatedBy: string | null;
  reason:      string | null;
  /** The grant note (disaster_recovery_state.bypass_notes); saved before but never shown. */
  notes?:      string | null;
}

interface AuditEntry {
  id:        string;
  ts:        number;
  admin:     string;
  action:    string;
  target:    string;
  severity:  "info" | "warning" | "critical";
}

type ModalStep = "acknowledge" | "mfa" | "complete";

/* The bypass roster is every real account from GET /admin/users (paged).
   Bypass state comes from disaster_recovery_state via GET
   /admin/disaster-recovery and is only changed through the service-role
   backend; the history is the audit log's disaster-recovery entries. */
interface DBUserRow {
  id: string; email: string; full_name: string; plan: string;
}

interface DBStateRow {
  user_id: string; addon_active: boolean; bypass_granted: boolean;
  bypass_granted_at: string | null; bypass_expires_at: string | null; bypass_reason: string | null;
  bypass_notes?: string | null;
}
interface DBAuditRow {
  id: string; created_at: string; actor_email: string | null; action: string; target_id: string | null;
}

/* Status from the saved row: a granted window that has run out is "expired". */
function withState(u: UserBypass, s: DBStateRow | undefined, grantedBy?: string): UserBypass {
  if (!s || !s.bypass_granted || !s.bypass_expires_at) {
    return s?.bypass_granted_at ? { ...u, status: "expired" } : u;
  }
  const expires = new Date(s.bypass_expires_at).getTime();
  return {
    ...u,
    status: expires > Date.now() ? "active" : "expired",
    activatedAt: s.bypass_granted_at ? new Date(s.bypass_granted_at).getTime() : null,
    expiresAt: expires,
    activatedBy: grantedBy ?? "an administrator",
    reason: s.bypass_reason,
    notes: s.bypass_notes ?? null,
  };
}

function rowToBypass(u: DBUserRow): UserBypass {
  return {
    userId: u.id, userName: u.full_name, email: u.email, plan: u.plan,
    status: "none", activatedAt: null, expiresAt: null, activatedBy: null, reason: null,
  };
}

const REASON_CODES = [
  { id:"natural_disaster",  label:"Natural Disaster / Evacuation" },
  { id:"account_compromise",label:"Account Compromise / Hack" },
  { id:"estate_emergency",  label:"Urgent Estate / Probate Need" },
  { id:"medical_emergency", label:"Medical Emergency — Acting on Behalf" },
  { id:"device_loss",       label:"Device Loss / Total Hardware Failure" },
  { id:"legal_requirement", label:"Legal / Court Order Requirement" },
  { id:"other",             label:"Other (documented)" },
];

/* ── countdown hook ──────────────────────────────────────────────── */
function useCountdown(expiresAt: number | null) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRem(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const h = Math.floor(rem / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  const s = Math.floor((rem % 60_000) / 1000);
  return { h, m, s, remaining: rem };
}

function BypassTimer({ expiresAt }: { expiresAt: number }) {
  const { h, m, s, remaining } = useCountdown(expiresAt);
  const urgent = h < 4;
  return (
    <div className="flex items-center gap-1.5">
      <Clock size={12} color={urgent ? "#FC8181" : "#F6AD55"} />
      <span style={{ fontSize:12, fontWeight:700, ...MONO, color: urgent ? "#FC8181" : "#F6AD55" }}>
        {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
        {remaining === 0 ? " (expired)" : ""}
      </span>
    </div>
  );
}

/* ── Grant Bypass Modal ───────────────────────────────────────────── */
function GrantModal({
  user, onClose, onGrant
}: {
  user: UserBypass;
  onClose: () => void;
  /** Resolves to whether the holder was emailed, or null if the grant failed. */
  onGrant: (userId: string, reason: string, notes: string) => Promise<boolean | null>;
}) {
  const [step, setStep] = useState<ModalStep>("acknowledge");
  const [reason, setReason] = useState("natural_disaster");
  const [mfaCode, setMfaCode] = useState("");
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [notified, setNotified] = useState(false);

  // The code is checked for real against the admin's own second factor.
  // Before, any six characters opened a 48-hour bypass.
  const [factor, setFactor] = useState<
    | { kind: "totp"; factorId: string }
    | { kind: "phone"; factorId: string; challengeId: string }
    | { kind: "email" }
    | null
  >(null);
  const [busy, setBusy] = useState(false);

  const handleAcknowledge = async () => {
    if (!reason) { toast.error("Please select a reason code"); return; }
    if (!agreed) { toast.error("You must acknowledge the security implications"); return; }
    setBusy(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      const phone = factors?.phone?.[0];
      if (totp) {
        setFactor({ kind: "totp", factorId: totp.id });
      } else if (phone) {
        setFactor({ kind: "phone", factorId: phone.id, challengeId: await challengeFactor(phone.id) });
        toast.success("We sent a code to your phone");
      } else {
        const settings = await getLocalTwoFactorSettings();
        if (!settings.enabled || settings.method !== "email_otp") {
          toast.error("Turn on two-step verification for your admin account (Account Settings → Security) before granting a bypass.");
          return;
        }
        await startEmailCode();
        setFactor({ kind: "email" });
        toast.success("We emailed you a code");
      }
      setStep("mfa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setBusy(false);
    }
  };

  const handleMFA = async () => {
    if (mfaCode.length < 6) { toast.error("Enter your 6-digit MFA code"); return; }
    if (!factor) { toast.error("Start verification again"); setStep("acknowledge"); return; }
    setBusy(true);
    try {
      if (factor.kind === "totp") await verifyFactor(factor.factorId, mfaCode);
      else if (factor.kind === "phone") await verifyChallenge(factor.factorId, factor.challengeId, mfaCode);
      else await checkEmailCode(mfaCode, "login");
    } catch (err) {
      setBusy(false);
      setMfaCode("");
      toast.error(err instanceof Error ? err.message : "That code isn't right");
      return;
    }
    const reasonLabel = REASON_CODES.find(r => r.id === reason)?.label ?? reason;
    const result = await onGrant(user.userId, reasonLabel, notes);
    setBusy(false);
    if (result === null) return;   // the error was shown; stay on this step
    setNotified(result);
    setStep("complete");
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(5,8,14,0.8)",
      backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#101728", borderRadius:22, width:"100%", maxWidth:500,
        border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>

        <div style={{ background:"linear-gradient(135deg,#D9A55E,#8C6423)", padding:"20px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} color="#1C1608"/>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:"#1C1608" }}>Emergency Bypass Protocol</div>
              <div style={{ fontSize:12, color:"rgba(28,22,8,0.75)" }}>{user.userName} · {user.userId}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(28,22,8,0.15)", border:"none",
            borderRadius:8, padding:6, cursor:"pointer", color:"#1C1608" }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            {(["acknowledge","mfa","complete"] as ModalStep[]).map((s, i) => (
              <React.Fragment key={s}>
                <div style={{
                  width:24, height:24, borderRadius:"50%", fontSize:11, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: step === s ? "#F6AD55"
                    : (["acknowledge","mfa","complete"].indexOf(step) > i) ? "#48BB78" : "rgba(255,255,255,0.1)",
                  color: step === s || (["acknowledge","mfa","complete"].indexOf(step) > i) ? "#101728" : "#A3ADC9",
                  transition:"all 0.2s"
                }}>{i+1}</div>
                {i < 2 && <div style={{ flex:1, height:2, background:"rgba(255,255,255,0.1)", borderRadius:1 }} />}
              </React.Fragment>
            ))}
          </div>

          {step === "acknowledge" && (
            <div className="space-y-4">
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#EFF2F9", marginBottom:6 }}>
                  Security Acknowledgment
                </div>
                <div style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)",
                  borderRadius:10, padding:"12px 14px", fontSize:13, color:"#F0B0B0", lineHeight:1.7 }}>
                  <strong>⚠ Warning:</strong> Activating the Emergency Bypass Protocol grants
                  the user unrestricted bulk-download access for 48 hours. This action is
                  irreversible, fully audited, and should only be used for genuine emergencies.
                </div>
              </div>

              <div>
                <label style={{ fontSize:13, fontWeight:600, color:"#EFF2F9", display:"block", marginBottom:6 }}>
                  Reason Code *
                </label>
                <select value={reason} onChange={e => setReason(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:8, fontSize:13,
                    border:`1.5px solid ${reason ? "rgba(246,173,85,0.4)" : "rgba(255,255,255,0.1)"}`,
                    background:"#0F1624", color:"#EFF2F9", outline:"none", cursor:"pointer" }}>
                  <option value="">— Select a reason code —</option>
                  {REASON_CODES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize:13, fontWeight:600, color:"#EFF2F9", display:"block", marginBottom:6 }}>
                  Internal Notes (optional)
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3} placeholder="Document the circumstances…"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:8, fontSize:13,
                    border:"1.5px solid rgba(255,255,255,0.1)", resize:"none", background:"#0F1624",
                    color:"#EFF2F9", outline:"none", lineHeight:1.5 }} />
              </div>

              <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer" }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  style={{ marginTop:2, accentColor:"#F6AD55" }} />
                <span style={{ fontSize:13, color:"#BCC5DA", lineHeight:1.6 }}>
                  I acknowledge the security implications of this action, confirm this is a genuine
                  emergency, and understand this will be logged in the audit trail.
                </span>
              </label>

              <button onClick={handleAcknowledge} disabled={busy}
                style={{ opacity: busy ? 0.6 : 1, width:"100%", padding:"12px", borderRadius:10,
                  background:"linear-gradient(135deg,#D9A55E,#B4842E)", border:"none", cursor:"pointer",
                  color:"#1C1608", fontWeight:700, fontSize:14,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                Continue to MFA Verification
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === "mfa" && (
            <div className="space-y-5">
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#EFF2F9", marginBottom:4 }}>
                  MFA Verification Required
                </div>
                <p style={{ fontSize:13, color:"#A3ADC9", lineHeight:1.6 }}>
                  Enter your 6-digit authenticator code to confirm this high-security action.
                </p>
              </div>

              <div style={{ background:"#0F1624", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:12, color:"#A3ADC9", marginBottom:2 }}>Granting bypass for:</div>
                <div style={{ fontWeight:700, color:"#EFF2F9" }}>{user.userName}</div>
                <div style={{ fontSize:12, color:"#8A9AB8", ...MONO }}>{user.email}</div>
                <div style={{ fontSize:12, color:"#F6AD55", marginTop:4 }}>
                  Reason: {REASON_CODES.find(r => r.id === reason)?.label}
                </div>
              </div>

              <div>
                <label style={{ fontSize:13, fontWeight:600, color:"#EFF2F9", display:"block", marginBottom:8 }}>
                  Authenticator Code
                </label>
                <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{
                      width:44, height:52, borderRadius:10, fontSize:22, fontWeight:700,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background:"#0F1624",
                      border:`2px solid ${mfaCode[i] ? "rgba(246,173,85,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color:"#EFF2F9", ...MONO
                    }}>
                      {mfaCode[i] ?? ""}
                    </div>
                  ))}
                </div>
                <input
                  type="text" maxLength={6} value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g,""))}
                  placeholder="Enter 6-digit code"
                  style={{
                    width:"100%", marginTop:10, padding:"10px 14px", borderRadius:8,
                    fontSize:16, textAlign:"center", border:"1.5px solid rgba(255,255,255,0.1)",
                    background:"#0F1624", color:"#EFF2F9", outline:"none", ...MONO, letterSpacing:"0.3em"
                  }}
                  autoFocus
                />
                <p style={{ fontSize:12, color:"#8A9AB8", textAlign:"center", marginTop:6 }}>
                  The code from your own two-step verification
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("acknowledge")}
                  style={{ flex:1, padding:"11px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.1)",
                    background:"transparent", cursor:"pointer", color:"#A3ADC9", fontWeight:600, fontSize:13 }}>
                  Back
                </button>
                <button onClick={handleMFA} disabled={busy}
                  style={{ opacity: busy ? 0.6 : 1, flex:2, padding:"11px", borderRadius:10,
                    background:"linear-gradient(135deg,#D9A55E,#B4842E)",
                    border:"none", cursor:"pointer", color:"#1C1608", fontWeight:700, fontSize:14,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8
                  }}>
                  <Key size={15} />
                  Confirm & Activate Bypass
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(72,187,120,0.12)",
                border:"2px solid rgba(72,187,120,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <CheckCircle size={28} color="#48BB78" />
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#EFF2F9", marginBottom:6 }}>
                  Bypass Activated
                </div>
                <p style={{ fontSize:13, color:"#A3ADC9" }}>
                  {user.userName} now has 48 hours of emergency export access.
                  {notified ? " They were emailed about it." : " The notification email could not be sent — tell them directly."} This action has been logged.
                </p>
              </div>
              <div style={{ display:"flex", gap:8, ...MONO }}>
                {["48h window", notified ? "Emailed ✓" : "Not emailed", "Audit logged"].map(badge => (
                  <span key={badge} style={{ fontSize:11, padding:"4px 10px", borderRadius:6,
                    background:"rgba(72,187,120,0.12)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.3)" }}>
                    {badge}
                  </span>
                ))}
              </div>
              <button onClick={onClose}
                style={{ padding:"11px 24px", borderRadius:10, border:"none",
                  background:"#F6AD55", color:"#101728", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN ADMIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function DisasterRecoveryAdmin() {
  // Audit entries must name whoever is actually signed in, not a placeholder.
  const { authUser } = useAuth();
  const actingAdmin = authUser?.email ?? "unknown admin";
  // Grant is a PUT and Revoke a DELETE on legacy_management (server index.tsx);
  // the screen itself opens on `users`, so not every viewer may act.
  const { can } = useAdminMe();
  const canGrant = can("legacy_management", "edit");
  const canRevoke = can("legacy_management", "delete");

  // Every account (the users endpoint pages at 100), every saved add-on /
  // bypass row, and the grant/revoke history from the real audit log.
  const { data: usersData, loading: usersLoading, error: usersError, refetch } = useAdminFetch(
    async () => {
      const rows: DBUserRow[] = [];
      for (let page = 1; page <= 50; page++) {
        const res = await adminApi.get<{ users: DBUserRow[]; total: number }>(`/users?pageSize=100&page=${page}`);
        rows.push(...res.users);
        if (rows.length >= res.total || res.users.length === 0) break;
      }
      const [{ states }, audit] = await Promise.all([
        adminApi.get<{ states: DBStateRow[] }>("/disaster-recovery"),
        // The history needs the Audit permission; without it the roster
        // still works and the history panel says why it's empty.
        adminApi.get<{ logs: DBAuditRow[] }>("/audit?targetType=disaster-recovery&pageSize=200")
          .then(r => ({ logs: r.logs, auditDenied: false }))
          .catch(e => { if (e instanceof AdminApiError && e.status === 403) return { logs: [] as DBAuditRow[], auditDenied: true }; throw e; }),
      ]);
      return { users: rows, states, logs: audit.logs, auditDenied: audit.auditDenied };
    },
    [],
    ADMIN_LIVE_POLL_MS,
  );

  const [users, setUsers] = useState<UserBypass[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!usersData) return;
    const stateById = new Map(usersData.states.map(s => [s.user_id, s]));
    const nameById = new Map(usersData.users.map(u => [u.id, u.full_name || u.email]));
    setUsers(usersData.users.map(row => withState(rowToBypass(row), stateById.get(row.id))));
    setAudit(usersData.logs.map(l => {
      const revoke = l.action.startsWith("DELETE");
      return {
        id: l.id.slice(0, 8).toUpperCase(),
        ts: new Date(l.created_at).getTime(),
        admin: l.actor_email ?? "admin",
        action: revoke ? "Bypass revoked" : "Bypass granted / updated",
        target: `${l.target_id ?? "?"} (${nameById.get(l.target_id ?? "") ?? "deleted account"})`,
        severity: revoke ? "warning" : "critical",
      } as AuditEntry;
    }));
  }, [usersData]);
  const [grantTarget, setGrantTarget] = useState<UserBypass | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|BypassStatus>("all");
  const [showAudit, setShowAudit] = useState(false);

  const handleGrant = async (userId: string, reason: string, notes: string): Promise<boolean | null> => {
    const targetUser = users.find(u => u.userId === userId);
    // Persist first: if the backend refuses (restricted role, or a row that is
    // not a real account) the window must not appear open in the console.
    try {
      const res = await adminApi.put<{ state: DBStateRow; notified: boolean }>(`/disaster-recovery/${userId}`, { grant_bypass: true, reason, notes });
      setUsers(us => us.map(u => u.userId === userId ? withState(u, res.state, actingAdmin) : u));
      toast.success(`Emergency bypass activated for ${targetUser?.userName}`);
      refetch();
      return res.notified;
    } catch (e) {
      const msg = e instanceof AdminApiError ? e.message : "Could not reach the admin backend";
      toast.error(`Bypass not granted for ${targetUser?.userName ?? userId}: ${msg}`);
      return null;
    }
  };

  const handleRevoke = async (userId: string) => {
    const targetUser = users.find(u => u.userId === userId);

    let notified = false;
    try {
      notified = (await adminApi.del<{ notified: boolean }>(`/disaster-recovery/${userId}`)).notified;
    } catch (e) {
      const msg = e instanceof AdminApiError ? e.message : "Could not reach the admin backend";
      toast.error(`Bypass not revoked for ${targetUser?.userName ?? userId}: ${msg}`);
      return;
    }

    setUsers(us => us.map(u =>
      u.userId === userId
        ? { ...u, status:"expired", activatedAt:null, expiresAt:null, activatedBy:null, reason:null }
        : u
    ));
    refetch();
    toast.success(notified ? "Bypass revoked — the user was emailed" : "Bypass revoked (the notification email could not be sent)");
  };

  const filtered = users.filter(u => {
    const matchSearch = u.userName.toLowerCase().includes(search.toLowerCase())
      || u.userId.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    active:   users.filter(u => u.status === "active").length,
    expired:  users.filter(u => u.status === "expired").length,
    today:    audit.filter(a => a.ts > Date.now() - 24*3600_000 && a.action === "Bypass granted / updated").length,
  };

  return (
    <div style={{ background:"transparent", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }} className="space-y-6">

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={14} color="#F6AD55" />
              <span style={{ fontSize:14, color:"#F6AD55", ...MONO, letterSpacing:"0.1em" }}>
                DISASTER RECOVERY · MASTER ADMIN CONTROL
              </span>
            </div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>
              Emergency Recovery Center
            </h1>
            <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
              Grant and manage 48-hour emergency bypass protocols for user accounts.
            </p>
          </div>
          <button onClick={() => setShowAudit(v => !v)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 15px",
              border:"1px solid rgba(91,110,225,0.3)", borderRadius:10,
              background:"#141B2E", cursor:"pointer", fontSize:13, fontWeight:600, color:"#8A9AB8" }}>
            <Activity size={13} />
            {showAudit ? "Hide" : "Show"} Audit Log
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Active Bypasses",  value:stats.active,  color:"#F6AD55" },
            { label:"Granted Today",    value:stats.today,   color:"#6E90C9" },
            { label:"Expired Sessions", value:stats.expired, color:"#8A9AB8" },
            { label:"Total Events",     value:audit.length,  color:"#6FAE8B" },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:s.color }}>{s.value}</div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderRadius:16,
          background: stats.active > 0 ? "rgba(252,129,129,0.06)" : "rgba(246,173,85,0.06)",
          border:`1px solid ${stats.active > 0 ? "rgba(252,129,129,0.25)" : "rgba(246,173,85,0.25)"}`
        }}>
          <AlertTriangle size={16} color={stats.active > 0 ? "#FC8181" : "#F6AD55"} style={{ marginTop:1, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:stats.active > 0 ? "#FC8181" : "#F6AD55", marginBottom:2 }}>
              {stats.active > 0
                ? `${stats.active} active emergency bypass${stats.active > 1 ? "es" : ""} in progress`
                : "No active bypasses — all accounts in normal state"}
            </div>
            <div style={{ fontSize:12, color:"#8A9AB8", lineHeight:1.6 }}>
              Emergency Bypass Protocol grants unrestricted bulk-export access. All activations require
              MFA, reason documentation, and are permanently logged. Bypass windows cannot be extended.
            </div>
          </div>
        </div>

        {showAudit && (
          <div className="p-5 rounded-2xl" style={CARD}>
            <div style={{ fontSize:13, fontWeight:700, color:"#E8EDF5", marginBottom:14, ...MONO, letterSpacing:"0.08em" }}>
              BYPASS AUDIT LOG
            </div>
            <div className="space-y-1">
              {audit.length === 0 && (
                <div style={{ padding:"18px 0", color:"#8A9AB8", fontSize:14.5 }}>
                  {usersData?.auditDenied
                    ? "Your role can't read the audit log, so the grant/revoke history isn't shown."
                    : "No bypass has been granted or revoked yet. Every grant and revoke is kept in the audit log and listed here."}
                </div>
              )}
              {audit.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background: entry.severity === "critical" ? "#FC8181" : entry.severity === "warning" ? "#F6AD55" : "#48BB78" }} />
                  <span style={{ fontSize:11, color:"#8A9AB8", ...MONO, minWidth:80 }}>{entry.id}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:"#EFF2F9", flex:1 }}>{entry.action}</span>
                  <span style={{ fontSize:12, color:"#8A9AB8", flex:1 }}>{entry.target}</span>
                  <span style={{ fontSize:11, color:"#8A9AB8", ...MONO }}>{new Date(entry.ts).toLocaleString()}</span>
                  <span style={{ fontSize:11, color:"#8A9AB8", ...MONO }}>{entry.admin}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-x-auto" style={{ border:"1px solid rgba(91,110,225,0.16)" }}>
          <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3" style={{ background:"#101728" }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#E8EDF5" }}>User Bypass Management</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
                <Search size={13} color="#8A9AB8" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                  style={{ border:"none", background:"transparent", outline:"none", fontSize:14, color:"#E8EDF5", width:160 }} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                style={{ padding:"9px 12px", border:"1px solid rgba(91,110,225,0.3)", borderRadius:10,
                  fontSize:13, background:"#141B2E", color:"#E8EDF5", outline:"none", cursor:"pointer" }}>
                <option value="all">All Statuses</option>
                <option value="none">Normal</option>
                <option value="active">Active Bypass</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.5fr 1fr", padding:"10px 20px",
            background:"rgba(255,255,255,0.04)", borderTop:"1px solid rgba(91,110,225,0.08)", borderBottom:"1px solid rgba(91,110,225,0.08)",
            fontSize:11, color:"#8A9AB8", fontWeight:600, ...MONO }}>
            <span>USER</span><span>PLAN</span><span>STATUS</span><span>BYPASS WINDOW</span><span>ACTIONS</span>
          </div>

          {usersLoading && (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"#8A9AB8", fontSize:15 }}>Loading accounts…</div>
          )}
          {usersError && (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"#FC8181", fontSize:15 }}>{usersError}</div>
          )}
          {!usersLoading && !usersError && filtered.length === 0 && (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"#8A9AB8", fontSize:15 }}>
              {users.length === 0 ? "No accounts yet." : "No accounts match this search."}
            </div>
          )}

          {filtered.map((user, i) => {
            const isExpanded = expandedUser === user.userId;
            return (
              <div key={user.userId}>
                <div style={{
                  display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.5fr 1fr", padding:"14px 20px", alignItems:"center",
                  borderBottom:"1px solid rgba(91,110,225,0.08)",
                  background: user.status === "active" ? "rgba(246,173,85,0.05)" : i%2===0 ? "#101728" : "rgba(255,255,255,0.02)",
                  cursor:"pointer"
                }} onClick={() => setExpandedUser(isExpanded ? null : user.userId)}>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width:32, height:32, borderRadius:"50%",
                      background: user.status === "active" ? "rgba(246,173,85,0.15)" : "rgba(91,110,225,0.12)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:700, color: user.status === "active" ? "#F6AD55" : "#6E90C9"
                    }}>
                      {user.userName.split(" ").map(p=>p[0]).join("")}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#E8EDF5" }}>{user.userName}</div>
                      <div style={{ fontSize:11, color:"#8A9AB8", ...MONO }}>{user.userId}</div>
                    </div>
                  </div>

                  <div style={{ fontSize:13, color:"#8A9AB8" }}>{user.plan}</div>

                  <div>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:6, ...MONO,
                      background: user.status === "active" ? "rgba(246,173,85,0.15)"
                        : user.status === "expired" ? "rgba(252,129,129,0.12)" : "rgba(255,255,255,0.06)",
                      color: user.status === "active" ? "#F6AD55" : user.status === "expired" ? "#FC8181" : "#8A9AB8",
                      border: `1px solid ${user.status === "active" ? "rgba(246,173,85,0.35)"
                        : user.status === "expired" ? "rgba(252,129,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                      {user.status === "active" ? "⚡ BYPASS ACTIVE" : user.status === "expired" ? "EXPIRED" : "NORMAL"}
                    </span>
                  </div>

                  <div>
                    {user.status === "active" && user.expiresAt ? (
                      <BypassTimer expiresAt={user.expiresAt} />
                    ) : (
                      <span style={{ fontSize:12, color:"#8A9AB8" }}>—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {user.status === "none" || user.status === "expired" ? (canGrant &&
                      <button onClick={e => { e.stopPropagation(); setGrantTarget(user); }}
                        style={{ fontSize:11, fontWeight:700, padding:"6px 11px", borderRadius:8,
                          background:"linear-gradient(135deg,#D9A55E,#B4842E)", border:"none", color:"#1C1608",
                          cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                        <Unlock size={11} /> Grant
                      </button>
                    ) : (canRevoke &&
                      <button onClick={e => { e.stopPropagation(); handleRevoke(user.userId); }}
                        style={{ fontSize:11, fontWeight:700, padding:"6px 11px", borderRadius:8,
                          background:"rgba(252,129,129,0.12)", border:"1px solid rgba(252,129,129,0.3)",
                          color:"#FC8181", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                        <Lock size={11} /> Revoke
                      </button>
                    )}
                    <div style={{ color:"#8A9AB8", padding:"4px 2px" }}>
                      {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding:"16px 20px 20px", background:"rgba(246,173,85,0.03)", borderBottom:"2px solid rgba(246,173,85,0.15)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <div style={{ fontSize:11, color:"#8A9AB8", ...MONO, marginBottom:4 }}>EMAIL</div>
                        <div style={{ fontSize:13, color:"#E8EDF5" }}>{user.email}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:"#8A9AB8", ...MONO, marginBottom:4 }}>REASON</div>
                        <div style={{ fontSize:13, color:"#E8EDF5" }}>{user.reason ?? "—"}</div>
                      </div>
                      {user.notes && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize:11, color:"#8A9AB8", ...MONO, marginBottom:4 }}>NOTES</div>
                          <div style={{ fontSize:13, color:"#E8EDF5", whiteSpace:"pre-wrap" }}>{user.notes}</div>
                        </div>
                      )}
                      {user.activatedAt && (
                        <>
                          <div>
                            <div style={{ fontSize:11, color:"#8A9AB8", ...MONO, marginBottom:4 }}>ACTIVATED</div>
                            <div style={{ fontSize:13, color:"#E8EDF5" }}>{new Date(user.activatedAt).toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:"#8A9AB8", ...MONO, marginBottom:4 }}>EXPIRES</div>
                            <div style={{ fontSize:13, color:"#F6AD55" }}>{new Date(user.expiresAt!).toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:"#8A9AB8", ...MONO, marginBottom:4 }}>GRANTED BY</div>
                            <div style={{ fontSize:13, color:"#E8EDF5" }}>{user.activatedBy}</div>
                          </div>
                        </>
                      )}
                    </div>
                    {user.status === "active" && (
                      <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
                        background:"rgba(246,173,85,0.1)", borderRadius:8, border:"1px solid rgba(246,173,85,0.3)" }}>
                        <Zap size={13} color="#F6AD55" />
                        <span style={{ fontSize:12, color:"#EAC793" }}>
                          They can open the Emergency Recovery dashboard in their vault until the window ends.
                          Revoking closes it immediately and emails them.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {grantTarget && (
        <GrantModal user={grantTarget} onClose={() => setGrantTarget(null)} onGrant={handleGrant} />
      )}
    </div>
  );
}
