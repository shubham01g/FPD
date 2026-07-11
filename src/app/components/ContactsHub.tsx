import React, { useState } from "react";
import {
  Users, Shield, AlertCircle, PawPrint, Plus, Phone, Mail,
  CheckCircle, Clock, X, Trash2, FolderOpen, Eye,
  ChevronDown, ChevronUp, Info, Crown, ArrowDown,
  FileText, Lock, Star, AlertTriangle, Upload, RefreshCw, UserCheck
} from "lucide-react";
import { useDemo, type Contact } from "../context/DemoContext";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

// Extended verification status — richer than DemoContext's 3-state
type VerifStatus = "not_sent" | "pending" | "id_submitted" | "verified" | "rejected";

const verifConfig: Record<VerifStatus, { label:string; color:string; bg:string; icon:React.ReactNode }> = {
  not_sent:     { label:"NOT SENT",     color:"#8A9AB8", bg:"rgba(138,154,184,0.1)", icon:<X size={11}/> },
  pending:      { label:"INVITE SENT",  color:"#F6AD55", bg:"rgba(246,173,85,0.12)", icon:<Clock size={11}/> },
  id_submitted: { label:"ID SUBMITTED", color:"#4A90D9", bg:"rgba(74,144,217,0.12)", icon:<Upload size={11}/> },
  verified:     { label:"VERIFIED",     color:"#48BB78", bg:"rgba(72,187,120,0.12)", icon:<CheckCircle size={11}/> },
  rejected:     { label:"REJECTED",     color:"#FC8181", bg:"rgba(252,129,129,0.12)",icon:<AlertTriangle size={11}/> },
};

// Map DemoContext status → VerifStatus
function toVerifStatus(s: string): VerifStatus {
  if (s === "verified") return "verified";
  if (s === "pending")  return "pending";
  return "not_sent";
}

const GLASS: React.CSSProperties = { background:"rgba(16,23,40,0.96)", border:"1px solid rgba(58,91,217,0.14)", backdropFilter:"blur(12px)" };
const GRID:  React.CSSProperties = { backgroundImage:"linear-gradient(rgba(58,91,217,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(58,91,217,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" };
const MONO:  React.CSSProperties = { fontFamily:"var(--font-mono)" };

type ContactType = "legacy"|"guardian"|"emergency"|"pet_emergency";

const typeConfig = {
  legacy:       { label:"Legacy Contact",        color:"#3A5BD9", bg:"rgba(58,91,217,0.1)",    icon:<Shield size={13}/>,       desc:"Receives full vault access upon verified passing." },
  guardian:     { label:"Guardian Contact",      color:"#48BB78", bg:"rgba(72,187,120,0.1)",   icon:<Users size={13}/>,        desc:"View-only access to assigned folders right now — no death required." },
  emergency:    { label:"Emergency Contact",     color:"#F6AD55", bg:"rgba(246,173,85,0.1)",   icon:<AlertCircle size={13}/>,  desc:"Notified by first responders in an emergency." },
  pet_emergency:{ label:"Pet Emergency Contact", color:"#6E8BFF", bg:"rgba(110,139,255,0.1)", icon:<PawPrint size={13}/>,     desc:"Cares for your pets in an emergency or upon passing." },
};

/* ── Verification methods a user can configure per Legacy Contact ─── */
const VERIFICATION_METHODS = [
  { id:"death_cert",     label:"Death Certificate",               icon:"📜", required:true,  desc:"Official government-issued death certificate — always required." },
  { id:"security_word",  label:"Preset Security Word",            icon:"🔑", required:false, desc:"A secret word agreed upon privately between you and your legacy contact." },
  { id:"security_qa",    label:"Security Question & Answer",      icon:"❓", required:false, desc:"A personal question only you and your contact would know the answer to." },
  { id:"govt_id",        label:"Government-Issued Photo ID",      icon:"🪪", required:false, desc:"Driver's license or passport to confirm your contact's identity." },
  { id:"notarized",      label:"Notarized Affidavit",             icon:"✍️", required:false, desc:"A legally notarized letter from your contact confirming their authority." },
  { id:"attorney",       label:"Attorney Certification",          icon:"⚖️", required:false, desc:"Written confirmation from the estate attorney on file." },
  { id:"obit",           label:"Published Obituary",              icon:"📰", required:false, desc:"A published obituary from a recognized news outlet." },
  { id:"hospital_rec",   label:"Hospital / Hospice Record",       icon:"🏥", required:false, desc:"Official record from a licensed medical facility confirming the passing." },
];

