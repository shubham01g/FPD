import React, { useState, useRef } from "react";
import {
  Users, Shield, AlertCircle, PawPrint, Plus, Phone, Mail,
  CheckCircle, Clock, X, Trash2, FolderOpen, Eye,
  ChevronDown, ChevronUp, Info, Crown, ArrowDown,
  AlertTriangle, Upload, RefreshCw, UserCheck, Smartphone, FileUp, Edit2
} from "lucide-react";
import { useDemo, type Contact } from "../context/DemoContext";
import { toast } from "sonner";
import { ScanButton, type ScannedDocument } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { StoredImage } from "./StoredImage";
import heroLegacyPhoto from "../../imports/legacycontacts_hero_photo.webp";
import heroGuardianPhoto from "../../imports/guardiancontacts_hero_photo.webp";
import heroEmergencyPhoto from "../../imports/emergencycontacts_hero_photo.webp";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

// Extended verification status — derived from the contact's real DB verification_status
// plus the status of its latest id_verifications submission (see computeVerifStatus below).
type VerifStatus = "not_sent" | "pending" | "id_submitted" | "verified" | "rejected";

const verifConfig: Record<VerifStatus, { label:string; color:string; icon:React.ReactNode }> = {
  not_sent:     { label:"NOT SENT",     color:MUTED, icon:<X size={11}/> },
  pending:      { label:"INVITE SENT",  color:WARN,  icon:<Clock size={11}/> },
  id_submitted: { label:"ID SUBMITTED", color:"#6FAE8B", icon:<Upload size={11}/> },
  verified:     { label:"VERIFIED",     color:"#D99A6B",   icon:<CheckCircle size={11}/> },
  rejected:     { label:"REJECTED",     color:NEG,   icon:<AlertTriangle size={11}/> },
};

// A contact's verification_status only tracks not_sent/pending/verified/rejected — "id submitted,
// awaiting admin review" is derived by also checking whether its latest id_verifications row
// (loaded by DemoContext) is still pending.
function computeVerifStatus(c: Contact): VerifStatus {
  if (c.verificationStatus === "verified") return "verified";
  if (c.verificationStatus === "rejected") return "rejected";
  if (c.verificationStatus === "not_sent") return "not_sent";
  return c.idVerificationStatus === "pending" ? "id_submitted" : "pending";
}

type ContactType = "legacy"|"guardian"|"emergency"|"pet_emergency";

const typeConfig = {
  legacy:       { label:"Legacy Contact",        color:"#6FAE8B", icon:<Shield size={13}/>,       desc:"Receives full vault access upon verified passing." },
  guardian:     { label:"Guardian Contact",      color:"#D99A6B",     icon:<Users size={13}/>,        desc:"View-only access to assigned folders right now — no death required." },
  emergency:    { label:"Emergency Contact",     color:WARN,    icon:<AlertCircle size={13}/>,  desc:"Notified by first responders in an emergency." },
  pet_emergency:{ label:"Pet Emergency Contact", color:"#6E90C9",  icon:<PawPrint size={13}/>,     desc:"Cares for your pets in an emergency or upon passing." },
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
  verified: { color:"#D99A6B",  label:"VERIFIED", icon:<CheckCircle size={11}/> },
  pending:  { color:WARN, label:"PENDING",  icon:<Clock size={11}/> },
  not_sent: { color:MUTED,label:"NOT SENT", icon:<X size={11}/> },
  rejected: { color:NEG,  label:"REJECTED", icon:<AlertTriangle size={11}/> },
};

/* ── Folder catalog ──────────────────────────────────────────────── */
const FOLDER_CATALOG = [
  { id:"legal",     label:"Legal Documents",        emoji:"⚖️",  color:"#6E90C9" },
  { id:"financial", label:"Financial Records",       emoji:"💰",  color:"#D99A6B" },
  { id:"medical",   label:"Medical Records",         emoji:"🏥",  color:"#FC8181" },
  { id:"taxes",     label:"Tax Records",             emoji:"📋",  color:"#F6AD55" },
  { id:"property",  label:"Property & Real Estate",  emoji:"🏠",  color:"#ED8936" },
  { id:"vehicles",  label:"Vehicles",                emoji:"🚗",  color:"#6FAE8B" },
  { id:"utilities", label:"Utilities & Services",    emoji:"⚡",  color:"#D68FA8" },
  { id:"insurance", label:"Insurance Policies",      emoji:"🛡️",  color:"#6E90C9" },
  { id:"pets",      label:"Pet Records",             emoji:"🐾",  color:"#F6AD55" },
  { id:"personal",  label:"Personal Letters",        emoji:"💌",  color:"#E53E3E" },
  { id:"photos",    label:"Photo Albums",            emoji:"📷",  color:"#F6AD55" },
  { id:"videos",    label:"Videos & Recordings",     emoji:"🎬",  color:"#6E90C9" },
  { id:"digital",   label:"Digital Assets",          emoji:"💻",  color:"#6E90C9" },
  { id:"business",  label:"Business Records",        emoji:"📊",  color:"#D99A6B" },
  { id:"crypto",    label:"Crypto & NFTs",           emoji:"₿",   color:"#F6AD55" },
  { id:"education", label:"Education & Awards",      emoji:"🎓",  color:"#6FAE8B" },
  { id:"military",  label:"Military Records",        emoji:"🎖️",  color:"#ED8936" },
  { id:"other",     label:"Other Documents",         emoji:"📁",  color:MUTED },
];

