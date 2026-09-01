import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import {
  Users, Users2, Contact, Phone, Mail, MapPin, Gift, Heart, Plus, Search,
  Edit2, Trash2, X, Star, Camera,
  Send, CheckCircle, Layers, Smartphone, FileUp
} from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { PhotoPicker } from "./PhotoPicker";
import heroFamilyFriendsPhoto from "../../imports/familyfriends_hero_photo.png";

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
      <div className="card modal">
        <div className="modal-head">
          <div className="flex items-center gap-2">
            <Send size={16} color="#FFFFFF"/>
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
            <Mail size={12} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
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

/* Rows come from Supabase — see reload() below. */

const groupConfig = {
  immediate: { label: "Immediate Family", color: "#6FAE8B", icon: <Heart size={18}/> },
  extended:  { label: "Extended Family",  color: "#D99A6B", icon: <Users size={18}/> },
  friends:   { label: "Friends",          color: "#6E90C9", icon: <Users2 size={18}/> },
  other:     { label: "Other Contacts",   color: WARN,      icon: <Contact size={18}/> },
};

function AddContactModal({ editing, onClose, onAdd, onSave }: {
  editing?: Contact | null; onClose: () => void; onAdd: (c: Contact) => void; onSave?: (id: string, updates: Partial<Contact>) => void;
}) {
  useEscapeKey(true, onClose);
  const [form, setForm] = useState(() => editing
    ? { name: editing.name, relationship: editing.relationship, phone: editing.phone ?? "", email: editing.email ?? "", birthday: editing.birthday ?? "", address: editing.address ?? "", group: editing.group, notes: editing.notes ?? "" }
    : { name:"", relationship:"", phone:"", email:"", birthday:"", address:"", group:"immediate" as Contact["group"], notes:"" });
  const [photo, setPhoto] = useState(editing?.photo ?? "");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const initials = form.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
    if (editing) {
      onSave?.(editing.id, { ...form, initials, photo: photo || undefined });
    } else {
      onAdd({ ...form, id:`cf-${Date.now()}`, initials, color: COLORS[Math.floor(Math.random() * COLORS.length)], photo: photo || undefined });
      toast.success(`${form.name} added to Family & Friends`);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head">
          <h3>{editing ? "Edit Contact" : "Add Contact"}</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <PhotoPicker value={photo} onChange={setPhoto} label="Contact Photo (optional)" aspectRatio="1/1"/>
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
            {loading ? "Saving..." : editing ? "Save Changes" : "Add Contact"}
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

function BulkImportModal({ onClose, onImport }: {
  onClose:()=>void; onImport:(contacts:Contact[])=>void;
}) {
  useEscapeKey(true, onClose);
  const [stage, setStage] = useState<"choose"|"preview">("choose");
  const [rows, setRows] = useState<ParsedContact[]>([]);
  const [group, setGroup] = useState<Contact["group"]>("friends");
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
    await new Promise(r => setTimeout(r, 500));
    const imported: Contact[] = chosen.map((r, i) => ({
      id: `cf-import-${Date.now()}-${i}`,
      name: r.name, relationship: "", phone: r.phone || undefined, email: r.email || undefined,
      group,
      initials: r.name.split(" ").map(w=>w[0]).filter(Boolean).join("").slice(0,2).toUpperCase() || "?",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    onImport(imported);
    setImporting(false);
    toast.success(`${imported.length} contact${imported.length===1?"":"s"} imported`);
    onClose();
  }

  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head">
          <div>
            <h3>Import Contacts</h3>
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
              <div className="field">
                <label>ADD TO GROUP</label>
                <select value={group} onChange={e => setGroup(e.target.value as Contact["group"])}>
                  {Object.entries(groupConfig).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ color: MUTED, fontSize: 14, fontFamily: "var(--font-mono)" }}>{selectedCount} OF {rows.length} SELECTED</span>
                <div className="flex gap-2">
                  <button onClick={()=>setRows(prev=>prev.map(r=>({...r,selected:true})))} style={{ color: "#6FAE8B", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>All</button>
                  <button onClick={()=>setRows(prev=>prev.map(r=>({...r,selected:false})))} style={{ color: MUTED, fontSize: 12.5, fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
                </div>
              </div>
              <div className="import-list">
                {rows.map((r,i)=>(
                  <button key={i} onClick={()=>toggleRow(i)} className="import-row"
                    style={{ background:r.selected?"rgba(91,110,225,0.07)":"rgba(255,255,255,0.02)", borderColor:r.selected?"rgba(91,110,225,0.3)":"rgba(255,255,255,0.07)" }}>
                    <div className="import-row-ico" style={{ background:r.selected?"rgba(91,110,225,0.12)":"rgba(255,255,255,0.04)" }}>
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

/* Rows come from Supabase — see reload() below. */

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-ff so nothing else in the app is affected. */
const FF_CSS = `
.fpd-ff{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-ff *{box-sizing:border-box;}
.fpd-ff-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-ff .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-ff .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-ff .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-ff .hbanner:hover .art{transform:scale(1.08);}
.fpd-ff .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-ff .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-ff .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-ff .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-ff .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-ff .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-ff .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-ff .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-ff .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-ff .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-ff .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-ff .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-ff .hbanner{min-height:auto;} .fpd-ff .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-ff .hbanner h1{font-size:29px;}}

.fpd-ff .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-ff .card.pad{padding:28px;}
.fpd-ff .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-ff .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-ff .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-ff .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-ff .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-ff .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-ff .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-ff .btn-ghost.on{background:rgba(91,110,225,0.20);}
.fpd-ff .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* group summary — clickable filter tiles */
.fpd-ff .gstat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
@media (max-width:900px){.fpd-ff .gstat-grid{grid-template-columns:1fr 1fr;}}
.fpd-ff .gstat{display:flex;align-items:center;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.065);text-align:left;cursor:pointer;transition:background .15s,border-color .15s,transform .15s;}
.fpd-ff .gstat:hover{background:#101728;transform:translateY(-1px);}
.fpd-ff .gstat-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-ff .gstat-txt{flex:1;min-width:0;}
.fpd-ff .gstat-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-ff .gstat-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}

/* segmented all/starred filter */
.fpd-ff .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;}
.fpd-ff .seg button{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:99px;font-size:16px;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-ff .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* toolbar */
.fpd-ff .toolbar{display:flex;flex-wrap:wrap;gap:10px;}
.fpd-ff .search{display:flex;align-items:center;gap:8px;padding:11px 15px;flex:1;min-width:220px;}
.fpd-ff .search input{background:transparent;border:none;outline:none;color:${TEXT};font-size:16px;width:100%;font-family:var(--font-body);}

/* groups panel */
.fpd-ff .gpanel-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(91,110,225,0.05);}
.fpd-ff .gpanel-title{font-family:var(--font-display);font-size:19px;color:${TEXT};}
.fpd-ff .gpanel-desc{color:${MUTED};font-size:15px;}
.fpd-ff .grow{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-ff .gavatar{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:var(--font-display);}
.fpd-ff .gname{color:${TEXT};font-size:17.5px;font-weight:600;}
.fpd-ff .gmeta{color:${MUTED};font-size:14px;}
.fpd-ff .gmember-chip{padding:2px 8px;border-radius:99px;font-size:14px;background:rgba(91,110,225,0.09);color:#6FAE8B;}
.fpd-ff .gcreate{padding:16px 20px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(91,110,225,0.03);display:flex;flex-direction:column;gap:12px;}
.fpd-ff .gcreate-lbl{color:#6FAE8B;font-size:15px;font-weight:700;font-family:var(--font-mono);}
.fpd-ff .swatch{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);cursor:pointer;}
.fpd-ff .member-pick{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;}

/* bento layout */
.fpd-ff .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:16px;align-items:start;}
@media (max-width:1024px){.fpd-ff .bento{grid-template-columns:1fr;}}
.fpd-ff .clist{display:flex;flex-direction:column;gap:10px;}
.fpd-ff .empty{padding:44px 12px;text-align:center;}

/* contact row */
.fpd-ff .crow{display:flex;align-items:center;gap:14px;padding:16px;cursor:pointer;border:1.5px solid rgba(91,110,225,0.4);box-shadow:0 0 0 1px rgba(91,110,225,0.1),0 0 16px -8px rgba(91,110,225,0.35);transition:border-color .18s ease,box-shadow .18s ease;}
.fpd-ff .crow:hover{border-color:rgba(91,110,225,0.6);box-shadow:0 0 0 1px rgba(91,110,225,0.14),0 0 22px -6px rgba(91,110,225,0.45);}
.fpd-ff .crow.sel{border-color:rgba(91,110,225,0.5);}
.fpd-ff .cavatar-wrap{position:relative;flex-shrink:0;}
.fpd-ff .cavatar{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(91,110,225,0.22);}
.fpd-ff .cavatar-fallback{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;font-family:var(--font-display);}
.fpd-ff .cname{color:${TEXT};font-size:17.5px;font-weight:600;}
.fpd-ff .crel{padding:2px 8px;border-radius:99px;font-size:12.5px;font-family:var(--font-mono);}
.fpd-ff .cmeta{display:flex;flex-wrap:wrap;gap:12px;margin-top:4px;}
.fpd-ff .cmeta span{color:${MUTED};font-size:15px;}
.fpd-ff .cnote{color:${FAINT};font-size:14px;margin-top:3px;font-style:italic;}
.fpd-ff .cacts{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.fpd-ff .cacts a,.fpd-ff .cacts button{color:${MUTED};background:none;border:none;cursor:pointer;display:flex;}

/* detail panel */
.fpd-ff .dphoto{position:relative;height:128px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fpd-ff .dphoto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;}
.fpd-ff .dphoto-init{font-family:var(--font-display);font-size:60.5px;opacity:0.4;}
.fpd-ff .dphoto-btn{position:absolute;bottom:8px;right:8px;display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:16px;font-size:14px;font-weight:600;background:rgba(13,20,33,0.9);color:#6FAE8B;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-ff .dname{font-family:var(--font-display);font-size:25px;color:${TEXT};margin-bottom:4px;}
.fpd-ff .drel{font-size:16px;font-weight:500;margin-bottom:16px;}
.fpd-ff .dfield{display:flex;align-items:center;gap:8px;color:${TEXT};font-size:16px;}
.fpd-ff .dfield+.dfield{margin-top:10px;}
.fpd-ff .dnotes{margin-top:16px;padding:12px;border-radius:16px;background:#0F1624;}
.fpd-ff .dnotes-lbl{font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.06em;color:${MUTED};margin-bottom:4px;}
.fpd-ff .dnotes-val{color:${SOFT};font-size:16px;line-height:1.7;}
.fpd-ff .dedit{flex:1;padding:9px;border-radius:16px;font-size:16px;background:#141B2E;color:#6FAE8B;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-ff .ddelete{padding:9px 13px;border-radius:16px;font-size:16px;background:rgba(208,107,107,0.12);color:${NEG};border:none;cursor:pointer;}

/* modal */
.fpd-ff .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-ff .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-ff .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-ff .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-ff .modal-sub{color:${MUTED};font-size:14px;margin-top:3px;}
.fpd-ff .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;flex-shrink:0;}

/* bulk import */
.fpd-ff .import-method{width:100%;display:flex;align-items:center;gap:14px;padding:16px;border-radius:18px;text-align:left;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;font-family:var(--font-body);}
.fpd-ff .import-method:disabled{opacity:.45;cursor:not-allowed;}
.fpd-ff .import-method .imico{width:44px;height:44px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.14);color:${ACCENT2};}
.fpd-ff .import-hint{color:${MUTED};font-size:13.5px;line-height:1.6;padding:2px 2px 0;}
.fpd-ff .import-list{max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;}
.fpd-ff .import-row{width:100%;display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;text-align:left;border:1px solid;font-family:var(--font-body);}
.fpd-ff .import-row-ico{width:32px;height:32px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${TEXT};}
.fpd-ff .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-ff .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-ff .field input,.fpd-ff .field select,.fpd-ff .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-ff .field textarea{resize:none;}
.fpd-ff .field input::placeholder,.fpd-ff .field textarea::placeholder{color:${FAINT};}
.fpd-ff .field input:focus,.fpd-ff .field select:focus,.fpd-ff .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-ff .recipients-box{padding:12px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-ff .rec-lbl{font-family:var(--font-mono);font-size:13.5px;color:${MUTED};margin-bottom:8px;}
.fpd-ff .rec-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:99px;font-size:14px;}
.fpd-ff .rec-chip.on{background:rgba(91,110,225,0.10);color:#6FAE8B;}
.fpd-ff .rec-chip.off{background:rgba(140,151,180,0.10);color:${MUTED};}
.fpd-ff .bcc-note{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:16px;background:rgba(95,190,145,0.07);border:1px solid rgba(95,190,145,0.2);}
.fpd-ff .bcc-note p{color:#D99A6B;font-size:14px;line-height:1.6;}
.fpd-ff .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-ff .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;display:flex;align-items:center;justify-content:center;gap:6px;}
`;

export function FamilyFriends() {
  const { authUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);

  // family_friends and contact_groups both key off owner_user_id, not user_id
  // — the ownerTable() helper is configured for that. Custom-group membership
  // lives only on contact_groups.member_contact_ids, so each contact's
  // customGroups is derived from the groups rather than stored twice.
  const reload = useCallback(async () => {
    if (!authUser) { setContacts([]); setGroups([]); return; }

    const [contactsRes, groupsRes] = await Promise.all([
      tables.familyFriends.list(authUser.id),
      tables.contactGroups.list(authUser.id),
    ]);
    if (contactsRes.error) { toast.error(`Could not load contacts: ${contactsRes.error.message}`); return; }
    if (groupsRes.error) { toast.error(`Could not load groups: ${groupsRes.error.message}`); return; }

    const loadedGroups: ContactGroup[] = (groupsRes.data ?? []).map(g => ({
      id: String(g.id),
      name: String(g.name ?? ""),
      color: String(g.color ?? GROUP_COLORS[0]),
      description: String(g.description ?? ""),
      memberIds: (g.member_contact_ids as string[] | null) ?? [],
      createdAt: g.created_at ? new Date(String(g.created_at)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    }));
    setGroups(loadedGroups);

    setContacts((contactsRes.data ?? []).map(r => {
      const id = String(r.id);
      const name = String(r.full_name ?? "");
      return {
        id,
        name,
        relationship: String(r.relationship ?? ""),
        phone: (r.phone as string | null) ?? undefined,
        email: (r.email as string | null) ?? undefined,
        address: (r.address as string | null) ?? undefined,
        birthday: (r.birthday as string | null) ?? undefined,
        photo: (r.photo_url as string | null) ?? undefined,
        notes: (r.notes as string | null) ?? undefined,
        group: (r.group_category as Contact["group"]) ?? "other",
        starred: Boolean(r.starred),
        initials: name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase(),
        color: GROUP_COLORS[name.length % GROUP_COLORS.length],
        customGroups: loadedGroups.filter(g => g.memberIds.includes(id)).map(g => g.id),
      };
    }));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);

  // Shared mapping from the UI's Contact shape to family_friends columns.
  const toRow = (c: Partial<Contact>) => ({
    full_name: c.name, relationship: c.relationship, phone: c.phone ?? null,
    email: c.email ?? null, address: c.address ?? null, birthday: c.birthday ?? null,
    notes: c.notes ?? null, group_category: c.group ?? "other",
    ...(c.starred === undefined ? {} : { starred: c.starred }),
  });

  const addContact = async (c: Contact) => {
    if (!authUser) { toast.error("Sign in to save contacts."); return; }
    const { error } = await tables.familyFriends.add(authUser.id, toRow(c));
    if (error) { toast.error(`Could not add contact: ${error.message}`); return; }
    await reload();
  };
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<Contact["group"] | "all" | "starred">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
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

  const toggleStar = async (id: string) => {
    const current = contacts.find(c => c.id === id);
    const { error } = await tables.familyFriends.update(id, { starred: !current?.starred });
    if (error) { toast.error(`Could not update: ${error.message}`); return; }
    await reload();
  };

  const handlePhotoUpload = (id: string, file: File | null) => {
    if (!file) return;
    // URL.createObjectURL gives an in-memory blob: URL that means nothing in
    // another session, so this stays a preview only. Persisting the image
    // needs a Storage upload, which is separate work from this wiring.
    const url = URL.createObjectURL(file);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, photo: url } : c));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, photo: url } : prev);
    toast.success("Photo updated for this session — not yet saved to your vault");
  };

  return (
    <div className="fpd-ff">
      <style dangerouslySetInnerHTML={{ __html: FF_CSS }} />
      <div className="fpd-ff-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroFamilyFriendsPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">The People Who Matter</span>
            <h1>Every relationship worth <span className="accent">keeping close.</span></h1>
            <p>Family, friends, and neighbors — with the details your legacy contacts will need to reach them when it counts.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Contact</button>
              <button className="hbtn ghost" onClick={() => setShowImport(true)}><FileUp size={15} /> Import Contacts</button>
            </div>
          </div>
        </div>

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
          </div>
        </div>

        {/* ── Groups & Email Blast panel ── */}
        {showGroupsPanel && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="gpanel-hd">
              <div className="flex items-center gap-2">
                <Layers size={15} color="#FFFFFF"/>
                <span className="gpanel-title">Contact Groups</span>
                <span className="gpanel-desc">— create groups to send blast emails to multiple contacts at once</span>
              </div>
              <button className="btn-ghost" onClick={() => setShowCreateGroup(true)}>
                <Plus size={11}/> New Group
              </button>
            </div>

            {groups.length === 0 && (
              <div style={{ padding: "32px 0", textAlign: "center", color: MUTED, fontSize: 16 }}>
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
                    <button onClick={() => { void (async () => {
                      const { error } = await tables.contactGroups.remove(g.id);
                      if (error) { toast.error(`Could not delete group: ${error.message}`); return; }
                      await reload();
                    })(); }} style={{ color: NEG, background:"none", border:"none", cursor:"pointer" }}><Trash2 size={13}/></button>
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
                    <label style={{ color: MUTED, fontSize: 12.5, fontFamily: "var(--font-mono)" }}>
                      ADD MEMBERS ({newGroupMembers.length}/{contacts.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setNewGroupMembers(contacts.map(c => c.id))} className="btn-ghost" style={{ padding: "5px 11px", fontSize: 14 }}>+ Add All</button>
                      {newGroupMembers.length > 0 && (
                        <button onClick={() => setNewGroupMembers([])} className="btn-ghost" style={{ padding: "5px 11px", fontSize: 14, color: NEG, background: "rgba(208,107,107,0.10)", borderColor: "rgba(208,107,107,0.28)" }}>Clear</button>
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
                    if (!authUser) { toast.error("Sign in to create groups."); return; }
                    const groupName = newGroupName.trim();
                    void (async () => {
                      const { error } = await tables.contactGroups.add(authUser.id, {
                        name: groupName, color: newGroupColor,
                        description: newGroupDesc, member_contact_ids: newGroupMembers,
                      });
                      if (error) { toast.error(`Could not create group: ${error.message}`); return; }
                      await reload();
                      setNewGroupName(""); setNewGroupDesc(""); setNewGroupMembers([]); setNewGroupColor(GROUP_COLORS[0]);
                      setShowCreateGroup(false);
                      toast.success(`Group "${groupName}" created with ${newGroupMembers.length} members`);
                    })();
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
              className="gstat" style={{ borderColor: activeGroup === g ? cfg.color : "rgba(255,255,255,0.065)" }}>
              <span className="gstat-ico" style={{ background:`linear-gradient(150deg,${cfg.color}52,${cfg.color}12)`, color: cfg.color }}>{cfg.icon}</span>
              <div className="gstat-txt">
                <div className="gstat-val">{byGroup(g).length}</div>
                <div className="gstat-lbl">{cfg.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Search + filter ── */}
        <div className="toolbar">
          <div className="card search">
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
              <div className="card empty">
                <Users size={32} color="rgba(91,110,225,0.3)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color: MUTED, fontSize: 17.5 }}>No contacts found.</div>
              </div>
            )}
            {filtered.map(contact => {
              const cfg = groupConfig[contact.group];
              return (
                <div key={contact.id} className={`card crow ${selected?.id === contact.id ? "sel" : ""}`} onClick={() => setSelected(selected?.id === contact.id ? null : contact)}>
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
              <div className="card" style={{ overflow: "hidden", position: "sticky", top: 16 }}>
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
                    <button onClick={() => setEditingContact(selected)} className="dedit">
                      <Edit2 size={13} style={{ display:"inline", marginRight:4 }}/>Edit Contact
                    </button>
                    <button onClick={() => { void (async () => {
                      const { error } = await tables.familyFriends.remove(selected.id);
                      if (error) { toast.error(`Could not remove: ${error.message}`); return; }
                      await reload();
                      setSelected(null);
                      toast.success(`${selected.name} removed`);
                    })(); }} className="ddelete">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card pad empty">
                <Heart size={32} color="rgba(91,110,225,0.3)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color: MUTED, fontSize: 17.5 }}>Select a contact to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdd={c => { void addContact(c); }}/>}
      {editingContact && (
        <AddContactModal
          editing={editingContact}
          onClose={() => setEditingContact(null)}
          onAdd={() => {}}
          onSave={(id, updates) => { void (async () => {
            const { error } = await tables.familyFriends.update(id, toRow(updates));
            if (error) { toast.error(`Could not update: ${error.message}`); return; }
            await reload();
            setSelected(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
            setEditingContact(null);
            toast.success("Contact updated");
          })(); }}
        />
      )}
      {showImport && <BulkImportModal onClose={() => setShowImport(false)} onImport={imported => { void (async () => {
        if (!authUser) { toast.error("Sign in to import contacts."); return; }
        const { error } = await tables.familyFriends.addMany(authUser.id, imported.map(toRow));
        if (error) { toast.error(`Could not import: ${error.message}`); return; }
        await reload();
      })(); }}/>}
      {blastGroup && <BlastEmailModal group={blastGroup} contacts={contacts} onClose={() => setBlastGroup(null)}/>}
    </div>
  );
}
