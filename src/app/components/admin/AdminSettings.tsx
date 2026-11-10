import React, { useEffect, useState } from "react";
import {
  Globe, Shield, Bell, Mail, Database, Users, ToggleLeft, ToggleRight, RefreshCw, Plus, Trash2, AlertCircle, Download, Lock, Activity, Zap, Save, Info, AlertTriangle, CheckCircle, X, Key,
} from "lucide-react";
import { SERVICES as HEALTH_SERVICES } from "./SystemHealth";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { downloadCSV } from "../../utils/exportCsv";
import type { AdminPageId } from "./AdminLayout";
import { ROLE_PRESETS, toStoredPermissions, type AdminRole } from "./AdminRoles";
import { copyToClipboard } from "../../utils/clipboard";
import { InactivePurge, RotateEncryptionKey, TestAccountCleanup } from "./DangerZoneTools";

/* ─── Shared styles ───────────────────────────────────────────────── */
const CARD: React.CSSProperties = {
  background: "#101728",
  border: "1px solid rgba(159,122,234,0.12)",
  boxShadow: "0 2px 12px rgba(159,122,234,0.06)",
  borderRadius: 16,
};
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const INPUT: React.CSSProperties = {
  background: "rgba(159,122,234,0.05)",
  border: "1px solid rgba(159,122,234,0.18)",
  color: "#E8EDF5",
  fontSize: 13,
  outline: "none",
  borderRadius: 10,
  padding: "9px 12px",
  width: "100%",
};
const LABEL: React.CSSProperties = { color: "#A3ADC9", fontSize: 12, display: "block", marginBottom: 4 };
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
  color: "#E8EDF5", marginBottom: 2,
};
const SECTION_DESC: React.CSSProperties = { color: "#8A9AB8", fontSize: 12, marginBottom: 16 };

type SettingsTab =
  | "general" | "feature-flags" | "admin-users"
  | "security" | "audit-log" | "notifications"
  | "email-smtp" | "backup";