const verStyle = {
  verified: { color:"#48BB78", bg:"rgba(72,187,120,0.12)",  label:"VERIFIED",  icon:<CheckCircle size={11}/> },
  pending:  { color:"#F6AD55", bg:"rgba(246,173,85,0.12)",  label:"PENDING",   icon:<Clock size={11}/> },
  not_sent: { color:"#8A9AB8", bg:"rgba(90,106,136,0.14)", label:"NOT SENT",  icon:<X size={11}/> },
};

/* ── Folder catalog ──────────────────────────────────────────────── */
const FOLDER_CATALOG = [
  { id:"legal",     label:"Legal Documents",        emoji:"⚖️",  color:"#3A5BD9" },
  { id:"financial", label:"Financial Records",       emoji:"💰",  color:"#48BB78" },
  { id:"medical",   label:"Medical Records",         emoji:"🏥",  color:"#FC8181" },
  { id:"taxes",     label:"Tax Records",             emoji:"📋",  color:"#F6AD55" },
  { id:"property",  label:"Property & Real Estate",  emoji:"🏠",  color:"#ED8936" },
  { id:"vehicles",  label:"Vehicles",                emoji:"🚗",  color:"#4A90D9" },
  { id:"utilities", label:"Utilities & Services",    emoji:"⚡",  color:"#38B2AC" },
  { id:"insurance", label:"Insurance Policies",      emoji:"🛡️",  color:"#6E8BFF" },
  { id:"pets",      label:"Pet Records",             emoji:"🐾",  color:"#F6AD55" },
  { id:"personal",  label:"Personal Letters",        emoji:"💌",  color:"#E53E3E" },
  { id:"photos",    label:"Photo Albums",            emoji:"📷",  color:"#F6AD55" },
  { id:"videos",    label:"Videos & Recordings",     emoji:"🎬",  color:"#6E8BFF" },
  { id:"digital",   label:"Digital Assets",          emoji:"💻",  color:"#3A5BD9" },
  { id:"business",  label:"Business Records",        emoji:"📊",  color:"#48BB78" },
  { id:"crypto",    label:"Crypto & NFTs",           emoji:"₿",   color:"#F6AD55" },
  { id:"education", label:"Education & Awards",      emoji:"🎓",  color:"#4A90D9" },
  { id:"military",  label:"Military Records",        emoji:"🎖️",  color:"#ED8936" },
  { id:"other",     label:"Other Documents",         emoji:"📁",  color:"#8A9AB8" },
];

