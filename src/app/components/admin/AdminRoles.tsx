import React, { useState } from "react";
import {
  Shield, Plus, X, ChevronDown, ChevronUp, Edit2,
  CheckCircle, Eye, EyeOff, Lock, Unlock, Send, UserX,
  Crown, Users, BarChart3, DollarSign, HardDrive, UserCheck,
  TrendingUp, Bell, Star, Settings, Mail, FileText, Key,
  AlertTriangle, Save, ToggleLeft, ToggleRight, RefreshCw, Copy
} from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.16)", borderRadius:20 };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", borderRadius:10, padding:"8px 12px", fontSize:16, color:"#FFFFFF", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

/* ── Permission modules ──────────────────────────────────────────── */
export interface ModulePermission {
  module: string;
  label: string;
  icon: React.ReactNode;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const MODULE_DEFS: Omit<ModulePermission, "canView"|"canEdit"|"canDelete">[] = [
  { module:"overview",      label:"Dashboard Overview",       icon:<BarChart3 size={13}/> },
  { module:"analytics",     label:"Analytics",                icon:<TrendingUp size={13}/> },
  { module:"users",         label:"Users & Accounts",         icon:<Users size={13}/> },
  { module:"revenue",       label:"Revenue & MRR",            icon:<DollarSign size={13}/> },
  { module:"storage",       label:"Storage Management",       icon:<HardDrive size={13}/> },
  { module:"verification",  label:"ID Verification",          icon:<UserCheck size={13}/> },
  { module:"payouts",       label:"Payouts & Commissions",    icon:<TrendingUp size={13}/> },
  { module:"continuation",  label:"$199 Legacy Fee",          icon:<DollarSign size={13}/> },
  { module:"audit",         label:"Audit Log",                icon:<Shield size={13}/> },
  { module:"notifications", label:"Push Notifications",       icon:<Bell size={13}/> },
  { module:"white_glove",   label:"White Glove Concierge",    icon:<Star size={13}/> },
  { module:"subscription",  label:"Subscription Config",      icon:<Settings size={13}/> },
  { module:"white_label",   label:"White Label Packages",     icon:<Crown size={13}/> },
  { module:"partners",      label:"Partner Program",          icon:<Users size={13}/> },
  { module:"email_templates",label:"Email Templates",         icon:<Mail size={13}/> },
  { module:"crypto",        label:"Crypto Merchant Config",   icon:<Key size={13}/> },
];

function makePermissions(view: boolean, edit: boolean, del: boolean): ModulePermission[] {
  return MODULE_DEFS.map(m => ({ ...m, canView: view, canEdit: edit, canDelete: del }));
}

/* ── Role presets ────────────────────────────────────────────────── */
export type AdminRole = "super_admin" | "operations_manager" | "support_agent" | "finance_manager" | "wg_manager" | "content_admin" | "custom";

const ROLE_PRESETS: Record<AdminRole, { label: string; color: string; description: string; permissions: ModulePermission[] }> = {
  super_admin: {
    label: "Super Admin",
    color: "#6E90C9",
    description: "Full access to everything. Cannot be restricted.",
    permissions: makePermissions(true, true, true),
  },
  operations_manager: {
    label: "Operations Manager",
    color: "#6FAE8B",
    description: "Full view access + edit on users, WG, verification, notifications. No financial delete.",
    permissions: MODULE_DEFS.map(m => ({
      ...m,
      canView: true,
      canEdit: ["overview","users","white_glove","verification","notifications","audit"].includes(m.module),
      canDelete: false,
    })),
  },
  support_agent: {
    label: "Support Agent",
    color: "#6FAE8B",
    description: "View users and white glove only. No financial data, no config access.",
    permissions: MODULE_DEFS.map(m => ({
      ...m,
      canView: ["overview","users","white_glove","verification"].includes(m.module),
      canEdit: ["users","white_glove"].includes(m.module),
      canDelete: false,
    })),
  },
  finance_manager: {
    label: "Finance Manager",
    color: "#D99A6B",
    description: "Full access to revenue, payouts, $199 fee, crypto. View-only everything else.",
    permissions: MODULE_DEFS.map(m => ({
      ...m,
      canView: true,
      canEdit: ["revenue","payouts","continuation","crypto","subscription"].includes(m.module),
      canDelete: ["payouts"].includes(m.module),
    })),
  },
  wg_manager: {
    label: "White Glove Manager",
    color: "#ED8936",
    description: "Full White Glove access including clients, waivers, billing, staff. View-only users.",
    permissions: MODULE_DEFS.map(m => ({
      ...m,
      canView: ["overview","users","white_glove","verification","audit"].includes(m.module),
      canEdit: ["white_glove"].includes(m.module),
      canDelete: false,
    })),
  },
  content_admin: {
    label: "Content Admin",
    color: "#FC8181",
    description: "Edit email templates and push notifications. View-only everything else.",
    permissions: MODULE_DEFS.map(m => ({
      ...m,
      canView: ["overview","notifications","email_templates"].includes(m.module),
      canEdit: ["notifications","email_templates"].includes(m.module),
      canDelete: false,
    })),
  },
  custom: {
    label: "Custom",
    color: "#8A9AB8",
    description: "Manually configure each permission below.",
    permissions: makePermissions(false, false, false),
  },
};

/* ── Admin account type ──────────────────────────────────────────── */
export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "invited" | "suspended";
  permissions: ModulePermission[];
  createdAt: string;
  lastLogin?: string;
  invitedBy: string;
  avatar: string;
  notes: string;
}

