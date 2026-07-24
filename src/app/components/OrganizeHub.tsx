import React, { useState } from "react";
import { Folder, Bell, Calendar, Plus, Trash2, CheckCircle, X, Cake, Heart, PartyPopper } from "lucide-react";
import { useDemo, type Reminder, type Occasion } from "../context/DemoContext";
import { toast } from "sonner";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet & legacy vault) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B7BF5";
const ACCENT2 = "#8AA0FF";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

type Tab = "folders"|"reminders"|"occasions";

/* Refined per-folder accent — the same nine-hue harmonised family used across
   the Calendar, File Cabinet and Legacy Vault. */
const RAMP = ["#8AA0FF","#7EB0DC","#A99BE6","#6FB2B4","#82B8A6","#97A2C6","#B7A9DE","#79A6C9","#6E86E8"];

const folders = [
  { id:1, name:"Legal Documents",  files:8,   size:"12.4 MB", color:RAMP[0], desc:"Wills, trusts, power of attorney" },
  { id:2, name:"Financial Records",files:15,  size:"24.8 MB", color:RAMP[1], desc:"Bank statements, tax returns" },
  { id:3, name:"Medical Records",  files:6,   size:"8.1 MB",  color:RAMP[2], desc:"Test results, prescriptions" },
  { id:4, name:"Property Records", files:4,   size:"5.2 MB",  color:RAMP[3], desc:"Deeds, mortgage statements" },
  { id:5, name:"Insurance Policies",files:5,  size:"7.9 MB",  color:RAMP[4], desc:"Life, home, auto policies" },
  { id:6, name:"Personal Letters", files:12,  size:"3.4 MB",  color:RAMP[5], desc:"Letters to family" },
  { id:7, name:"Photo Archive",    files:847, size:"4.2 GB",  color:RAMP[6], desc:"Scanned family photos" },
  { id:8, name:"Secret Vault", files:3,   size:"0.8 MB",  color:NEG, desc:"Encrypted — seed phrases, combinations", locked:true },
];

