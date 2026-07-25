import React, { useState, useRef } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import {
  Users, Phone, Mail, MapPin, Gift, Heart, Plus, Search,
  Edit2, Trash2, X, Star, Camera,
  Send, CheckCircle, Layers
} from "lucide-react";
import { toast } from "sonner";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#808BAA";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

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

const GROUP_COLORS = ["#7E6BD8","#5B6EE1","#5BA7D6","#6F9E94","#6FAE8B"];

/* ── Blast Email Modal ─────────────────────────────────────────────── */
function BlastEmailModal({
  group, contacts, onClose,
}: { group: ContactGroup; contacts: Contact[]; onClose: () => void }) {
  useEscapeKey(true, onClose);
  const members = contacts.filter(c => group.memberIds.includes(c.id));
  const withEmail = members.filter(c => c.email);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

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
    <div className="backdrop">
      <div className="card modal glow-surface">
        <div className="modal-head">
          <div className="flex items-center gap-2">
            <Send size={16} color={ACCENT2}/>
            <h3>Blast Email — {group.name}</h3>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <div className="recipients-box">
            <div className="rec-lbl">RECIPIENTS ({withEmail.length} with email / {members.length} total in group)</div>
            <div className="flex flex-wrap gap-1.5">
              {withEmail.map(c => (
                <span key={c.id} className="rec-chip on">{c.initials} {c.name}</span>
              ))}
              {members.filter(c => !c.email).map(c => (
                <span key={c.id} className="rec-chip off">{c.name} (no email)</span>
              ))}
            </div>
          </div>
          <div className="field">
            <label>SUBJECT *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Family Reunion — Save the Date!"/>
          </div>
          <div className="field">
            <label>MESSAGE *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Write your message here…"/>
          </div>
          <div className="bcc-note">
            <Mail size={12} color={POS} style={{ marginTop:1, flexShrink:0 }}/>
            <p>Recipients are BCC'd — each person sees only themselves in the To field. Opens your default email client.</p>
          </div>
        </div>
        <div className="modal-foot">
          <button onClick={sendEmail} disabled={sending} className="save" style={{ opacity: sending ? 0.7 : 1 }}>
            <Send size={14}/>{sending ? "Opening Email…" : `Send to ${withEmail.length} Recipients`}
          </button>
          <button onClick={onClose} className="btn-sec">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const COLORS = ["#5B6EE1","#48BB78","#5B6EE1","#F6AD55","#FC8181","#6F9E94","#ED8936","#5BA7D6"];

const initContacts: Contact[] = [
  { id:"c1", name:"Sarah Johnson", relationship:"Spouse", phone:"(916) 555-0234", email:"sarah.j@email.com", address:"1842 Oak Ridge Dr, Sacramento CA", birthday:"Aug 14", group:"immediate", starred:true, initials:"SJ", color:"#5B6EE1", notes:"My partner for 36 years. She loves peonies and dark chocolate.", photo:"https://images.unsplash.com/photo-1625690988276-0a7b0cdf3d5d?w=80&h=80&fit=crop&auto=format" },
  { id:"c2", name:"Michael Doe", relationship:"Son", phone:"(415) 555-0871", email:"m.doe@email.com", birthday:"Mar 5", group:"immediate", starred:true, initials:"MD", color:"#48BB78", notes:"Married to Amanda. Has Tyler and Lily." },
  { id:"c3", name:"Emily Doe", relationship:"Daughter", phone:"(916) 555-0392", email:"e.doe@email.com", birthday:"Oct 22", group:"immediate", starred:true, initials:"ED", color:"#5B6EE1", notes:"Lives in Sacramento. Loves art and teaching." },
  { id:"c4", name:"Tyler Doe", relationship:"Grandson", birthday:"Mar 5", group:"immediate", initials:"TD", color:"#F6AD55", notes:"Age 8. Loves dinosaurs and baseball. Peanut allergy." },
  { id:"c5", name:"Lily Doe", relationship:"Granddaughter", birthday:"Jul 19", group:"immediate", initials:"LD", color:"#FC8181", notes:"Age 6. Loves ballet and painting." },
  { id:"c6", name:"Robert Doe", relationship:"Brother", phone:"(213) 555-0481", email:"r.doe@email.com", address:"2240 Maple Ave, Los Angeles CA", birthday:"Feb 28", group:"extended", initials:"RD", color:"#6F9E94" },
  { id:"c7", name:"Linda Torres", relationship:"Sister-in-law", phone:"(916) 555-0821", email:"ltorres@email.com", birthday:"Apr 12", group:"extended", initials:"LT", color:"#ED8936" },
  { id:"c8", name:"George Martinez", relationship:"Best Friend", phone:"(916) 555-0192", email:"g.martinez@email.com", birthday:"Jul 4", group:"friends", starred:true, initials:"GM", color:"#5BA7D6", notes:"We go back to Army days. Fishing partner." },
  { id:"c9", name:"Carol & Dave Wilson", relationship:"Neighbors", phone:"(916) 555-0283", email:"c.wilson@email.com", group:"friends", initials:"CW", color:"#5B6EE1", notes:"Next door neighbors, 15 years. Feed Biscuit when we travel." },
  { id:"c10", name:"Pastor James Collins", relationship:"Pastor", phone:"(916) 555-0541", email:"jcollins@gracechurch.com", group:"other", initials:"JC", color:"#5B6EE1", notes:"Grace Community Church. Has conducted family funerals." },
];

const groupConfig = {
  immediate: { label: "Immediate Family", color: ACCENT2 },
  extended:  { label: "Extended Family",  color: POS },
  friends:   { label: "Friends",          color: ACCENT },
  other:     { label: "Other Contacts",   color: WARN },
};

function AddContactModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Contact) => void }) {
  useEscapeKey(true, onClose);
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
    <div className="backdrop">
      <div className="card modal glow-surface">
        <div className="modal-head">
          <h3>Add Contact</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          {[
            { key:"name", label:"FULL NAME", ph:"e.g. John Smith", required:true },
            { key:"relationship", label:"RELATIONSHIP", ph:"e.g. Son, Friend, Neighbor" },
            { key:"phone", label:"PHONE", ph:"(555) 000-0000" },
            { key:"email", label:"EMAIL", ph:"name@email.com" },
            { key:"birthday", label:"BIRTHDAY", ph:"e.g. Aug 14" },
            { key:"address", label:"ADDRESS", ph:"Street, City, State" },
          ].map(f => (
            <div className="field" key={f.key}>
              <label>{f.label}{f.required ? " *" : ""}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} placeholder={f.ph}/>
            </div>
          ))}
          <div className="field">
            <label>GROUP</label>
            <select value={form.group} onChange={e => setForm(p => ({...p, group:e.target.value as Contact["group"]}))}>
              {Object.entries(groupConfig).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>NOTES</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} placeholder="Personal notes..." rows={2}/>
          </div>
        </div>
        <div className="modal-foot">
          <button onClick={submit} disabled={loading} className="save" style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : "Add Contact"}
          </button>
          <button onClick={onClose} className="btn-sec">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const initGroups: ContactGroup[] = [
  { id:"g1", name:"Estate Team", color:"#5B6EE1", description:"People involved in estate and legal matters", memberIds:["c1","c2","c3"], createdAt:"Jun 1, 2026" },
  { id:"g2", name:"Close Family", color:"#5B6EE1", description:"Immediate family members", memberIds:["c1","c2","c3","c4","c5"], createdAt:"Jun 1, 2026" },
  { id:"g3", name:"Sacramento Neighbors", color:"#48BB78", description:"Local friends and neighbors", memberIds:["c8","c9"], createdAt:"Jun 5, 2026" },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-ff so nothing else in the app is affected. */
const FF_CSS = `
.fpd-ff{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-ff *{box-sizing:border-box;}
.fpd-ff-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-ff .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-ff .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-ff .card.pad{padding:22px;}
.fpd-ff .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-ff .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-ff .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-ff .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-ff .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-ff .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-ff .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-ff .btn-ghost.on{background:rgba(91,110,225,0.20);}
.fpd-ff .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* group summary — clickable filter tiles */
.fpd-ff .gstat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
@media (max-width:760px){.fpd-ff .gstat-grid{grid-template-columns:1fr 1fr;}}
.fpd-ff .gstat{padding:16px;text-align:left;cursor:pointer;transition:border-color .18s;}
.fpd-ff .gstat-val{font-family:var(--font-display);font-size:22px;font-weight:600;}
.fpd-ff .gstat-lbl{color:${TEXT};font-size:13px;font-weight:500;margin-top:2px;}

/* segmented all/starred filter */
.fpd-ff .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);width:fit-content;}
.fpd-ff .seg button{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:9px;font-size:13px;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-ff .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* toolbar */
.fpd-ff .toolbar{display:flex;flex-wrap:wrap;gap:10px;}
.fpd-ff .search{display:flex;align-items:center;gap:8px;padding:11px 15px;flex:1;min-width:220px;}
.fpd-ff .search input{background:transparent;border:none;outline:none;color:${TEXT};font-size:13px;width:100%;font-family:var(--font-body);}

/* groups panel */
.fpd-ff .gpanel-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.22);background:rgba(91,110,225,0.05);}
.fpd-ff .gpanel-title{font-family:var(--font-display);font-size:15px;color:${TEXT};}
.fpd-ff .gpanel-desc{color:${MUTED};font-size:12px;}
.fpd-ff .grow{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-ff .gavatar{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:var(--font-display);}
.fpd-ff .gname{color:${TEXT};font-size:14px;font-weight:600;}
.fpd-ff .gmeta{color:${MUTED};font-size:11px;}
.fpd-ff .gmember-chip{padding:2px 8px;border-radius:99px;font-size:11px;background:rgba(91,110,225,0.09);color:${ACCENT2};}
.fpd-ff .gcreate{padding:16px 20px;border-top:1px solid rgba(255,255,255,0.22);background:rgba(91,110,225,0.03);display:flex;flex-direction:column;gap:12px;}
.fpd-ff .gcreate-lbl{color:${ACCENT2};font-size:12px;font-weight:700;font-family:var(--font-mono);}
.fpd-ff .swatch{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);cursor:pointer;}
.fpd-ff .member-pick{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;}

/* bento layout */
.fpd-ff .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:16px;align-items:start;}
@media (max-width:1000px){.fpd-ff .bento{grid-template-columns:1fr;}}
.fpd-ff .clist{display:flex;flex-direction:column;gap:10px;}
.fpd-ff .empty{padding:44px 12px;text-align:center;}

/* contact row */
.fpd-ff .crow{display:flex;align-items:center;gap:14px;padding:16px;cursor:pointer;transition:border-color .18s;}
.fpd-ff .crow.sel{border-color:rgba(91,110,225,0.5);}
.fpd-ff .cavatar-wrap{position:relative;flex-shrink:0;}
.fpd-ff .cavatar{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(91,110,225,0.22);}
.fpd-ff .cavatar-fallback{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:var(--font-display);}
.fpd-ff .cname{color:${TEXT};font-size:14px;font-weight:600;}
.fpd-ff .crel{padding:2px 8px;border-radius:99px;font-size:10px;font-family:var(--font-mono);}
.fpd-ff .cmeta{display:flex;flex-wrap:wrap;gap:12px;margin-top:4px;}
.fpd-ff .cmeta span{color:${MUTED};font-size:12px;}
.fpd-ff .cnote{color:${FAINT};font-size:11px;margin-top:3px;font-style:italic;}
.fpd-ff .cacts{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.fpd-ff .cacts a,.fpd-ff .cacts button{color:${MUTED};background:none;border:none;cursor:pointer;display:flex;}

/* detail panel */
.fpd-ff .dphoto{position:relative;height:128px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fpd-ff .dphoto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;}
.fpd-ff .dphoto-init{font-family:var(--font-display);font-size:48px;opacity:0.4;}
.fpd-ff .dphoto-btn{position:absolute;bottom:8px;right:8px;display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;font-size:11px;font-weight:600;background:rgba(13,20,33,0.9);color:${ACCENT2};border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-ff .dname{font-family:var(--font-display);font-size:20px;color:${TEXT};margin-bottom:4px;}
.fpd-ff .drel{font-size:13px;font-weight:500;margin-bottom:16px;}
.fpd-ff .dfield{display:flex;align-items:center;gap:8px;color:${TEXT};font-size:13px;}
.fpd-ff .dfield+.dfield{margin-top:10px;}
.fpd-ff .dnotes{margin-top:16px;padding:12px;border-radius:11px;background:#0F1624;}
.fpd-ff .dnotes-lbl{font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;color:${MUTED};margin-bottom:4px;}
.fpd-ff .dnotes-val{color:${SOFT};font-size:13px;line-height:1.7;}
.fpd-ff .dedit{flex:1;padding:9px;border-radius:11px;font-size:13px;background:#141B2E;color:${ACCENT2};border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-ff .ddelete{padding:9px 13px;border-radius:11px;font-size:13px;background:rgba(208,107,107,0.12);color:${NEG};border:none;cursor:pointer;}

/* modal */
.fpd-ff .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-ff .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-ff .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-ff .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-ff .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-ff .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-ff .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-ff .field input,.fpd-ff .field select,.fpd-ff .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-ff .field textarea{resize:none;}
.fpd-ff .field input::placeholder,.fpd-ff .field textarea::placeholder{color:${FAINT};}
.fpd-ff .field input:focus,.fpd-ff .field select:focus,.fpd-ff .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-ff .recipients-box{padding:12px;border-radius:11px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-ff .rec-lbl{font-family:var(--font-mono);font-size:10.5px;color:${MUTED};margin-bottom:8px;}
.fpd-ff .rec-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:99px;font-size:11px;}
.fpd-ff .rec-chip.on{background:rgba(91,110,225,0.10);color:${ACCENT2};}
.fpd-ff .rec-chip.off{background:rgba(140,151,180,0.10);color:${MUTED};}
.fpd-ff .bcc-note{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:11px;background:rgba(95,190,145,0.07);border:1px solid rgba(95,190,145,0.2);}
.fpd-ff .bcc-note p{color:${POS};font-size:11px;line-height:1.6;}
.fpd-ff .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-ff .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;display:flex;align-items:center;justify-content:center;gap:6px;}
`;

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
    <div className="fpd-ff">
      <style dangerouslySetInnerHTML={{ __html: FF_CSS }} />
      <div className="fpd-ff-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Users size={12} /> CONTACT BOOK</div>
            <h1 className="pg-h1">Family & Friends</h1>
            <div className="pg-sub">{contacts.length} contacts · {contacts.filter(c=>c.starred).length} starred · organized by relationship</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGroupsPanel(!showGroupsPanel)} className={`btn-ghost ${showGroupsPanel ? "on" : ""}`}>
              <Layers size={14}/> Groups & Email Blast ({groups.length})
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={15}/> Add Contact
            </button>
          </div>
        </div>

        {/* ── Groups & Email Blast panel ── */}
        {showGroupsPanel && (
          <div className="card glow-surface" style={{ overflow: "hidden" }}>
            <div className="gpanel-hd">
              <div className="flex items-center gap-2">
                <Layers size={15} color={ACCENT2}/>
                <span className="gpanel-title">Contact Groups</span>
                <span className="gpanel-desc">— create groups to send blast emails to multiple contacts at once</span>
              </div>
              <button className="btn-ghost" onClick={() => setShowCreateGroup(true)}>
                <Plus size={11}/> New Group
              </button>
            </div>

            {groups.length === 0 && (
              <div style={{ padding: "32px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
                No groups yet. Create a group to send blast emails.
              </div>
            )}

            {groups.map(g => {
              const members = contacts.filter(c => g.memberIds.includes(c.id));
              const withEmail = members.filter(c => c.email).length;
              return (
                <div key={g.id} className="grow">
                  <div className="gavatar" style={{ background:`${g.color}20`, color:g.color }}>
                    {g.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="gname">{g.name}</div>
                    <div className="gmeta">{members.length} contacts · {withEmail} with email{g.description ? ` · ${g.description}` : ""}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-1" style={{ minWidth: 0 }}>
                    {members.slice(0,5).map(m => <span key={m.id} className="gmember-chip">{m.name.split(" ")[0]}</span>)}
                    {members.length > 5 && <span className="gmeta">+{members.length-5} more</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setBlastGroup(g)} className="btn-ghost" style={{ color: g.color, background: `${g.color}14`, borderColor: `${g.color}40` }}>
                      <Send size={11}/> Blast Email
                    </button>
                    <button onClick={() => setGroups(prev => prev.filter(x => x.id !== g.id))} style={{ color: NEG, background:"none", border:"none", cursor:"pointer" }}><Trash2 size={13}/></button>
                  </div>
                </div>
              );
            })}

            {showCreateGroup && (
              <div className="gcreate">
                <div className="gcreate-lbl">CREATE NEW GROUP</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label>GROUP NAME *</label>
                    <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Estate Team"/>
                  </div>
                  <div className="field">
                    <label>DESCRIPTION (optional)</label>
                    <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="What is this group for?"/>
                  </div>
                </div>
                <div className="field">
                  <label>COLOR</label>
                  <div className="flex gap-2">
                    {GROUP_COLORS.map(c => (
                      <button key={c} onClick={() => setNewGroupColor(c)} className="swatch"
                        style={{ background:c, outline: newGroupColor===c ? `3px solid ${c}` : "none", outlineOffset:2 }}/>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, fontFamily: "var(--font-mono)" }}>
                      ADD MEMBERS ({newGroupMembers.length}/{contacts.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setNewGroupMembers(contacts.map(c => c.id))} className="btn-ghost" style={{ padding: "5px 11px", fontSize: 11 }}>+ Add All</button>
                      {newGroupMembers.length > 0 && (
                        <button onClick={() => setNewGroupMembers([])} className="btn-ghost" style={{ padding: "5px 11px", fontSize: 11, color: NEG, background: "rgba(208,107,107,0.10)", borderColor: "rgba(208,107,107,0.28)" }}>Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contacts.map(c => {
                      const sel = newGroupMembers.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => setNewGroupMembers(prev => sel ? prev.filter(x=>x!==c.id) : [...prev,c.id])}
                          className="member-pick"
                          style={{ background:sel?`${newGroupColor}1E`:"rgba(255,255,255,0.03)", borderColor:sel?newGroupColor:"rgba(255,255,255,0.09)", color:sel?newGroupColor:MUTED }}>
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
                  }} className="btn-primary">
                    <Plus size={11}/> Create Group
                  </button>
                  <button onClick={() => setShowCreateGroup(false)} className="btn-sec">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Group summary ── */}
        <div className="gstat-grid">
          {(Object.entries(groupConfig) as [Contact["group"], typeof groupConfig[Contact["group"]]][]).map(([g, cfg]) => (
            <button key={g} onClick={() => setActiveGroup(activeGroup === g ? "all" : g)}
              className="card gstat glow-surface" style={{ borderColor: activeGroup === g ? cfg.color : "rgba(255,255,255,0.065)" }}>
              <div className="gstat-val" style={{ color: cfg.color }}>{byGroup(g).length}</div>
              <div className="gstat-lbl">{cfg.label}</div>
            </button>
          ))}
        </div>

        {/* ── Search + filter ── */}
        <div className="toolbar">
          <div className="card search glow-surface">
            <Search size={13} color={MUTED}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search family & friends..."/>
          </div>
          <div className="seg">
            {([["all","All"],["starred","⭐ Starred"]] as const).map(([id, label]) => (
              <button key={id} className={activeGroup === id ? "on" : ""} onClick={() => setActiveGroup(id as any)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="bento">
          {/* Contact list */}
          <div className="clist">
            {filtered.length === 0 && (
              <div className="card empty glow-surface">
                <Users size={32} color="rgba(91,110,225,0.3)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color: MUTED, fontSize: 14 }}>No contacts found.</div>
              </div>
            )}
            {filtered.map(contact => {
              const cfg = groupConfig[contact.group];
              return (
                <div key={contact.id} className={`card crow glow-surface ${selected?.id === contact.id ? "sel" : ""}`} onClick={() => setSelected(selected?.id === contact.id ? null : contact)}>
                  <div className="cavatar-wrap">
                    {contact.photo
                      ? <img src={contact.photo} alt={contact.name} className="cavatar"/>
                      : <div className="cavatar-fallback" style={{ background:`${contact.color}20`, color:contact.color }}>{contact.initials}</div>
                    }
                    {contact.starred && <Star size={12} fill={WARN} color={WARN} style={{ position:"absolute", bottom:0, right:0 }}/>}
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span className="cname">{contact.name}</span>
                      <span className="crel" style={{ background:`${cfg.color}1C`, color:cfg.color }}>{contact.relationship}</span>
                    </div>
                    <div className="cmeta">
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.birthday && <span>🎂 {contact.birthday}</span>}
                    </div>
                    {contact.notes && <div className="cnote truncate">"{contact.notes}"</div>}
                  </div>
                  <div className="cacts">
                    <button onClick={e => { e.stopPropagation(); toggleStar(contact.id); }} style={{ color: contact.starred ? WARN : MUTED }}>
                      <Star size={14} fill={contact.starred ? WARN : "transparent"}/>
                    </button>
                    {contact.phone && <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()}><Phone size={13}/></a>}
                    {contact.email && <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()}><Mail size={13}/></a>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="card glow-surface" style={{ overflow: "hidden", position: "sticky", top: 16 }}>
                <div className="dphoto" style={{ background:`${selected.color}1C` }}>
                  {selected.photo
                    ? <img src={selected.photo} alt={selected.name}/>
                    : <div className="dphoto-init" style={{ color: selected.color }}>{selected.initials}</div>
                  }
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(selected.id, e.target.files?.[0] ?? null)}/>
                  <button onClick={() => photoRef.current?.click()} className="dphoto-btn">
                    <Camera size={11}/> {selected.photo ? "Change" : "Add Photo"}
                  </button>
                </div>
                <div className="card pad" style={{ border: "none", background: "transparent", boxShadow: "none" }}>
                  <div className="dname">{selected.name}</div>
                  <div className="drel" style={{ color: groupConfig[selected.group].color }}>{selected.relationship}</div>
                  <div>
                    {selected.phone && <div className="dfield"><Phone size={13} color={MUTED}/>{selected.phone}</div>}
                    {selected.email && <div className="dfield"><Mail size={13} color={MUTED}/>{selected.email}</div>}
                    {selected.address && <div className="dfield"><MapPin size={13} color={MUTED}/>{selected.address}</div>}
                    {selected.birthday && <div className="dfield"><Gift size={13} color={MUTED}/>{selected.birthday}</div>}
                  </div>
                  {selected.notes && (
                    <div className="dnotes">
                      <div className="dnotes-lbl">NOTES</div>
                      <div className="dnotes-val">{selected.notes}</div>
                    </div>
                  )}
                  <div className="flex gap-2" style={{ marginTop: 16 }}>
                    <button onClick={() => {
                      const newName = prompt("Edit name:", selected.name);
                      if (newName && newName.trim()) {
                        setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, name: newName.trim() } : c));
                        setSelected(s => s ? { ...s, name: newName.trim() } : s);
                        toast.success(`Updated to "${newName.trim()}"`);
                      }
                    }} className="dedit">
                      <Edit2 size={13} style={{ display:"inline", marginRight:4 }}/>Edit Name
                    </button>
                    <button onClick={() => { setContacts(prev => prev.filter(c => c.id !== selected.id)); setSelected(null); toast.success(`${selected.name} removed`); }} className="ddelete">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card pad empty glow-surface">
                <Heart size={32} color="rgba(91,110,225,0.3)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color: MUTED, fontSize: 14 }}>Select a contact to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdd={c => setContacts(prev => [c, ...prev])}/>}
      {blastGroup && <BlastEmailModal group={blastGroup} contacts={contacts} onClose={() => setBlastGroup(null)}/>}
    </div>
  );
}
