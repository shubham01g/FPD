import React, { useState } from "react";
import {
  Star, Plus, X, Mail, Phone, CheckCircle, AlertCircle,
  Edit2, Shield, Send, Copy, ToggleRight, ToggleLeft, Key, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../utils/clipboard";
import {
  conciergeEmployees, inviteEmployee, updateEmployee, revokeEmployee,
  type ConciergeEmployee, type StaffRole, ROLE_LABELS, ROLE_COLORS,
} from "../../services/conciergeStaff";

const CARD: React.CSSProperties = { background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,167,214,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

const AVAILABLE_CLIENTS = [
  { id:"WG-001", name:"Dorothy Henderson" },
  { id:"WG-002", name:"Walter & Edna Briggs" },
  { id:"WG-003", name:"Margaret Thompson" },
];

const statusColor: Record<string, string> = { active:"#48BB78", invited:"#F6AD55", suspended:"#FC8181" };
const statusBg:    Record<string, string> = { active:"rgba(72,187,120,0.1)", invited:"rgba(246,173,85,0.1)", suspended:"rgba(252,129,129,0.1)" };

/* ── Invite modal ─────────────────────────────────────────────────── */
function InviteModal({ onClose, onInvited }: { onClose:()=>void; onInvited:(e:ConciergeEmployee)=>void }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", role:"junior_concierge" as StaffRole, assignedClientIds:[] as string[], password:"Concierge2026!" });
  const [sending, setSending] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function send() {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setSending(true);
    setTimeout(() => {
      const emp = inviteEmployee({ ...form, status:"invited", invitedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) });
      onInvited(emp);
      toast.success(`Concierge invite sent to ${form.email}`);
      setSending(false);
      onClose();
    }, 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...CARD, maxHeight:"90vh", overflowY:"auto" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ background:"#0A0F1A", borderColor:"rgba(91,167,214,0.2)" }}>
          <div className="flex items-center gap-2">
            <Star size={16} color="#FFFFFF"/>
            <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Invite Concierge Employee</span>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 rounded-2xl"
            style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.2)" }}>
            <Shield size={12} color="#FFFFFF" style={{ marginTop:1 }}/>
            <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6 }}>
              The employee will receive an email with a unique link to the <strong>Concierge Portal</strong> — separate from the master admin. They can only see the clients you assign here.
            </p>
          </div>

          {[
            { label:"FULL NAME *",    key:"name",  ph:"e.g. Sarah Mitchell", type:"text" },
            { label:"WORK EMAIL *",   key:"email", ph:"sarah.mitchell@finalpassdown.com", type:"email" },
            { label:"PHONE (optional)",key:"phone", ph:"+1 (555) 000-0000", type:"tel" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} placeholder={f.ph}
                onChange={e => setForm(p => ({ ...p, [f.key]:e.target.value }))} style={INPUT}/>
            </div>
          ))}

          {/* Role */}
          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:8 }}>ROLE</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setForm(p => ({ ...p, role:id }))}
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold text-center transition-all"
                  style={{ background:form.role===id?`${ROLE_COLORS[id]}15`:"rgba(91,167,214,0.04)",
                    border:`1px solid ${form.role===id?ROLE_COLORS[id]:"rgba(91,167,214,0.12)"}`,
                    color:form.role===id?ROLE_COLORS[id]:"#8A9AB8" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign clients */}
          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:8 }}>
              ASSIGN CLIENTS ({form.assignedClientIds.length} selected)
            </label>
            <div className="space-y-2">
              {AVAILABLE_CLIENTS.map(c => {
                const isAssigned = form.assignedClientIds.includes(c.id);
                return (
                  <button key={c.id} onClick={() => setForm(p => ({
                    ...p, assignedClientIds: isAssigned
                      ? p.assignedClientIds.filter(id => id !== c.id)
                      : [...p.assignedClientIds, c.id]
                  }))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-left"
                    style={{ background:isAssigned?"rgba(91,167,214,0.08)":"rgba(91,167,214,0.03)",
                      border:`1px solid ${isAssigned?"rgba(91,167,214,0.35)":"rgba(91,167,214,0.1)"}` }}>
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width:20, height:20, background:isAssigned?"#5BA7D6":"#0A0F1A",
                        border:`2px solid ${isAssigned?"#5BA7D6":"rgba(91,167,214,0.3)"}`, flexShrink:0 }}>
                      {isAssigned && <CheckCircle size={12} color="#fff"/>}
                    </div>
                    <span style={{ color:isAssigned?"#E8EDF5":"#8A9AB8", fontSize:16 }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temp password */}
          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>TEMPORARY PASSWORD</label>
            <div className="flex gap-2">
              <input type={showPw?"text":"password"} value={form.password}
                onChange={e => setForm(p => ({ ...p, password:e.target.value }))} style={{ ...INPUT, flex:1 }}/>
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ color:"#8A9AB8" }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:3 }}>Employee must change this on first login</div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={send} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", opacity:sending?0.7:1 }}>
              <Send size={14}/>{sending ? "Sending Invite…" : "Send Concierge Invite"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-2xl text-sm"
              style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Employee card ────────────────────────────────────────────────── */
function EmployeeCard({ emp, onUpdate }: { emp: ConciergeEmployee; onUpdate:()=>void }) {
  const [expanded, setExpanded] = useState(false);
  const roleColor = ROLE_COLORS[emp.role];
  const portalLink = `https://finalpassdown.com/concierge?token=${emp.inviteToken}`;

  return (
    <div style={CARD} className="rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:44, height:44, background:`${roleColor}15`, color:roleColor, fontSize:20, fontFamily:"var(--font-display)" }}>
              {emp.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>{emp.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:`${roleColor}15`, color:roleColor, ...MONO }}>{ROLE_LABELS[emp.role].toUpperCase()}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:statusBg[emp.status], color:statusColor[emp.status], ...MONO }}>{emp.status.toUpperCase()}</span>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{emp.email}</div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:1 }}>
                {emp.assignedClientIds.length} client{emp.assignedClientIds.length!==1?"s":""} assigned ·
                {emp.lastLogin ? ` Last login: ${emp.lastLogin}` : " Never logged in"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B" }}>
              {expanded ? "Hide" : "Manage"}
            </button>
            <button onClick={() => { revokeEmployee(emp.id); onUpdate(); toast.success(`${emp.name}'s access ${emp.status==="suspended"?"restored":"suspended"}`); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:emp.status==="suspended"?"rgba(72,187,120,0.1)":"rgba(252,129,129,0.1)", color:emp.status==="suspended"?"#D99A6B":"#FC8181" }}>
              {emp.status === "suspended" ? "Restore" : "Suspend"}
            </button>
          </div>
        </div>

        {/* Assigned clients */}
        {emp.assignedClientIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {emp.assignedClientIds.map(id => {
              const c = AVAILABLE_CLIENTS.find(x => x.id === id);
              return c ? (
                <span key={id} className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B", border:"1px solid rgba(91,167,214,0.2)" }}>
                  ⭐ {c.name}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Expanded: client assignment + portal link */}
      {expanded && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"rgba(91,167,214,0.1)" }}>
          <div className="pt-4">
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:8 }}>ASSIGN / REMOVE CLIENTS</div>
            <div className="space-y-2">
              {AVAILABLE_CLIENTS.map(c => {
                const isAssigned = emp.assignedClientIds.includes(c.id);
                return (
                  <button key={c.id} onClick={() => {
                    const newIds = isAssigned
                      ? emp.assignedClientIds.filter(id => id !== c.id)
                      : [...emp.assignedClientIds, c.id];
                    updateEmployee(emp.id, { assignedClientIds: newIds });
                    onUpdate();
                    toast.success(isAssigned ? `${c.name} removed from ${emp.name}` : `${c.name} assigned to ${emp.name}`);
                  }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all text-left"
                    style={{ background:isAssigned?"rgba(91,167,214,0.08)":"rgba(91,167,214,0.03)",
                      border:`1px solid ${isAssigned?"rgba(91,167,214,0.3)":"rgba(91,167,214,0.1)"}` }}>
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width:18, height:18, background:isAssigned?"#5BA7D6":"#0A0F1A",
                        border:`2px solid ${isAssigned?"#5BA7D6":"rgba(91,167,214,0.3)"}`, flexShrink:0 }}>
                      {isAssigned && <CheckCircle size={10} color="#fff"/>}
                    </div>
                    <span style={{ color:isAssigned?"#E8EDF5":"#8A9AB8", fontSize:15 }}>{c.name}</span>
                    <span style={{ marginLeft:"auto", color:isAssigned?"#FC8181":"#D99A6B", fontSize:12.5, fontWeight:600 }}>
                      {isAssigned ? "Remove" : "Assign"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portal login link */}
          <div>
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>CONCIERGE PORTAL LOGIN LINK</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.15)" }}>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, flex:1 }} className="truncate">{portalLink}</span>
              <button onClick={() => { copyToClipboard(portalLink); toast.success("Portal link copied"); }}
                style={{ color:"#6FAE8B", flexShrink:0 }}><Copy size={12}/></button>
            </div>
            <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:4 }}>
              Send this link to {emp.name} so they can access the Concierge Portal. Login: {emp.email} / {emp.password}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { copyToClipboard(`Login: ${emp.email}\nPassword: ${emp.password}\nPortal: ${portalLink}`); toast.success("Credentials copied"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold flex-1"
              style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B" }}>
              <Key size={11}/> Copy Full Credentials
            </button>
            <button onClick={() => toast.success(`Invite email resent to ${emp.email}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold"
              style={{ background:"rgba(91,110,225,0.06)", color:"#6E90C9" }}>
              <Send size={11}/> Resend Invite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────── */
export function ConciergeStaffAdmin() {
  const [staff, setStaff] = useState([...conciergeEmployees]);
  const [showInvite, setShowInvite] = useState(false);

  function refresh() { setStaff([...conciergeEmployees]); }

  const active    = staff.filter(e => e.status === "active").length;
  const invited   = staff.filter(e => e.status === "invited").length;
  const suspended = staff.filter(e => e.status === "suspended").length;

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* KPIs */}
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

      {/* How it works banner */}
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
              <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                style={{ width:22, height:22, background:"#5BA7D6", color:"#fff", fontSize:14 }}>{s.step}</div>
              <span style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Staff list */}
      <div className="space-y-3">
        {staff.map(emp => <EmployeeCard key={emp.id} emp={emp} onUpdate={refresh}/>)}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => { refresh(); setShowInvite(false); }}
        />
      )}
    </div>
  );
}
