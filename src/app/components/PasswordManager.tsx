import { copyToClipboard } from "../utils/clipboard";
import React, { useState, useRef } from "react";
import { ScanButton } from "./DocumentScanner";
import {
  Key, Eye, EyeOff, Copy, Plus, Trash2, Edit2, X, Search,
  Lock, Globe, User, FileText, Shield, CheckCircle, Upload,
  AlertTriangle, Star, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(32,64,192,0.1)", boxShadow:"0 2px 12px rgba(32,64,192,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

interface PasswordEntry {
  id: string; title: string; website?: string; username?: string;
  email?: string; password: string; accountNumber?: string;
  securityQuestion?: string; securityAnswer?: string; notes?: string;
  category: string; strength: "weak"|"fair"|"good"|"strong";
  lastUpdated: string; starred?: boolean; twoFactor?: boolean;
  documents?: string[];
}

const categories = ["All","Social Media","Banking","Email","Shopping","Work","Healthcare","Government","Entertainment","Other"];

const strengthColor = { weak:"#E53E3E", fair:"#F6AD55", good:"#48BB78", strong:"#2040C0" };
const strengthLabel = { weak:"Weak", fair:"Fair", good:"Good", strong:"Strong" };

function getStrength(pw: string): PasswordEntry["strength"] {
  if (pw.length < 6) return "weak";
  if (pw.length < 10) return "fair";
  if (pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) return "strong";
  return "good";
}

const initPasswords: PasswordEntry[] = [
  { id:"p1", title:"Gmail – Primary", website:"https://mail.google.com", username:"james.doe", email:"james.doe@gmail.com", password:"MyP@ssw0rd2024!", category:"Email", strength:"strong", lastUpdated:"Jun 8, 2026", starred:true, twoFactor:true, securityQuestion:"What was your first car?", securityAnswer:"1967 Ford Mustang" },
  { id:"p2", title:"Wells Fargo Online Banking", website:"https://wellsfargo.com", username:"jdoe8821", accountNumber:"XXXX-XXXX-8821", password:"WF@Banking99!", category:"Banking", strength:"strong", lastUpdated:"May 15, 2026", starred:true, twoFactor:true, securityQuestion:"Mother's maiden name", securityAnswer:"Williams" },
  { id:"p3", title:"Fidelity Investments", website:"https://fidelity.com", username:"james.doe@fidelity", accountNumber:"7721-XXXX", password:"Fid3lity$Invest!", category:"Banking", strength:"strong", lastUpdated:"Apr 1, 2026", twoFactor:true },
  { id:"p4", title:"Facebook", website:"https://facebook.com", username:"james.doe.1962", email:"james.doe@gmail.com", password:"FB#Social24!", category:"Social Media", strength:"good", lastUpdated:"Mar 20, 2026" },
  { id:"p5", title:"Amazon Shopping", website:"https://amazon.com", email:"james.doe@gmail.com", password:"Amaz0n@Shop!", category:"Shopping", strength:"good", lastUpdated:"Feb 10, 2026" },
  { id:"p6", title:"Kaiser Permanente Patient Portal", website:"https://kp.org", username:"jdoe8821", password:"KP$Health22", category:"Healthcare", strength:"fair", lastUpdated:"Jan 5, 2026", notes:"Use this to access all medical records and test results online." },
];

function PasswordStrengthBar({ strength }: { strength: PasswordEntry["strength"] }) {
  const levels = { weak:1, fair:2, good:3, strong:4 };
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1,2,3,4].map(n => (
          <div key={n} style={{ width:28, height:4, borderRadius:2, background: n <= levels[strength] ? strengthColor[strength] : "rgba(32,64,192,0.1)" }}/>
        ))}
      </div>
      <span style={{ fontSize:11, color:strengthColor[strength], fontWeight:600 }}>{strengthLabel[strength]}</span>
    </div>
  );
}

function AddPasswordModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(p:PasswordEntry)=>void }) {
  const [form, setForm] = useState({ title:"", website:"", username:"", email:"", password:"", accountNumber:"", securityQuestion:"", securityAnswer:"", notes:"", category:"Other", twoFactor:false, starred:false });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!form.title || !form.password) { toast.error("Title and password are required"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onAdd({ ...form, id:`pw-${Date.now()}`, strength: getStrength(form.password), lastUpdated: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) });
    toast.success(`"${form.title}" saved to Password Manager 🔒`);
    onClose();
  };

  const f = (key: string, label: string, ph: string, type = "text") => (
    <div>
      <label style={{ color:"#8A9AB8", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} placeholder={ph}
        className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#F5F8FE", border:"1px solid rgba(32,64,192,0.12)", color:"#0D1428", fontSize:13, outline:"none" }}/>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={CARD}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"rgba(32,64,192,0.08)" }}>
          <div className="flex items-center gap-2">
            <Key size={18} color="#2040C0"/>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#0D1428" }}>Add Password Entry</h3>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4" style={{ maxHeight:"80vh" }}>
          <div className="grid grid-cols-2 gap-4">
            {f("title","TITLE *","e.g. Gmail Account")}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>CATEGORY</label>
              <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#F5F8FE", border:"1px solid rgba(32,64,192,0.12)", color:"#0D1428", fontSize:13, outline:"none" }}>
                {categories.filter(c=>c!=="All").map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f("website","WEBSITE URL","https://example.com","url")}
            {f("accountNumber","ACCOUNT NUMBER","e.g. XXXX-8821")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f("username","USERNAME","your.username")}
            {f("email","EMAIL ADDRESS","email@example.com","email")}
          </div>
          {/* Password with show/hide */}
          <div>
            <label style={{ color:"#8A9AB8", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>PASSWORD *</label>
            <div className="relative">
              <input type={showPw?"text":"password"} value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-xl pr-10" style={{ background:"#F5F8FE", border:"1px solid rgba(32,64,192,0.12)", color:"#0D1428", fontSize:13, outline:"none", ...MONO }}/>
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"#8A9AB8" }}>
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            {form.password && <div className="mt-2"><PasswordStrengthBar strength={getStrength(form.password)}/></div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f("securityQuestion","SECURITY QUESTION","e.g. Mother's maiden name?")}
            {f("securityAnswer","SECURITY ANSWER","Your answer")}
          </div>
          <div>
            <label style={{ color:"#8A9AB8", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>NOTES & SIGN-IN PROCEDURES</label>
            <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Special instructions for logging in, 2FA notes, backup codes location..." rows={3}
              className="w-full px-4 py-2.5 rounded-xl resize-none" style={{ background:"#F5F8FE", border:"1px solid rgba(32,64,192,0.12)", color:"#0D1428", fontSize:13, outline:"none" }}/>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.twoFactor} onChange={e => setForm(p=>({...p,twoFactor:e.target.checked}))} style={{ accentColor:"#2040C0", width:15, height:15 }}/>
              <span style={{ color:"#374669", fontSize:13 }}>2FA / MFA Enabled</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.starred} onChange={e => setForm(p=>({...p,starred:e.target.checked}))} style={{ accentColor:"#F6AD55", width:15, height:15 }}/>
              <span style={{ color:"#374669", fontSize:13 }}>Mark as important</span>
            </label>
          </div>
          {/* Document upload */}
          <div>
            <label style={{ color:"#8A9AB8", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>UPLOAD SUPPORTING DOCUMENTS (optional)</label>
            <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => { if (e.target.files?.[0]) toast.success(`Document attached: ${e.target.files[0].name}`); }}/>
            <div className="flex items-center gap-2">
              <div onClick={() => fileRef.current?.click()} className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer"
                style={{ borderColor:"rgba(32,64,192,0.2)", background:"rgba(32,64,192,0.02)" }}>
                <Upload size={15} color="#2040C0" style={{ opacity:0.6 }}/>
                <span style={{ color:"#8A9AB8", fontSize:13 }}>Attach PDF, image, or document</span>
              </div>
              <ScanButton folder="other" onUpload={doc => toast.success(`"${doc.name}" attached`)} size="sm" label="Scan"/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#2040C0,#3355E0)", color:"#fff", boxShadow:"0 4px 12px rgba(32,64,192,0.3)", opacity:loading?0.7:1 }}>
              <Lock size={13} style={{ display:"inline", marginRight:6 }}/>{loading?"Encrypting & Saving...":"Save to Vault"}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm" style={{ background:"#F0F4FA", color:"#5A6A88" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PasswordManager() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>(initPasswords);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<PasswordEntry|null>(null);
  const [showPwFor, setShowPwFor] = useState<string|null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = passwords.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || (p.website??"").includes(search) || (p.username??"").includes(search);
    const matchCat = category === "All" || p.category === category;
    return matchSearch && matchCat;
  });

  const copy = (text: string, label: string) => { copyToClipboard(text); toast.success(`${label} copied to clipboard`) };

  return (
    <div style={{ background:"#F0F4FA", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }} className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} color="#2040C0"/>
              <span style={{ color:"#2040C0", fontSize:11, ...MONO, letterSpacing:"0.1em" }}>AES-256 ENCRYPTED · ZERO-KNOWLEDGE</span>
            </div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#0D1428" }}>Password Manager</h1>
            <p style={{ color:"#5A6A88", fontSize:13, marginTop:4 }}>{passwords.length} entries · Encrypted and accessible to your designated legacy contacts</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background:"linear-gradient(135deg,#2040C0,#3355E0)", color:"#fff", boxShadow:"0 4px 12px rgba(32,64,192,0.3)" }}>
            <Plus size={15}/> Add Password
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Total Entries", value:passwords.length, color:"#2040C0" },
            { label:"Strong Passwords", value:passwords.filter(p=>p.strength==="strong").length, color:"#48BB78" },
            { label:"Weak/Fair Passwords", value:passwords.filter(p=>p.strength==="weak"||p.strength==="fair").length, color:"#FC8181" },
            { label:"2FA Enabled", value:passwords.filter(p=>p.twoFactor).length, color:"#9F7AEA" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:24, color:s.color }}>{s.value}</div>
              <div style={{ color:"#5A6A88", fontSize:12, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Category */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 min-w-48" style={CARD}>
            <Search size={13} color="#8A9AB8"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search passwords..."
              style={{ background:"transparent", border:"none", outline:"none", color:"#0D1428", fontSize:13, width:"100%" }}/>
          </div>
          <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={CARD}>
            {categories.slice(0,6).map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all"
                style={{ background:category===c?"#2040C0":"transparent", color:category===c?"#fff":"#5A6A88", fontWeight:category===c?600:400 }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Password list */}
          <div className="lg:col-span-2 space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer transition-all"
                style={{ ...CARD, borderColor:selected?.id===p.id?"#2040C0":"rgba(32,64,192,0.1)", borderWidth:selected?.id===p.id?2:1 }}
                onClick={() => setSelected(selected?.id===p.id ? null : p)}>
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:"rgba(32,64,192,0.08)" }}>
                  <Globe size={18} color="#2040C0"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color:"#0D1428", fontSize:14, fontWeight:600 }}>{p.title}</span>
                    {p.starred && <Star size={12} fill="#F6AD55" color="#F6AD55"/>}
                    {p.twoFactor && <Shield size={12} color="#48BB78"/>}
                  </div>
                  <div style={{ color:"#5A6A88", fontSize:12 }}>{p.username || p.email || p.website}</div>
                </div>
                <PasswordStrengthBar strength={p.strength}/>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); copy(p.username||p.email||"", "Username"); }} style={{ color:"#8A9AB8", padding:4 }}>
                    <User size={13}/>
                  </button>
                  <button onClick={e => { e.stopPropagation(); copy(p.password, "Password"); }} style={{ color:"#8A9AB8", padding:4 }}>
                    <Copy size={13}/>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setPasswords(prev => prev.filter(x => x.id !== p.id)); if(selected?.id===p.id) setSelected(null); toast.success("Entry deleted"); }} style={{ color:"#FC8181", padding:4 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="rounded-2xl p-5 sticky top-4 space-y-4" style={CARD}>
                <div className="flex items-center justify-between">
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#0D1428" }}>{selected.title}</div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const newPw = prompt("Set new password for demo:", selected.password);
                      if (newPw && newPw.trim()) {
                        setPasswords(prev => prev.map(e => e.id === selected.id ? { ...e, password: newPw.trim() } : e));
                        setSelected(s => s ? { ...s, password: newPw.trim() } : s);
                        toast.success("Password updated");
                      }
                    }} style={{ color:"#8A9AB8", padding:3 }}><Edit2 size={13}/></button>
                    <button onClick={() => setSelected(null)} style={{ color:"#8A9AB8", padding:3 }}><X size={13}/></button>
                  </div>
                </div>
                <PasswordStrengthBar strength={selected.strength}/>
                <div className="space-y-2">
                  {[
                    { label:"Website", value:selected.website, icon:<Globe size={12}/> },
                    { label:"Username", value:selected.username, icon:<User size={12}/>, copy:true },
                    { label:"Email", value:selected.email, icon:<FileText size={12}/>, copy:true },
                    { label:"Account #", value:selected.accountNumber, icon:<Key size={12}/> },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background:"#F5F8FE" }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span style={{ color:"#8A9AB8" }}>{row.icon}</span>
                        <div className="min-w-0">
                          <div style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>{row.label.toUpperCase()}</div>
                          <div style={{ color:"#0D1428", fontSize:13 }} className="truncate">{row.value}</div>
                        </div>
                      </div>
                      {row.copy && <button onClick={() => copy(row.value!, row.label)} style={{ color:"#2040C0", flexShrink:0 }}><Copy size={12}/></button>}
                    </div>
                  ))}
                  {/* Password field */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background:"#F5F8FE" }}>
                    <div className="flex items-center gap-2 flex-1">
                      <Lock size={12} color="#8A9AB8"/>
                      <div>
                        <div style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>PASSWORD</div>
                        <div style={{ color:"#0D1428", fontSize:13, ...MONO }}>{showPwFor===selected.id ? selected.password : "••••••••••••"}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setShowPwFor(showPwFor===selected.id ? null : selected.id)} style={{ color:"#8A9AB8" }}>
                        {showPwFor===selected.id ? <EyeOff size={12}/> : <Eye size={12}/>}
                      </button>
                      <button onClick={() => copy(selected.password, "Password")} style={{ color:"#2040C0" }}><Copy size={12}/></button>
                    </div>
                  </div>
                </div>
                {selected.twoFactor && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
                    <Shield size={13} color="#48BB78"/>
                    <span style={{ color:"#48BB78", fontSize:12 }}>Two-Factor Authentication enabled</span>
                  </div>
                )}
                {selected.securityQuestion && (
                  <div className="px-3 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
                    <div style={{ color:"#8A9AB8", fontSize:9, ...MONO, marginBottom:4 }}>SECURITY QUESTION</div>
                    <div style={{ color:"#374669", fontSize:12, marginBottom:6 }}>{selected.securityQuestion}</div>
                    <div style={{ color:"#8A9AB8", fontSize:9, ...MONO, marginBottom:4 }}>ANSWER</div>
                    <div style={{ color:"#0D1428", fontSize:12 }}>{selected.securityAnswer}</div>
                  </div>
                )}
                {selected.notes && (
                  <div className="px-3 py-3 rounded-xl" style={{ background:"#F5F8FE" }}>
                    <div style={{ color:"#8A9AB8", fontSize:9, ...MONO, marginBottom:4 }}>NOTES & SIGN-IN PROCEDURES</div>
                    <div style={{ color:"#374669", fontSize:13, lineHeight:1.7 }}>{selected.notes}</div>
                  </div>
                )}
                <div style={{ color:"#8A9AB8", fontSize:11 }}>Last updated: {selected.lastUpdated}</div>
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={CARD}>
                <Key size={32} color="rgba(32,64,192,0.2)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"#8A9AB8", fontSize:13 }}>Select a password entry to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <AddPasswordModal onClose={() => setShowAdd(false)} onAdd={p => setPasswords(prev => [p, ...prev])}/>}
    </div>
  );
}
