import React, { useState, useRef } from "react";
import {
  Users, Phone, Mail, MapPin, Gift, Heart, Plus, Search,
  Edit2, Trash2, X, Upload, Star, Camera, ChevronDown,
  Send, Tag, CheckCircle, Layers
} from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = { background: "#101728", border: "1px solid rgba(58,91,217,0.1)", boxShadow: "0 2px 12px rgba(58,91,217,0.06)", borderRadius: 16 };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

interface Contact {
  id: string; name: string; relationship: string; phone?: string; email?: string;
  address?: string; birthday?: string; photo?: string; notes?: string;
  group: "immediate" | "extended" | "friends" | "other";
  starred?: boolean; initials: string; color: string;
  customGroups?: string[]; // IDs of user-created groups this contact belongs to
}

interface ContactGroup {
  id: string; name: string; color: string; description?: string;
  memberIds: string[];
  createdAt: string;
}

const GROUP_COLORS = ["#3A5BD9","#6E8BFF","#48BB78","#F7931A","#FC8181","#4A90D9","#38B2AC","#F6AD55"];

/* ── Blast Email Modal ─────────────────────────────────────────────── */
function BlastEmailModal({
  group, contacts, onClose,
}: { group: ContactGroup; contacts: Contact[]; onClose: () => void }) {
  const members = contacts.filter(c => group.memberIds.includes(c.id));
  const withEmail = members.filter(c => c.email);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const INPUT: React.CSSProperties = {
    background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)",
    color:"#FFFFFF", fontSize:13, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%",
  };

  function sendEmail() {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim()) { toast.error("Message body is required"); return; }
    if (withEmail.length === 0) { toast.error("No contacts in this group have email addresses"); return; }
    setSending(true);
    // Build mailto: BCC link so recipients see only themselves
    const bcc = withEmail.map(c => c.email!).join(",");
    setTimeout(() => {
      setSending(false);
      window.open(`mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      toast.success(`Email blast sent to ${withEmail.length} contacts in "${group.name}"`);
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden glow-surface" style={CARD}>
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor:"rgba(58,91,217,0.08)" }}>
          <div className="flex items-center gap-2">
            <Send size={16} color="#3A5BD9"/>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>
              Blast Email — {group.name}
            </h3>
          </div>
          <button onClick={onClose} style={{ color:"rgba(255,255,255,0.65)" }}><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Recipients */}
          <div className="p-3 rounded-xl glow-surface" style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.12)" }}>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontFamily:"var(--font-mono)", marginBottom:6 }}>
              RECIPIENTS ({withEmail.length} with email / {members.length} total in group)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {withEmail.map(c => (
                <span key={c.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{ background:"rgba(58,91,217,0.08)", color:"#3A5BD9" }}>
                  {c.initials} {c.name}
                </span>
              ))}
              {members.filter(c => !c.email).map(c => (
                <span key={c.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{ background:"rgba(107,114,128,0.1)", color:"rgba(255,255,255,0.65)" }}>
                  {c.name} (no email)
                </span>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontFamily:"var(--font-mono)", display:"block", marginBottom:5 }}>SUBJECT *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Family Reunion — Save the Date!" style={INPUT}/>
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontFamily:"var(--font-mono)", display:"block", marginBottom:5 }}>MESSAGE *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              placeholder="Write your message here…" className="w-full resize-none"
              style={INPUT}/>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl"
            style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
            <Mail size={12} color="#48BB78" style={{ marginTop:1, flexShrink:0 }}/>
            <p style={{ color:"#48BB78", fontSize:11, lineHeight:1.6 }}>
              Recipients are BCC'd — each person sees only themselves in the To field. Opens your default email client.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={sendEmail} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", opacity:sending?0.7:1 }}>
              <Send size={14}/>{sending ? "Opening Email…" : `Send to ${withEmail.length} Recipients`}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm"
              style={{ background:"rgba(58,91,217,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const COLORS = ["#3A5BD9","#48BB78","#6E8BFF","#F6AD55","#FC8181","#38B2AC","#ED8936","#4A90D9"];

const initContacts: Contact[] = [
  { id:"c1", name:"Sarah Johnson", relationship:"Spouse", phone:"(916) 555-0234", email:"sarah.j@email.com", address:"1842 Oak Ridge Dr, Sacramento CA", birthday:"Aug 14", group:"immediate", starred:true, initials:"SJ", color:"#3A5BD9", notes:"My partner for 36 years. She loves peonies and dark chocolate.", photo:"https://images.unsplash.com/photo-1625690988276-0a7b0cdf3d5d?w=80&h=80&fit=crop&auto=format" },
  { id:"c2", name:"Michael Doe", relationship:"Son", phone:"(415) 555-0871", email:"m.doe@email.com", birthday:"Mar 5", group:"immediate", starred:true, initials:"MD", color:"#48BB78", notes:"Married to Amanda. Has Tyler and Lily." },
  { id:"c3", name:"Emily Doe", relationship:"Daughter", phone:"(916) 555-0392", email:"e.doe@email.com", birthday:"Oct 22", group:"immediate", starred:true, initials:"ED", color:"#6E8BFF", notes:"Lives in Sacramento. Loves art and teaching." },
  { id:"c4", name:"Tyler Doe", relationship:"Grandson", birthday:"Mar 5", group:"immediate", initials:"TD", color:"#F6AD55", notes:"Age 8. Loves dinosaurs and baseball. Peanut allergy." },
  { id:"c5", name:"Lily Doe", relationship:"Granddaughter", birthday:"Jul 19", group:"immediate", initials:"LD", color:"#FC8181", notes:"Age 6. Loves ballet and painting." },
  { id:"c6", name:"Robert Doe", relationship:"Brother", phone:"(213) 555-0481", email:"r.doe@email.com", address:"2240 Maple Ave, Los Angeles CA", birthday:"Feb 28", group:"extended", initials:"RD", color:"#38B2AC" },
  { id:"c7", name:"Linda Torres", relationship:"Sister-in-law", phone:"(916) 555-0821", email:"ltorres@email.com", birthday:"Apr 12", group:"extended", initials:"LT", color:"#ED8936" },
  { id:"c8", name:"George Martinez", relationship:"Best Friend", phone:"(916) 555-0192", email:"g.martinez@email.com", birthday:"Jul 4", group:"friends", starred:true, initials:"GM", color:"#4A90D9", notes:"We go back to Army days. Fishing partner." },
  { id:"c9", name:"Carol & Dave Wilson", relationship:"Neighbors", phone:"(916) 555-0283", email:"c.wilson@email.com", group:"friends", initials:"CW", color:"#3A5BD9", notes:"Next door neighbors, 15 years. Feed Biscuit when we travel." },
  { id:"c10", name:"Pastor James Collins", relationship:"Pastor", phone:"(916) 555-0541", email:"jcollins@gracechurch.com", group:"other", initials:"JC", color:"#6E8BFF", notes:"Grace Community Church. Has conducted family funerals." },
];

const groupConfig = {
  immediate: { label: "Immediate Family", color: "#3A5BD9", bg: "#141B2E" },
  extended:  { label: "Extended Family",  color: "#48BB78", bg: "#F0FFF4" },
  friends:   { label: "Friends",          color: "#6E8BFF", bg: "#0C1322" },
  other:     { label: "Other Contacts",   color: "#F6AD55", bg: "#FFFBEB" },
};

function AddContactModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Contact) => void }) {
  const [form, setForm] = useState({ name:"", relationship:"", phone:"", email:"", birthday:"", address:"", group:"immediate" as Contact["group"], notes:"" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const initials = form.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
    onAdd({ ...form, id:`cf-${Date.now()}`, initials, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    toast.success(`${form.name} added to Family & Friends`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl p-7 glow-surface" style={CARD}>
        <div className="flex items-center justify-between mb-6">
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>Add Contact</h3>
          <button onClick={onClose} style={{ color:"rgba(255,255,255,0.65)" }}><X size={16}/></button>
        </div>
        <div className="space-y-3">
          {[
            { key:"name", label:"FULL NAME", ph:"e.g. John Smith", required:true },
            { key:"relationship", label:"RELATIONSHIP", ph:"e.g. Son, Friend, Neighbor" },
            { key:"phone", label:"PHONE", ph:"(555) 000-0000" },
            { key:"email", label:"EMAIL", ph:"name@email.com" },
            { key:"birthday", label:"BIRTHDAY", ph:"e.g. Aug 14" },
            { key:"address", label:"ADDRESS", ph:"Street, City, State" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>{f.label}{f.required ? " *" : ""}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#070A12", border:"1px solid rgba(58,91,217,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>
          ))}
          <div>
            <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>GROUP</label>
            <select value={form.group} onChange={e => setForm(p => ({...p, group:e.target.value as Contact["group"]}))}
              className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#070A12", border:"1px solid rgba(58,91,217,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
              {Object.entries(groupConfig).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>NOTES</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} placeholder="Personal notes..." rows={2}
              className="w-full px-4 py-2.5 rounded-xl resize-none" style={{ background:"#070A12", border:"1px solid rgba(58,91,217,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:"0 4px 12px rgba(58,91,217,0.3)", opacity:loading?0.7:1 }}>
              {loading ? "Saving..." : "Add Contact"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm" style={{ background:"#070A12", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const initGroups: ContactGroup[] = [
  { id:"g1", name:"Estate Team", color:"#3A5BD9", description:"People involved in estate and legal matters", memberIds:["c1","c2","c3"], createdAt:"Jun 1, 2026" },
  { id:"g2", name:"Close Family", color:"#6E8BFF", description:"Immediate family members", memberIds:["c1","c2","c3","c4","c5"], createdAt:"Jun 1, 2026" },
  { id:"g3", name:"Sacramento Neighbors", color:"#48BB78", description:"Local friends and neighbors", memberIds:["c8","c9"], createdAt:"Jun 5, 2026" },
];

export function FamilyFriends() {
  const [contacts, setContacts] = useState<Contact[]>(initContacts);
  const [groups, setGroups] = useState<ContactGroup[]>(initGroups);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<Contact["group"] | "all" | "starred">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [blastGroup, setBlastGroup] = useState<ContactGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const filtered = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.relationship ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGroup = activeGroup === "all" || activeGroup === "starred" ? (activeGroup === "starred" ? c.starred : true) : c.group === activeGroup;
    return matchSearch && matchGroup;
  });

  const byGroup = (g: Contact["group"]) => contacts.filter(c => c.group === g);

  const toggleStar = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
  };

  const handlePhotoUpload = (id: string, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, photo: url } : c));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, photo: url } : prev);
    toast.success("Photo updated");
  };

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1240, margin: "0 auto", background: "#070A12", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:4 }}>Family & Friends</h1>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>{contacts.length} contacts · {contacts.filter(c=>c.starred).length} starred · organized by relationship</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGroupsPanel(!showGroupsPanel)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background:showGroupsPanel?"rgba(110,139,255,0.15)":"rgba(110,139,255,0.08)", color:"#6E8BFF", border:"1px solid rgba(110,139,255,0.25)" }}>
            <Layers size={14}/> Groups & Email Blast ({groups.length})
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:"0 4px 12px rgba(58,91,217,0.3)" }}>
            <Plus size={15}/> Add Contact
          </button>
        </div>
      </div>

      {/* Groups & Email Blast Panel */}
      {showGroupsPanel && (
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(110,139,255,0.2)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ background:"rgba(110,139,255,0.05)", borderColor:"rgba(110,139,255,0.15)" }}>
            <div className="flex items-center gap-2">
              <Layers size={15} color="#6E8BFF"/>
              <span style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#FFFFFF" }}>Contact Groups</span>
              <span style={{ color:"rgba(255,255,255,0.65)", fontSize:12 }}>— create groups to send blast emails to multiple contacts at once</span>
            </div>
            <button onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background:"rgba(110,139,255,0.1)", color:"#6E8BFF" }}>
              <Plus size={11}/> New Group
            </button>
          </div>

          {groups.length === 0 && (
            <div className="py-8 text-center" style={{ color:"rgba(255,255,255,0.65)", fontSize:13 }}>
              No groups yet. Create a group to send blast emails.
            </div>
          )}

          <div className="divide-y" style={{ borderColor:"rgba(110,139,255,0.08)" }}>
            {groups.map(g => {
              const members = contacts.filter(c => g.memberIds.includes(c.id));
              const withEmail = members.filter(c => c.email).length;
              return (
                <div key={g.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                    style={{ width:36, height:36, background:`${g.color}18`, color:g.color, fontSize:13, fontFamily:"var(--font-display)" }}>
                    {g.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color:"#FFFFFF", fontSize:14, fontWeight:600 }}>{g.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>
                      {members.length} contacts · {withEmail} with email{g.description ? ` · ${g.description}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {members.slice(0,5).map(m => (
                      <span key={m.id} className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background:"rgba(58,91,217,0.06)", color:"#3A5BD9" }}>
                        {m.name.split(" ")[0]}
                      </span>
                    ))}
                    {members.length > 5 && <span style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>+{members.length-5} more</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setBlastGroup(g)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ background:`${g.color}12`, color:g.color, border:`1px solid ${g.color}30` }}>
                      <Send size={11}/> Blast Email
                    </button>
                    <button onClick={() => setGroups(prev => prev.filter(x => x.id !== g.id))}
                      style={{ color:"#FC8181", padding:4 }}><Trash2 size={13}/></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create group inline form */}
          {showCreateGroup && (
            <div className="px-5 py-4 border-t space-y-3"
              style={{ background:"rgba(110,139,255,0.03)", borderColor:"rgba(110,139,255,0.12)" }}>
              <div style={{ color:"#6E8BFF", fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)" }}>CREATE NEW GROUP</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontFamily:"var(--font-mono)", display:"block", marginBottom:4 }}>GROUP NAME *</label>
                  <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g. Estate Team" className="w-full px-3 py-2 rounded-xl"
                    style={{ background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                </div>
                <div>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontFamily:"var(--font-mono)", display:"block", marginBottom:4 }}>DESCRIPTION (optional)</label>
                  <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)}
                    placeholder="What is this group for?" className="w-full px-3 py-2 rounded-xl"
                    style={{ background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                </div>
              </div>
              <div>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontFamily:"var(--font-mono)", display:"block", marginBottom:6 }}>COLOR</label>
                <div className="flex gap-2">
                  {GROUP_COLORS.map(c => (
                    <button key={c} onClick={() => setNewGroupColor(c)}
                      style={{ width:24, height:24, borderRadius:"50%", background:c,
                        outline: newGroupColor===c ? `3px solid ${c}` : "none",
                        outlineOffset:2, border:"2px solid #fff" }}/>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontFamily:"var(--font-mono)" }}>
                    ADD MEMBERS ({newGroupMembers.length}/{contacts.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setNewGroupMembers(contacts.map(c => c.id))}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background:"rgba(58,91,217,0.1)", color:"#3A5BD9", border:"1px solid rgba(58,91,217,0.2)" }}>
                      + Add All
                    </button>
                    {newGroupMembers.length > 0 && (
                      <button onClick={() => setNewGroupMembers([])}
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{ background:"rgba(252,129,129,0.1)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)" }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contacts.map(c => {
                    const sel = newGroupMembers.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => setNewGroupMembers(prev => sel ? prev.filter(x=>x!==c.id) : [...prev,c.id])}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                        style={{ background:sel?`${newGroupColor}15`:"rgba(58,91,217,0.04)",
                          border:`1px solid ${sel?newGroupColor:"rgba(58,91,217,0.12)"}`,
                          color:sel?newGroupColor:"rgba(255,255,255,0.7)" }}>
                        {sel && <CheckCircle size={10}/>}
                        {c.name.split(" ")[0]}
                        {c.email && <Mail size={9} style={{ opacity:0.6 }}/>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  if (!newGroupName.trim()) { toast.error("Group name required"); return; }
                  const ng: ContactGroup = { id:`g${Date.now()}`, name:newGroupName.trim(), color:newGroupColor, description:newGroupDesc, memberIds:newGroupMembers, createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) };
                  setGroups(prev => [...prev, ng]);
                  setNewGroupName(""); setNewGroupDesc(""); setNewGroupMembers([]); setNewGroupColor(GROUP_COLORS[0]);
                  setShowCreateGroup(false);
                  toast.success(`Group "${ng.name}" created with ${newGroupMembers.length} members`);
                }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background:"linear-gradient(135deg,#6E8BFF,#B8C6F5)", color:"#04080F" }}>
                  <Plus size={11}/> Create Group
                </button>
                <button onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 rounded-xl text-xs" style={{ background:"rgba(58,91,217,0.06)", color:"rgba(255,255,255,0.7)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(groupConfig) as [Contact["group"], typeof groupConfig[Contact["group"]]][]).map(([g, cfg]) => (
          <button key={g} onClick={() => setActiveGroup(activeGroup === g ? "all" : g)}
            className="p-4 rounded-2xl text-left transition-all"
            style={{ ...CARD, borderColor: activeGroup === g ? cfg.color : "rgba(58,91,217,0.1)", borderWidth: activeGroup === g ? 2 : 1 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:cfg.color }}>{byGroup(g).length}</div>
            <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:500, marginTop:2 }}>{cfg.label}</div>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 min-w-48" style={{ background:"#101728", border:"1px solid rgba(58,91,217,0.1)" }}>
          <Search size={13} color="rgba(255,255,255,0.65)"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search family & friends..."
            style={{ background:"transparent", border:"none", outline:"none", color:"#FFFFFF", fontSize:13, width:"100%" }}/>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#101728", border:"1px solid rgba(58,91,217,0.1)" }}>
          {([["all","All"],["starred","⭐ Starred"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveGroup(id as any)}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ background: activeGroup === id ? "#3A5BD9" : "transparent", color: activeGroup === id ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: activeGroup === id ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Contact list */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <div className="py-12 text-center rounded-2xl glow-surface" style={CARD}>
              <Users size={32} color="rgba(58,91,217,0.2)" style={{ margin:"0 auto 12px" }}/>
              <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14 }}>No contacts found.</div>
            </div>
          )}
          {filtered.map(contact => {
            const cfg = groupConfig[contact.group];
            return (
              <div key={contact.id}
                className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                style={{ ...CARD, borderColor: selected?.id === contact.id ? "#3A5BD9" : "rgba(58,91,217,0.1)", borderWidth: selected?.id === contact.id ? 2 : 1 }}
                onClick={() => setSelected(selected?.id === contact.id ? null : contact)}>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {contact.photo
                    ? <img src={contact.photo} alt={contact.name} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(58,91,217,0.2)" }}/>
                    : <div className="flex items-center justify-center rounded-full" style={{ width:48, height:48, background:`${contact.color}18`, color:contact.color, fontSize:16, fontWeight:700, fontFamily:"var(--font-display)" }}>{contact.initials}</div>
                  }
                  {contact.starred && <Star size={12} fill="#F6AD55" color="#F6AD55" style={{ position:"absolute", bottom:0, right:0 }}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color:"#FFFFFF", fontSize:14, fontWeight:600 }}>{contact.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:cfg.bg, color:cfg.color, fontSize:10, ...MONO }}>{contact.relationship}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {contact.phone && <span style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{contact.phone}</span>}
                    {contact.birthday && <span style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>🎂 {contact.birthday}</span>}
                  </div>
                  {contact.notes && <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:3, fontStyle:"italic" }} className="truncate">"{contact.notes}"</div>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); toggleStar(contact.id); }} style={{ color: contact.starred ? "#F6AD55" : "rgba(255,255,255,0.75)" }}>
                    <Star size={14} fill={contact.starred ? "#F6AD55" : "transparent"}/>
                  </button>
                  {contact.phone && <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} style={{ color:"rgba(255,255,255,0.65)" }}><Phone size={13}/></a>}
                  {contact.email && <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} style={{ color:"rgba(255,255,255,0.65)" }}><Mail size={13}/></a>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <div className="rounded-2xl overflow-hidden sticky top-4 glow-surface" style={CARD}>
              {/* Photo */}
              <div className="relative h-32 flex items-center justify-center" style={{ background:`${selected.color}12` }}>
                {selected.photo
                  ? <img src={selected.photo} alt={selected.name} style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.8 }}/>
                  : <div style={{ fontFamily:"var(--font-display)", fontSize:48, color:selected.color, opacity:0.4 }}>{selected.initials}</div>
                }
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(selected.id, e.target.files?.[0] ?? null)}/>
                <button onClick={() => photoRef.current?.click()}
                  className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                  style={{ background:"rgba(22,22,31,0.9)", color:"#3A5BD9", fontWeight:600 }}>
                  <Camera size={11}/> {selected.photo ? "Change" : "Add Photo"}
                </button>
              </div>
              <div className="p-5">
                <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#FFFFFF", marginBottom:4 }}>{selected.name}</div>
                <div style={{ color:groupConfig[selected.group].color, fontSize:13, fontWeight:500, marginBottom:16 }}>{selected.relationship}</div>
                <div className="space-y-3">
                  {selected.phone && (
                    <div className="flex items-center gap-2"><Phone size={13} color="rgba(255,255,255,0.65)"/><span style={{ color:"#FFFFFF", fontSize:13 }}>{selected.phone}</span></div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-2"><Mail size={13} color="rgba(255,255,255,0.65)"/><span style={{ color:"#FFFFFF", fontSize:13 }}>{selected.email}</span></div>
                  )}
                  {selected.address && (
                    <div className="flex items-start gap-2"><MapPin size={13} color="rgba(255,255,255,0.65)" style={{ marginTop:2 }}/><span style={{ color:"#FFFFFF", fontSize:13 }}>{selected.address}</span></div>
                  )}
                  {selected.birthday && (
                    <div className="flex items-center gap-2"><Gift size={13} color="rgba(255,255,255,0.65)"/><span style={{ color:"#FFFFFF", fontSize:13 }}>{selected.birthday}</span></div>
                  )}
                </div>
                {selected.notes && (
                  <div className="mt-4 p-3 rounded-xl glow-surface" style={{ background:"#070A12" }}>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, marginBottom:4 }}>NOTES</div>
                    <div style={{ color:"rgba(255,255,255,0.8)", fontSize:13, lineHeight:1.7 }}>{selected.notes}</div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => {
                    const newName = prompt("Edit name:", selected.name);
                    if (newName && newName.trim()) {
                      setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, name: newName.trim() } : c));
                      setSelected(s => s ? { ...s, name: newName.trim() } : s);
                      toast.success(`Updated to "${newName.trim()}"`);
                    }
                  }}
                    className="flex-1 py-2 rounded-xl text-sm" style={{ background:"#141B2E", color:"#3A5BD9" }}>
                    <Edit2 size={13} style={{ display:"inline", marginRight:4 }}/>Edit Name
                  </button>
                  <button onClick={() => { setContacts(prev => prev.filter(c => c.id !== selected.id)); setSelected(null); toast.success(`${selected.name} removed`); }}
                    className="py-2 px-3 rounded-xl text-sm" style={{ background:"rgba(252,129,129,0.1)", color:"#FC8181" }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center glow-surface" style={CARD}>
              <Heart size={32} color="rgba(58,91,217,0.2)" style={{ margin:"0 auto 12px" }}/>
              <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14 }}>Select a contact to view details</div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdd={c => setContacts(prev => [c, ...prev])}/>}
      {blastGroup && <BlastEmailModal group={blastGroup} contacts={contacts} onClose={() => setBlastGroup(null)}/>}
    </div>
  );
}