/* ── Seed data ──────────────────────────────────────────────────────*/
let _admins: AdminAccount[] = [
  {
    id: "ADM-001",
    name: "Alex Johnson",
    email: "alex.johnson@finalpassdown.com",
    role: "super_admin",
    status: "active",
    permissions: ROLE_PRESETS.super_admin.permissions,
    createdAt: "Jan 10, 2026",
    lastLogin: "Jun 28, 2026 · 9:02 AM",
    invitedBy: "System",
    avatar: "AJ",
    notes: "Platform founder account.",
  },
  {
    id: "ADM-002",
    name: "Simone Carter",
    email: "s.carter@finalpassdown.com",
    role: "operations_manager",
    status: "active",
    permissions: ROLE_PRESETS.operations_manager.permissions,
    createdAt: "Mar 5, 2026",
    lastLogin: "Jun 27, 2026 · 4:18 PM",
    invitedBy: "Alex Johnson",
    avatar: "SC",
    notes: "Manages day-to-day operations and concierge team.",
  },
  {
    id: "ADM-003",
    name: "Derek Mills",
    email: "d.mills@finalpassdown.com",
    role: "finance_manager",
    status: "active",
    permissions: ROLE_PRESETS.finance_manager.permissions,
    createdAt: "Apr 12, 2026",
    lastLogin: "Jun 26, 2026 · 11:34 AM",
    invitedBy: "Alex Johnson",
    avatar: "DM",
    notes: "Handles all payouts, revenue reporting, and crypto config.",
  },
  {
    id: "ADM-004",
    name: "Priya Nair",
    email: "p.nair@finalpassdown.com",
    role: "support_agent",
    status: "invited",
    permissions: ROLE_PRESETS.support_agent.permissions,
    createdAt: "Jun 20, 2026",
    invitedBy: "Simone Carter",
    avatar: "PN",
    notes: "New hire — awaiting first login.",
  },
];

