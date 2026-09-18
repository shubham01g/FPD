import React, { useState } from "react";
import {
  Star, Plus, X, CheckCircle, Shield, Send, Copy, Key,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../utils/clipboard";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";

type StaffRole = "junior_concierge" | "senior_concierge" | "lead_concierge";
type StaffStatus = "active" | "invited" | "suspended";

interface ConciergeEmployee {
  id: string; name: string; email: string; phone: string | null;
  role: StaffRole; status: StaffStatus; invited_at: string; last_login_at: string | null; invite_token: string;
}

interface WGClientRow {
  id: string;
  users: { full_name: string } | null;
  concierge_employees: { id: string; name: string } | null;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  junior_concierge: "Junior Concierge", senior_concierge: "Senior Concierge", lead_concierge: "Lead Concierge",
};
export const ROLE_COLORS: Record<StaffRole, string> = {
  junior_concierge: "#5BA7D6", senior_concierge: "#5BA7D6", lead_concierge: "#F7931A",
};

const CARD: React.CSSProperties = { background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,167,214,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

const statusColor: Record<string, string> = { active:"#48BB78", invited:"#F6AD55", suspended:"#FC8181" };
const statusBg:    Record<string, string> = { active:"rgba(72,187,120,0.1)", invited:"rgba(246,173,85,0.1)", suspended:"rgba(252,129,129,0.1)" };

function avatarFor(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ── Invite modal ─────────────────────────────────────────────────── */
function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("junior_concierge");
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<{ employee: ConciergeEmployee; tempPassword: string } | null>(null);

  async function send() {
    if (!name.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    setSending(true);
    try {
      const res = await adminApi.post<{ employee: ConciergeEmployee; tempPassword: string }>("/concierge", { name, email, phone: phone || undefined, role });
      setCreated(res);
      onInvited();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite employee");
    } finally {
      setSending(false);
    }
  }

  const portalLink = created ? `https://finalpassdown.com/concierge?token=${created.employee.invite_token}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...CARD, maxHeight:"90vh", overflowY:"auto" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ background:"#0A0F1A", borderColor:"rgba(91,167,214,0.2)" }}>
          <div className="flex items-center gap-2">
            <Star size={16} color="#FFFFFF"/>
            <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>{created ? "Employee Invited" : "Invite Concierge Employee"}</span>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        {created ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-2xl" style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.2)" }}>
              <Shield size={12} color="#FFFFFF" style={{ marginTop:1 }}/>
              <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6 }}>
                No email was sent — this app has no email delivery set up. Copy these credentials and the portal link, and send them to {created.employee.name} yourself. The temporary password is shown only once.
              </p>
            </div>
            <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.15)" }}>
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>LOGIN</div>
              <div style={{ color:"#E8EDF5", fontSize:16, marginTop:2 }}>{created.employee.email}</div>
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginTop:8 }}>TEMPORARY PASSWORD</div>
              <div style={{ color:"#E8EDF5", fontSize:16, marginTop:2, ...MONO }}>{created.tempPassword}</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.15)" }}>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, flex:1 }} className="truncate">{portalLink}</span>
              <button onClick={() => { copyToClipboard(portalLink!); toast.success("Link copied"); }} style={{ color:"#6FAE8B", flexShrink:0 }}><Copy size={12}/></button>
            </div>
            <button onClick={() => { copyToClipboard(`Login: ${created.employee.email}\nPassword: ${created.tempPassword}\nPortal: ${portalLink}`); toast.success("Credentials copied"); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B" }}>
              <Key size={13}/> Copy Full Credentials
            </button>
            <button onClick={onClose} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F" }}>Done</button>
          </div>
        ) : (
        <div className="p-6 space-y-4">
          {[
            { label:"FULL NAME *", value:name, set:setName, ph:"e.g. Sarah Mitchell", type:"text" },
            { label:"WORK EMAIL *", value:email, set:setEmail, ph:"sarah.mitchell@finalpassdown.com", type:"email" },
            { label:"PHONE (optional)", value:phone, set:setPhone, ph:"+1 (555) 000-0000", type:"tel" },
          ].map(f => (
            <div key={f.label}>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
              <input type={f.type} value={f.value} placeholder={f.ph} onChange={e => f.set(e.target.value)} style={INPUT}/>
            </div>
          ))}

          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:8 }}>ROLE</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setRole(id)}
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold text-center transition-all"
                  style={{ background:role===id?`${ROLE_COLORS[id]}15`:"rgba(91,167,214,0.04)",
                    border:`1px solid ${role===id?ROLE_COLORS[id]:"rgba(91,167,214,0.12)"}`,
                    color:role===id?ROLE_COLORS[id]:"#8A9AB8" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={send} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", opacity:sending?0.7:1 }}>
              <Send size={14}/>{sending ? "Inviting…" : "Send Concierge Invite"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-2xl text-sm" style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Cancel</button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/* ── Employee card ────────────────────────────────────────────────── */
function EmployeeCard({ emp, clients, onUpdate }: { emp: ConciergeEmployee; clients: WGClientRow[]; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const roleColor = ROLE_COLORS[emp.role];
  const portalLink = `https://finalpassdown.com/concierge?token=${emp.invite_token}`;
  const assigned = clients.filter(c => c.concierge_employees?.id === emp.id);
  const unassigned = clients.filter(c => !c.concierge_employees || c.concierge_employees.id === emp.id);

  async function toggleSuspend() {
    setBusy(true);
    try {
      const next = emp.status === "suspended" ? "active" : "suspended";
      await adminApi.patch(`/concierge/${emp.id}`, { status: next });
      toast.success(`${emp.name}'s access ${next === "suspended" ? "suspended" : "restored"}`);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAssign(client: WGClientRow) {
    const isAssigned = client.concierge_employees?.id === emp.id;
    try {
      await adminApi.patch(`/white-glove/clients/${client.id}`, { specialist_id: isAssigned ? null : emp.id });
      toast.success(isAssigned ? `${client.users?.full_name ?? "Client"} removed from ${emp.name}` : `${client.users?.full_name ?? "Client"} assigned to ${emp.name}`);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignment");
    }
  }

  async function resetPassword() {
    setBusy(true);
    try {
      const res = await adminApi.post<{ tempPassword: string }>(`/concierge/${emp.id}/reset-password`);
      copyToClipboard(`Login: ${emp.email}\nPassword: ${res.tempPassword}\nPortal: ${portalLink}`);
      toast.success("New password generated and copied to clipboard — this is the only time it's shown.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={CARD} className="rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:44, height:44, background:`${roleColor}15`, color:roleColor, fontSize:20, fontFamily:"var(--font-display)" }}>
              {avatarFor(emp.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>{emp.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:`${roleColor}15`, color:roleColor, ...MONO }}>{ROLE_LABELS[emp.role].toUpperCase()}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:statusBg[emp.status], color:statusColor[emp.status], ...MONO }}>{emp.status.toUpperCase()}</span>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{emp.email}</div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:1 }}>
                {assigned.length} client{assigned.length!==1?"s":""} assigned ·
                {emp.last_login_at ? ` Last login: ${new Date(emp.last_login_at).toLocaleString()}` : " Never logged in"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B" }}>
              {expanded ? "Hide" : "Manage"}
            </button>
            <button onClick={toggleSuspend} disabled={busy} className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
              style={{ background:emp.status==="suspended"?"rgba(72,187,120,0.1)":"rgba(252,129,129,0.1)", color:emp.status==="suspended"?"#D99A6B":"#FC8181" }}>
              {emp.status === "suspended" ? "Restore" : "Suspend"}
            </button>
          </div>
        </div>

        {assigned.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {assigned.map(c => (
              <span key={c.id} className="px-2 py-0.5 rounded-full text-xs" style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B", border:"1px solid rgba(91,167,214,0.2)" }}>
                ⭐ {c.users?.full_name ?? "Client"}
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"rgba(91,167,214,0.1)" }}>
          <div className="pt-4">
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:8 }}>ASSIGN / REMOVE CLIENTS</div>
            <div className="space-y-2">
              {unassigned.length === 0 && (
                <div style={{ color:"#8A9AB8", fontSize:14 }}>No White Glove clients available to assign.</div>
              )}
              {unassigned.map(c => {
                const isAssigned = c.concierge_employees?.id === emp.id;
                return (
                  <button key={c.id} onClick={() => toggleAssign(c)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all text-left"
                    style={{ background:isAssigned?"rgba(91,167,214,0.08)":"rgba(91,167,214,0.03)", border:`1px solid ${isAssigned?"rgba(91,167,214,0.3)":"rgba(91,167,214,0.1)"}` }}>
                    <div className="flex items-center justify-center rounded-full" style={{ width:18, height:18, background:isAssigned?"#5BA7D6":"#0A0F1A", border:`2px solid ${isAssigned?"#5BA7D6":"rgba(91,167,214,0.3)"}`, flexShrink:0 }}>
                      {isAssigned && <CheckCircle size={10} color="#fff"/>}
                    </div>
                    <span style={{ color:isAssigned?"#E8EDF5":"#8A9AB8", fontSize:15 }}>{c.users?.full_name ?? "Client"}</span>
                    <span style={{ marginLeft:"auto", color:isAssigned?"#FC8181":"#D99A6B", fontSize:12.5, fontWeight:600 }}>{isAssigned ? "Remove" : "Assign"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>CONCIERGE PORTAL LOGIN LINK</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.15)" }}>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, flex:1 }} className="truncate">{portalLink}</span>
              <button onClick={() => { copyToClipboard(portalLink); toast.success("Portal link copied"); }} style={{ color:"#6FAE8B", flexShrink:0 }}><Copy size={12}/></button>
            </div>
          </div>

          <button onClick={resetPassword} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold disabled:opacity-50"
            style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B" }}>
            <Key size={11}/> Reset Password
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────── */
export function ConciergeStaffAdmin() {
  const [showInvite, setShowInvite] = useState(false);

  const { data, loading, refetch } = useAdminFetch(
    () => adminApi.get<{ employees: ConciergeEmployee[] }>("/concierge"),
    [],
    ADMIN_LIVE_POLL_MS,
  );
  const { data: clientData, refetch: refetchClients } = useAdminFetch(
    () => adminApi.get<{ clients: WGClientRow[] }>("/white-glove/clients"),
    [],
    ADMIN_LIVE_POLL_MS,
  );

  const staff = data?.employees ?? [];
  const clients = clientData?.clients ?? [];

  function refreshAll() { refetch(); refetchClients(); }

  const active    = staff.filter(e => e.status === "active").length;
  const invited   = staff.filter(e => e.status === "invited").length;
  const suspended = staff.filter(e => e.status === "suspended").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div style={{ color:"#6FAE8B", fontSize:14, ...MONO, letterSpacing:"0.1em", marginBottom:4 }}>WHITE GLOVE · CONCIERGE STAFF</div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:27.5, color:"#E8EDF5" }}>Staff Management</h2>
          <p style={{ color:"#8A9AB8", fontSize:15, marginTop:4 }}>
            Invite employees to the Concierge Portal. Each employee only sees their assigned clients — no master admin access.
          </p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm"
          style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", boxShadow:"0 0 16px rgba(91,167,214,0.3)" }}>
          <Plus size={14}/> Invite Employee
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:"Active Staff",   value:active,    color:"#D99A6B" },
          { label:"Pending Invite", value:invited,   color:"#F6AD55" },
          { label:"Suspended",      value:suspended, color:"#FC8181" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl" style={{ background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)" }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:30, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl" style={{ background:"rgba(91,167,214,0.04)", border:"1px solid rgba(91,167,214,0.2)" }}>
        <div style={{ color:"#6FAE8B", fontSize:14, fontWeight:700, ...MONO, marginBottom:8 }}>HOW CONCIERGE ACCESS WORKS</div>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            { step:"1", text:"You invite an employee by email and assign them specific clients" },
            { step:"2", text:"Employee receives a unique Concierge Portal link and temporary password" },
            { step:"3", text:"They log in to a separate portal — no master admin access at all" },
            { step:"4", text:"They can only see and work with the clients you've assigned to them" },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-2.5">
              <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0" style={{ width:22, height:22, background:"#5BA7D6", color:"#fff", fontSize:14 }}>{s.step}</div>
              <span style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {!loading && staff.length === 0 && (
          <div className="p-8 rounded-2xl text-center" style={{ ...CARD, color:"#8A9AB8", fontSize:15 }}>
            No concierge staff yet. Use <strong style={{ color:"#E8EDF5" }}>Invite Employee</strong> to add one.
          </div>
        )}
        {staff.map(emp => <EmployeeCard key={emp.id} emp={emp} clients={clients} onUpdate={refreshAll}/>)}
      </div>

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={refreshAll}/>
      )}
    </div>
  );
}
