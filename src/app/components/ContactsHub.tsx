import React, { useState } from "react";
import {
  Users, Shield, AlertCircle, PawPrint, Plus, Phone, Mail,
  CheckCircle, Clock, X, Trash2, FolderOpen, Eye,
  ChevronDown, ChevronUp, Info, Crown, ArrowDown,
  AlertTriangle, Upload, RefreshCw, UserCheck
} from "lucide-react";
import { useDemo, type Contact } from "../context/DemoContext";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

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

// Extended verification status — richer than DemoContext's 3-state
type VerifStatus = "not_sent" | "pending" | "id_submitted" | "verified" | "rejected";

const verifConfig: Record<VerifStatus, { label:string; color:string; icon:React.ReactNode }> = {
  not_sent:     { label:"NOT SENT",     color:MUTED, icon:<X size={11}/> },
  pending:      { label:"INVITE SENT",  color:WARN,  icon:<Clock size={11}/> },
  id_submitted: { label:"ID SUBMITTED", color:ACCENT2, icon:<Upload size={11}/> },
  verified:     { label:"VERIFIED",     color:POS,   icon:<CheckCircle size={11}/> },
  rejected:     { label:"REJECTED",     color:NEG,   icon:<AlertTriangle size={11}/> },
};

// Map DemoContext status → VerifStatus
function toVerifStatus(s: string): VerifStatus {
  if (s === "verified") return "verified";
  if (s === "pending")  return "pending";
  return "not_sent";
}

type ContactType = "legacy"|"guardian"|"emergency"|"pet_emergency";

const typeConfig = {
  legacy:       { label:"Legacy Contact",        color:ACCENT2, icon:<Shield size={13}/>,       desc:"Receives full vault access upon verified passing." },
  guardian:     { label:"Guardian Contact",      color:POS,     icon:<Users size={13}/>,        desc:"View-only access to assigned folders right now — no death required." },
  emergency:    { label:"Emergency Contact",     color:WARN,    icon:<AlertCircle size={13}/>,  desc:"Notified by first responders in an emergency." },
  pet_emergency:{ label:"Pet Emergency Contact", color:ACCENT,  icon:<PawPrint size={13}/>,     desc:"Cares for your pets in an emergency or upon passing." },
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
  verified: { color:POS,  label:"VERIFIED", icon:<CheckCircle size={11}/> },
  pending:  { color:WARN, label:"PENDING",  icon:<Clock size={11}/> },
  not_sent: { color:MUTED,label:"NOT SENT", icon:<X size={11}/> },
};

/* ── Folder catalog ──────────────────────────────────────────────── */
const FOLDER_CATALOG = [
  { id:"legal",     label:"Legal Documents",        emoji:"⚖️",  color:"#5B6EE1" },
  { id:"financial", label:"Financial Records",       emoji:"💰",  color:"#48BB78" },
  { id:"medical",   label:"Medical Records",         emoji:"🏥",  color:"#FC8181" },
  { id:"taxes",     label:"Tax Records",             emoji:"📋",  color:"#F6AD55" },
  { id:"property",  label:"Property & Real Estate",  emoji:"🏠",  color:"#ED8936" },
  { id:"vehicles",  label:"Vehicles",                emoji:"🚗",  color:"#5BA7D6" },
  { id:"utilities", label:"Utilities & Services",    emoji:"⚡",  color:"#6F9E94" },
  { id:"insurance", label:"Insurance Policies",      emoji:"🛡️",  color:"#5B6EE1" },
  { id:"pets",      label:"Pet Records",             emoji:"🐾",  color:"#F6AD55" },
  { id:"personal",  label:"Personal Letters",        emoji:"💌",  color:"#E53E3E" },
  { id:"photos",    label:"Photo Albums",            emoji:"📷",  color:"#F6AD55" },
  { id:"videos",    label:"Videos & Recordings",     emoji:"🎬",  color:"#5B6EE1" },
  { id:"digital",   label:"Digital Assets",          emoji:"💻",  color:"#5B6EE1" },
  { id:"business",  label:"Business Records",        emoji:"📊",  color:"#48BB78" },
  { id:"crypto",    label:"Crypto & NFTs",           emoji:"₿",   color:"#F6AD55" },
  { id:"education", label:"Education & Awards",      emoji:"🎓",  color:"#5BA7D6" },
  { id:"military",  label:"Military Records",        emoji:"🎖️",  color:"#ED8936" },
  { id:"other",     label:"Other Documents",         emoji:"📁",  color:MUTED },
];