/* ── Permission row ──────────────────────────────────────────────── */
function PermissionRow({
  perm, onChange, locked
}: {
  perm: ModulePermission;
  onChange: (changes: Partial<ModulePermission>) => void;
  locked: boolean;
}) {
  return (
    <div className="grid items-center gap-2 py-2 px-3 rounded-2xl" style={{ gridTemplateColumns:"1fr auto auto auto", borderBottom:"1px solid rgba(91,110,225,0.06)" }}>
      <div className="flex items-center gap-2">
        <span style={{ color:"#8A9AB8" }}>{perm.icon}</span>
        <span style={{ fontSize:15, color:"#E8EDF5" }}>{perm.label}</span>
      </div>
      {(["canView","canEdit","canDelete"] as const).map(key => {
        const labels = { canView:"View", canEdit:"Edit", canDelete:"Delete" };
        const colors = { canView:"#5BA7D6", canEdit:"#48BB78", canDelete:"#FC8181" };
        const active = perm[key];
        return (
          <button
            key={key}
            disabled={locked}
            onClick={() => onChange({ [key]: !active })}
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: active ? `${colors[key]}18` : "rgba(91,110,225,0.04)",
              color: active ? colors[key] : "#B0C0DC",
              border: `1px solid ${active ? colors[key] + "40" : "rgba(91,110,225,0.1)"}`,
              opacity: locked ? 0.6 : 1,
              cursor: locked ? "not-allowed" : "pointer",
              minWidth: 60,
              justifyContent: "center",
            }}
          >
            {active ? <CheckCircle size={9}/> : <X size={9}/>} {labels[key]}
          </button>
        );
      })}
    </div>
  );
}