/* ── Folder selector ─────────────────────────────────────────────── */
function FolderSelector({ selected, onChange }: { selected:string[]; onChange:(ids:string[])=>void }) {
  const toggle = (id:string) => onChange(selected.includes(id) ? selected.filter(x=>x!==id) : [...selected,id]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
        <Eye size={12} color="#48BB78"/>
        <span style={{ color:"#48BB78", fontSize:11, fontWeight:700 }}>VIEW ONLY — Guardian contacts cannot download files</span>
      </div>
      <div className="flex items-center justify-between">
        <span style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>ASSIGN FOLDERS ({selected.length}/{FOLDER_CATALOG.length})</span>
        <div className="flex gap-2">
          <button onClick={()=>onChange(FOLDER_CATALOG.map(f=>f.id))} style={{ color:"#3A5BD9", fontSize:10, ...MONO, fontWeight:700 }}>All</button>
          <button onClick={()=>onChange([])} style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>Clear</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5" style={{ maxHeight:200, overflowY:"auto" }}>
        {FOLDER_CATALOG.map(f=>{
          const active = selected.includes(f.id);
          return (
            <button key={f.id} onClick={()=>toggle(f.id)}
              className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-left transition-all"
              style={{ background:active?`${f.color}15`:"rgba(58,91,217,0.03)", border:`1px solid ${active?f.color+"50":"rgba(58,91,217,0.1)"}`, color:active?f.color:"#8A9AB8" }}>
              <span style={{ fontSize:12 }}>{f.emoji}</span>
              <span style={{ fontSize:9, fontWeight:active?700:400, lineHeight:1.3 }}>{f.label}</span>
              {active && <CheckCircle size={9} color={f.color} style={{ marginLeft:"auto" }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Add Contact Modal ───────────────────────────────────────────── */
function AddContactModal({ defaultType, onClose, onAdd }: {
  defaultType: ContactType; onClose:()=>void; onAdd:(c:Omit<Contact,"id">)=>Promise<void>;
}) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", relationship:"", type:defaultType, accessLevel:"", notes:"" });
  const [guardianFolders, setGuardianFolders] = useState<string[]>([]);
  const [showFolders, setShowFolders] = useState(false);
  const [selectedVerifications, setSelectedVerifications] = useState<string[]>(["death_cert"]);
  const [securityWord, setSecurityWord] = useState("");
  const [securityQ, setSecurityQ] = useState("");
  const [securityA, setSecurityA] = useState("");
  const [loading, setLoading] = useState(false);

  const isGuardian = form.type === "guardian";
  const isLegacy   = form.type === "legacy";

  function toggleVerification(id:string) {
    if (id === "death_cert") return; // always required
    setSelectedVerifications(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  }

  const submit = async () => {
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    if (isGuardian && guardianFolders.length === 0) { toast.error("Assign at least one folder for guardian access"); return; }
    setLoading(true);
    const accessDesc = isGuardian
      ? `View Only — ${guardianFolders.length} folder${guardianFolders.length===1?"":"s"} assigned`
      : form.accessLevel;
    await onAdd({ ...form, accessLevel:accessDesc, verificationStatus:"pending", avatar:form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-7 overflow-y-auto" style={{ ...GLASS, maxHeight:"90vh" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>
              Add {typeConfig[form.type].label}
            </h3>
            <p style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>{typeConfig[form.type].desc}</p>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        <div className="space-y-4">
          {/* Basic fields */}
          {[
            { key:"name",         label:"FULL LEGAL NAME",  ph:"As on government ID" },
            { key:"email",        label:"EMAIL ADDRESS",    ph:"contact@email.com" },
            { key:"phone",        label:"PHONE NUMBER",     ph:"+1 (555) 000-0000" },
            { key:"relationship", label:"RELATIONSHIP",     ph:"e.g. Spouse, Attorney, Daughter" },
          ].map(f=>(
            <div key={f.key}>
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>
          ))}

          {/* Guardian folder picker */}
          {isGuardian && (
            <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(72,187,120,0.25)" }}>
              <button onClick={()=>setShowFolders(!showFolders)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background:"rgba(72,187,120,0.06)", color:"#48BB78" }}>
                <div className="flex items-center gap-2">
                  <FolderOpen size={14}/>
                  <span style={{ fontSize:12, fontWeight:700, ...MONO }}>
                    FOLDER ACCESS {guardianFolders.length > 0 ? `· ${guardianFolders.length} assigned` : "— required"}
                  </span>
                </div>
                {showFolders ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
              {showFolders && <div className="p-4"><FolderSelector selected={guardianFolders} onChange={setGuardianFolders}/></div>}
            </div>
          )}

          {/* Legacy — verification requirements */}
          {isLegacy && (
            <div>
              <div style={{ color:"#8A9AB8", fontSize:11, ...MONO, marginBottom:6 }}>
                VERIFICATION REQUIREMENTS (choose what your legacy contact must provide)
              </div>
              <div className="space-y-2">
                {VERIFICATION_METHODS.map(vm => {
                  const selected = selectedVerifications.includes(vm.id);
                  return (
                    <button key={vm.id} onClick={()=>toggleVerification(vm.id)} disabled={vm.required}
                      className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all"
                      style={{ background:selected?"rgba(58,91,217,0.06)":"rgba(58,91,217,0.02)", border:`1px solid ${selected?"rgba(58,91,217,0.25)":"rgba(58,91,217,0.08)"}`, cursor:vm.required?"not-allowed":"pointer" }}>
                      <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ width:32, height:32, background:selected?"rgba(58,91,217,0.1)":"rgba(58,91,217,0.04)", fontSize:16 }}>
                        {vm.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ color:"#FFFFFF", fontSize:12, fontWeight:600 }}>{vm.label}</span>
                          {vm.required && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background:"rgba(58,91,217,0.1)", color:"#3A5BD9", ...MONO }}>REQUIRED</span>}
                        </div>
                        <div style={{ color:"#8A9AB8", fontSize:11, marginTop:1, lineHeight:1.4 }}>{vm.desc}</div>
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {selected ? <CheckCircle size={15} color="#3A5BD9"/> : <div style={{ width:15, height:15, borderRadius:"50%", border:"1.5px solid #C0CDE0" }}/>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Security word / Q&A fields */}
              {selectedVerifications.includes("security_word") && (
                <div className="mt-3 p-4 rounded-xl glow-surface" style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.12)" }}>
                  <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>YOUR SHARED SECRET WORD</label>
                  <input value={securityWord} onChange={e=>setSecurityWord(e.target.value)}
                    placeholder="A word only you and your contact know — e.g. a childhood memory"
                    className="w-full px-3 py-2.5 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                  <p style={{ color:"#8A9AB8", fontSize:10, marginTop:4 }}>Keep this private. Your contact must provide this word exactly to gain access.</p>
                </div>
              )}
              {selectedVerifications.includes("security_qa") && (
                <div className="mt-3 p-4 rounded-xl space-y-3 glow-surface" style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.12)" }}>
                  <div>
                    <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>YOUR SECURITY QUESTION</label>
                    <input value={securityQ} onChange={e=>setSecurityQ(e.target.value)}
                      placeholder="e.g. What is the name of the street I grew up on?"
                      className="w-full px-3 py-2.5 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                  </div>
                  <div>
                    <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>ANSWER</label>
                    <input value={securityA} onChange={e=>setSecurityA(e.target.value)} placeholder="The exact answer your contact must provide"
                      className="w-full px-3 py-2.5 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>NOTES (optional)</label>
            <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional instructions or context"
              className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", boxShadow:"0 0 20px rgba(58,91,217,0.3)", opacity:loading?0.7:1 }}>
              {loading ? "Sending Invite…" : "Send Verification Invite"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm" style={{ background:"rgba(58,91,217,0.06)", color:"#8A9AB8" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper with its own header + Add button ────────────── */
function ContactSection({
  type, contacts, onAdd, onRemove,
  getVerifStatus, advanceStatus, simulateVerify, verifying, onScanId,
}: {
  type: ContactType;
  contacts: Contact[];
  onAdd: () => void;
  onRemove: (id:string) => void;
  getVerifStatus?: (id:string) => VerifStatus;
  advanceStatus?: (id:string) => void;
  simulateVerify?: (id:string) => void;
  verifying?: string | null;
  onScanId?: (id:string, name:string) => void;
}) {
  const cfg = typeConfig[type];
  const isLegacy  = type === "legacy";
  const isGuardian = type === "guardian";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border:`2px solid ${cfg.color}25` }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ background:`${cfg.color}08`, borderBottom:`1px solid ${cfg.color}20` }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl"
            style={{ width:38, height:38, background:`${cfg.color}18`, color:cfg.color }}>
            {type === "legacy" ? <Shield size={18}/> : type === "guardian" ? <Users size={18}/> : type === "emergency" ? <AlertCircle size={18}/> : <PawPrint size={18}/>}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#FFFFFF" }}>{cfg.label}s</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:`${cfg.color}15`, color:cfg.color, ...MONO }}>{contacts.length}</span>
            </div>
            <div style={{ color:"#8A9AB8", fontSize:11, marginTop:1 }}>{cfg.desc}</div>
          </div>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
          <Plus size={12}/> Add {cfg.label}
        </button>
      </div>

      {/* Guardian view-only reminder */}
      {isGuardian && contacts.length > 0 && (
        <div className="px-5 py-2.5 border-b flex items-center gap-2"
          style={{ background:"rgba(72,187,120,0.04)", borderColor:"rgba(72,187,120,0.15)" }}>
          <Eye size={12} color="#48BB78"/>
          <span style={{ color:"#48BB78", fontSize:11 }}>Guardian contacts can <strong>view</strong> their assigned folders but <strong style={{ color:"#E53E3E" }}>cannot download</strong> any files.</span>
        </div>
      )}

      {/* Contact list */}
      <div className="divide-y" style={{ borderColor:`${cfg.color}12` }}>
        {contacts.length === 0 && (
          <div className="py-8 text-center">
            <div style={{ color:"#B8C8E0", fontSize:13 }}>No {cfg.label.toLowerCase()}s added yet.</div>
            <button onClick={onAdd} className="mt-2 text-xs underline" style={{ color:cfg.color }}>Add one now</button>
          </div>
        )}

        {contacts.map((c, i) => {
          const vs = verStyle[c.verificationStatus];
          return (
            <div key={c.id} className="p-5">
              <div className="flex items-start gap-3">
                {/* Priority number for Legacy */}
                {isLegacy && (
                  <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0 relative"
                    style={{ width:42, height:42, background:i===0?"rgba(58,91,217,0.15)":"rgba(58,91,217,0.06)", color:i===0?"#3A5BD9":"#8A9AB8", fontSize:14, fontFamily:"var(--font-display)", border:i===0?"2px solid rgba(58,91,217,0.3)":"1px solid rgba(58,91,217,0.1)" }}>
                    {i===0 ? <Crown size={18} color="#3A5BD9"/> : `#${i+1}`}
                  </div>
                )}

                {/* Avatar for non-legacy */}
                {!isLegacy && (
                  <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                    style={{ width:42, height:42, background:cfg.bg, color:cfg.color, fontSize:14, fontFamily:"var(--font-display)" }}>
                    {c.avatar}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{ color:"#FFFFFF", fontSize:14, fontWeight:600 }}>{c.name}</span>
                    {isLegacy && i === 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background:"rgba(58,91,217,0.1)", color:"#3A5BD9", ...MONO }}>
                        <Crown size={9}/> PRIMARY
                      </span>
                    )}
                    {isLegacy && i > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background:"rgba(90,106,136,0.14)", color:"#8A9AB8", ...MONO }}>
                        CONTINGENT #{i+1}
                      </span>
                    )}
                    <span style={{ color:"#8A9AB8", fontSize:12 }}>{c.relationship}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {c.phone && <span className="flex items-center gap-1 text-xs" style={{ color:"#8A9AB8" }}><Phone size={10}/>{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 text-xs" style={{ color:"#8A9AB8" }}><Mail size={10}/>{c.email}</span>}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ background:vs.bg, color:vs.color }}>
                      {vs.icon}<span style={{ ...MONO, marginLeft:3 }}>{vs.label}</span>
                    </div>
                  </div>

                  {/* Guardian folder badge */}
                  {isGuardian && c.accessLevel && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <FolderOpen size={10} color="#48BB78"/>
                      <span style={{ color:"#8A9AB8", fontSize:10 }}>{c.accessLevel}</span>
                    </div>
                  )}

                  {/* Legacy priority note */}
                  {isLegacy && (
                    <div className="mt-1.5 text-xs" style={{ color:"#8A9AB8" }}>
                      {i === 0
                        ? "Has primary authority — notified first and assumes full control of the vault."
                        : `Backup #${i+1} — assumes control only if all contacts ranked above are unable to act.`}
                    </div>
                  )}

                  {/* ID Verification status — inline on legacy contacts */}
                  {isLegacy && getVerifStatus && (() => {
                    const vs = getVerifStatus(c.id);
                    const vc = verifConfig[vs];
                    return (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background:vc.bg, color:vc.color }}>
                            {vc.icon}<span style={{ fontFamily:"var(--font-mono)", marginLeft:3 }}>{vc.label}</span>
                          </div>
                          <span style={{ color:"#8A9AB8", fontSize:11 }}>
                            {vs==="not_sent" && "ID verification invite not yet sent"}
                            {vs==="pending" && "Invite sent — awaiting ID submission"}
                            {vs==="id_submitted" && "ID submitted — pending compliance review (1–2 days)"}
                            {vs==="verified" && "Government ID verified by compliance team ✓"}
                            {vs==="rejected" && "ID rejected — please resubmit"}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {vs === "not_sent" && (
                            <button onClick={()=>advanceStatus(c.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                              style={{ background:"rgba(58,91,217,0.08)", color:"#3A5BD9", border:"1px solid rgba(58,91,217,0.2)" }}>
                              <Mail size={10}/> Send Verification Invite
                            </button>
                          )}
                          {vs === "pending" && (
                            <>
                              <button onClick={()=>advanceStatus(c.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                                style={{ background:"rgba(74,144,217,0.08)", color:"#4A90D9", border:"1px solid rgba(74,144,217,0.2)" }}>
                                <Upload size={10}/> Simulate ID Submission
                              </button>
                              <button onClick={()=>toast.success(`Invite resent to ${c.email}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                                style={{ background:"rgba(58,91,217,0.05)", color:"#8A9AB8" }}>
                                Resend Invite
                              </button>
                            </>
                          )}
                          {vs === "id_submitted" && (
                            <button onClick={()=>simulateVerify(c.id)} disabled={verifying===c.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                              style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}>
                              {verifying===c.id
                                ? <><RefreshCw size={10} style={{ animation:"spin 1s linear infinite" }}/> Verifying…</>
                                : <><CheckCircle size={10}/> Simulate Verify</>}
                            </button>
                          )}
                          {vs === "verified" && (
                            <div className="flex items-center gap-1.5 text-xs" style={{ color:"#48BB78" }}>
                              <UserCheck size={11}/> Vault access activates upon verified passing
                            </div>
                          )}
                          {/* Scan ID option */}
                          {(vs === "not_sent" || vs === "pending") && (
                            <ScanButton folder="legal" onUpload={() => onScanId?.(c.id, c.name)} size="sm" label="Scan ID"/>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>{ if(window.confirm(`Remove ${c.name}?`)) onRemove(c.id); }}
                    className="p-1.5 rounded-lg" style={{ color:"#FC8181" }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export function ContactsHub({ initialSection = "legacy" }: { initialSection?: ContactType }) {
  const { contacts, addContact, removeContact, updateContactStatus } = useDemo();
  const [addingType, setAddingType] = useState<ContactType | null>(null);

  // Extended verification status map — keyed by contact id
  const [verifStatus, setVerifStatus] = useState<Record<string, VerifStatus>>(() => {
    const map: Record<string, VerifStatus> = {};
    contacts.forEach(c => {
      if (c.type === "legacy") map[c.id] = toVerifStatus(c.verificationStatus);
    });
    return map;
  });
  const [verifying, setVerifying] = useState<string | null>(null);

  function getVerifStatus(id: string): VerifStatus {
    return verifStatus[id] ?? "not_sent";
  }

  async function simulateVerify(id: string) {
    setVerifying(id);
    const tid = toast.loading("Simulating compliance team review…");
    await new Promise(r => setTimeout(r, 1800));
    setVerifStatus(p => ({ ...p, [id]: "verified" }));
    updateContactStatus(id, "verified");
    setVerifying(null);
    toast.success("✅ Identity verified — vault access granted on trigger condition", { id: tid });
  }

  function advanceStatus(id: string) {
    const current = getVerifStatus(id);
    if (current === "not_sent") {
      setVerifStatus(p => ({ ...p, [id]: "pending" }));
      toast.success("Verification invite sent");
    } else if (current === "pending") {
      setVerifStatus(p => ({ ...p, [id]: "id_submitted" }));
      toast.success("ID submission simulated");
    }
  }

  // Only show contacts for the active section — never mix types
  const activeType: ContactType = initialSection;
  const visibleContacts = contacts.filter(c => c.type === activeType);
  const legacyContacts = contacts.filter(c => c.type === "legacy");

  return (
    <div className="p-6 space-y-6 relative" style={{ maxWidth:1240, margin:"0 auto", ...GRID }}>
      {/* Page header */}
      {(() => {
        const cfg = typeConfig[activeType];
        const access: Record<ContactType, { label:string; color:string }> = {
          legacy:        { label:"Full vault download — after verified passing", color:"#3A5BD9" },
          guardian:      { label:"View-only assigned folders — never downloads", color:"#48BB78" },
          emergency:     { label:"Informational only — no vault access", color:"#F6AD55" },
          pet_emergency: { label:"Informational only — pet care details", color:"#6E8BFF" },
        };
        const Icon = activeType === "legacy" ? Shield : activeType === "guardian" ? Users : activeType === "emergency" ? AlertCircle : PawPrint;
        return (
          <div className="flex items-start justify-between gap-4 fpd-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width:52, height:52, background:`${cfg.color}18`, color:cfg.color, boxShadow:`0 8px 24px -10px ${cfg.color}` }}>
                <Icon size={24}/>
              </div>
              <div>
                <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:4, letterSpacing:"-0.01em" }}>
                  {cfg.label}s
                </h1>
                <p style={{ color:"#8A9AB8", fontSize:13, maxWidth:"52ch", lineHeight:1.6 }}>{cfg.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-shrink-0" style={{ background:`${access[activeType].color}12`, border:`1px solid ${access[activeType].color}30` }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:access[activeType].color, boxShadow:`0 0 6px ${access[activeType].color}` }}/>
              <span style={{ color:access[activeType].color, fontSize:11, fontWeight:600 }}>{access[activeType].label}</span>
            </div>
          </div>
        );
      })()}

      {/* Chain of authority — Legacy only, multiple contacts */}
      {activeType === "legacy" && legacyContacts.length > 1 && (
        <div className="p-5 rounded-2xl glow-surface" style={{ background:"rgba(58,91,217,0.04)", border:"2px solid rgba(58,91,217,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Crown size={16} color="#3A5BD9"/>
            <span style={{ fontFamily:"var(--font-display)", fontSize:14, color:"#FFFFFF" }}>Chain of Authority</span>
          </div>
          <div className="space-y-2">
            {legacyContacts.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width:28, height:28, background:i===0?"#3A5BD9":"rgba(58,91,217,0.1)", color:i===0?"#fff":"#8A9AB8", fontSize:11, fontWeight:700 }}>
                  {i===0 ? <Crown size={12}/> : `${i+1}`}
                </div>
                <div className="flex-1 text-sm" style={{ color:"#FFFFFF" }}>
                  <strong>{c.name}</strong>
                  <span style={{ color:"#8A9AB8", marginLeft:8 }}>
                    {i===0 ? "Primary — notified first, assumes full vault authority" : `Contingent #${i+1} — activates only if contacts above cannot act`}
                  </span>
                </div>
                {i < legacyContacts.length-1 && <ArrowDown size={14} color="#B8C8E0"/>}
              </div>
            ))}
          </div>
          <div className="mt-3 px-3 py-2 rounded-xl text-xs flex items-start gap-2"
            style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
            <AlertTriangle size={11} color="#F6AD55" style={{ marginTop:1, flexShrink:0 }}/>
            <span style={{ color:"#8A9AB8", lineHeight:1.5 }}>
              Authority passes automatically down the list if a contact above is deceased, incapacitated, or formally declines.
            </span>
          </div>
        </div>
      )}

      {/* Single legacy contact — suggest adding a backup */}
      {activeType === "legacy" && legacyContacts.length === 1 && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
          style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.15)" }}>
          <Info size={16} color="#3A5BD9" style={{ marginTop:1, flexShrink:0 }}/>
          <div style={{ color:"#8A9AB8", fontSize:12, lineHeight:1.7 }}>
            You have one Legacy Contact. Consider adding a <strong style={{ color:"#FFFFFF" }}>contingent backup</strong> — if your primary contact is also deceased or unable to act, there would be no one to claim your vault.
          </div>
        </div>
      )}

      {/* Only this contact type — nothing else */}
      <ContactSection
        type={activeType}
        contacts={visibleContacts}
        onAdd={() => setAddingType(activeType)}
        onRemove={id => removeContact(id)}
        getVerifStatus={getVerifStatus}
        advanceStatus={advanceStatus}
        simulateVerify={simulateVerify}
        verifying={verifying}
        onScanId={(id, name) => { setVerifStatus(p => ({ ...p, [id]: "id_submitted" })); toast.success(`ID scanned for ${name}`); }}
      />

      {/* Add modal — locked to the active type */}
      {addingType && (
        <AddContactModal
          defaultType={addingType}
          onClose={() => setAddingType(null)}
          onAdd={async c => { await addContact(c); setAddingType(null); toast.success(`${typeConfig[c.type].label} added`); }}
        />
      )}
    </div>
  );
}