/* ── Folder selector ─────────────────────────────────────────────── */
function FolderSelector({ selected, onChange }: { selected:string[]; onChange:(ids:string[])=>void }) {
  const toggle = (id:string) => onChange(selected.includes(id) ? selected.filter(x=>x!==id) : [...selected,id]);
  return (
    <div className="space-y-3">
      <div className="view-only-note">
        <Eye size={12} color={POS}/>
        <span>VIEW ONLY — Guardian contacts cannot download files</span>
      </div>
      <div className="flex items-center justify-between">
        <span style={{ color: MUTED, fontSize: 11, fontFamily: "var(--font-mono)" }}>ASSIGN FOLDERS ({selected.length}/{FOLDER_CATALOG.length})</span>
        <div className="flex gap-2">
          <button onClick={()=>onChange(FOLDER_CATALOG.map(f=>f.id))} style={{ color: ACCENT2, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>All</button>
          <button onClick={()=>onChange([])} style={{ color: MUTED, fontSize: 10, fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
        </div>
      </div>
      <div className="folder-grid">
        {FOLDER_CATALOG.map(f=>{
          const active = selected.includes(f.id);
          return (
            <button key={f.id} onClick={()=>toggle(f.id)} className="folder-chip"
              style={{ background:active?`${f.color}1E`:"rgba(255,255,255,0.03)", border:`1px solid ${active?f.color+"55":"rgba(255,255,255,0.08)"}`, color:active?f.color:MUTED }}>
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
    <div className="backdrop">
      <div className="card modal glow-surface">
        <div className="modal-head">
          <div>
            <h3>Add {typeConfig[form.type].label}</h3>
            <p className="modal-sub">{typeConfig[form.type].desc}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body">
          {[
            { key:"name",         label:"FULL LEGAL NAME",  ph:"As on government ID" },
            { key:"email",        label:"EMAIL ADDRESS",    ph:"contact@email.com" },
            { key:"phone",        label:"PHONE NUMBER",     ph:"+1 (555) 000-0000" },
            { key:"relationship", label:"RELATIONSHIP",     ph:"e.g. Spouse, Attorney, Daughter" },
          ].map(f=>(
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}/>
            </div>
          ))}

          {isGuardian && (
            <div className="folder-picker">
              <button onClick={()=>setShowFolders(!showFolders)} className="folder-picker-hd">
                <div className="flex items-center gap-2">
                  <FolderOpen size={14}/>
                  <span style={{ fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)" }}>
                    FOLDER ACCESS {guardianFolders.length > 0 ? `· ${guardianFolders.length} assigned` : "— required"}
                  </span>
                </div>
                {showFolders ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
              {showFolders && <div style={{ padding: 16 }}><FolderSelector selected={guardianFolders} onChange={setGuardianFolders}/></div>}
            </div>
          )}

          {isLegacy && (
            <div>
              <div style={{ color:MUTED, fontSize:11, fontFamily:"var(--font-mono)", marginBottom:8 }}>
                VERIFICATION REQUIREMENTS (choose what your legacy contact must provide)
              </div>
              <div className="space-y-2">
                {VERIFICATION_METHODS.map(vm => {
                  const selected = selectedVerifications.includes(vm.id);
                  return (
                    <button key={vm.id} onClick={()=>toggleVerification(vm.id)} disabled={vm.required} className="verif-row"
                      style={{ background:selected?"rgba(91,110,225,0.07)":"rgba(255,255,255,0.02)", borderColor:selected?"rgba(91,110,225,0.3)":"rgba(255,255,255,0.07)", cursor:vm.required?"not-allowed":"pointer" }}>
                      <div className="verif-ico" style={{ background:selected?"rgba(91,110,225,0.12)":"rgba(255,255,255,0.04)" }}>{vm.icon}</div>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color:TEXT, fontSize:12, fontWeight:600 }}>{vm.label}</span>
                          {vm.required && <span className="req-tag">REQUIRED</span>}
                        </div>
                        <div style={{ color:MUTED, fontSize:11, marginTop:1, lineHeight:1.4 }}>{vm.desc}</div>
                      </div>
                      <div className="flex-shrink-0" style={{ marginTop: 2 }}>
                        {selected ? <CheckCircle size={15} color={ACCENT2}/> : <div style={{ width:15, height:15, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,0.25)" }}/>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedVerifications.includes("security_word") && (
                <div className="sub-panel">
                  <label>YOUR SHARED SECRET WORD</label>
                  <input value={securityWord} onChange={e=>setSecurityWord(e.target.value)} placeholder="A word only you and your contact know — e.g. a childhood memory"/>
                  <p className="sub-hint">Keep this private. Your contact must provide this word exactly to gain access.</p>
                </div>
              )}
              {selectedVerifications.includes("security_qa") && (
                <div className="sub-panel space-y-3">
                  <div>
                    <label>YOUR SECURITY QUESTION</label>
                    <input value={securityQ} onChange={e=>setSecurityQ(e.target.value)} placeholder="e.g. What is the name of the street I grew up on?"/>
                  </div>
                  <div>
                    <label>ANSWER</label>
                    <input value={securityA} onChange={e=>setSecurityA(e.target.value)} placeholder="The exact answer your contact must provide"/>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="field">
            <label>NOTES (optional)</label>
            <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional instructions or context"/>
          </div>
        </div>
        <div className="modal-foot">
          <button onClick={submit} disabled={loading} className="save" style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sending Invite…" : "Send Verification Invite"}
          </button>
          <button onClick={onClose} className="btn-sec">Cancel</button>
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
    <div className="card glow-surface" style={{ overflow: "hidden", borderColor: `${cfg.color}30` }}>
      <div className="section-hd" style={{ background:`${cfg.color}0C` }}>
        <div className="flex items-center gap-3">
          <div className="section-ico" style={{ background:`${cfg.color}20`, color:cfg.color }}>
            {type === "legacy" ? <Shield size={18}/> : type === "guardian" ? <Users size={18}/> : type === "emergency" ? <AlertCircle size={18}/> : <PawPrint size={18}/>}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="section-title">{cfg.label}s</span>
              <span className="section-count" style={{ background:`${cfg.color}1E`, color:cfg.color }}>{contacts.length}</span>
            </div>
            <div className="section-desc">{cfg.desc}</div>
          </div>
        </div>
        <button onClick={onAdd} className="btn-ghost" style={{ color: cfg.color, background:`${cfg.color}1E`, borderColor:`${cfg.color}55` }}>
          <Plus size={12}/> Add {cfg.label}
        </button>
      </div>

      {isGuardian && contacts.length > 0 && (
        <div className="view-only-strip">
          <Eye size={12} color={POS}/>
          <span>Guardian contacts can <strong>view</strong> their assigned folders but <strong style={{ color: NEG }}>cannot download</strong> any files.</span>
        </div>
      )}

      <div>
        {contacts.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{ color: SOFT, fontSize: 13 }}>No {cfg.label.toLowerCase()}s added yet.</div>
            <button onClick={onAdd} className="add-one-link" style={{ color: cfg.color }}>Add one now</button>
          </div>
        )}

        {contacts.map((c, i) => {
          const vs = verStyle[c.verificationStatus];
          return (
            <div key={c.id} className="contact-row">
              <div className="flex items-start gap-3">
                {isLegacy && (
                  <div className="priority-badge" style={{ background:i===0?"rgba(91,110,225,0.18)":"rgba(91,110,225,0.08)", color:i===0?ACCENT2:MUTED, border:i===0?"2px solid rgba(91,110,225,0.35)":"1px solid rgba(91,110,225,0.14)" }}>
                    {i===0 ? <Crown size={18} color={ACCENT2}/> : `#${i+1}`}
                  </div>
                )}

                {!isLegacy && (
                  <div className="priority-badge" style={{ background:`${cfg.color}1E`, color:cfg.color }}>
                    {c.avatar}
                  </div>
                )}

                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                    <span style={{ color:TEXT, fontSize:14, fontWeight:600 }}>{c.name}</span>
                    {isLegacy && i === 0 && (
                      <span className="rank-badge" style={{ background:"rgba(91,110,225,0.14)", color:ACCENT2 }}>
                        <Crown size={9}/> PRIMARY
                      </span>
                    )}
                    {isLegacy && i > 0 && (
                      <span className="rank-badge" style={{ background:"rgba(140,151,180,0.14)", color:MUTED }}>
                        CONTINGENT #{i+1}
                      </span>
                    )}
                    <span style={{ color:MUTED, fontSize:12 }}>{c.relationship}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {c.phone && <span className="meta-item"><Phone size={10}/>{c.phone}</span>}
                    {c.email && <span className="meta-item"><Mail size={10}/>{c.email}</span>}
                    <div className="status-chip" style={{ background:`${vs.color}1E`, color:vs.color }}>
                      {vs.icon}<span style={{ fontFamily:"var(--font-mono)", marginLeft:3 }}>{vs.label}</span>
                    </div>
                  </div>

                  {isGuardian && c.accessLevel && (
                    <div className="flex items-center gap-1.5" style={{ marginTop: 6 }}>
                      <FolderOpen size={10} color={POS}/>
                      <span style={{ color:MUTED, fontSize:10 }}>{c.accessLevel}</span>
                    </div>
                  )}

                  {isLegacy && (
                    <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>
                      {i === 0
                        ? "Has primary authority — notified first and assumes full control of the vault."
                        : `Backup #${i+1} — assumes control only if all contacts ranked above are unable to act.`}
                    </div>
                  )}

                  {isLegacy && getVerifStatus && (() => {
                    const vs2 = getVerifStatus(c.id);
                    const vc = verifConfig[vs2];
                    return (
                      <div className="space-y-2" style={{ marginTop: 12 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="status-chip lg" style={{ background:`${vc.color}1E`, color:vc.color }}>
                            {vc.icon}<span style={{ fontFamily:"var(--font-mono)", marginLeft:3 }}>{vc.label}</span>
                          </div>
                          <span style={{ color:MUTED, fontSize:11 }}>
                            {vs2==="not_sent" && "ID verification invite not yet sent"}
                            {vs2==="pending" && "Invite sent — awaiting ID submission"}
                            {vs2==="id_submitted" && "ID submitted — pending compliance review (1–2 days)"}
                            {vs2==="verified" && "Government ID verified by compliance team ✓"}
                            {vs2==="rejected" && "ID rejected — please resubmit"}
                          </span>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {vs2 === "not_sent" && (
                            <button onClick={()=>advanceStatus?.(c.id)} className="btn-ghost" style={{ color: ACCENT2 }}>
                              <Mail size={10}/> Send Verification Invite
                            </button>
                          )}
                          {vs2 === "pending" && (
                            <>
                              <button onClick={()=>advanceStatus?.(c.id)} className="btn-ghost" style={{ color: ACCENT2 }}>
                                <Upload size={10}/> Simulate ID Submission
                              </button>
                              <button onClick={()=>toast.success(`Invite resent to ${c.email}`)} className="btn-sec">
                                Resend Invite
                              </button>
                            </>
                          )}
                          {vs2 === "id_submitted" && (
                            <button onClick={()=>simulateVerify?.(c.id)} disabled={verifying===c.id} className="btn-ghost" style={{ color: POS, background: "rgba(95,190,145,0.10)", borderColor: "rgba(95,190,145,0.3)" }}>
                              {verifying===c.id
                                ? <><RefreshCw size={10} style={{ animation:"spin 1s linear infinite" }}/> Verifying…</>
                                : <><CheckCircle size={10}/> Simulate Verify</>}
                            </button>
                          )}
                          {vs2 === "verified" && (
                            <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: POS }}>
                              <UserCheck size={11}/> Vault access activates upon verified passing
                            </div>
                          )}
                          {(vs2 === "not_sent" || vs2 === "pending") && (
                            <ScanButton folder="legal" onUpload={() => onScanId?.(c.id, c.name)} size="sm" label="Scan ID"/>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>{ if(window.confirm(`Remove ${c.name}?`)) onRemove(c.id); }} style={{ color: NEG, background: "none", border: "none", cursor: "pointer", padding: 6 }}>
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

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-contacts so nothing else in the app is affected. */
const CONTACTS_CSS = `
.fpd-contacts{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-contacts *{box-sizing:border-box;}
.fpd-contacts-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-contacts .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-contacts .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-contacts .card.pad{padding:22px;}
.fpd-contacts .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-contacts .pg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-contacts .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin-bottom:4px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-contacts .pg-sub{color:${MUTED};font-size:13px;max-width:52ch;line-height:1.6;}
.fpd-contacts .head-ico{width:52px;height:52px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-contacts .access-pill{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:11px;flex-shrink:0;}
.fpd-contacts .access-dot{width:6px;height:6px;border-radius:50%;}

.fpd-contacts .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;background:none;}
.fpd-contacts .btn-sec{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:11.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* chain of authority */
.fpd-contacts .chain-box{padding:20px;border-radius:15px;background:rgba(91,110,225,0.05);border:2px solid rgba(91,110,225,0.22);}
.fpd-contacts .chain-hd{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.fpd-contacts .chain-hd span{font-family:var(--font-display);font-size:14px;color:${TEXT};}
.fpd-contacts .chain-row{display:flex;align-items:center;gap:12px;}
.fpd-contacts .chain-num{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}
.fpd-contacts .chain-note{margin-top:12px;padding:10px 12px;border-radius:11px;font-size:12px;display:flex;align-items:flex-start;gap:8px;background:rgba(217,165,94,0.07);border:1px solid rgba(217,165,94,0.22);color:${MUTED};line-height:1.5;}

/* solo-legacy info banner */
.fpd-contacts .info-banner{display:flex;align-items:flex-start;gap:10px;padding:16px 20px;border-radius:15px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);}
.fpd-contacts .info-banner p{color:${MUTED};font-size:12px;line-height:1.7;}

/* section */
.fpd-contacts .section-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-contacts .section-ico{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-contacts .section-title{font-family:var(--font-display);font-size:15px;color:${TEXT};}
.fpd-contacts .section-count{padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;font-family:var(--font-mono);}
.fpd-contacts .section-desc{color:${MUTED};font-size:11px;margin-top:2px;}
.fpd-contacts .view-only-strip{display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid rgba(95,190,145,0.16);background:rgba(95,190,145,0.05);color:${POS};font-size:11px;}
.fpd-contacts .view-only-note{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:11px;background:rgba(95,190,145,0.07);border:1px solid rgba(95,190,145,0.22);color:${POS};font-size:11px;font-weight:700;}
.fpd-contacts .add-one-link{margin-top:6px;font-size:11px;text-decoration:underline;background:none;border:none;cursor:pointer;font-family:var(--font-body);}

/* contact row */
.fpd-contacts .contact-row{padding:18px 20px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-contacts .contact-row:first-child{border-top:none;}
.fpd-contacts .priority-badge{width:42px;height:42px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;font-family:var(--font-display);}
.fpd-contacts .rank-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;font-family:var(--font-mono);}
.fpd-contacts .meta-item{display:flex;align-items:center;gap:4px;font-size:11px;color:${MUTED};}
.fpd-contacts .status-chip{display:flex;align-items:center;gap:0;padding:2px 6px;border-radius:6px;font-size:11px;}
.fpd-contacts .status-chip.lg{padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;}

/* modal */
.fpd-contacts .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.8);backdrop-filter:blur(8px);}
.fpd-contacts .modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
.fpd-contacts .modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-contacts .modal-head h3{font-family:var(--font-display);font-size:17px;color:${TEXT};font-weight:600;}
.fpd-contacts .modal-sub{color:${MUTED};font-size:12px;margin-top:3px;}
.fpd-contacts .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-contacts .modal-body{padding:22px 24px;display:flex;flex-direction:column;gap:14px;}
.fpd-contacts .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-contacts .field input,.fpd-contacts .field select{width:100%;padding:12px 14px;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-contacts .field input::placeholder{color:${FAINT};}
.fpd-contacts .field input:focus,.fpd-contacts .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-contacts .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 24px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-contacts .modal-foot .save{flex:1;padding:13px;border-radius:11px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);box-shadow:0 8px 20px -10px rgba(91,110,225,0.7);}

/* folder picker */
.fpd-contacts .folder-picker{border-radius:14px;overflow:hidden;border:1px solid rgba(95,190,145,0.28);}
.fpd-contacts .folder-picker-hd{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(95,190,145,0.06);color:${POS};border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-contacts .folder-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:200px;overflow-y:auto;}
.fpd-contacts .folder-chip{display:flex;align-items:center;gap:6px;padding:8px;border-radius:9px;text-align:left;cursor:pointer;font-family:var(--font-body);}

/* verification requirement rows */
.fpd-contacts .verif-row{width:100%;display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:11px;text-align:left;border:1px solid;font-family:var(--font-body);}
.fpd-contacts .verif-ico{width:32px;height:32px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;}
.fpd-contacts .req-tag{padding:2px 6px;border-radius:5px;font-size:10px;background:rgba(91,110,225,0.14);color:${ACCENT2};font-family:var(--font-mono);}
.fpd-contacts .sub-panel{margin-top:12px;padding:14px;border-radius:11px;background:rgba(91,110,225,0.04);border:1px solid rgba(91,110,225,0.14);}
.fpd-contacts .sub-panel label{display:block;margin-bottom:5px;font-family:var(--font-mono);font-size:10px;color:${MUTED};}
.fpd-contacts .sub-panel input{width:100%;padding:10px 12px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);}
.fpd-contacts .sub-hint{color:${MUTED};font-size:10px;margin-top:5px;}
`;

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

  const cfg = typeConfig[activeType];
  const access: Record<ContactType, { label:string; color:string }> = {
    legacy:        { label:"Full vault download — after verified passing", color:ACCENT2 },
    guardian:      { label:"View-only assigned folders — never downloads", color:POS },
    emergency:     { label:"Informational only — no vault access", color:WARN },
    pet_emergency: { label:"Informational only — pet care details", color:ACCENT },
  };
  const Icon = activeType === "legacy" ? Shield : activeType === "guardian" ? Users : activeType === "emergency" ? AlertCircle : PawPrint;

  return (
    <div className="fpd-contacts">
      <style dangerouslySetInnerHTML={{ __html: CONTACTS_CSS }} />
      <div className="fpd-contacts-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Page header ── */}
        <div className="pg-head">
          <div className="flex items-start gap-4">
            <div className="head-ico" style={{ background:`${cfg.color}20`, color:cfg.color, boxShadow:`0 8px 24px -10px ${cfg.color}` }}>
              <Icon size={24}/>
            </div>
            <div>
              <h1 className="pg-h1">{cfg.label}s</h1>
              <p className="pg-sub">{cfg.desc}</p>
            </div>
          </div>
          <div className="access-pill" style={{ background:`${access[activeType].color}1A`, border:`1px solid ${access[activeType].color}44` }}>
            <div className="access-dot" style={{ background:access[activeType].color, boxShadow:`0 0 6px ${access[activeType].color}` }}/>
            <span style={{ color:access[activeType].color, fontSize:11, fontWeight:600 }}>{access[activeType].label}</span>
          </div>
        </div>

        {/* ── Chain of authority ── */}
        {activeType === "legacy" && legacyContacts.length > 1 && (
          <div className="chain-box">
            <div className="chain-hd">
              <Crown size={16} color={ACCENT2}/>
              <span>Chain of Authority</span>
            </div>
            <div className="space-y-2">
              {legacyContacts.map((c, i) => (
                <div key={c.id} className="chain-row">
                  <div className="chain-num" style={{ background:i===0?ACCENT:"rgba(91,110,225,0.14)", color:i===0?"#fff":MUTED }}>
                    {i===0 ? <Crown size={12}/> : `${i+1}`}
                  </div>
                  <div className="flex-1" style={{ fontSize: 13, color: TEXT }}>
                    <strong>{c.name}</strong>
                    <span style={{ color:MUTED, marginLeft:8 }}>
                      {i===0 ? "Primary — notified first, assumes full vault authority" : `Contingent #${i+1} — activates only if contacts above cannot act`}
                    </span>
                  </div>
                  {i < legacyContacts.length-1 && <ArrowDown size={14} color={FAINT}/>}
                </div>
              ))}
            </div>
            <div className="chain-note">
              <AlertTriangle size={11} color={WARN} style={{ marginTop:1, flexShrink:0 }}/>
              <span>Authority passes automatically down the list if a contact above is deceased, incapacitated, or formally declines.</span>
            </div>
          </div>
        )}

        {activeType === "legacy" && legacyContacts.length === 1 && (
          <div className="info-banner">
            <Info size={16} color={ACCENT2} style={{ marginTop:1, flexShrink:0 }}/>
            <p>You have one Legacy Contact. Consider adding a <strong style={{ color: TEXT }}>contingent backup</strong> — if your primary contact is also deceased or unable to act, there would be no one to claim your vault.</p>
          </div>
        )}

        {/* ── Section (single contact type) ── */}
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

        {addingType && (
          <AddContactModal
            defaultType={addingType}
            onClose={() => setAddingType(null)}
            onAdd={async c => { await addContact(c); setAddingType(null); toast.success(`${typeConfig[c.type].label} added`); }}
          />
        )}
      </div>
    </div>
  );
}