/* ── Admin account card ──────────────────────────────────────────── */
function AdminCard({
  admin, onUpdate, onRevoke, isSelf
}: {
  admin: AdminAccount;
  onUpdate: (id: string, changes: Partial<AdminAccount>) => void;
  onRevoke: (id: string) => void;
  isSelf: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingPerms, setEditingPerms] = useState(false);
  const [localPerms, setLocalPerms] = useState<ModulePermission[]>(admin.permissions);
  const preset = ROLE_PRESETS[admin.role];
  const statusColor = { active:"#48BB78", invited:"#F6AD55", suspended:"#FC8181" }[admin.status];
  const isSuper = admin.role === "super_admin";

  function savePerms() {
    onUpdate(admin.id, { permissions: localPerms, role: "custom" });
    setEditingPerms(false);
    toast.success("Permissions saved");
  }

  function applyPreset(role: AdminRole) {
    const perms = ROLE_PRESETS[role].permissions;
    setLocalPerms(perms);
    onUpdate(admin.id, { role, permissions: perms });
    toast.success(`Role set to ${ROLE_PRESETS[role].label}`);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:46, height:46, background:`${preset.color}18`, color:preset.color, fontSize:19, fontFamily:"var(--font-display)" }}>
              {admin.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>{admin.name}</span>
                {isSelf && <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(91,110,225,0.1)", color:"#6E90C9", ...MONO }}>YOU</span>}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:`${preset.color}15`, color:preset.color, ...MONO }}>
                  {preset.label.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:`${statusColor}15`, color:statusColor, ...MONO }}>
                  {admin.status.toUpperCase()}
                </span>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15 }}>{admin.email}</div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:2 }}>
                Added {admin.createdAt} by {admin.invitedBy}
                {admin.lastLogin && ` · Last login: ${admin.lastLogin}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSelf && !isSuper && admin.status !== "suspended" && (
              <button onClick={() => { onRevoke(admin.id); toast.success(`${admin.name} suspended`); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs"
                style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)" }}>
                <UserX size={11}/> Suspend
              </button>
            )}
            {admin.status === "suspended" && (
              <button onClick={() => { onUpdate(admin.id, { status:"active" }); toast.success(`${admin.name} reactivated`); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs"
                style={{ background:"rgba(72,187,120,0.08)", color:"#D99A6B", border:"1px solid rgba(72,187,120,0.2)" }}>
                <Unlock size={11}/> Reactivate
              </button>
            )}
            {admin.status === "invited" && (
              <button onClick={() => toast.success(`Invite resent to ${admin.email}`)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs"
                style={{ background:"rgba(246,173,85,0.08)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.2)" }}>
                <Send size={11}/> Resend Invite
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} style={{ color:"#8A9AB8" }}>
              {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          </div>
        </div>

        {/* Permission summary pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {admin.permissions.filter(p => p.canView).slice(0, 6).map(p => (
            <span key={p.module} className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
              style={{ background:"rgba(91,110,225,0.05)", color:"#8A9AB8", border:"1px solid rgba(91,110,225,0.08)" }}>
              {p.icon} {p.label}
            </span>
          ))}
          {admin.permissions.filter(p => p.canView).length > 6 && (
            <span className="px-2 py-0.5 rounded text-xs" style={{ color:"#8A9AB8" }}>
              +{admin.permissions.filter(p => p.canView).length - 6} more
            </span>
          )}
          {admin.permissions.filter(p => p.canView).length === 0 && (
            <span className="px-2 py-0.5 rounded text-xs" style={{ color:"#FC8181" }}>No permissions assigned</span>
          )}
        </div>
      </div>

      {/* Expanded — full permission editor */}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5" style={{ borderColor:"rgba(91,110,225,0.08)" }}>

          {/* Notes */}
          {admin.notes && (
            <div className="px-3 py-2.5 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.08)" }}>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>NOTES · </span>
              <span style={{ color:"#8A9AB8", fontSize:15 }}>{admin.notes}</span>
            </div>
          )}

          {/* Role preset selector */}
          {!isSuper && (
            <div>
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:8 }}>APPLY ROLE PRESET</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.entries(ROLE_PRESETS) as [AdminRole, typeof ROLE_PRESETS[AdminRole]][])
                  .filter(([k]) => k !== "super_admin")
                  .map(([key, r]) => (
                    <button key={key} onClick={() => applyPreset(key)}
                      className="p-3 rounded-2xl text-left transition-all"
                      style={{
                        background: admin.role === key ? `${r.color}12` : "rgba(91,110,225,0.03)",
                        border: `1px solid ${admin.role === key ? r.color + "40" : "rgba(91,110,225,0.1)"}`,
                      }}>
                      <div style={{ fontSize:15, fontWeight:700, color:r.color }}>{r.label}</div>
                      <div style={{ fontSize:12.5, color:"#8A9AB8", marginTop:2, lineHeight:1.4 }}>{r.description}</div>
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* Permission matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>PERMISSIONS — VIEW · EDIT · DELETE</div>
              {!isSuper && (
                <div className="flex gap-2">
                  {editingPerms ? (
                    <>
                      <button onClick={savePerms}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-semibold"
                        style={{ background:"#5B6EE1", color:"#fff" }}>
                        <Save size={11}/> Save
                      </button>
                      <button onClick={() => { setLocalPerms(admin.permissions); setEditingPerms(false); }}
                        className="px-3 py-1.5 rounded-2xl text-xs" style={{ background:"rgba(91,110,225,0.05)", color:"#8A9AB8" }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditingPerms(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs"
                      style={{ background:"rgba(91,110,225,0.06)", color:"#6E90C9" }}>
                      <Edit2 size={11}/> Edit Permissions
                    </button>
                  )}
                </div>
              )}
            </div>

            {isSuper && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-3"
                style={{ background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.15)" }}>
                <Crown size={14} color="#FFFFFF"/>
                <span style={{ color:"#6E90C9", fontSize:15, fontWeight:600 }}>Super Admin has unrestricted access to all modules and cannot be limited.</span>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(91,110,225,0.08)" }}>
              <div className="grid px-3 py-2" style={{ gridTemplateColumns:"1fr auto auto auto", background:"rgba(91,110,225,0.04)", borderBottom:"1px solid rgba(91,110,225,0.08)" }}>
                <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>MODULE</span>
                {["VIEW","EDIT","DELETE"].map(h => (
                  <span key={h} className="text-center" style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, minWidth:60 }}>{h}</span>
                ))}
              </div>
              {(editingPerms ? localPerms : admin.permissions).map((perm, i) => (
                <PermissionRow
                  key={perm.module}
                  perm={perm}
                  locked={!editingPerms || isSuper}
                  onChange={changes => {
                    setLocalPerms(prev => prev.map((p, idx) => idx === i ? { ...p, ...changes } : p));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function AdminRoles() {
  const [admins, setAdmins] = useState<AdminAccount[]>(_admins);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteStep, setInviteStep] = useState<"form"|"sending"|"done">("form");
  const [filterRole, setFilterRole] = useState<AdminRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"invited"|"suspended">("all");
  const [newAdmin, setNewAdmin] = useState({ name:"", email:"", role:"support_agent" as AdminRole, notes:"" });
  const [createdAdmin, setCreatedAdmin] = useState<AdminAccount | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const SELF_ID = "ADM-001";

  function updateAdmin(id: string, changes: Partial<AdminAccount>) {
    setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
    _admins = _admins.map(a => a.id === id ? { ...a, ...changes } : a);
  }
  function revokeAdmin(id: string) { updateAdmin(id, { status:"suspended" }); }

  function sendInvite() {
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) { toast.error("Name and email required"); return; }
    setInviteStep("sending");
    setTimeout(() => {
      const acct: AdminAccount = {
        id: `ADM-${String(Date.now()).slice(-3)}`,
        name: newAdmin.name, email: newAdmin.email, role: newAdmin.role,
        status: "invited",
        permissions: ROLE_PRESETS[newAdmin.role].permissions,
        createdAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        invitedBy: "Alex Johnson",
        avatar: newAdmin.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
        notes: newAdmin.notes,
      };
      setAdmins(prev => [acct, ...prev]);
      _admins = [acct, ..._admins];
      setCreatedAdmin(acct);
      setInviteStep("done");
    }, 2000);
  }

  function closeModal() {
    setShowInvite(false);
    setTimeout(() => { setInviteStep("form"); setNewAdmin({ name:"", email:"", role:"support_agent", notes:"" }); setCreatedAdmin(null); setLinkCopied(false); }, 300);
  }

  function copyLink() {
    const link = `https://admin.finalpassdown.com/accept?id=${createdAdmin?.id}&token=DEMO_${Date.now().toString(36).toUpperCase()}`;
    try { navigator.clipboard.writeText(link); } catch { /* fallback */ }
    setLinkCopied(true);
    toast.success("Login link copied");
    setTimeout(() => setLinkCopied(false), 3000);
  }

  const filtered = admins.filter(a =>
    (filterRole === "all" || a.role === filterRole) &&
    (filterStatus === "all" || a.status === filterStatus)
  );

  const stats = [
    { label:"Total Admins",  value:admins.length,                                  color:"#6E90C9" },
    { label:"Active",         value:admins.filter(a=>a.status==="active").length,   color:"#D99A6B" },
    { label:"Invited",        value:admins.filter(a=>a.status==="invited").length,  color:"#F6AD55" },
    { label:"Suspended",      value:admins.filter(a=>a.status==="suspended").length,color:"#FC8181" },
  ];

  /* step indicator helper */
  const STEPS = ["Fill Details","Sending Invite","Invite Sent"];
  const stepIdx = inviteStep === "form" ? 0 : inviteStep === "sending" ? 1 : 2;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} color="#FFFFFF"/>
            <span style={{ color:"#6E90C9", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>ADMIN · TEAM & ROLES</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Admin Team & Permissions</h1>
          <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
            Create administrator accounts for your team. Control exactly what each person can view, edit, and delete across every module.
          </p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm"
          style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 20px rgba(91,110,225,0.3)" }}>
          <Plus size={14}/> Invite Admin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-2xl text-center" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:35.5, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:14, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Role reference */}
      <div className="p-4 rounded-2xl" style={{ background:"rgba(91,110,225,0.03)", border:"1px solid rgba(91,110,225,0.1)" }}>
        <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:10 }}>ROLE PRESETS — QUICK REFERENCE</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(ROLE_PRESETS) as [AdminRole, typeof ROLE_PRESETS[AdminRole]][]).map(([key, r]) => (
            <div key={key} className="flex items-start gap-2 p-3 rounded-2xl" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${r.color}25` }}>
              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background:r.color }}/>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:r.color }}>{r.label}</div>
                <div style={{ fontSize:12.5, color:"#8A9AB8", lineHeight:1.4, marginTop:1 }}>{r.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.1)" }}>
          {(["all","active","invited","suspended"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:filterStatus===s?"#5B6EE1":"transparent", color:filterStatus===s?"#fff":"#8A9AB8" }}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value as AdminRole | "all")}
          style={{ ...INPUT, width:"auto", padding:"6px 12px", fontSize:15 }}>
          <option value="all">All Roles</option>
          {(Object.entries(ROLE_PRESETS) as [AdminRole, typeof ROLE_PRESETS[AdminRole]][]).map(([k,r]) => (
            <option key={k} value={k}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Admin cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ color:"#8A9AB8" }}>No admin accounts match your filter.</div>
        )}
        {filtered.map(admin => (
          <AdminCard key={admin.id} admin={admin} onUpdate={updateAdmin} onRevoke={revokeAdmin} isSelf={admin.id === SELF_ID}/>
        ))}
      </div>

      {/* ── INVITE MODAL — 3-step demo ────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background:"rgba(7,13,26,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 24px 60px -20px rgba(0,0,0,0.55)", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

            {/* Step bar */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor:"rgba(91,110,225,0.1)" }}>
              {STEPS.map((label, i) => {
                const done = stepIdx > i;
                const active = stepIdx === i;
                return (
                  <div key={label} className="flex-1 flex items-center gap-2 px-4 py-3"
                    style={{ background:active?"rgba(91,110,225,0.06)":"transparent", borderRight:i<2?"1px solid rgba(91,110,225,0.08)":"none" }}>
                    <div className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                      style={{ width:20, height:20, background:done?"#48BB78":active?"#5B6EE1":"rgba(91,110,225,0.1)", color:done||active?"#fff":"#8A9AB8" }}>
                      {done ? <CheckCircle size={11}/> : i+1}
                    </div>
                    <span style={{ fontSize:12.5, fontWeight:600, color:active?"#6E90C9":done?"#D99A6B":"#8A9AB8", ...MONO }}>{label.toUpperCase()}</span>
                  </div>
                );
              })}
              <button onClick={closeModal} className="px-4 flex-shrink-0" style={{ color:"#8A9AB8" }}><X size={16}/></button>
            </div>

            {/* STEP 1 — Form */}
            {inviteStep === "form" && (
              <div style={{ overflowY:"auto", flex:1 }}>
                <div className="p-6 space-y-4">
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:22.5, color:"#E8EDF5" }}>Invite a New Administrator</div>
                    <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>
                      They'll receive an email with a secure one-time login link. Permissions auto-apply from the role you choose and can be fine-tuned afterward.
                    </div>
                  </div>

                  {[
                    { label:"Full Name",   key:"name",  placeholder:"e.g. Jordan Smith",                type:"text"  },
                    { label:"Work Email",  key:"email", placeholder:"jordan@finalpassdown.com",          type:"email" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ color:"#8A9AB8", fontSize:15, fontWeight:600, display:"block", marginBottom:4 }}>{f.label}</label>
                      <input type={f.type} value={(newAdmin as any)[f.key]} placeholder={f.placeholder}
                        onChange={e => setNewAdmin(p => ({ ...p, [f.key]:e.target.value }))}
                        style={{ ...INPUT, width:"100%", display:"block" }}/>
                    </div>
                  ))}

                  <div>
                    <label style={{ color:"#8A9AB8", fontSize:15, fontWeight:600, display:"block", marginBottom:6 }}>Role & Access Level</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(ROLE_PRESETS) as [AdminRole, typeof ROLE_PRESETS[AdminRole]][])
                        .filter(([k]) => k !== "super_admin")
                        .map(([key, r]) => (
                          <button key={key} onClick={() => setNewAdmin(p => ({ ...p, role:key }))}
                            className="p-3 rounded-2xl text-left transition-all"
                            style={{ background:newAdmin.role===key?`${r.color}12`:"rgba(91,110,225,0.03)", border:`1px solid ${newAdmin.role===key?r.color+"40":"rgba(91,110,225,0.1)"}` }}>
                            <div style={{ fontSize:15, fontWeight:700, color:r.color }}>{r.label}</div>
                            <div style={{ fontSize:12.5, color:"#8A9AB8", marginTop:2, lineHeight:1.3 }}>{r.description}</div>
                          </button>
                        ))
                      }
                    </div>
                  </div>

                  {/* Live permission preview */}
                  <div>
                    <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>
                      ACCESS PREVIEW — {ROLE_PRESETS[newAdmin.role].label.toUpperCase()}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_PRESETS[newAdmin.role].permissions.filter(p => p.canView).map(p => (
                        <span key={p.module} className="px-2 py-1 rounded-xl text-xs flex items-center gap-1"
                          style={{ background:"rgba(72,187,120,0.08)", color:"#D99A6B", border:"1px solid rgba(72,187,120,0.2)" }}>
                          <CheckCircle size={8}/>{p.label}
                        </span>
                      ))}
                      {ROLE_PRESETS[newAdmin.role].permissions.filter(p => !p.canView).map(p => (
                        <span key={p.module} className="px-2 py-1 rounded-xl text-xs flex items-center gap-1"
                          style={{ background:"rgba(91,110,225,0.04)", color:"#B0C0DC", border:"1px solid rgba(91,110,225,0.08)" }}>
                          <Lock size={8}/>{p.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ color:"#8A9AB8", fontSize:15, fontWeight:600, display:"block", marginBottom:4 }}>Internal Notes (optional)</label>
                    <textarea value={newAdmin.notes} onChange={e => setNewAdmin(p => ({ ...p, notes:e.target.value }))}
                      rows={2} placeholder="e.g. Handles WG billing, reports to Simone Carter"
                      className="resize-none" style={{ ...INPUT, width:"100%", display:"block" }}/>
                  </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={sendInvite}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                    style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 4px 16px rgba(91,110,225,0.3)" }}>
                    <Send size={14}/> Send Invite Email
                  </button>
                  <button onClick={closeModal} className="px-5 py-3 rounded-2xl text-sm"
                    style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Sending animation */}
            {inviteStep === "sending" && (
              <div className="flex flex-col items-center justify-center py-14 px-8 gap-5 flex-1">
                <div className="relative">
                  <div className="flex items-center justify-center rounded-full"
                    style={{ width:72, height:72, background:"rgba(91,110,225,0.08)", border:"2px solid rgba(91,110,225,0.2)" }}>
                    <Send size={28} color="#FFFFFF"/>
                  </div>
                  <div className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
                    style={{ width:22, height:22, background:"#5B6EE1" }}>
                    <RefreshCw size={11} color="#fff" style={{ animation:"spin 1s linear infinite" }}/>
                  </div>
                </div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:22.5, color:"#E8EDF5", textAlign:"center" }}>
                  Creating Administrator Account…
                </div>
                <div style={{ color:"#8A9AB8", fontSize:16, textAlign:"center", lineHeight:1.6 }}>
                  Sending invite to <strong style={{ color:"#6E90C9" }}>{newAdmin.email}</strong>
                </div>
                <div className="w-full max-w-xs space-y-2.5 mt-2">
                  {["Creating account record","Assigning role permissions","Generating one-time login token","Sending invite email"].map(step => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{ width:20, height:20, background:"rgba(72,187,120,0.15)" }}>
                        <CheckCircle size={11} color="#FFFFFF"/>
                      </div>
                      <span style={{ fontSize:15, color:"#8A9AB8" }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 — Success */}
            {inviteStep === "done" && createdAdmin && (
              <div style={{ overflowY:"auto", flex:1 }}>
                <div className="p-6 space-y-5">
                  {/* Success badge */}
                  <div className="flex flex-col items-center text-center gap-3 py-2">
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width:60, height:60, background:"rgba(72,187,120,0.12)", border:"2px solid rgba(72,187,120,0.3)" }}>
                      <CheckCircle size={26} color="#FFFFFF"/>
                    </div>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:25, color:"#E8EDF5" }}>Invite Sent!</div>
                      <div style={{ color:"#8A9AB8", fontSize:16, marginTop:3 }}>
                        <strong style={{ color:"#E8EDF5" }}>{createdAdmin.name}</strong> invited as{" "}
                        <strong style={{ color:ROLE_PRESETS[createdAdmin.role].color }}>{ROLE_PRESETS[createdAdmin.role].label}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Email preview */}
                  <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(91,110,225,0.12)" }}>
                    <div className="px-4 py-2.5 flex items-center gap-1.5 border-b" style={{ background:"rgba(91,110,225,0.04)", borderColor:"rgba(91,110,225,0.08)" }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background:"#FC8181" }}/>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background:"#F6AD55" }}/>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background:"#48BB78" }}/>
                      <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginLeft:8 }}>EMAIL PREVIEW · SENT TO {createdAdmin.email.toUpperCase()}</span>
                    </div>
                    <div className="p-5" style={{ background:"#fff" }}>
                      <div style={{ color:"#8A9AB8", fontSize:14, marginBottom:2 }}>From: <strong>noreply@finalpassdown.com</strong></div>
                      <div style={{ color:"#8A9AB8", fontSize:14, marginBottom:12 }}>Subject: <strong>You've been invited to the Final Pass Down Admin Portal</strong></div>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:8 }}>Hi {createdAdmin.name.split(" ")[0]},</div>
                      <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7, marginBottom:14 }}>
                        <strong style={{ color:"#E8EDF5" }}>Alex Johnson</strong> has invited you to join the Final Pass Down admin team as{" "}
                        <strong>{ROLE_PRESETS[createdAdmin.role].label}</strong>.<br/><br/>
                        Click below to set your password and access the Command Center. This link expires in <strong>72 hours</strong> and is single-use.
                      </div>
                      <div className="flex justify-center mb-4">
                        <div className="px-5 py-2.5 rounded-2xl text-sm font-bold"
                          style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#fff", display:"inline-block" }}>
                          Accept Invitation & Set Password →
                        </div>
                      </div>
                      <div style={{ color:"#B0C0DC", fontSize:12.5, textAlign:"center" }}>
                        Single-use link · Expires 72 hours after sending · Ignore if unexpected
                      </div>
                    </div>
                  </div>

                  {/* Copy login link */}
                  <div>
                    <div style={{ color:"#8A9AB8", fontSize:14, fontWeight:600, marginBottom:6, ...MONO }}>ONE-TIME LOGIN LINK (DEMO)</div>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2.5 rounded-2xl truncate text-xs"
                        style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.12)", color:"#8A9AB8", ...MONO }}>
                        admin.finalpassdown.com/accept?id={createdAdmin.id}&token=DEMO_…
                      </div>
                      <button onClick={copyLink}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold flex-shrink-0"
                        style={{ background:linkCopied?"rgba(72,187,120,0.1)":"rgba(91,110,225,0.08)", color:linkCopied?"#D99A6B":"#6E90C9", border:`1px solid ${linkCopied?"rgba(72,187,120,0.3)":"rgba(91,110,225,0.15)"}` }}>
                        {linkCopied ? <><CheckCircle size={11}/> Copied!</> : <><Copy size={11}/> Copy</>}
                      </button>
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label:"Account ID",    value:createdAdmin.id },
                      { label:"Role",           value:ROLE_PRESETS[createdAdmin.role].label },
                      { label:"Status",         value:"Invited — awaiting first login" },
                      { label:"Link Expires",   value:"72 hours from now" },
                    ].map(r => (
                      <div key={r.label} className="px-3 py-2.5 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.08)" }}>
                        <div style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>{r.label.toUpperCase()}</div>
                        <div style={{ color:"#E8EDF5", fontSize:15, fontWeight:600, marginTop:2 }}>{r.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setInviteStep("form"); setNewAdmin({ name:"", email:"", role:"support_agent", notes:"" }); setCreatedAdmin(null); setLinkCopied(false); }}
                      className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                      style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
                      <Plus size={14}/> Invite Another Admin
                    </button>
                    <button onClick={closeModal} className="px-6 py-3 rounded-2xl text-sm font-semibold"
                      style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Done</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