const remStatus = {
  overdue:  { color:NEG,  label:"OVERDUE" },
  due_soon: { color:WARN, label:"DUE SOON" },
  upcoming: { color:POS,  label:"UPCOMING" },
  completed:{ color:FAINT,label:"DONE" },
};
const occType = {
  birthday:    { color:ACCENT2,    Icon:Cake },
  anniversary: { color:"#A99BE6",  Icon:Heart },
  holiday:     { color:WARN,       Icon:PartyPopper },
};

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-org so nothing else in the app is affected. */
const ORG_CSS = `
.fpd-org{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,123,245,0.10),transparent 70%);}
.fpd-org *{box-sizing:border-box;}
.fpd-org-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-org .wrap{max-width:1180px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-org .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.065);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-org .card.pad{padding:22px;}
.fpd-org .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-org .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-org .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-org .pg-sub{color:${MUTED};font-size:13px;max-width:620px;line-height:1.6;}
.fpd-org .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(74,99,222,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-org .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}

/* segmented tabs */
.fpd-org .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.065);width:fit-content;}
.fpd-org .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;font-size:12.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-org .seg button.on{background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;box-shadow:0 6px 16px -8px rgba(74,99,222,0.8);}

.fpd-org .toolbar{display:flex;justify-content:flex-end;}

/* folder grid */
.fpd-org .fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.fpd-org .fcard{position:relative;text-align:left;border-radius:15px;overflow:hidden;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.065);box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);cursor:pointer;transition:transform .18s,border-color .18s;}
.fpd-org .fcard:hover{transform:translateY(-2px);border-color:rgba(91,123,245,0.3);}
.fpd-org .fcard .bar{height:3px;}
.fpd-org .fcard .fbody{padding:18px;}
.fpd-org .fcard .ftop{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.fpd-org .fcard .fico{width:40px;height:40px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-org .fcard .ftitle{color:${TEXT};font-size:13.5px;font-weight:600;font-family:var(--font-display);}
.fpd-org .fcard .fmeta{color:${MUTED};font-family:var(--font-mono);font-size:10px;margin-top:2px;}
.fpd-org .fcard .flocked{margin-left:auto;color:${NEG};font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:0.06em;flex-shrink:0;}
.fpd-org .fcard .fdesc{color:${MUTED};font-size:11.5px;line-height:1.55;}

/* reminders */
.fpd-org .rlist{display:flex;flex-direction:column;gap:10px;}
.fpd-org .rrow{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;border-radius:14px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.05);}
.fpd-org .rrow .rtop{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
.fpd-org .rrow .rtitle{color:${TEXT};font-size:13.5px;font-weight:600;font-family:var(--font-display);}
.fpd-org .rrow .rmeta{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:4px;}
.fpd-org .rrow .rmeta span{color:${MUTED};font-size:12px;}
.fpd-org .rrow .rmeta strong{color:${TEXT};font-weight:600;}
.fpd-org .rrow .rcat{padding:2px 8px;border-radius:6px;font-size:10.5px;background:rgba(255,255,255,0.04);color:${SOFT};}
.fpd-org .rrow .rnotes{color:${MUTED};font-size:11.5px;margin-top:3px;}
.fpd-org .rrow .racts{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.fpd-org .rrow .rbadge{padding:4px 9px;border-radius:7px;font-family:var(--font-mono);font-size:9.5px;font-weight:700;letter-spacing:0.05em;flex-shrink:0;}
.fpd-org .rrow .racts button{background:none;border:none;cursor:pointer;padding:5px;display:flex;transition:filter .16s;}

/* occasions */
.fpd-org .ogrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.fpd-org .ocard{padding:18px;border-radius:15px;}
.fpd-org .ocard .otop{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.fpd-org .ocard .oico{width:40px;height:40px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-org .ocard .oname{color:${TEXT};font-size:13.5px;font-weight:600;font-family:var(--font-display);}
.fpd-org .ocard .odate{font-family:var(--font-mono);font-size:11.5px;margin-top:2px;}
.fpd-org .ocard .orec{color:${MUTED};font-size:12px;margin-bottom:4px;}
.fpd-org .ocard .onotes{color:${MUTED};font-size:11.5px;font-style:italic;}
.fpd-org .ocard .oannual{margin-left:auto;color:${POS};font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:0.06em;flex-shrink:0;}

/* new-tile / empty */
.fpd-org .newtile{border-radius:15px;border:1.5px dashed rgba(255,255,255,0.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px;color:${MUTED};cursor:pointer;transition:border-color .18s,color .18s;background:rgba(255,255,255,0.008);font-family:var(--font-body);}
.fpd-org .newtile:hover{border-color:rgba(91,123,245,0.4);color:${ACCENT2};}
.fpd-org .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 12px;}
.fpd-org .empty .ei{width:46px;height:46px;border-radius:12px;background:rgba(91,123,245,0.08);border:1px solid rgba(91,123,245,0.2);display:flex;align-items:center;justify-content:center;color:${ACCENT2};margin-bottom:12px;}
.fpd-org .empty .et{color:${SOFT};font-size:13px;font-weight:600;font-family:var(--font-display);}

/* modal */
.fpd-org .backdrop{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-org .modal{width:100%;max-width:380px;padding:24px;}
.fpd-org .modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.fpd-org .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-org .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-org .field{margin-bottom:12px;}
.fpd-org .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-org .field input,.fpd-org .field select{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.09);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-org .field input::placeholder{color:${FAINT};}
.fpd-org .field input:focus,.fpd-org .field select:focus{border-color:rgba(91,123,245,0.5);box-shadow:0 0 0 3px rgba(91,123,245,0.12);}
.fpd-org .modal-acts{display:flex;gap:10px;margin-top:6px;}
.fpd-org .modal-acts .save{flex:1;padding:11px;border-radius:10px;font-size:13px;font-weight:600;border:none;cursor:pointer;background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-org .modal-acts .save:hover{filter:brightness(1.08);}
.fpd-org .modal-acts .save:disabled{opacity:.6;cursor:default;}
.fpd-org .modal-acts .cancel{padding:11px 16px;border-radius:10px;font-size:13px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.065);color:${MUTED};cursor:pointer;font-family:var(--font-body);}

@media (max-width:640px){.fpd-org .fgrid,.fpd-org .ogrid{grid-template-columns:1fr;}}
`;

function AddReminderModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(r:Omit<Reminder,"id">)=>Promise<void> }) {
  const [form, setForm] = useState({ title:"", dueDate:"", frequency:"Annual", category:"Legal", status:"upcoming" as Reminder["status"], notes:"" });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.title || !form.dueDate) { toast.error("Title and due date required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="backdrop">
      <div className="card modal glow-surface">
        <div className="modal-head"><h3>Add Reminder</h3><button onClick={onClose}><X size={15}/></button></div>
        {[{key:"title",label:"REMINDER TITLE",ph:"e.g. Update Will"},{key:"dueDate",label:"DUE DATE",ph:"e.g. Sep 15, 2026"},{key:"notes",label:"NOTES",ph:"Optional notes"}].map(f=>(
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}/>
          </div>
        ))}
        <div className="field">
          <label>FREQUENCY</label>
          <select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
            <option>Annual</option><option>Quarterly</option><option>Monthly</option><option>6 months</option><option>One-time</option>
          </select>
        </div>
        <div className="field">
          <label>CATEGORY</label>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
            <option>Legal</option><option>Financial</option><option>Medical</option><option>Legacy</option><option>Vehicles</option><option>Pets</option>
          </select>
        </div>
        <div className="modal-acts">
          <button className="save" onClick={submit} disabled={loading}>{loading?"Saving...":"Create Reminder"}</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddOccasionModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(o:Omit<Occasion,"id">)=>Promise<void> }) {
  const [form, setForm] = useState({ name:"", date:"", type:"birthday" as Occasion["type"], recipient:"", notes:"", recurring:true });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.name || !form.date) { toast.error("Name and date required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="backdrop">
      <div className="card modal glow-surface">
        <div className="modal-head"><h3>Add Occasion</h3><button onClick={onClose}><X size={15}/></button></div>
        {[{key:"name",label:"OCCASION NAME",ph:"e.g. Sarah's Birthday"},{key:"date",label:"DATE",ph:"e.g. Aug 14"},{key:"recipient",label:"RECIPIENT",ph:"e.g. Sarah Johnson"},{key:"notes",label:"NOTES",ph:"Optional notes"}].map(f=>(
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}/>
          </div>
        ))}
        <div className="field">
          <label>TYPE</label>
          <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))}>
            <option value="birthday">Birthday</option><option value="anniversary">Anniversary</option><option value="holiday">Holiday</option>
          </select>
        </div>
        <div className="modal-acts">
          <button className="save" onClick={submit} disabled={loading}>{loading?"Saving...":"Save Occasion"}</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddFolderModal({ onClose, onAdd, form, setForm }: { onClose:()=>void; onAdd:()=>void; form:{name:string;desc:string}; setForm:(f:{name:string;desc:string})=>void }) {
  return (
    <div className="backdrop">
      <div className="card modal glow-surface">
        <div className="modal-head"><h3>Create New Folder</h3><button onClick={onClose}><X size={15}/></button></div>
        <div className="field">
          <label>FOLDER NAME *</label>
          <input value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} placeholder="e.g. Medical Directives"/>
        </div>
        <div className="field">
          <label>DESCRIPTION (optional)</label>
          <input value={form.desc} onChange={e=>setForm({ ...form, desc:e.target.value })} placeholder="What this folder is for"/>
        </div>
        <div className="modal-acts">
          <button className="save" onClick={onAdd}>Create Folder</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function OrganizeHub() {
  const { reminders, occasions, addReminder, completeReminder, removeReminder, addOccasion } = useDemo();
  const [tab, setTab] = useState<Tab>("folders");
  const [showAddRem, setShowAddRem] = useState(false);
  const [showAddOcc, setShowAddOcc] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderList, setFolderList] = useState(folders);
  const [newFolder, setNewFolder] = useState({ name:"", desc:"" });

  function addFolder() {
    if (!newFolder.name.trim()) { toast.error("Folder name required"); return; }
    const color = RAMP[folderList.length % RAMP.length];
    setFolderList(prev => [...prev, { id: Date.now(), name: newFolder.name, files: 0, size: "0 MB", color, desc: newFolder.desc }]);
    toast.success(`"${newFolder.name}" folder created`);
    setNewFolder({ name:"", desc:"" });
    setShowAddFolder(false);
  }

  const tabs = [
    { id:"folders" as Tab, label:"Folders", icon:<Folder size={13}/> },
    { id:"reminders" as Tab, label:`Reminders (${reminders.length})`, icon:<Bell size={13}/> },
    { id:"occasions" as Tab, label:`Occasions (${occasions.length})`, icon:<Calendar size={13}/> },
  ];

  return (
    <div className="fpd-org">
      <style dangerouslySetInnerHTML={{ __html: ORG_CSS }} />
      <div className="fpd-org-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth:0 }}>
            <div className="eyebrow"><Folder size={12}/> Personal Organization</div>
            <h1 className="pg-h1">Folders &amp; Reminders</h1>
            <div className="pg-sub">Personal folders, recurring reminders, and important family occasions — fully interactive in demo mode.</div>
          </div>
          <div className="seg">
            {tabs.map(t=>(
              <button key={t.id} className={tab===t.id ? "on" : ""} onClick={()=>setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab==="folders" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="toolbar">
              <button className="btn-primary" onClick={()=>setShowAddFolder(true)}><Plus size={14}/> Create New Folder</button>
            </div>
            <div className="fgrid">
              {folderList.map(f=>(
                <button key={f.id} className="fcard glow-surface" onClick={()=>toast.success(`Opened: ${f.name}`)}>
                  <div className="bar" style={{ background:`linear-gradient(90deg,${f.color},${f.color}66)` }}/>
                  <div className="fbody">
                    <div className="ftop">
                      <div className="fico" style={{ background:`${f.color}1C`, color:f.color }}><Folder size={18} fill={`${f.color}33`}/></div>
                      <div>
                        <div className="ftitle">{f.name}</div>
                        <div className="fmeta">{f.files} files · {f.size}</div>
                      </div>
                      {(f as any).locked && <span className="flocked">LOCKED</span>}
                    </div>
                    <div className="fdesc">{f.desc}</div>
                  </div>
                </button>
              ))}
              <div className="newtile" onClick={()=>setShowAddFolder(true)}>
                <Plus size={20} style={{ opacity:0.6 }}/>
                <span style={{ fontSize:13 }}>New Custom Folder</span>
              </div>
            </div>
          </div>
        )}

        {tab==="reminders" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="toolbar">
              <button className="btn-primary" onClick={()=>setShowAddRem(true)}><Plus size={14}/> Add Reminder</button>
            </div>
            {reminders.length===0 && (
              <div className="card empty glow-surface">
                <div className="ei"><Bell size={20}/></div>
                <div className="et">No reminders yet</div>
              </div>
            )}
            <div className="rlist">
              {reminders.map(r=>{
                const s = remStatus[r.status];
                return (
                  <div key={r.id} className="card rrow glow-surface">
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="rtop">
                        <Bell size={13} color={ACCENT2}/>
                        <span className="rtitle">{r.title}</span>
                      </div>
                      <div className="rmeta">
                        <span>Due: <strong>{r.dueDate}</strong></span>
                        <span>Repeats: {r.frequency}</span>
                        <span className="rcat">{r.category}</span>
                      </div>
                      {r.notes && <div className="rnotes">{r.notes}</div>}
                    </div>
                    <div className="racts">
                      <span className="rbadge" style={{ background:`${s.color}22`, color:s.color }}>{s.label}</span>
                      {r.status!=="completed" && (
                        <button onClick={()=>completeReminder(r.id)} style={{ color:POS }}><CheckCircle size={15}/></button>
                      )}
                      <button onClick={()=>removeReminder(r.id)} style={{ color:NEG }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {showAddRem && <AddReminderModal onClose={()=>setShowAddRem(false)} onAdd={addReminder}/>}
          </div>
        )}

        {tab==="occasions" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="toolbar">
              <button className="btn-primary" onClick={()=>setShowAddOcc(true)}><Plus size={14}/> Add Occasion</button>
            </div>
            {occasions.length===0 && (
              <div className="card empty glow-surface">
                <div className="ei"><Calendar size={20}/></div>
                <div className="et">No occasions yet</div>
              </div>
            )}
            <div className="ogrid">
              {occasions.map(o=>{
                const ot = occType[o.type];
                return (
                  <div key={o.id} className="card ocard glow-surface">
                    <div className="otop">
                      <div className="oico" style={{ background:`${ot.color}1C`, color:ot.color }}><ot.Icon size={18}/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="oname">{o.name}</div>
                        <div className="odate" style={{ color:ot.color }}>{o.date}</div>
                      </div>
                      {o.recurring && <span className="oannual">ANNUAL</span>}
                    </div>
                    <div className="orec">{o.recipient}</div>
                    {o.notes && <div className="onotes">{o.notes}</div>}
                  </div>
                );
              })}
            </div>
            {showAddOcc && <AddOccasionModal onClose={()=>setShowAddOcc(false)} onAdd={addOccasion}/>}
          </div>
        )}

        {showAddFolder && (
          <AddFolderModal
            onClose={()=>setShowAddFolder(false)}
            onAdd={addFolder}
            form={newFolder}
            setForm={setNewFolder}
          />
        )}
      </div>
    </div>
  );
}