/* ─── Toggle row helper ───────────────────────────────────────────── */
function ToggleRow({
  label, desc, value, onChange, accent = "#9F7AEA", disabled = false,
}: {
  label: string; desc?: string; value: boolean;
  onChange: (v: boolean) => void; accent?: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3"
      style={{ borderBottom: "1px solid rgba(159,122,234,0.07)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "#8A9AB8", marginTop: 2 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 disabled:opacity-50"
        style={{
          background: value ? `${accent}18` : "rgba(139,154,184,0.1)",
          color: value ? accent : "#8A9AB8",
          border: `1px solid ${value ? `${accent}30` : "rgba(139,154,184,0.2)"}`,
          cursor: disabled ? "not-allowed" : "pointer",
        }}>
        {value ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
        {value ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}

/* ─── Section card wrapper ────────────────────────────────────────── */
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: 24 }}>
      <div style={SECTION_TITLE}>{title}</div>
      {desc && <div style={SECTION_DESC}>{desc}</div>}
      {children}
    </div>
  );
}

/* Row shapes from the existing admin routes (adminAccounts.ts, audit.ts). */
interface AdminAccountRow {
  id: string; name: string; email: string; role: string;
  status: "active" | "invited" | "suspended"; last_login_at: string | null;
}
interface AuditLogRow {
  id: string; actor_email: string | null; action: string;
  target_type: string | null; target_id: string | null;
  severity: string; ip_address: string | null; created_at: string;
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: "#9F7AEA",
  admin:       "#7E8FF0",
};

const SEV_COLOR: Record<string, string> = { critical:"#FC8181", high:"#FC8181", warning:"#D9A55E", medium:"#D9A55E", info:"#5FBE91", low:"#5FBE91" };

const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

/* Shown wherever a setting is stored but nothing acts on it yet. */
function StoredOnly({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 px-4 py-2.5 rounded-xl"
      style={{ background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.2)" }}>
      <Info size={13} color="#D9A55E" style={{ marginTop: 2, flexShrink: 0 }}/>
      <span style={{ color: "#D9A55E", fontSize: 12, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
type Saved = Partial<Record<"general" | "flags" | "security" | "notifications", Record<string, unknown>>>;

export function AdminSettings({ onNavigate }: { onNavigate?: (page: AdminPageId) => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  /* Every tab's preferences are one JSON document under admin_settings
     "platform.<section>" — see routes/settings.ts. */
  const { data: savedData, error: loadError } = useAdminFetch(() => adminApi.get<{ settings: Saved }>("/settings"), []);

  async function save(section: keyof Saved, value: Record<string, unknown>, message: string) {
    try {
      await adminApi.put(`/settings/${section}`, { value });
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    }
  }

  /* ── General state ── */
  const [platformName,    setPlatformName]    = useState("Final Pass Down");
  const [tagline,         setTagline]         = useState("Preserve your legacy, protect your loved ones.");
  const [supportEmail,    setSupportEmail]    = useState("");
  const [supportPhone,    setSupportPhone]    = useState("");
  const [timezone,        setTimezone]        = useState("America/New_York");
  const [maintenance,     setMaintenance]     = useState(false);
  const [maintenanceMsg,  setMaintenanceMsg]  = useState("We're performing scheduled maintenance. We'll be back shortly.");

  /* ── Feature flags ── */
  const [flags, setFlags] = useState({
    whiteGloveConcierge:  true,
    affiliateProgram:     true,
    partnerPortal:        true,
    cryptoPayments:       true,
    receiptOCR:           true,
    aiAssistant:          true,
    disasterProtection:   true,
    idVerification:       true,   // same default as services/platform.ts
    betaFeatures:         false,
    publicSignup:         true,
    emailReferrals:       true,
  });
  const resetFlags = () => {
    if (!window.confirm("Reset every feature flag to its default (all on except ID Verification and Beta Features)?")) return;
    const defaults = { ...flags };
    (Object.keys(defaults) as (keyof typeof flags)[]).forEach(k => { defaults[k] = k !== "idVerification" && k !== "betaFeatures"; });
    setFlags(defaults);
    void save("flags", defaults, "Feature flags reset to defaults");
  };
  const toggleFlag = (k: keyof typeof flags, label: string) => {
    const next = { ...flags, [k]: !flags[k] };
    setFlags(next);
    void save("flags", next, `${label} ${next[k] ? "enabled" : "disabled"}`);
  };

  /* ── Admin users (real accounts; invited and edited in Admin Team & Roles) ── */
  const { data: adminsData, loading: adminsLoading, error: adminsError, refetch: refetchAdmins } = useAdminFetch(
    () => adminApi.get<{ accounts: AdminAccountRow[] }>("/admin-accounts"), []);
  const admins = adminsData?.accounts ?? [];
  const [showAddAdmin, setAddAdmin] = useState(false);
  const [newAdminName,  setNewName]  = useState("");
  const [newAdminEmail, setNewEmail] = useState("");
  const [newAdminRole,  setNewRole]  = useState<AdminRole>("support_agent");
  const INVITE_ROLES = (Object.keys(ROLE_PRESETS) as AdminRole[]).filter(r => r !== "custom");

  /* Same invite the Admin Team & Roles page sends: the role's preset
     permissions, and an invite link to pass on (no email is sent). */
  const addAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.includes("@")) { toast.error("Enter a name and a valid email"); return; }
    try {
      const res = await adminApi.post<{ account: { id: string }; inviteToken: string; emailed?: boolean; emailError?: string }>("/admin-accounts", {
        name: newAdminName.trim(), email: newAdminEmail.trim(), role: newAdminRole,
        permissions: toStoredPermissions(ROLE_PRESETS[newAdminRole].permissions),
      });
      if (res.emailed) {
        toast.success(`Invite emailed to ${newAdminEmail.trim()}`);
      } else {
        copyToClipboard(`${window.location.origin}/admin/accept?id=${res.account.id}&token=${res.inviteToken}`);
        toast.warning(`${res.emailError ?? "The invite email was not sent"} — the invite link was copied for you to send`);
      }
      setNewName(""); setNewEmail(""); setNewRole("support_agent"); setAddAdmin(false);
      refetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite this admin");
    }
  };

  /* There is no delete for admin accounts — removing one suspends it, which
     ends its access and can be undone in Admin Team & Roles. */
  const removeAdmin = async (a: AdminAccountRow) => {
    if (a.status === "active" && admins.filter(x => x.status === "active").length <= 1) {
      toast.error("Cannot remove the last active admin"); return;
    }
    if (!window.confirm(`Remove ${a.name}'s admin access? Their account is suspended and can be reactivated in Admin Team & Roles.`)) return;
    try {
      await adminApi.patch(`/admin-accounts/${a.id}`, { status: "suspended" });
      toast.success("Admin access removed");
      refetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove this admin");
    }
  };

  const reactivateAdmin = async (a: AdminAccountRow) => {
    try {
      await adminApi.patch(`/admin-accounts/${a.id}`, { status: "active" });
      toast.success(`${a.name}'s admin access restored`);
      refetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reactivate this admin");
    }
  };

  /* ── System health: the same real probes as Master Admin → System Health ── */
  const [health, setHealth] = useState<Record<string, { ok: boolean; ms: number }>>({});
  useEffect(() => {
    if (activeTab !== "general") return;
    let cancelled = false;
    HEALTH_SERVICES.forEach(async svc => {
      const start = performance.now();
      let ok = true;
      try { await svc.probe(); } catch { ok = false; }
      if (!cancelled) setHealth(h => ({ ...h, [svc.id]: { ok, ms: Math.round(performance.now() - start) } }));
    });
    return () => { cancelled = true; };
  }, [activeTab]);

  /* ── Email: whether the server can send, and a real test send ── */
  const { data: emailStatus } = useAdminFetch(
    () => adminApi.get<{ configured: boolean; provider: string | null; from: string }>("/settings/email-status"), []);
  const emailOn = emailStatus?.configured === true;
  const [testingEmail, setTestingEmail] = useState(false);
  const sendTestEmail = async () => {
    setTestingEmail(true);
    const tid = toast.loading("Sending test email...");
    try {
      const res = await adminApi.post<{ sent: boolean; to: string }>("/notifications/test-email");
      toast.success(`Test email sent to ${res.to}`, { id: tid });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The test email could not be sent", { id: tid });
    } finally {
      setTestingEmail(false);
    }
  };

  /* ── Security state ── */
  // Off until saved ON: the server refuses ON while any active admin has no
  // second factor (routes/settings.ts), and blocks unenrolled admins once it is.
  const [enforce2FA,     setEnforce2FA]     = useState(false);
  const { data: twofaData, refetch: refetchTwofa } = useAdminFetch(
    () => adminApi.get<{ admins: { email: string; name: string | null; role: string; enrolled: boolean }[] }>("/settings/2fa-status"), []);
  const unenrolled = (twofaData?.admins ?? []).filter(a => !a.enrolled);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [ipAllowlist,    setIpAllowlist]    = useState<string[]>([]);
  const [newIp,          setNewIp]          = useState("");
  const saveSecurity = (patch: { enforce2FA?: boolean; sessionTimeout?: string; ipAllowlist?: string[] }, message: string) =>
    void save("security", { enforce2FA, sessionTimeout, ipAllowlist, ...patch }, message);
  const addIp = () => {
    if (!newIp.trim()) return;
    const next = [...ipAllowlist, newIp.trim()];
    setIpAllowlist(next);
    setNewIp("");
    saveSecurity({ ipAllowlist: next }, "IP range added");
  };

  /* ── Notification toggles ── */
  const [notifs, setNotifs] = useState({
    newSignup:          true,
    paymentFailed:      true,
    paymentSuccess:     false,
    planUpgrade:        true,
    planDowngrade:      true,
    affiliatePayout:    true,
    whiteGloveRequest:  true,
    idVerification:     true,
    securityAlert:      true,
    backupComplete:     false,
    systemError:        true,
    dailyReport:        false,
  });
  const [notifEmail, setNotifEmail] = useState("");
  const toggleNotif = (k: keyof typeof notifs) => {
    const next = { ...notifs, [k]: !notifs[k] };
    setNotifs(next);
    void save("notifications", { email: notifEmail, alerts: next }, "Notification preference saved");
  };

  /* Every export is a real list from an admin endpoint. `only` narrows the
     audit log to feature-flag changes for the Feature Flag History export. */
  const EXPORTS: { label: string; desc: string; path: string; file: string; only?: string }[] = [
    { label:"All Users & Profiles",    desc:"Full user database including plans and metadata",   path:"/users?pageSize=100", file:"users.csv" },
    { label:"Transaction History",     desc:"All payment records (latest 1,000)",                path:"/analytics/payments",  file:"transactions.csv" },
    { label:"Affiliate & Partner Data", desc:"Referral links, commissions, and payouts",         path:"/affiliates",          file:"affiliates.csv" },
    { label:"Payouts",                  desc:"Affiliate and partner payout records",             path:"/payouts",             file:"payouts.csv" },
    { label:"Audit Log",                desc:"Admin activity history (latest 200 events)",       path:"/audit?pageSize=200",  file:"audit-log.csv" },
    { label:"Feature Flag History",     desc:"Log of all flag changes with timestamps",          path:"/audit?pageSize=200",  file:"feature-flag-history.csv", only:"/settings/flags" },
  ];

  /* Paged endpoints (users caps at 100 a page) are read to the end. */
  async function fetchRows(path: string, only?: string): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    const paged = path.startsWith("/users");
    for (let page = 1; page <= (paged ? 200 : 1); page++) {
      const url = paged ? `${path}${path.includes("?") ? "&" : "?"}page=${page}` : path;
      const res = await adminApi.get<Record<string, unknown>>(url);
      const batch = (Object.values(res).find(Array.isArray) as Record<string, unknown>[] | undefined) ?? [];
      rows.push(...batch);
      const total = Number(res.total ?? 0);
      if (!paged || batch.length === 0 || rows.length >= total) break;
    }
    return only ? rows.filter(r => String(r.action ?? "").includes(only)) : rows;
  }

  async function exportData(label: string, path: string, file: string, only?: string) {
    try {
      const rows = await fetchRows(path, only);
      if (!rows.length) { toast.info(`${label}: nothing to export yet`); return; }
      downloadCSV(file, rows);
      toast.success(`${label} exported (${rows.length} rows)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not export ${label}`);
    }
  }

  /* Everything above plus the saved settings, as one JSON file. This is a data
     snapshot for the admin to keep — database backups are run by Supabase. */
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  async function exportSnapshot() {
    if (snapshotBusy) return;
    setSnapshotBusy(true);
    const tid = toast.loading("Building platform snapshot...");
    try {
      const snapshot: Record<string, unknown> = { exportedAt: new Date().toISOString(), settings: savedData?.settings ?? {} };
      const failed: string[] = [];
      await Promise.all(EXPORTS.map(async e => {
        try { snapshot[e.label] = await fetchRows(e.path, e.only); } catch { failed.push(e.label); }
      }));
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `fpd-platform-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (failed.length) toast.warning(`Snapshot downloaded without: ${failed.join(", ")}`, { id: tid });
      else toast.success("Platform snapshot downloaded", { id: tid });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the snapshot", { id: tid });
    } finally {
      setSnapshotBusy(false);
    }
  }

  /* ── Audit log (real, written by the auditLog middleware) ── */
  const { data: auditData, loading: auditLoading, error: auditError, refetch: refetchAudit } = useAdminFetch(
    () => adminApi.get<{ logs: AuditLogRow[] }>("/audit?pageSize=200"), []);
  const auditLogs = auditData?.logs ?? [];
  const [clearingAudit, setClearingAudit] = useState(false);
  async function clearAudit() {
    if (!window.confirm("Clear the entire audit log? Every entry is permanently deleted for all admins and cannot be recovered. Export first if you need a copy.")) return;
    setClearingAudit(true);
    try {
      const { cleared } = await adminApi.del<{ cleared: number }>("/audit");
      toast.success(`Audit log cleared (${cleared} entries removed)`);
      refetchAudit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear the audit log");
    } finally {
      setClearingAudit(false);
    }
  }
  const [auditSearch, setAuditSearch]   = useState("");
  const [auditSev,    setAuditSev]      = useState("all");
  const severities = [...new Set(auditLogs.map(e => e.severity))];
  const filteredAudit = auditLogs.filter(e =>
    (auditSev === "all" || e.severity === auditSev) &&
    (e.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
     (e.actor_email ?? "").toLowerCase().includes(auditSearch.toLowerCase()))
  );

  /* ── Hydrate every tab from what was saved ── */
  useEffect(() => {
    const saved = savedData?.settings;
    if (!saved) return;
    const g = saved.general as Record<string, unknown> | undefined;
    if (g) {
      if (typeof g.platformName === "string") setPlatformName(g.platformName);
      if (typeof g.tagline === "string") setTagline(g.tagline);
      if (typeof g.supportEmail === "string") setSupportEmail(g.supportEmail);
      if (typeof g.supportPhone === "string") setSupportPhone(g.supportPhone);
      if (typeof g.timezone === "string") setTimezone(g.timezone);
      if (typeof g.maintenance === "boolean") setMaintenance(g.maintenance);
      if (typeof g.maintenanceMsg === "string") setMaintenanceMsg(g.maintenanceMsg);
    }
    if (saved.flags) setFlags(f => ({ ...f, ...(saved.flags as Partial<typeof f>) }));
    const sec = saved.security as Record<string, unknown> | undefined;
    if (sec) {
      if (typeof sec.enforce2FA === "boolean") setEnforce2FA(sec.enforce2FA);
      if (typeof sec.sessionTimeout === "string") setSessionTimeout(sec.sessionTimeout);
      if (Array.isArray(sec.ipAllowlist)) setIpAllowlist(sec.ipAllowlist as string[]);
    }
    const n = saved.notifications as Record<string, unknown> | undefined;
    if (n) {
      if (typeof n.email === "string") setNotifEmail(n.email);
      if (n.alerts && typeof n.alerts === "object") setNotifs(v => ({ ...v, ...(n.alerts as Partial<typeof v>) }));
    }
  }, [savedData]);

  const general = { platformName, tagline, supportEmail, supportPhone, timezone, maintenance, maintenanceMsg };

  /* ── Tabs definition ── */
  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general",      label: "General",       icon: <Globe size={13} /> },
    { id: "feature-flags",label: "Feature Flags", icon: <Zap size={13} /> },
    { id: "admin-users",  label: "Admin Users",   icon: <Users size={13} /> },
    { id: "security",     label: "Security",      icon: <Shield size={13} /> },
    { id: "audit-log",    label: "Audit Log",     icon: <Activity size={13} /> },
    { id: "notifications",label: "Notifications", icon: <Bell size={13} /> },
    { id: "email-smtp",   label: "Email",         icon: <Mail size={13} /> },
    { id: "backup",       label: "Backup & Data", icon: <Database size={13} /> },
  ];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1000 }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#E8EDF5", marginBottom: 4 }}>
          Admin Settings
        </h1>
        <p style={{ color: "#8A9AB8", fontSize: 14 }}>
          Platform configuration, security, access control, and system management.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)", color: "#FC8181", fontSize: 13 }}>
          <AlertCircle size={14}/> Saved settings could not be loaded: {loadError}
        </div>
      )}

      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
        style={{ background: "rgba(159,122,234,0.06)", border: "1px solid rgba(159,122,234,0.12)", width: "fit-content", maxWidth: "100%" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
            style={{
              background: activeTab === t.id ? "rgba(159,122,234,0.18)" : "transparent",
              color: activeTab === t.id ? "#C4A9F5" : "#8A9AB8",
              border: "none", cursor: "pointer",
              boxShadow: activeTab === t.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ GENERAL ════════════════ */}
      {activeTab === "general" && (
        <div className="space-y-5">
          <Section title="Platform Identity" desc="Core details shown across the platform and in emails.">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label style={LABEL}>Platform Name</label>
                <input value={platformName} onChange={e => setPlatformName(e.target.value)} style={INPUT}/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label style={LABEL}>Support Email</label>
                <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} style={INPUT}/>
              </div>
              <div className="col-span-2">
                <label style={LABEL}>Tagline</label>
                <input value={tagline} onChange={e => setTagline(e.target.value)} style={INPUT}/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label style={LABEL}>Support Phone</label>
                <input value={supportPhone} onChange={e => setSupportPhone(e.target.value)} style={INPUT}/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label style={LABEL}>Default Timezone</label>
                <select className="fpd-select-dark" value={timezone} onChange={e => setTimezone(e.target.value)} style={INPUT}>
                  {["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","UTC","Europe/London","Europe/Paris","Asia/Tokyo"].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={() => void save("general", general, "Platform settings saved")}
              className="mt-5 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#9F7AEA,#7C3AED)", color: "#fff", border: "none", cursor: "pointer" }}>
              <Save size={13}/> Save Changes
            </button>
          </Section>

          <Section title="Maintenance Mode"
            desc="When enabled, non-admin users see a maintenance message instead of the platform.">
            <ToggleRow label="Maintenance Mode" desc="Blocks all non-admin access immediately"
              value={maintenance} onChange={v => { setMaintenance(v); void save("general", { ...general, maintenance: v }, v ? "Maintenance mode saved as ON" : "Maintenance mode saved as OFF"); }} accent="#FC8181"/>
            {maintenance && (
              <div className="mt-4">
                <label style={LABEL}>Maintenance Message</label>
                <textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)}
                  rows={2} style={{ ...INPUT, resize: "vertical" }}/>
                <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(252,129,129,0.07)", border: "1px solid rgba(252,129,129,0.2)" }}>
                  <AlertTriangle size={13} color="#FC8181"/>
                  <span style={{ color: "#FC8181", fontSize: 12, fontWeight: 600 }}>
                    Platform is currently in maintenance mode — users cannot use their portal.
                  </span>
                </div>
                <button onClick={() => void save("general", general, "Maintenance message saved")}
                  className="mt-3 flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(159,122,234,0.1)", color: "#C4A9F5", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
                  <Save size={12}/> Save Message
                </button>
              </div>
            )}
            <p style={{ color: "#8A9AB8", fontSize: 12, marginTop: 12 }}>While on, signed-in users see the maintenance message instead of their portal. The admin portal keeps working.</p>
          </Section>

          <Section title="System Health" desc="Live status of core platform services.">
            <div className="space-y-2 mb-4">
              {HEALTH_SERVICES.map(s => {
                const h = health[s.id];
                const color = !h ? "#8A9AB8" : h.ok ? "#5FBE91" : "#FC8181";
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(159,122,234,0.03)", border: "1px solid rgba(159,122,234,0.08)" }}>
                    <div style={{ color: "#8A9AB8" }}>{s.icon}</div>
                    <span style={{ flex: 1, fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>{s.name}</span>
                    <span style={{ ...MONO, fontSize: 11, color: "#8A9AB8" }}>{h ? `${h.ms}ms` : "—"}</span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ background: `${color}1A`, color }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }}/>
                      {!h ? "Checking" : h.ok ? "Operational" : "Failing"}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(159,122,234,0.03)", border: "1px solid rgba(159,122,234,0.08)" }}>
                <div style={{ color: "#8A9AB8" }}><Mail size={16}/></div>
                <span style={{ flex: 1, fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>Email Delivery</span>
                <span style={{ ...MONO, fontSize: 11, color: "#8A9AB8" }}>—</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{ background: emailOn ? "rgba(95,190,145,0.1)" : "rgba(217,165,94,0.1)", color: emailOn ? "#5FBE91" : "#D9A55E" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: emailOn ? "#5FBE91" : "#D9A55E", display: "inline-block" }}/>
                  {emailOn ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            <button onClick={() => onNavigate?.("master-admin")}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(159,122,234,0.1)", color: "#C4A9F5", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
              <Activity size={13}/> Open Master Admin → System Health
            </button>
          </Section>
        </div>
      )}

      {/* ════════════════ FEATURE FLAGS ════════════════ */}
      {activeTab === "feature-flags" && (
        <div className="space-y-5">
          <Section title="Platform Features"
            desc="Toggle platform features on or off globally.">
            {([
              { key:"publicSignup",         label:"Public Signup",           desc:"Allow new users to register without an invite" },
              { key:"aiAssistant",          label:"AI Assistant",            desc:"Show the FPD AI assistant to all users" },
              { key:"whiteGloveConcierge",  label:"White Glove Concierge",   desc:"Enable concierge service requests and staff portal" },
              { key:"affiliateProgram",     label:"Affiliate Program",       desc:"Allow affiliate link generation and payout tracking" },
              { key:"partnerPortal",        label:"Partner Portal",          desc:"Enable white-label partner onboarding flow" },
              { key:"cryptoPayments",       label:"Crypto Payments",         desc:"Show cryptocurrency payment option at checkout" },
              { key:"receiptOCR",           label:"Receipts & OCR Scanning", desc:"Enable receipt scanning in the user file cabinet" },
              { key:"disasterProtection",   label:"Disaster Protection",     desc:"Show disaster protection plan upsell and features" },
              { key:"idVerification",       label:"ID Verification",         desc:"Require identity verification for high-value accounts" },
              { key:"emailReferrals",       label:"Email Referrals",         desc:"Allow users to invite contacts via email referral" },
              { key:"betaFeatures",         label:"Beta Features",           desc:"Expose experimental in-development features to users" },
            ] as { key: keyof typeof flags; label: string; desc: string }[]).map(f => (
              <ToggleRow key={f.key} label={f.label} desc={f.desc}
                value={flags[f.key]} onChange={() => toggleFlag(f.key, f.label)}/>
            ))}
          </Section>

          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.2)" }}>
            <Info size={14} color="#D9A55E"/>
            <p style={{ color: "#D9A55E", fontSize: 13 }}>
              Turning a flag off hides that feature for everyone (it can take a page reload) and does not delete any data. ID Verification turns the contact ID-upload step on or off. Email Referrals and Beta Features are not connected to any feature yet, so switching them changes nothing.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════ ADMIN USERS ════════════════ */}
      {activeTab === "admin-users" && (
        <div className="space-y-5">
          <Section title="Admin Accounts"
            desc="Manage who has access to the admin portal and what they can do.">

            {/* Add admin form */}
            {showAddAdmin && (
              <div className="mb-5 p-4 rounded-2xl space-y-3"
                style={{ background: "rgba(159,122,234,0.05)", border: "1px solid rgba(159,122,234,0.18)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#C4A9F5", marginBottom: 2 }}>Invite New Admin</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={newAdminName}  onChange={e => setNewName(e.target.value)} placeholder="Full name" style={INPUT}/>
                  <input value={newAdminEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" style={INPUT}/>
                  <select className="fpd-select-dark" value={newAdminRole} onChange={e => setNewRole(e.target.value as AdminRole)} style={INPUT}>
                    {INVITE_ROLES.map(r => <option key={r} value={r}>{ROLE_PRESETS[r].label}</option>)}
                  </select>
                </div>
                <div style={{ color: "#8A9AB8", fontSize: 12 }}>{ROLE_PRESETS[newAdminRole].description}</div>
                <div className="flex gap-2">
                  <button onClick={() => void addAdmin()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold"
                    style={{ background: "linear-gradient(135deg,#9F7AEA,#7C3AED)", color: "#fff", border: "none", cursor: "pointer" }}>
                    <Plus size={12}/> Send Invite
                  </button>
                  <button onClick={() => setAddAdmin(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(159,122,234,0.08)", color: "#8A9AB8", border: "1px solid rgba(159,122,234,0.15)", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showAddAdmin && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <button onClick={() => setAddAdmin(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(159,122,234,0.1)", color: "#C4A9F5", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
                  <Plus size={13}/> Invite Admin
                </button>
                <button onClick={() => onNavigate?.("admin-roles")}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "transparent", color: "#8A9AB8", border: "1px solid rgba(159,122,234,0.15)", cursor: "pointer" }}>
                  Edit permissions in Admin Team &amp; Roles
                </button>
              </div>
            )}

            {adminsLoading && <div style={{ color: "#8A9AB8", fontSize: 13 }}>Loading admin accounts…</div>}
            {adminsError && <div style={{ color: "#FC8181", fontSize: 13 }}>{adminsError}</div>}
            {!adminsLoading && !adminsError && admins.length === 0 && (
              <div style={{ color: "#8A9AB8", fontSize: 13 }}>No admin accounts have been invited yet.</div>
            )}

            <div className="space-y-2">
              {admins.map(a => (
                <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: "rgba(159,122,234,0.03)", border: "1px solid rgba(159,122,234,0.08)" }}>
                  <div className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 38, height: 38, background: `${ROLE_COLOR[a.role] ?? "#9F7AEA"}18`,
                      border: `2px solid ${ROLE_COLOR[a.role] ?? "#9F7AEA"}30`, color: ROLE_COLOR[a.role] ?? "#9F7AEA",
                      fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>
                    {a.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#E8EDF5" }}>{a.name}</span>
                      <span style={{ fontSize: 10, ...MONO, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                        background: `${ROLE_COLOR[a.role] ?? "#9F7AEA"}15`, color: ROLE_COLOR[a.role] ?? "#9F7AEA" }}>
                        {a.role.replace(/_/g, " ").toUpperCase()}
                      </span>
                      {a.status !== "active" && (
                        <span style={{ fontSize: 10, ...MONO, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                          background: "rgba(139,154,184,0.12)", color: "#8A9AB8" }}>
                          {a.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#8A9AB8", fontSize: 11, marginTop: 2 }}>{a.email}</div>
                  </div>
                  <div className="text-right hidden md:block flex-shrink-0">
                    <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO }}>LAST LOGIN</div>
                    <div style={{ fontSize: 11, color: "#A3ADC9" }}>{fmtWhen(a.last_login_at)}</div>
                  </div>
                  {a.status === "suspended" && (
                    <button onClick={() => void reactivateAdmin(a)}
                      style={{ color: "#5FBE91", background: "rgba(95,190,145,0.08)", border: "1px solid rgba(95,190,145,0.25)",
                        borderRadius: 8, padding: "6px 12px", cursor: "pointer", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
                      Reactivate
                    </button>
                  )}
                  {a.status !== "suspended" && (
                    <button onClick={() => void removeAdmin(a)} title="Remove admin access"
                      style={{ color: "#FC8181", background: "rgba(252,129,129,0.07)", border: "1px solid rgba(252,129,129,0.15)",
                        borderRadius: 8, padding: 7, cursor: "pointer", flexShrink: 0 }}>
                      <Trash2 size={13}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Role Permissions Reference" desc="What each role can access in the admin portal.">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(159,122,234,0.05)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, ...MONO, color: "#8A9AB8", fontWeight: 700, whiteSpace: "nowrap" }}>Permission</th>
                    {INVITE_ROLES.map(r => (
                      <th key={r} style={{ padding: "8px 12px", textAlign: "center", fontSize: 10, ...MONO,
                        color: "#8A9AB8", fontWeight: 700, whiteSpace: "nowrap" }}>{ROLE_PRESETS[r].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLE_PRESETS.super_admin.permissions.map((m, i) => (
                    <tr key={m.module} style={{ borderTop: "1px solid rgba(159,122,234,0.07)",
                      background: i % 2 ? "rgba(159,122,234,0.02)" : "transparent" }}>
                      <td style={{ padding: "9px 12px", fontSize: 12, color: "#E8EDF5", fontWeight: 500, whiteSpace: "nowrap" }}>{m.label}</td>
                      {INVITE_ROLES.map(r => {
                        const p = ROLE_PRESETS[r].permissions[i];
                        return (
                          <td key={r} style={{ padding: "9px 12px", textAlign: "center" }}>
                            {p.canEdit ? <CheckCircle size={13} color="#5FBE91" style={{ display: "inline" }}/>
                              : p.canView ? <span style={{ fontSize: 10, ...MONO, color: "#A3ADC9" }}>VIEW</span>
                              : <X size={13} color="rgba(252,129,129,0.5)" style={{ display: "inline" }}/>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "#8A9AB8", fontSize: 11, marginTop: 10 }}>
              ✓ can view and edit · VIEW is read-only · ✕ no access. These are the role presets; an individual admin's permissions can be adjusted in Admin Team &amp; Roles.
            </p>
          </Section>

        </div>
      )}

      {/* ════════════════ SECURITY ════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-5">

          <Section title="Authentication" desc="Control how admins authenticate to the portal.">
            <ToggleRow label="Enforce 2FA for all admins"
              desc="While on, an admin with no two-step verification set up cannot use the portal until they set it up."
              disabled={!enforce2FA && unenrolled.length > 0}
              value={enforce2FA} onChange={v => {
                setEnforce2FA(v);
                void adminApi.put("/settings/security", { value: { enforce2FA: v, sessionTimeout, ipAllowlist } })
                  .then(() => toast.success(v ? "2FA is now required for every admin" : "2FA enforcement turned off"))
                  .catch(err => { setEnforce2FA(!v); toast.error(err instanceof Error ? err.message : "Could not save"); })
                  .finally(() => refetchTwofa());
              }}/>
            {unenrolled.length > 0 && (
              <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.2)" }}>
                <div style={{ color: "#D9A55E", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  {unenrolled.length === 1 ? "1 admin has" : `${unenrolled.length} admins have`} not set up two-step verification{enforce2FA ? " and cannot use the portal" : ", so enforcement can't be turned on yet"}:
                </div>
                <ul style={{ color: "#E8EDF5", fontSize: 12, lineHeight: 1.7, paddingLeft: 16, listStyle: "disc" }}>
                  {unenrolled.map(a => <li key={a.email}>{a.name ? `${a.name} · ` : ""}{a.email} <span style={{ color: "#8A9AB8" }}>({a.role})</span></li>)}
                </ul>
                <div style={{ color: "#8A9AB8", fontSize: 11, marginTop: 6 }}>Each of them signs in to the app and opens Account Settings → Two-Step Verification.</div>
              </div>
            )}
            <div className="mt-4">
              <label style={LABEL}>Session Timeout (minutes)</label>
              <select className="fpd-select-dark" value={sessionTimeout} onChange={e => { setSessionTimeout(e.target.value); saveSecurity({ sessionTimeout: e.target.value }, "Session timeout saved"); }} style={{ ...INPUT, width: 200 }}>
                {["15","30","60","120","240","Never"].map(v => <option key={v} value={v}>{v === "Never" ? "Never" : `${v} minutes`}</option>)}
              </select>
              <p style={{ color: "#8A9AB8", fontSize: 11, marginTop: 6 }}>
                Admin sessions expire after this period of inactivity.
              </p>
            </div>
            <p style={{ color: "#8A9AB8", fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>
              Admins who have set up two-step verification must pass it on every sign-in. The 2FA switch takes effect within a minute; the session timeout on the next page load.
            </p>
          </Section>

          <Section title="IP Allowlist"
            desc="Restrict admin portal access to specific IP ranges. Leave empty to allow all IPs.">
            <div className="space-y-2 mb-4">
              {ipAllowlist.map((ip, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(159,122,234,0.04)", border: "1px solid rgba(159,122,234,0.1)" }}>
                  <Lock size={12} color="#8A9AB8"/>
                  <span style={{ flex: 1, ...MONO, fontSize: 13, color: "#E8EDF5" }}>{ip}</span>
                  <button onClick={() => { const next = ipAllowlist.filter((_, j) => j !== i); setIpAllowlist(next); saveSecurity({ ipAllowlist: next }, "IP range removed"); }}
                    style={{ color: "#FC8181", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              ))}
              {ipAllowlist.length === 0 && (
                <p style={{ color: "#D9A55E", fontSize: 12 }}>⚠ No IP restrictions — admin portal accessible from any IP.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input value={newIp} onChange={e => setNewIp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addIp()}
                placeholder="e.g. 203.0.113.0/24 or 10.0.0.1" style={{ ...INPUT }}/>
              <button onClick={addIp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                style={{ background: "rgba(159,122,234,0.1)", color: "#9F7AEA", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
                <Plus size={12}/> Add
              </button>
            </div>
          </Section>

          <Section title="Stored Secrets Encryption Key" desc="Encrypts payment-processor credentials and Enterprise API key secrets at rest.">
            <RotateEncryptionKey/>
          </Section>

          <Section title="Password Policy" desc="Minimum requirements enforced for all admin account passwords.">
            {[
              "Minimum 12 characters",
              "Require uppercase letter",
              "Require number",
              "Require special character",
              "Prevent password reuse (last 5)",
              "Force rotation every 90 days",
            ].map(label => (
              <div key={label} className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(159,122,234,0.07)" }}>
                <CheckCircle size={13} color="#8A9AB8"/>
                <span style={{ fontSize: 13, color: "#A3ADC9" }}>{label}</span>
              </div>
            ))}
            <StoredOnly>This is the intended policy. Password rules are enforced by Supabase Auth (Authentication → Providers → Email in the Supabase dashboard), not by this screen — set the minimum length and required characters there to make it binding.</StoredOnly>
          </Section>

        </div>
      )}

      {/* ════════════════ AUDIT LOG ════════════════ */}
      {activeTab === "audit-log" && (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div className="flex items-center gap-3 p-5 border-b flex-wrap"
            style={{ borderColor: "rgba(159,122,234,0.1)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#E8EDF5", flex: 1 }}>Admin Activity Log</h3>
            <select className="fpd-select-dark" value={auditSev} onChange={e => setAuditSev(e.target.value)}
              style={{ ...INPUT, width: 150, padding: "7px 12px" }}>
              <option value="all">All Severity</option>
              {severities.map(sev => <option key={sev} value={sev}>{sev[0].toUpperCase() + sev.slice(1)}</option>)}
            </select>
            <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
              placeholder="Search action or user..." style={{ ...INPUT, width: 220, padding: "7px 12px" }}/>
            <button onClick={() => { const n = downloadCSV("audit-log.csv", filteredAudit as unknown as Record<string, unknown>[]); toast.success(`Audit log exported (${n} rows)`); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
              style={{ background: "rgba(159,122,234,0.08)", color: "#9F7AEA", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
              <Download size={12}/> Export
            </button>
            <button onClick={() => void clearAudit()} disabled={clearingAudit || auditLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
              style={{ background: "rgba(252,129,129,0.08)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.2)",
                cursor: clearingAudit || auditLogs.length === 0 ? "not-allowed" : "pointer", opacity: clearingAudit || auditLogs.length === 0 ? 0.5 : 1 }}>
              <Trash2 size={12}/> {clearingAudit ? "Clearing…" : "Clear"}
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(159,122,234,0.04)" }}>
                  {["Event ID","Admin","Action","Target","IP","Severity","Timestamp"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10,
                      ...MONO, color: "#8A9AB8", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((e, i) => (
                  <tr key={e.id} style={{ borderTop: "1px solid rgba(159,122,234,0.06)",
                    background: i % 2 ? "rgba(159,122,234,0.01)" : "transparent" }}>
                    <td style={{ padding: "11px 14px", fontSize: 11, ...MONO, color: "#C4A9F5" }}>{e.id.slice(0, 8)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#A3ADC9" }}>{e.actor_email ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "#E8EDF5" }}>{e.action}</td>
                    <td style={{ padding: "11px 14px", fontSize: 11, ...MONO, color: "#8A9AB8" }}>{[e.target_type, e.target_id?.slice(0, 8)].filter(Boolean).join(" · ") || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 11, ...MONO, color: "#8A9AB8" }}>{e.ip_address ?? "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 9, ...MONO, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                        background: `${SEV_COLOR[e.severity] ?? "#8A9AB8"}15`, color: SEV_COLOR[e.severity] ?? "#8A9AB8" }}>
                        {e.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#8A9AB8", whiteSpace: "nowrap" }}>{fmtWhen(e.created_at)}</td>
                  </tr>
                ))}
                {filteredAudit.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: auditError ? "#FC8181" : "#8A9AB8", fontSize: 13 }}>{auditError ?? (auditLoading ? "Loading activity…" : auditLogs.length === 0 ? "No admin activity recorded yet." : "No events match your filters.")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════ NOTIFICATIONS ════════════════ */}
      {activeTab === "notifications" && (
        <div className="space-y-5">
          <Section title="Alert Email Address" desc="All admin notifications are sent to this address.">
            <div className="mb-3" style={{ marginTop: -8 }}><StoredOnly>Alert emails are not sent yet. Your choices are saved for when alerts are switched on.</StoredOnly></div>
            <input value={notifEmail} onChange={e => setNotifEmail(e.target.value)} style={{ ...INPUT, maxWidth: 360 }}/>
            <button onClick={() => void save("notifications", { email: notifEmail, alerts: notifs }, "Notification email saved")}
              className="mt-3 flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(159,122,234,0.1)", color: "#9F7AEA", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
              <Save size={12}/> Save
            </button>
          </Section>

          <Section title="Users & Subscriptions">
            {([
              { k:"newSignup",     label:"New User Signup",        desc:"Alert when a new account is created" },
              { k:"planUpgrade",   label:"Plan Upgrade",           desc:"Alert when a user upgrades their plan" },
              { k:"planDowngrade", label:"Plan Downgrade / Cancel",desc:"Alert when a user downgrades or cancels" },
            ] as { k: keyof typeof notifs; label: string; desc: string }[]).map(n =>
              <ToggleRow key={n.k} label={n.label} desc={n.desc} value={notifs[n.k]} onChange={() => toggleNotif(n.k)}/>
            )}
          </Section>

          <Section title="Payments & Revenue">
            {([
              { k:"paymentSuccess",  label:"Successful Payment",     desc:"Alert on every successful charge (high volume)" },
              { k:"paymentFailed",   label:"Failed Payment",         desc:"Alert when a subscription payment fails" },
              { k:"affiliatePayout", label:"Affiliate Payout",       desc:"Alert when a payout is queued or processed" },
            ] as { k: keyof typeof notifs; label: string; desc: string }[]).map(n =>
              <ToggleRow key={n.k} label={n.label} desc={n.desc} value={notifs[n.k]} onChange={() => toggleNotif(n.k)}/>
            )}
          </Section>

          <Section title="Operations & System">
            {([
              { k:"whiteGloveRequest", label:"White Glove Request",  desc:"Alert when a user submits a concierge request" },
              { k:"idVerification",    label:"ID Verification",      desc:"Alert when a new ID is submitted for review" },
              { k:"securityAlert",     label:"Security Alert",       desc:"Alert on suspicious logins, IP changes, or 2FA failures" },
              { k:"backupComplete",    label:"Backup Complete",       desc:"Notify when automated backup finishes" },
              { k:"systemError",       label:"System Error",         desc:"Alert on API errors, service outages, or crashes" },
              { k:"dailyReport",       label:"Daily Summary Report",  desc:"Receive a daily digest of platform activity" },
            ] as { k: keyof typeof notifs; label: string; desc: string }[]).map(n =>
              <ToggleRow key={n.k} label={n.label} desc={n.desc} value={notifs[n.k]} onChange={() => toggleNotif(n.k)}/>
            )}
          </Section>
        </div>
      )}

      {/* ════════════════ EMAIL / SMTP ════════════════ */}
      {activeTab === "email-smtp" && (
        <div className="space-y-5">
          <Section title="Email Provider Status">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label:"Provider",   val: emailOn ? (emailStatus?.provider ?? "Connected") : "Not connected" },
                { label:"Sent (MTD)", val:"—" },
                { label:"Delivered",  val:"—" },
                { label:"Bounced",    val:"—" },
                { label:"Open Rate",  val:"—" },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl" style={{ background: "rgba(159,122,234,0.04)", border: "1px solid rgba(159,122,234,0.08)" }}>
                  <div style={{ fontSize: 10, ...MONO, color: "#8A9AB8", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: s.val === "—" ? "#8A9AB8" : emailOn ? "#5FBE91" : "#D9A55E" }}>{s.val}</div>
                </div>
              ))}
            </div>
            <StoredOnly>{emailOn
              ? `Email is sent through ${emailStatus?.provider ?? "the mail provider"} from ${emailStatus?.from}. The provider and sender are server secrets (SENDGRID_API_KEY, EMAIL_FROM), not settings here. Delivery, bounce and open figures are in the provider's own dashboard. "Send Test Email" sends a real message to your address.`
              : "Not connected. No mail key is set on the server, so the platform cannot send email and there are no delivery figures to show."}</StoredOnly>
            <button onClick={() => void sendTestEmail()} disabled={testingEmail || !emailOn}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ background: "rgba(159,122,234,0.1)", color: "#9F7AEA", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
              <RefreshCw size={13}/> {testingEmail ? "Sending…" : "Send Test Email"}
            </button>
          </Section>
        </div>
      )}

      {/* ════════════════ BACKUP & DATA ════════════════ */}
      {activeTab === "backup" && (
        <div className="space-y-5">

          <Section title="Backups" desc="Database backups are taken by Supabase on the project's own schedule (Supabase dashboard → Database → Backups).">
            <p style={{ color: "#8A9AB8", fontSize: 12, lineHeight: 1.6 }}>
              "Download Snapshot" saves a copy of the platform's data to your computer.
            </p>
            <button onClick={() => void exportSnapshot()} disabled={snapshotBusy}
              className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#9F7AEA,#7C3AED)", color: "#fff", border: "none", cursor: "pointer" }}>
              <Database size={13}/> {snapshotBusy ? "Building snapshot…" : "Download Snapshot"}
            </button>
          </Section>

          <Section title="Data Export" desc="Export platform data for compliance, analysis, or migration.">
            <div className="space-y-3">
              {EXPORTS.map(e => (
                <div key={e.label} className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "rgba(159,122,234,0.03)", border: "1px solid rgba(159,122,234,0.08)" }}>
                  <div className="flex-1">
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#E8EDF5" }}>{e.label}</div>
                    <div style={{ fontSize: 12, color: "#8A9AB8" }}>{e.desc}</div>
                  </div>
                  <button onClick={() => void exportData(e.label, e.path, e.file, e.only)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
                    style={{ background: "rgba(159,122,234,0.1)", color: "#C4A9F5", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
                    <Download size={11}/> Export CSV
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: "rgba(159,122,234,0.03)", border: "1px solid rgba(159,122,234,0.08)" }}>
                <div className="flex-1">
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#E8EDF5" }}>Full Platform Snapshot</div>
                  <div style={{ fontSize: 12, color: "#8A9AB8" }}>Everything above plus the saved settings, in a single JSON file</div>
                </div>
                <button onClick={() => void exportSnapshot()} disabled={snapshotBusy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 disabled:opacity-60"
                  style={{ background: "rgba(159,122,234,0.1)", color: "#C4A9F5", border: "1px solid rgba(159,122,234,0.2)", cursor: "pointer" }}>
                  <Download size={11}/> Export JSON
                </button>
              </div>
            </div>
          </Section>

          <Section title="Danger Zone" desc="Irreversible operations. Proceed with extreme caution.">
            <div className="space-y-3" style={{ marginBottom: 12 }}>
              <TestAccountCleanup/>
              <InactivePurge/>
            </div>
            {[
              { label:"Reset Feature Flags",  desc:"Restore all feature flags to their default values",    color:"#D9A55E", run: resetFlags },
            ].map(d => (
              <div key={d.label} className="flex items-center justify-between gap-4 py-3"
                style={{ borderBottom: "1px solid rgba(252,129,129,0.08)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#E8EDF5" }}>{d.label}</div>
                  <div style={{ fontSize: 12, color: "#8A9AB8" }}>{d.desc}</div>
                </div>
                <button onClick={d.run}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{ background: `${d.color}1A`, color: d.color, border: `1px solid ${d.color}4D`, cursor: "pointer" }}>
                  <AlertTriangle size={11}/> {d.label.split(" ").slice(0,2).join(" ")}
                </button>
              </div>
            ))}
          </Section>

        </div>
      )}
    </div>
  );
}
