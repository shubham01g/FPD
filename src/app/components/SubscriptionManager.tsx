import React, { useState, useRef } from "react";
import { ScanButton } from "./DocumentScanner";
import {
  CreditCard, Plus, X, Search, Trash2, Edit2, Upload,
  Globe, Phone, AlertTriangle, CheckCircle, Calendar,
  DollarSign, Lock, Eye, EyeOff, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = { background:"#16161F", border:"1px solid rgba(108,92,231,0.1)", boxShadow:"0 2px 12px rgba(108,92,231,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

type Frequency = "Weekly"|"Biweekly"|"Monthly"|"Quarterly"|"Yearly";
type PaymentType = "Checking Account"|"Savings Account"|"American Express"|"Mastercard"|"Visa"|"Discover"|"PayPal"|"Apple Pay"|"Google Pay";

interface Subscription {
  id: string; title: string; amount: number; frequency: Frequency;
  phone?: string; website?: string; username?: string; password?: string;
  billingAccountNumber?: string; paymentType: PaymentType; lastFour?: string;
  category: string; status: "active"|"paused"|"cancelled";
  nextBilling?: string; cancelInstructions?: string; notes?: string;
  autoPay: boolean; cancellationUrl?: string;
}

const categories = ["All","Streaming","Software","News","Health & Fitness","Finance","Shopping","Insurance","Utilities","Other"];

const initSubs: Subscription[] = [
  { id:"s1", title:"Netflix", amount:22.99, frequency:"Monthly", website:"https://netflix.com", username:"james.doe@gmail.com", password:"Netflix@2024!", paymentType:"Visa", lastFour:"8821", category:"Streaming", status:"active", nextBilling:"Jul 1, 2026", autoPay:true, cancelInstructions:"Log in → Account → Cancel Membership" },
  { id:"s2", title:"Spotify Premium", amount:11.99, frequency:"Monthly", website:"https://spotify.com", username:"james.doe@gmail.com", password:"Spot!fy24!", paymentType:"Mastercard", lastFour:"4492", category:"Streaming", status:"active", nextBilling:"Jun 28, 2026", autoPay:true },
  { id:"s3", title:"Adobe Creative Cloud", amount:59.99, frequency:"Monthly", phone:"1-800-833-6687", website:"https://adobe.com", username:"james.doe@gmail.com", password:"Adobe@CC24!", billingAccountNumber:"ADO-8821-CC", paymentType:"American Express", lastFour:"3321", category:"Software", status:"active", nextBilling:"Jul 5, 2026", autoPay:true, cancelInstructions:"Call 1-800-833-6687 or log in → Account → Plans → Cancel" },
  { id:"s4", title:"SMUD Electric", amount:142.00, frequency:"Monthly", phone:"(916) 452-3211", website:"https://smud.org", username:"jdoe8821", billingAccountNumber:"SMUD-9284-01", paymentType:"Checking Account", lastFour:"8821", category:"Utilities", status:"active", nextBilling:"Jul 3, 2026", autoPay:true },
  { id:"s5", title:"New York Times Digital", amount:25.00, frequency:"Quarterly", website:"https://nytimes.com", username:"james.doe@gmail.com", password:"NYT@Read24!", paymentType:"Visa", lastFour:"8821", category:"News", status:"active", nextBilling:"Aug 1, 2026", autoPay:true },
  { id:"s6", title:"Planet Fitness", amount:24.99, frequency:"Monthly", phone:"(916) 555-0291", website:"https://planetfitness.com", billingAccountNumber:"PF-8821", paymentType:"Checking Account", lastFour:"8821", category:"Health & Fitness", status:"active", nextBilling:"Jun 30, 2026", autoPay:true, cancelInstructions:"Must cancel IN PERSON at the gym or via certified mail." },
];

const frequencyColor: Record<Frequency,string> = { Weekly:"#48BB78", Biweekly:"#38B2AC", Monthly:"#6C5CE7", Quarterly:"#9F7AEA", Yearly:"#F6AD55" };
const statusColor: Record<string, { color:string; bg:string }> = {
  active:    { color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  paused:    { color:"#F6AD55", bg:"rgba(246,173,85,0.1)" },
  cancelled: { color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
};

function AddSubModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(s:Subscription)=>void }) {
  const [form, setForm] = useState<Partial<Subscription>>({ frequency:"Monthly", paymentType:"Visa", status:"active", autoPay:true, category:"Other" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!form.title || !form.amount) { toast.error("Title and amount are required"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onAdd({ ...form, id:`sub-${Date.now()}`, amount: Number(form.amount) } as Subscription);
    toast.success(`"${form.title}" added to Auto Pay & Subscriptions`);
    onClose();
  };

  const inp = (key: string, label: string, ph: string, type = "text") => (
    <div>
      <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>{label}</label>
      <input type={type} value={(form as any)[key]??""} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph}
        className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
    </div>
  );

  const sel = (key: string, label: string, opts: string[]) => (
    <div>
      <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>{label}</label>
      <select value={(form as any)[key]??""} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}
        className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={CARD}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"rgba(108,92,231,0.08)" }}>
          <div className="flex items-center gap-2"><CreditCard size={18} color="#6C5CE7"/><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>Add Subscription / Auto Pay</h3></div>
          <button onClick={onClose} style={{ color:"rgba(255,255,255,0.65)" }}><X size={16}/></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4" style={{ maxHeight:"80vh" }}>
          <div className="grid grid-cols-2 gap-4">
            {inp("title","TITLE *","e.g. Netflix, Adobe CC")}
            {sel("category","CATEGORY",categories.filter(c=>c!=="All"))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {inp("amount","MONTHLY AMOUNT ($) *","0.00","number")}
            {sel("frequency","BILLING FREQUENCY",["Weekly","Biweekly","Monthly","Quarterly","Yearly"])}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {inp("phone","PHONE NUMBER","1-800-000-0000","tel")}
            {inp("website","WEBSITE / LOGIN URL","https://example.com","url")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {inp("billingAccountNumber","BILLING ACCOUNT NUMBER","e.g. ACC-8821")}
            {inp("nextBilling","NEXT BILLING DATE","e.g. Jul 1, 2026")}
          </div>
          {/* Payment */}
          <div className="p-4 rounded-xl" style={{ background:"#0F1A33" }}>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, marginBottom:10 }}>PAYMENT METHOD</div>
            <div className="grid grid-cols-2 gap-4">
              {sel("paymentType","PAYMENT TYPE",["Checking Account","Savings Account","American Express","Mastercard","Visa","Discover","PayPal","Apple Pay","Google Pay","Bitcoin (BTC)","Ethereum (ETH)","USDC","Other Crypto"])}
              {inp("lastFour","LAST 4 DIGITS","e.g. 8821")}
            </div>
          </div>
          {/* Login details */}
          <div className="p-4 rounded-xl space-y-3" style={{ background:"rgba(108,92,231,0.03)", border:"1px solid rgba(108,92,231,0.1)" }}>
            <div style={{ color:"#6C5CE7", fontSize:10, ...MONO, fontWeight:700 }}>ACCOUNT LOGIN DETAILS (for legacy contacts)</div>
            <div className="grid grid-cols-2 gap-3">
              {inp("username","USERNAME / EMAIL","your.username")}
              <div>
                <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>PASSWORD</label>
                <div className="relative">
                  <input type={showPw?"text":"password"} value={form.password??""} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="Account password"
                    className="w-full px-4 py-2.5 rounded-xl pr-9" style={{ background:"#16161F", border:"1px solid rgba(108,92,231,0.12)", color:"#FFFFFF", fontSize:13, outline:"none", ...MONO }}/>
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.65)" }}>
                    {showPw ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>CANCELLATION INSTRUCTIONS</label>
            <textarea value={form.cancelInstructions??""} onChange={e => setForm(p=>({...p,cancelInstructions:e.target.value}))} placeholder="Step-by-step instructions to cancel this subscription..." rows={2}
              className="w-full px-4 py-2.5 rounded-xl resize-none" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
          </div>
          {inp("notes","ADDITIONAL NOTES","Account details, login quirks, etc.")}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.autoPay??true} onChange={e => setForm(p=>({...p,autoPay:e.target.checked}))} style={{ accentColor:"#6C5CE7", width:15, height:15 }}/>
              <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13 }}>Auto-Pay Enabled</span>
            </label>
          </div>
          {/* Upload */}
          <div>
            <label style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>ATTACH DOCUMENTS</label>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { if(e.target.files?.[0]) toast.success(`Attached: ${e.target.files[0].name}`); }}/>
            <div className="flex items-center gap-2">
              <div onClick={() => fileRef.current?.click()} className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer" style={{ borderColor:"rgba(108,92,231,0.2)", background:"rgba(108,92,231,0.02)" }}>
                <Upload size={14} color="#6C5CE7" style={{ opacity:0.6 }}/>
                <span style={{ color:"rgba(255,255,255,0.65)", fontSize:13 }}>Attach bill, statement, or agreement</span>
              </div>
              <ScanButton folder="financial" onUpload={doc => toast.success(`"${doc.name}" attached`)} size="sm" label="Scan"/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#fff", boxShadow:"0 4px 12px rgba(108,92,231,0.3)", opacity:loading?0.7:1 }}>
              {loading?"Saving...":"Save Subscription"}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm" style={{ background:"#0A0A0F", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionManager() {
  const [subs, setSubs] = useState<Subscription[]>(initSubs);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Subscription|null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPwFor, setShowPwFor] = useState<string|null>(null);

  const filtered = subs.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category==="All" || s.category===category;
    return matchSearch && matchCat;
  });

  const totalMonthly = subs.filter(s=>s.status==="active").reduce((sum,s) => {
    const mult: Record<Frequency,number> = { Weekly:4.33, Biweekly:2.17, Monthly:1, Quarterly:1/3, Yearly:1/12 };
    return sum + s.amount * (mult[s.frequency]??1);
  }, 0);

  const deleteSub = (id: string) => { setSubs(p => p.filter(s => s.id !== id)); if(selected?.id===id) setSelected(null); toast.success("Subscription removed"); };

  return (
    <div style={{ background:"#0A0A0F", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }} className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#FFFFFF" }}>Auto Pay & Subscriptions</h1>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:4 }}>{subs.filter(s=>s.status==="active").length} active subscriptions · ~${totalMonthly.toFixed(2)}/month total</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#fff", boxShadow:"0 4px 12px rgba(108,92,231,0.3)" }}>
            <Plus size={15}/> Add Subscription
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Monthly Cost", value:`$${totalMonthly.toFixed(2)}`, color:"#6C5CE7" },
            { label:"Annual Cost", value:`$${(totalMonthly*12).toFixed(0)}`, color:"#FC8181" },
            { label:"Auto-Pay Active", value:subs.filter(s=>s.autoPay&&s.status==="active").length, color:"#48BB78" },
            { label:"Total Subscriptions", value:subs.length, color:"#9F7AEA" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:24, color:s.color }}>{s.value}</div>
              <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alert */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border" style={{ background:"rgba(246,173,85,0.05)", borderColor:"rgba(246,173,85,0.25)" }}>
          <AlertTriangle size={14} color="#F6AD55"/>
          <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13 }}>These subscriptions and accounts need to be cancelled or transferred when a user passes. Ensure legacy contacts have access to this page.</span>
        </div>

        {/* Search + Category */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 min-w-48" style={CARD}>
            <Search size={13} color="rgba(255,255,255,0.65)"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subscriptions..."
              style={{ background:"transparent", border:"none", outline:"none", color:"#FFFFFF", fontSize:13, width:"100%" }}/>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={CARD}>
            {categories.slice(0,6).map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all"
                style={{ background:category===c?"#6C5CE7":"transparent", color:category===c?"#fff":"rgba(255,255,255,0.7)", fontWeight:category===c?600:400 }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Subscription list */}
          <div className="lg:col-span-2 space-y-2">
            {filtered.map(sub => (
              <div key={sub.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-all"
                style={{ ...CARD, borderColor:selected?.id===sub.id?"#6C5CE7":"rgba(108,92,231,0.1)", borderWidth:selected?.id===sub.id?2:1 }}
                onClick={() => setSelected(selected?.id===sub.id ? null : sub)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${frequencyColor[sub.frequency]}14` }}>
                  <CreditCard size={18} color={frequencyColor[sub.frequency]}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ color:"#FFFFFF", fontSize:14, fontWeight:600 }}>{sub.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:statusColor[sub.status].bg, color:statusColor[sub.status].color, fontSize:9, ...MONO, fontWeight:700 }}>{sub.status.toUpperCase()}</span>
                    {sub.autoPay && <span style={{ color:"#48BB78", fontSize:10, ...MONO }}>AUTO-PAY</span>}
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>
                    {sub.paymentType}{sub.lastFour ? ` ···· ${sub.lastFour}` : ""} · Next: {sub.nextBilling || "—"}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>${sub.amount.toFixed(2)}</div>
                  <div style={{ color:frequencyColor[sub.frequency], fontSize:10, ...MONO }}>{sub.frequency}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSub(sub.id); }} style={{ color:"#FC8181", padding:4 }}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="rounded-2xl p-5 sticky top-4 space-y-4" style={CARD}>
                <div className="flex items-center justify-between">
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>{selected.title}</div>
                  <button onClick={() => setSelected(null)} style={{ color:"rgba(255,255,255,0.65)" }}><X size={13}/></button>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#FFFFFF" }}>${selected.amount.toFixed(2)}</span>
                  <span style={{ color:frequencyColor[selected.frequency], fontSize:12, ...MONO }}>/{selected.frequency.toLowerCase()}</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label:"Payment", value:`${selected.paymentType}${selected.lastFour ? ` ···· ${selected.lastFour}` : ""}` },
                    { label:"Account #", value:selected.billingAccountNumber },
                    { label:"Phone", value:selected.phone },
                    { label:"Website", value:selected.website },
                    { label:"Username", value:selected.username },
                    { label:"Next Billing", value:selected.nextBilling },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="flex flex-col px-3 py-2 rounded-xl" style={{ background:"#0F1A33" }}>
                      <span style={{ color:"rgba(255,255,255,0.65)", fontSize:9, ...MONO }}>{row.label.toUpperCase()}</span>
                      <span style={{ color:"#FFFFFF", fontSize:12 }}>{row.value}</span>
                    </div>
                  ))}
                  {selected.password && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background:"#0F1A33" }}>
                      <div>
                        <div style={{ color:"rgba(255,255,255,0.65)", fontSize:9, ...MONO }}>PASSWORD</div>
                        <div style={{ color:"#FFFFFF", fontSize:12, ...MONO }}>{showPwFor===selected.id ? selected.password : "••••••••"}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setShowPwFor(showPwFor===selected.id ? null : selected.id)} style={{ color:"rgba(255,255,255,0.65)" }}>{showPwFor===selected.id ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
                      </div>
                    </div>
                  )}
                </div>
                {selected.cancelInstructions && (
                  <div className="px-3 py-3 rounded-xl" style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.2)" }}>
                    <div style={{ color:"#FC8181", fontSize:9, ...MONO, marginBottom:4 }}>CANCELLATION INSTRUCTIONS</div>
                    <div style={{ color:"rgba(255,255,255,0.8)", fontSize:12, lineHeight:1.7 }}>{selected.cancelInstructions}</div>
                  </div>
                )}
                {selected.notes && (
                  <div className="px-3 py-3 rounded-xl" style={{ background:"#0F1A33" }}>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:9, ...MONO, marginBottom:4 }}>NOTES</div>
                    <div style={{ color:"rgba(255,255,255,0.8)", fontSize:12 }}>{selected.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={CARD}>
                <CreditCard size={32} color="rgba(108,92,231,0.2)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"rgba(255,255,255,0.65)", fontSize:13 }}>Select a subscription to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <AddSubModal onClose={() => setShowAdd(false)} onAdd={s => setSubs(prev => [s, ...prev])}/>}
    </div>
  );
}
