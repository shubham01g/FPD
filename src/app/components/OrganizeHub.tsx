import React, { useState } from "react";
import { Folder, Bell, Calendar, Plus, Trash2, CheckCircle, Clock, X } from "lucide-react";
import { useDemo, type Reminder, type Occasion } from "../context/DemoContext";
import { toast } from "sonner";

const GLASS: React.CSSProperties = { background:"rgba(22,22,31,0.95)", border:"1px solid rgba(58,91,217,0.14)", backdropFilter:"blur(12px)" };
const GRID: React.CSSProperties = { backgroundImage:"linear-gradient(rgba(58,91,217,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(58,91,217,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
type Tab = "folders"|"reminders"|"occasions";

const folders = [
  { id:1, name:"Legal Documents",  files:8,   size:"12.4 MB", color:"#3A5BD9", desc:"Wills, trusts, power of attorney" },
  { id:2, name:"Financial Records",files:15,  size:"24.8 MB", color:"#48BB78", desc:"Bank statements, tax returns" },
  { id:3, name:"Medical Records",  files:6,   size:"8.1 MB",  color:"#6E8BFF", desc:"Test results, prescriptions" },
  { id:4, name:"Property Records", files:4,   size:"5.2 MB",  color:"#ED8936", desc:"Deeds, mortgage statements" },
  { id:5, name:"Insurance Policies",files:5,  size:"7.9 MB",  color:"#FC8181", desc:"Life, home, auto policies" },
  { id:6, name:"Personal Letters", files:12,  size:"3.4 MB",  color:"#F6AD55", desc:"Letters to family" },
  { id:7, name:"Photo Archive",    files:847, size:"4.2 GB",  color:"#4A90D9", desc:"Scanned family photos" },
  { id:8, name:"🔒 Secret Vault", files:3,   size:"0.8 MB",  color:"#E53E3E", desc:"Encrypted — seed phrases, combinations", locked:true },
];

const remStatus = {
  overdue:  { color:"#FC8181", bg:"rgba(252,129,129,0.12)", label:"OVERDUE" },
  due_soon: { color:"#F6AD55", bg:"rgba(246,173,85,0.12)",  label:"DUE SOON" },
  upcoming: { color:"#48BB78", bg:"rgba(72,187,120,0.12)",  label:"UPCOMING" },
  completed:{ color:"rgba(255,255,255,0.7)", bg:"rgba(107,114,128,0.12)", label:"DONE" },
};
const occType = {
  birthday:    { color:"#6E8BFF", bg:"rgba(110,139,255,0.12)", icon:"🎂" },
  anniversary: { color:"#3A5BD9", bg:"rgba(58,91,217,0.12)",   icon:"💍" },
  holiday:     { color:"#F6AD55", bg:"rgba(246,173,85,0.12)",  icon:"🎄" },
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-5"><h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>Add Reminder</h3><button onClick={onClose} style={{ color:"rgba(255,255,255,0.7)" }}><X size={15}/></button></div>
        <div className="space-y-3">
          {[{key:"title",label:"REMINDER TITLE",ph:"e.g. Update Will"},{key:"dueDate",label:"DUE DATE",ph:"e.g. Sep 15, 2026"},{key:"notes",label:"NOTES",ph:"Optional notes"}].map(f=>(
            <div key={f.key}><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>
          ))}
          <div><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>FREQUENCY</label>
            <select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))} className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
              <option>Annual</option><option>Quarterly</option><option>Monthly</option><option>6 months</option><option>One-time</option>
            </select>
          </div>
          <div><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>CATEGORY</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
              <option>Legal</option><option>Financial</option><option>Medical</option><option>Legacy</option><option>Vehicles</option><option>Pets</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm" style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", opacity:loading?0.7:1 }}>{loading?"Saving...":"Create Reminder"}</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background:"rgba(58,91,217,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-5"><h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>Add Occasion</h3><button onClick={onClose} style={{ color:"rgba(255,255,255,0.7)" }}><X size={15}/></button></div>
        <div className="space-y-3">
          {[{key:"name",label:"OCCASION NAME",ph:"e.g. Sarah's Birthday"},{key:"date",label:"DATE",ph:"e.g. Aug 14"},{key:"recipient",label:"RECIPIENT",ph:"e.g. Sarah Johnson"},{key:"notes",label:"NOTES",ph:"Optional notes"}].map(f=>(
            <div key={f.key}><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>
          ))}
          <div><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>TYPE</label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))} className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
              <option value="birthday">Birthday</option><option value="anniversary">Anniversary</option><option value="holiday">Holiday</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm" style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", opacity:loading?0.7:1 }}>{loading?"Saving...":"Save Occasion"}</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background:"rgba(58,91,217,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
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
  const FOLDER_COLORS = ["#3A5BD9","#48BB78","#6E8BFF","#ED8936","#FC8181","#F6AD55","#4A90D9","#38B2AC"];

  function addFolder() {
    if (!newFolder.name.trim()) { toast.error("Folder name required"); return; }
    const color = FOLDER_COLORS[folderList.length % FOLDER_COLORS.length];
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
    <div className="p-6 space-y-5 relative" style={{ maxWidth:1240, margin:"0 auto", ...GRID }}>
      <div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:4 }}>Organize</h1>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Personal folders, reminders, and important family occasions — fully interactive in demo mode.</p>
      </div>
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background:"rgba(22,22,31,0.95)", width:"fit-content" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background:tab===t.id?"#3A5BD9":"transparent", color:tab===t.id?"#FFFFFF":"rgba(255,255,255,0.7)", fontWeight:tab===t.id?700:400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==="folders" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setShowAddFolder(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", fontWeight:700, fontSize:13, boxShadow:"0 0 20px rgba(58,91,217,0.3)" }}>
              <Plus size={14}/> Create New Folder
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {folderList.map(f=>(
              <button key={f.id} onClick={()=>toast.success(`Opened: ${f.name}`)}
                className="p-5 rounded-2xl text-left transition-all hover:scale-[1.01]" style={GLASS}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl p-2.5" style={{ background:`${f.color}14` }}>
                    <Folder size={20} color={f.color} fill={`${f.color}22`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color:"#FFFFFF", fontSize:14, fontWeight:500 }}>{f.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO }}>{f.files} files · {f.size}</div>
                  </div>
                  {(f as any).locked && <span style={{ color:"#E53E3E", fontSize:9, ...MONO, fontWeight:700 }}>LOCKED</span>}
                </div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{f.desc}</div>
              </button>
            ))}
          </div>
          {/* Add folder modal */}
          {showAddFolder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
              <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 glow-surface" style={GLASS}>
                <div className="flex items-center justify-between">
                  <h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>Create New Folder</h3>
                  <button onClick={()=>setShowAddFolder(false)} style={{ color:"rgba(255,255,255,0.7)" }}><X size={15}/></button>
                </div>
                <div>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>FOLDER NAME *</label>
                  <input value={newFolder.name} onChange={e=>setNewFolder(p=>({...p,name:e.target.value}))}
                    placeholder="e.g. Medical Directives"
                    className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                </div>
                <div>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>DESCRIPTION (optional)</label>
                  <input value={newFolder.desc} onChange={e=>setNewFolder(p=>({...p,desc:e.target.value}))}
                    placeholder="What this folder is for"
                    className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={addFolder} className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF" }}>
                    Create Folder
                  </button>
                  <button onClick={()=>setShowAddFolder(false)} className="px-4 py-3 rounded-xl text-sm"
                    style={{ background:"rgba(58,91,217,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==="reminders" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={()=>setShowAddRem(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", fontWeight:700, fontSize:13, boxShadow:"0 0 20px rgba(58,91,217,0.3)" }}>
              <Plus size={14}/> Add Reminder
            </button>
          </div>
          {reminders.length===0 && <div className="py-12 text-center rounded-2xl glow-surface" style={GLASS}><Bell size={28} color="rgba(58,91,217,0.2)" style={{ margin:"0 auto 12px" }}/><div style={{ color:"rgba(255,255,255,0.65)" }}>No reminders yet.</div></div>}
          {reminders.map(r=>{
            const s = remStatus[r.status];
            return (
              <div key={r.id} className="p-5 rounded-2xl glow-surface" style={GLASS}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Bell size={13} color="#3A5BD9"/>
                      <span style={{ color:"#FFFFFF", fontSize:14, fontWeight:500 }}>{r.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-1">
                      <span style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>Due: <strong style={{ color:"#FFFFFF" }}>{r.dueDate}</strong></span>
                      <span style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>Repeats: {r.frequency}</span>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background:"rgba(58,91,217,0.06)", color:"rgba(255,255,255,0.7)" }}>{r.category}</span>
                    </div>
                    {r.notes && <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>{r.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:s.bg, color:s.color, ...MONO, fontSize:9 }}>{s.label}</span>
                    {r.status!=="completed" && (
                      <button onClick={()=>completeReminder(r.id)} style={{ color:"#48BB78" }}><CheckCircle size={14}/></button>
                    )}
                    <button onClick={()=>removeReminder(r.id)} style={{ color:"#FC8181" }}><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            );
          })}
          {showAddRem && <AddReminderModal onClose={()=>setShowAddRem(false)} onAdd={addReminder}/>}
        </div>
      )}

      {tab==="occasions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setShowAddOcc(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#FFFFFF", fontWeight:700, fontSize:13, boxShadow:"0 0 20px rgba(58,91,217,0.3)" }}>
              <Plus size={14}/> Add Occasion
            </button>
          </div>
          {occasions.length===0 && <div className="py-12 text-center rounded-2xl glow-surface" style={GLASS}><Calendar size={28} color="rgba(58,91,217,0.2)" style={{ margin:"0 auto 12px" }}/><div style={{ color:"rgba(255,255,255,0.65)" }}>No occasions yet.</div></div>}
          <div className="grid md:grid-cols-2 gap-4">
            {occasions.map(o=>{
              const ot = occType[o.type];
              return (
                <div key={o.id} className="p-5 rounded-2xl glow-surface" style={GLASS}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center rounded-xl text-lg" style={{ width:40, height:40, background:ot.bg }}>{ot.icon}</div>
                    <div className="flex-1">
                      <div style={{ color:"#FFFFFF", fontSize:14, fontWeight:500 }}>{o.name}</div>
                      <div style={{ color:ot.color, ...MONO, fontSize:12 }}>{o.date}</div>
                    </div>
                    {o.recurring && <span style={{ color:"#48BB78", fontSize:9, ...MONO, fontWeight:700 }}>ANNUAL</span>}
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginBottom:4 }}>{o.recipient}</div>
                  {o.notes && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontStyle:"italic" }}>{o.notes}</div>}
                </div>
              );
            })}
          </div>
          {showAddOcc && <AddOccasionModal onClose={()=>setShowAddOcc(false)} onAdd={addOccasion}/>}
        </div>
      )}
    </div>
  );
}