/* ── Folder selector ─────────────────────────────────────────────── */
function FolderSelector({ selected, onChange }: { selected:string[]; onChange:(ids:string[])=>void }) {
  const toggle = (id:string) => onChange(selected.includes(id) ? selected.filter(x=>x!==id) : [...selected,id]);
  return (
    <div className="space-y-3">
      <div className="view-only-note">
        <Eye size={12} color="#FFFFFF"/>
        <span>VIEW ONLY — Guardian contacts cannot download files</span>
      </div>
      <div className="flex items-center justify-between">
        <span style={{ color: MUTED, fontSize: 14, fontFamily: "var(--font-mono)" }}>ASSIGN FOLDERS ({selected.length}/{FOLDER_CATALOG.length})</span>
        <div className="flex gap-2">
          <button onClick={()=>onChange(FOLDER_CATALOG.map(f=>f.id))} style={{ color: "#6FAE8B", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>All</button>
          <button onClick={()=>onChange([])} style={{ color: MUTED, fontSize: 12.5, fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
        </div>
      </div>
      <div className="folder-grid">
        {FOLDER_CATALOG.map(f=>{
          const active = selected.includes(f.id);
          return (
            <button key={f.id} onClick={()=>toggle(f.id)} className="folder-chip"
              style={{ background:active?`${f.color}1E`:"rgba(255,255,255,0.03)", border:`1px solid ${active?f.color+"55":"rgba(255,255,255,0.08)"}`, color:active?f.color:MUTED }}>
              <span style={{ fontSize:15 }}>{f.emoji}</span>
              <span style={{ fontSize:11, fontWeight:active?700:400, lineHeight:1.3 }}>{f.label}</span>
              {active && <CheckCircle size={9} color={f.color} style={{ marginLeft:"auto" }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Add / Edit Contact Modal ────────────────────────────────────── */
function AddContactModal({ defaultType, editing, onClose, onAdd, onSave, onSaveFolders }: {
  defaultType: ContactType; editing?: Contact | null; onClose:()=>void;
  onAdd:(c:Omit<Contact,"id">)=>Promise<void>; onSave?:(id:string, updates:Partial<Contact>)=>void;
  onSaveFolders?:(id:string, folderIds:string[])=>Promise<void>;
}) {
  const [form, setForm] = useState(() => editing
    ? { name: editing.name, email: editing.email, phone: editing.phone, relationship: editing.relationship, type: editing.type, accessLevel: editing.accessLevel ?? "", notes: editing.notes ?? "", photo: editing.photo ?? "" }
    : { name:"", email:"", phone:"", relationship:"", type:defaultType, accessLevel:"", notes:"", photo:"" });
  const [guardianFolders, setGuardianFolders] = useState<string[]>(() => editing?.allowedFolderIds ?? []);
  const [showFolders, setShowFolders] = useState(!!editing);
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
    if (editing) {
      onSave?.(editing.id, {
        name: form.name, email: form.email, phone: form.phone, relationship: form.relationship,
        notes: form.notes, photo: form.photo || undefined,
        accessLevel: isGuardian ? `View Only — ${guardianFolders.length} folder${guardianFolders.length===1?"":"s"} assigned` : form.accessLevel,
        avatar: form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
      });
      if (isGuardian) await onSaveFolders?.(editing.id, guardianFolders);
      onClose();
      return;
    }
    const accessDesc = isGuardian
      ? `View Only — ${guardianFolders.length} folder${guardianFolders.length===1?"":"s"} assigned`
      : form.accessLevel;
    await onAdd({ ...form, accessLevel:accessDesc, verificationStatus:"pending", allowedFolderIds:isGuardian?guardianFolders:undefined, avatar:form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(), photo:form.photo || undefined });
    onClose();
  };

  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head">
          <div>
            <h3>{editing ? `Edit ${typeConfig[form.type].label}` : `Add ${typeConfig[form.type].label}`}</h3>
            <p className="modal-sub">{editing ? "Update this contact's details." : typeConfig[form.type].desc}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body">
          <PhotoPicker value={form.photo} onChange={url => setForm(p => ({ ...p, photo: url }))} label="Contact Photo" aspectRatio="1/1" />

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
                  <span style={{ fontSize:15, fontWeight:700, fontFamily:"var(--font-mono)" }}>
                    FOLDER ACCESS {guardianFolders.length > 0 ? `· ${guardianFolders.length} assigned` : "— required"}
                  </span>
                </div>
                {showFolders ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
              {showFolders && <div style={{ padding: 16 }}><FolderSelector selected={guardianFolders} onChange={setGuardianFolders}/></div>}
            </div>
          )}

          {!editing && isLegacy && (
            <div>
              <div style={{ color:MUTED, fontSize:14, fontFamily:"var(--font-mono)", marginBottom:8 }}>
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
                          <span style={{ color:TEXT, fontSize:15, fontWeight:600 }}>{vm.label}</span>
                          {vm.required && <span className="req-tag">REQUIRED</span>}
                        </div>
                        <div style={{ color:MUTED, fontSize:14, marginTop:1, lineHeight:1.4 }}>{vm.desc}</div>
                      </div>
                      <div className="flex-shrink-0" style={{ marginTop: 2 }}>
                        {selected ? <CheckCircle size={15} color="#FFFFFF"/> : <div style={{ width:15, height:15, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,0.25)" }}/>}
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
            {loading ? (editing ? "Saving…" : "Sending Invite…") : (editing ? "Save Changes" : "Send Verification Invite")}
          </button>
          <button onClick={onClose} className="btn-sec">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk import: device Contact Picker + .vcf / .csv file parsing ── */
type ParsedContact = { name:string; email:string; phone:string; selected:boolean };

function parseVCardText(text: string): Omit<ParsedContact,"selected">[] {
  const blocks = text.split(/BEGIN:VCARD/i).slice(1);
  return blocks.map(block => {
    const fn = block.match(/\r?\nFN[^:]*:(.*)/i)?.[1]?.trim();
    const n  = block.match(/\r?\nN[^:]*:(.*)/i)?.[1]?.trim();
    const email = block.match(/\r?\nEMAIL[^:]*:(.*)/i)?.[1]?.trim() ?? "";
    const tel = block.match(/\r?\nTEL[^:]*:(.*)/i)?.[1]?.trim() ?? "";
    let name = fn ?? "";
    if (!name && n) {
      const parts = n.split(";").map(p => p.trim()).filter(Boolean);
      name = parts.reverse().join(" ").trim();
    }
    return { name, email, phone: tel };
  }).filter(c => c.name);
}

function parseCSVText(text: string): Omit<ParsedContact,"selected">[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const splitLine = (l:string) => l.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
  const headers = splitLine(lines[0]).map(h => h.toLowerCase());
  const firstIdx = headers.findIndex(h => h.includes("first"));
  const lastIdx  = headers.findIndex(h => h.includes("last"));
  const nameIdx  = headers.findIndex(h => h === "name" || (h.includes("name") && !h.includes("first") && !h.includes("last")));
  const emailIdx = headers.findIndex(h => h.includes("email"));
  const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("tel"));
  const hasHeader = firstIdx>=0 || lastIdx>=0 || nameIdx>=0 || emailIdx>=0 || phoneIdx>=0;
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows.map(line => {
    const cols = splitLine(line);
    let name = "";
    if (nameIdx>=0) name = cols[nameIdx] ?? "";
    else if (firstIdx>=0 || lastIdx>=0) name = [cols[firstIdx], cols[lastIdx]].filter(Boolean).join(" ");
    else name = cols[0] ?? "";
    return {
      name: name.trim(),
      email: emailIdx>=0 ? (cols[emailIdx] ?? "").trim() : "",
      phone: phoneIdx>=0 ? (cols[phoneIdx] ?? "").trim() : "",
    };
  }).filter(c => c.name);
}

async function pickDeviceContacts(): Promise<Omit<ParsedContact,"selected">[]> {
  const nav = navigator as any;
  const results = await nav.contacts.select(["name", "email", "tel"], { multiple: true });
  return results
    .map((c:any) => ({ name: c.name?.[0] ?? "", email: c.email?.[0] ?? "", phone: c.tel?.[0] ?? "" }))
    .filter((c:any) => c.name);
}

function BulkImportModal({ defaultType, onClose, onImport }: {
  defaultType: ContactType; onClose:()=>void; onImport:(contacts:Omit<Contact,"id">[])=>Promise<void>;
}) {
  const [stage, setStage] = useState<"choose"|"preview">("choose");
  const [rows, setRows] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const deviceSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

  function loadRows(parsed: Omit<ParsedContact,"selected">[]) {
    if (parsed.length === 0) { toast.error("No contacts found in that file"); return; }
    setRows(parsed.map(p => ({ ...p, selected:true })));
    setStage("preview");
  }

  async function handleDevicePick() {
    try {
      loadRows(await pickDeviceContacts());
    } catch {
      toast.error("Contact picker was cancelled or isn't available");
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      loadRows(/BEGIN:VCARD/i.test(text) ? parseVCardText(text) : parseCSVText(text));
    };
    reader.readAsText(file);
  }

  const selectedCount = rows.filter(r => r.selected).length;
  const toggleRow = (i:number) => setRows(prev => prev.map((r,idx) => idx===i ? { ...r, selected:!r.selected } : r));

  async function doImport() {
    const chosen = rows.filter(r => r.selected);
    if (chosen.length === 0) return;
    setImporting(true);
    const contacts: Omit<Contact,"id">[] = chosen.map(r => ({
      name: r.name, email: r.email, phone: r.phone, relationship: "",
      type: defaultType,
      accessLevel: defaultType === "guardian" ? "View Only — folders not yet assigned" : "",
      notes: "", verificationStatus: "pending",
      avatar: r.name.split(" ").map(w=>w[0]).filter(Boolean).join("").slice(0,2).toUpperCase() || "?",
    }));
    await onImport(contacts);
  }

  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head">
          <div>
            <h3>Import {typeConfig[defaultType].label}s</h3>
            <p className="modal-sub">
              {stage==="choose" ? "Bring in contacts in bulk from your phone or a file." : `Found ${rows.length} contact${rows.length===1?"":"s"} — choose which to import.`}
            </p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body">
          {stage==="choose" && (
            <>
              <button className="import-method" onClick={handleDevicePick} disabled={!deviceSupported}>
                <div className="imico"><Smartphone size={20}/></div>
                <div className="flex-1">
                  <div style={{ color:TEXT, fontSize:16, fontWeight:600 }}>Import From Device Contacts</div>
                  <div style={{ color:MUTED, fontSize:13.5, marginTop:2 }}>
                    {deviceSupported ? "Pick contacts straight from your phone in a couple taps." : "Not supported in this browser — use file upload below instead."}
                  </div>
                </div>
              </button>

              <button className="import-method" onClick={()=>fileRef.current?.click()}>
                <div className="imico"><FileUp size={20}/></div>
                <div className="flex-1">
                  <div style={{ color:TEXT, fontSize:16, fontWeight:600 }}>Upload a Contacts File</div>
                  <div style={{ color:MUTED, fontSize:13.5, marginTop:2 }}>Import a .vcf (vCard) or .csv export from your phone or email provider.</div>
                </div>
              </button>
              <input ref={fileRef} type="file" accept=".vcf,.csv,text/vcard,text/csv" style={{ display:"none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value=""; }}/>

              <p className="import-hint">
                Tip: Most phones can export contacts as a .vcf file (iPhone: Contacts → Select All → Share → Save as vCard. Android: Contacts → Settings → Export).
              </p>
            </>
          )}

          {stage==="preview" && (
            <>
              <div className="flex items-center justify-between">
                <span style={{ color: MUTED, fontSize: 14, fontFamily: "var(--font-mono)" }}>{selectedCount} OF {rows.length} SELECTED</span>
                <div className="flex gap-2">
                  <button onClick={()=>setRows(prev=>prev.map(r=>({...r,selected:true})))} style={{ color: "#6FAE8B", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>All</button>
                  <button onClick={()=>setRows(prev=>prev.map(r=>({...r,selected:false})))} style={{ color: MUTED, fontSize: 12.5, fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
                </div>
              </div>
              <div className="import-list">
                {rows.map((r,i)=>(
                  <button key={i} onClick={()=>toggleRow(i)} className="verif-row"
                    style={{ background:r.selected?"rgba(91,110,225,0.07)":"rgba(255,255,255,0.02)", borderColor:r.selected?"rgba(91,110,225,0.3)":"rgba(255,255,255,0.07)" }}>
                    <div className="verif-ico" style={{ background:r.selected?"rgba(91,110,225,0.12)":"rgba(255,255,255,0.04)", fontSize:12, fontWeight:700, color:TEXT }}>
                      {r.name.split(" ").map(w=>w[0]).filter(Boolean).join("").slice(0,2).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1" style={{ minWidth:0 }}>
                      <div style={{ color:TEXT, fontSize:15, fontWeight:600 }}>{r.name}</div>
                      <div style={{ color:MUTED, fontSize:13, marginTop:1 }}>{[r.phone, r.email].filter(Boolean).join(" · ") || "No phone or email"}</div>
                    </div>
                    <div className="flex-shrink-0">
                      {r.selected ? <CheckCircle size={15} color="#FFFFFF"/> : <div style={{ width:15, height:15, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,0.25)" }}/>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          {stage==="preview" && (
            <button onClick={doImport} disabled={importing || selectedCount===0} className="save" style={{ opacity:(importing||selectedCount===0)?0.7:1 }}>
              {importing ? "Importing…" : `Import ${selectedCount} Contact${selectedCount===1?"":"s"}`}
            </button>
          )}
          {stage==="preview" && <button onClick={()=>setStage("choose")} className="btn-sec">Back</button>}
          <button onClick={onClose} className="btn-sec">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper with its own header + Add button ────────────── */
function ContactSection({
  type, contacts, onAdd, onImport, onRemove, onEdit,
  onSendInvite, submittingId, onScanId,
}: {
  type: ContactType;
  contacts: Contact[];
  onAdd: () => void;
  onImport: () => void;
  onRemove: (id:string) => void;
  onEdit: (c:Contact) => void;
  onSendInvite?: (id:string) => void;
  submittingId?: string | null;
  onScanId?: (id:string, name:string, doc:ScannedDocument) => void;
}) {
  const cfg = typeConfig[type];
  const isLegacy  = type === "legacy";
  const isGuardian = type === "guardian";

  return (
    <div className="card" style={{ overflow: "hidden", borderColor: `${cfg.color}30` }}>
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
        <div className="flex gap-2">
          <button onClick={onImport} className="btn-ghost" style={{ color: MUTED, background:"rgba(255,255,255,0.04)", borderColor:"rgba(255,255,255,0.14)" }}>
            <FileUp size={12}/> Import
          </button>
          <button onClick={onAdd} className="btn-ghost" style={{ color: cfg.color, background:`${cfg.color}1E`, borderColor:`${cfg.color}55` }}>
            <Plus size={12}/> Add {cfg.label}
          </button>
        </div>
      </div>

      {isGuardian && contacts.length > 0 && (
        <div className="view-only-strip">
          <Eye size={12} color="#FFFFFF"/>
          <span>Guardian contacts can <strong>view</strong> their assigned folders but <strong style={{ color: NEG }}>cannot download</strong> any files.</span>
        </div>
      )}

      <div>
        {contacts.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{ color: SOFT, fontSize: 16 }}>No {cfg.label.toLowerCase()}s added yet.</div>
            <button onClick={onAdd} className="add-one-link" style={{ color: cfg.color }}>Add one now</button>
          </div>
        )}

        {contacts.map((c, i) => {
          const vs = verStyle[c.verificationStatus];
          return (
            <div key={c.id} className="contact-row">
              <div className="flex items-start gap-3">
                {isLegacy && (
                  <div className="priority-badge" style={{ background:i===0?"rgba(91,110,225,0.18)":"rgba(91,110,225,0.08)", color:i===0?"#6FAE8B":MUTED, border:i===0?"2px solid rgba(91,110,225,0.35)":"1px solid rgba(91,110,225,0.14)" }}>
                    {i===0 ? <Crown size={18} color="#FFFFFF"/> : `#${i+1}`}
                  </div>
                )}

                {!isLegacy && (
                  c.photo ? (
                    <div className="priority-badge" style={{ padding: 0, overflow: "hidden" }}>
                      <StoredImage src={c.photo} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div className="priority-badge" style={{ background:`${cfg.color}1E`, color:cfg.color }}>
                      {c.avatar}
                    </div>
                  )
                )}

                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                    <span style={{ color:TEXT, fontSize:17.5, fontWeight:600 }}>{c.name}</span>
                    {isLegacy && i === 0 && (
                      <span className="rank-badge" style={{ background:"rgba(91,110,225,0.14)", color:"#6FAE8B" }}>
                        <Crown size={9}/> PRIMARY
                      </span>
                    )}
                    {isLegacy && i > 0 && (
                      <span className="rank-badge" style={{ background:"rgba(140,151,180,0.14)", color:MUTED }}>
                        CONTINGENT #{i+1}
                      </span>
                    )}
                    <span style={{ color:MUTED, fontSize:15 }}>{c.relationship}</span>
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
                      <FolderOpen size={10} color="#FFFFFF"/>
                      <span style={{ color:MUTED, fontSize:12.5 }}>{c.accessLevel}</span>
                    </div>
                  )}

                  {isLegacy && (
                    <div style={{ marginTop: 6, fontSize: 15, color: MUTED }}>
                      {i === 0
                        ? "Has primary authority — notified first and assumes full control of the vault."
                        : `Backup #${i+1} — assumes control only if all contacts ranked above are unable to act.`}
                    </div>
                  )}

                  {isLegacy && (() => {
                    const vs2 = computeVerifStatus(c);
                    const vc = verifConfig[vs2];
                    const submitting = submittingId === c.id;
                    return (
                      <div className="space-y-2" style={{ marginTop: 12 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="status-chip lg" style={{ background:`${vc.color}1E`, color:vc.color }}>
                            {vc.icon}<span style={{ fontFamily:"var(--font-mono)", marginLeft:3 }}>{vc.label}</span>
                          </div>
                          <span style={{ color:MUTED, fontSize:14 }}>
                            {vs2==="not_sent" && "ID verification invite not yet sent"}
                            {vs2==="pending" && "Invite sent — awaiting ID submission"}
                            {vs2==="id_submitted" && "ID submitted — pending compliance review (1–2 days)"}
                            {vs2==="verified" && "Government ID verified by compliance team ✓"}
                            {vs2==="rejected" && (c.idRejectionReason ? `Rejected: ${c.idRejectionReason}` : "ID rejected — please resubmit")}
                          </span>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {vs2 === "not_sent" && (
                            <button onClick={()=>onSendInvite?.(c.id)} className="btn-ghost" style={{ color: "#6FAE8B" }}>
                              <Mail size={10}/> Send Verification Invite
                            </button>
                          )}
                          {vs2 === "pending" && (
                            <button onClick={()=>onSendInvite?.(c.id)} className="btn-sec">
                              Resend Invite
                            </button>
                          )}
                          {vs2 === "id_submitted" && (
                            <div className="flex items-center gap-1.5" style={{ fontSize: 15, color: WARN }}>
                              <Clock size={11}/> Awaiting compliance team review
                            </div>
                          )}
                          {vs2 === "verified" && (
                            <div className="flex items-center gap-1.5" style={{ fontSize: 15, color: "#D99A6B" }}>
                              <UserCheck size={11}/> Vault access activates upon verified passing
                            </div>
                          )}
                          {(vs2 === "not_sent" || vs2 === "pending" || vs2 === "rejected") && (
                            submitting
                              ? <div className="flex items-center gap-1.5" style={{ fontSize: 14, color: MUTED }}><RefreshCw size={10} style={{ animation:"spin 1s linear infinite" }}/> Uploading…</div>
                              : <ScanButton folder="legal" onUpload={doc => onScanId?.(c.id, c.name, doc)} size="sm" label={vs2==="rejected" ? "Resubmit ID" : "Scan ID"}/>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>onEdit(c)} title="Edit contact" style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 6 }}>
                    <Edit2 size={13}/>
                  </button>
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

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-contacts .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-contacts .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-contacts .hbanner:hover .art{transform:scale(1.08);}
.fpd-contacts .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-contacts .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-contacts .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-contacts .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-contacts .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-contacts .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-contacts .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-contacts .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-contacts .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-contacts .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-contacts .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-contacts .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-contacts .hbanner{min-height:auto;} .fpd-contacts .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-contacts .hbanner h1{font-size:29px;}}

.fpd-contacts .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-contacts .card.pad{padding:28px;}
.fpd-contacts .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-contacts .pg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-contacts .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin-bottom:4px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-contacts .pg-sub{color:${MUTED};font-size:16px;max-width:52ch;line-height:1.6;}
.fpd-contacts .head-ico{width:52px;height:52px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-contacts .access-pill{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:16px;flex-shrink:0;}
.fpd-contacts .access-dot{width:6px;height:6px;border-radius:50%;}

.fpd-contacts .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;background:none;}
.fpd-contacts .btn-sec{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:14.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* chain of authority */
.fpd-contacts .chain-box{padding:20px;border-radius:22px;background:rgba(91,110,225,0.05);border:2px solid rgba(91,110,225,0.22);}
.fpd-contacts .chain-hd{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.fpd-contacts .chain-hd span{font-family:var(--font-display);font-size:17.5px;color:${TEXT};}
.fpd-contacts .chain-row{display:flex;align-items:center;gap:12px;}
.fpd-contacts .chain-num{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;}
.fpd-contacts .chain-note{margin-top:12px;padding:10px 12px;border-radius:16px;font-size:15px;display:flex;align-items:flex-start;gap:8px;background:rgba(217,165,94,0.07);border:1px solid rgba(217,165,94,0.22);color:${MUTED};line-height:1.5;}

/* solo-legacy info banner */
.fpd-contacts .info-banner{display:flex;align-items:flex-start;gap:10px;padding:16px 20px;border-radius:22px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);}
.fpd-contacts .info-banner p{color:${MUTED};font-size:15px;line-height:1.7;}

/* section */
.fpd-contacts .section-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-contacts .section-ico{width:38px;height:38px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-contacts .section-title{font-family:var(--font-display);font-size:19px;color:${TEXT};}
.fpd-contacts .section-count{padding:2px 8px;border-radius:99px;font-size:14px;font-weight:700;font-family:var(--font-mono);}
.fpd-contacts .section-desc{color:${MUTED};font-size:14px;margin-top:2px;}
.fpd-contacts .view-only-strip{display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid rgba(95,190,145,0.16);background:rgba(95,190,145,0.05);color:#D99A6B;font-size:14px;}
.fpd-contacts .view-only-note{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:16px;background:rgba(95,190,145,0.07);border:1px solid rgba(95,190,145,0.22);color:#D99A6B;font-size:14px;font-weight:700;}
.fpd-contacts .add-one-link{margin-top:6px;font-size:14px;text-decoration:underline;background:none;border:none;cursor:pointer;font-family:var(--font-body);}

/* contact row */
.fpd-contacts .contact-row{padding:18px 20px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-contacts .contact-row:first-child{border-top:none;}
.fpd-contacts .priority-badge{width:42px;height:42px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:17.5px;font-weight:700;font-family:var(--font-display);}
.fpd-contacts .rank-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:12.5px;font-weight:700;font-family:var(--font-mono);}
.fpd-contacts .meta-item{display:flex;align-items:center;gap:4px;font-size:14px;color:${MUTED};}
.fpd-contacts .status-chip{display:flex;align-items:center;gap:0;padding:2px 6px;border-radius:6px;font-size:14px;}
.fpd-contacts .status-chip.lg{padding:5px 10px;border-radius:16px;font-size:15px;font-weight:700;}

/* modal */
.fpd-contacts .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.8);backdrop-filter:blur(8px);}
.fpd-contacts .modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
.fpd-contacts .modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-contacts .modal-head h3{font-family:var(--font-display);font-size:21.5px;color:${TEXT};font-weight:600;}
.fpd-contacts .modal-sub{color:${MUTED};font-size:15px;margin-top:3px;}
.fpd-contacts .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-contacts .modal-body{padding:22px 24px;display:flex;flex-direction:column;gap:14px;}
.fpd-contacts .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-contacts .field input,.fpd-contacts .field select{width:100%;padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-contacts .field input::placeholder{color:${FAINT};}
.fpd-contacts .field input:focus,.fpd-contacts .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-contacts .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 24px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-contacts .modal-foot .save{flex:1;padding:13px;border-radius:16px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);box-shadow:0 8px 20px -10px rgba(91,110,225,0.7);}

/* folder picker */
.fpd-contacts .folder-picker{border-radius:18px;overflow:hidden;border:1px solid rgba(95,190,145,0.28);}
.fpd-contacts .folder-picker-hd{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(95,190,145,0.06);color:#D99A6B;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-contacts .folder-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:200px;overflow-y:auto;}
.fpd-contacts .folder-chip{display:flex;align-items:center;gap:6px;padding:8px;border-radius:99px;text-align:left;cursor:pointer;font-family:var(--font-body);}

/* bulk import */
.fpd-contacts .import-method{width:100%;display:flex;align-items:center;gap:14px;padding:16px;border-radius:18px;text-align:left;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;font-family:var(--font-body);}
.fpd-contacts .import-method:disabled{opacity:.45;cursor:not-allowed;}
.fpd-contacts .import-method .imico{width:44px;height:44px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.14);color:${ACCENT2};}
.fpd-contacts .import-hint{color:${MUTED};font-size:13.5px;line-height:1.6;padding:2px 2px 0;}
.fpd-contacts .import-list{max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;}

/* verification requirement rows */
.fpd-contacts .verif-row{width:100%;display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:16px;text-align:left;border:1px solid;font-family:var(--font-body);}
.fpd-contacts .verif-ico{width:32px;height:32px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;}
.fpd-contacts .req-tag{padding:2px 6px;border-radius:5px;font-size:12.5px;background:rgba(91,110,225,0.14);color:#6FAE8B;font-family:var(--font-mono);}
.fpd-contacts .sub-panel{margin-top:12px;padding:14px;border-radius:16px;background:rgba(91,110,225,0.04);border:1px solid rgba(91,110,225,0.14);}
.fpd-contacts .sub-panel label{display:block;margin-bottom:5px;font-family:var(--font-mono);font-size:12.5px;color:${MUTED};}
.fpd-contacts .sub-panel input{width:100%;padding:10px 12px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);}
.fpd-contacts .sub-hint{color:${MUTED};font-size:12.5px;margin-top:5px;}
`;

/* ── Main Component ──────────────────────────────────────────────── */
export function ContactsHub({ initialSection = "legacy" }: { initialSection?: ContactType }) {
  const { contacts, addContact, removeContact, updateContact, sendVerificationInvite, submitIdVerification, updateGuardianFolders } = useDemo();
  const [addingType, setAddingType] = useState<ContactType | null>(null);
  const [importingType, setImportingType] = useState<ContactType | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function handleScanId(id: string, name: string, doc: ScannedDocument) {
    setSubmittingId(id);
    await submitIdVerification(id, doc.file, "Government-Issued Photo ID");
    setSubmittingId(null);
  }

  // Only show contacts for the active section — never mix types
  const activeType: ContactType = initialSection;
  const visibleContacts = contacts.filter(c => c.type === activeType);
  const legacyContacts = contacts.filter(c => c.type === "legacy");

  const cfg = typeConfig[activeType];
  const access: Record<ContactType, { label:string; color:string }> = {
    legacy:        { label:"Full vault download — after verified passing", color:"#6FAE8B" },
    guardian:      { label:"View-only assigned folders — never downloads", color:"#D99A6B" },
    emergency:     { label:"Informational only — no vault access", color:WARN },
    pet_emergency: { label:"Informational only — pet care details", color:"#6E90C9" },
  };
  const Icon = activeType === "legacy" ? Shield : activeType === "guardian" ? Users : activeType === "emergency" ? AlertCircle : PawPrint;

  const heroConfig: Record<ContactType, { photo: string; eyebrow: string; title: React.ReactNode; sub: string }> = {
    legacy:        { photo: heroLegacyPhoto,    eyebrow: "Trusted With Everything",  title: <>The people who <span className="accent">carry your vault forward.</span></>, sub: "Verified legacy contacts unlock full access to your account after your passing is confirmed." },
    guardian:      { photo: heroGuardianPhoto,  eyebrow: "Trusted Right Now",         title: <>Give someone a <span className="accent">window in, today.</span></>, sub: "Guardian contacts get view-only access to the folders you assign — no waiting required." },
    emergency:     { photo: heroEmergencyPhoto, eyebrow: "In Case Of Emergency",      title: <>The call that gets made <span className="accent">first.</span></>, sub: "Emergency contacts are who first responders reach — keep their information current." },
    pet_emergency: { photo: heroEmergencyPhoto, eyebrow: "For Your Pets",             title: <>Someone to <span className="accent">care for them, too.</span></>, sub: "Make sure your pets are looked after in an emergency or after your passing." },
  };
  const hero = heroConfig[activeType];

  return (
    <div className="fpd-contacts">
      <style dangerouslySetInnerHTML={{ __html: CONTACTS_CSS }} />
      <div className="fpd-contacts-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${hero.photo})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">{hero.eyebrow}</span>
            <h1>{hero.title}</h1>
            <p>{hero.sub}</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setAddingType(activeType)}><Plus size={15} /> Add Contact</button>
              <button className="hbtn ghost" onClick={() => setImportingType(activeType)}><FileUp size={15} /> Import Contacts</button>
            </div>
          </div>
        </div>

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
            <span style={{ color:access[activeType].color, fontSize:14, fontWeight:600 }}>{access[activeType].label}</span>
          </div>
        </div>

        {/* ── Chain of authority ── */}
        {activeType === "legacy" && legacyContacts.length > 1 && (
          <div className="chain-box">
            <div className="chain-hd">
              <Crown size={16} color="#FFFFFF"/>
              <span>Chain of Authority</span>
            </div>
            <div className="space-y-2">
              {legacyContacts.map((c, i) => (
                <div key={c.id} className="chain-row">
                  <div className="chain-num" style={{ background:i===0?ACCENT:"rgba(91,110,225,0.14)", color:i===0?"#fff":MUTED }}>
                    {i===0 ? <Crown size={12}/> : `${i+1}`}
                  </div>
                  <div className="flex-1" style={{ fontSize: 16, color: TEXT }}>
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
            <Info size={16} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
            <p>You have one Legacy Contact. Consider adding a <strong style={{ color: TEXT }}>contingent backup</strong> — if your primary contact is also deceased or unable to act, there would be no one to claim your vault.</p>
          </div>
        )}

        {/* ── Section (single contact type) ── */}
        <ContactSection
          type={activeType}
          contacts={visibleContacts}
          onAdd={() => setAddingType(activeType)}
          onImport={() => setImportingType(activeType)}
          onRemove={id => removeContact(id)}
          onEdit={c => setEditingContact(c)}
          onSendInvite={sendVerificationInvite}
          submittingId={submittingId}
          onScanId={handleScanId}
        />

        {addingType && (
          <AddContactModal
            defaultType={addingType}
            onClose={() => setAddingType(null)}
            onAdd={async c => { await addContact(c); setAddingType(null); toast.success(`${typeConfig[c.type].label} added`); }}
          />
        )}

        {editingContact && (
          <AddContactModal
            defaultType={editingContact.type}
            editing={editingContact}
            onClose={() => setEditingContact(null)}
            onAdd={async () => {}}
            onSave={(id, updates) => {
              updateContact(id, updates);
              setEditingContact(null);
            }}
            onSaveFolders={updateGuardianFolders}
          />
        )}

        {importingType && (
          <BulkImportModal
            defaultType={importingType}
            onClose={() => setImportingType(null)}
            onImport={async contacts => {
              for (const c of contacts) await addContact(c);
              setImportingType(null);
              toast.success(`${contacts.length} contact${contacts.length===1?"":"s"} imported`);
            }}
          />
        )}
      </div>
    </div>
  );
}
