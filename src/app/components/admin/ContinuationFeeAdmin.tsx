import React, { useState } from "react";
import { Shield, Settings, CheckCircle, Clock, DollarSign, Search, Eye, RefreshCw, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

const paidFees = [
  { id:"LCF-0012", user:"James Doe", email:"james.doe@email.com", plan:"Premium", paidBy:"Account Owner", paidDate:"Jun 8, 2026", amount:199, txId:"pi_3A8BC2D4E5F6G7H8", status:"paid", activationPeriod:24, activated:false },
  { id:"LCF-0011", user:"Patricia Wells", email:"p.wells@email.com", plan:"Legacy Pro", paidBy:"Legacy Contact", paidDate:"May 22, 2026", amount:199, txId:"pi_2B9CD3E4F5G6H7I8", status:"paid", activationPeriod:24, activated:false },
  { id:"LCF-0010", user:"Robert Kim", email:"r.kim@email.com", plan:"Essential", paidBy:"Account Owner", paidDate:"Apr 10, 2026", amount:199, txId:"pi_1C0DE2E3F4G5H6I7", status:"paid", activationPeriod:24, activated:true, activatedDate:"May 5, 2026", expiresDate:"May 5, 2028" },
];

export function ContinuationFeeAdmin() {
  const [feeAmount, setFeeAmount] = useState("199.00");
  const [periodMonths, setPeriodMonths] = useState("24");
  const [savedConfig, setSavedConfig] = useState(false);
  const [search, setSearch] = useState("");
  const [fees, setFees] = useState(paidFees);

  const saveConfig = () => {
    setSavedConfig(true);
    toast.success(`Configuration updated: $${feeAmount} · ${periodMonths} month activation window`);
    setTimeout(() => setSavedConfig(false), 3000);
  };

  const activateFee = (id: string, userName: string) => {
    setFees(prev => prev.map(f => f.id === id ? { ...f, activated: true, activatedDate: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), expiresDate: `${parseInt(periodMonths)} months from today` } : f));
    toast.success(`Continuation fee activated for ${userName}. Vault will remain active for ${periodMonths} months.`);
  };

  const filtered = fees.filter(f => f.user.toLowerCase().includes(search.toLowerCase()) || f.email.includes(search) || f.id.includes(search));

  const totalRevenue = fees.reduce((s,f) => s + f.amount, 0);
  const activated = fees.filter(f => f.activated).length;
  const pending = fees.filter(f => !f.activated).length;

  return (
    <div style={{ background:"transparent", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }} className="space-y-6">

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} color="#FFFFFF"/>
            <span style={{ color:"#6E90C9", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>ADMIN · LEGACY CONTINUATION FEE</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Legacy Continuation Fee Control</h1>
          <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>Set the fee amount and activation period. Manually activate accounts when a user passes away.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Total Revenue", value:`$${totalRevenue.toLocaleString()}`, color:"#6E90C9" },
            { label:"Fees Collected", value:fees.length, color:"#D99A6B" },
            { label:"Currently Activated", value:activated, color:"#6FAE8B" },
            { label:"Pending Activation", value:pending, color:"#F6AD55" },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:s.color }}>{s.value}</div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Admin Configuration */}
        <div className="p-6 rounded-2xl" style={CARD}>
          <div className="flex items-center gap-2 mb-5">
            <Settings size={16} color="#FFFFFF"/>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Fee Configuration</h3>
            <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background:"rgba(246,173,85,0.1)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.25)", ...MONO, fontSize:11 }}>ADMIN ONLY — Changes affect all future payments</span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ONE-TIME FEE AMOUNT ($)</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
                <DollarSign size={15} color="#FFFFFF"/>
                <input type="number" step="0.01" value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                  style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:22.5, fontWeight:700, ...MONO, width:"100%" }}/>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:4 }}>Currently displayed as ${feeAmount} to users</div>
            </div>
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ACTIVATION WINDOW (MONTHS)</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
                <Clock size={15} color="#FFFFFF"/>
                <input type="number" step="1" min="1" max="120" value={periodMonths} onChange={e => setPeriodMonths(e.target.value)}
                  style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:22.5, fontWeight:700, ...MONO, width:"100%" }}/>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:4 }}>How long vault stays active after death activation</div>
            </div>
            <div className="flex flex-col justify-end">
              <button onClick={saveConfig} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm"
                style={{ background: savedConfig ? "rgba(72,187,120,0.12)" : "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: savedConfig ? "#D99A6B" : "#fff", border: savedConfig ? "1px solid rgba(72,187,120,0.3)" : "none", boxShadow: savedConfig ? "none" : "0 4px 12px rgba(91,110,225,0.3)" }}>
                {savedConfig ? <CheckCircle size={15}/> : <Save size={15}/>}
                {savedConfig ? "Configuration Saved!" : "Save Configuration"}
              </button>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:6 }}>Changes update in real-time via Supabase</div>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-2xl border" style={{ background:"rgba(246,173,85,0.05)", borderColor:"rgba(246,173,85,0.25)" }}>
            <AlertTriangle size={14} color="#F6AD55" style={{ marginTop:2, flexShrink:0 }}/>
            <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>
              <strong>Activation is a manual process.</strong> When a user is reported as no longer living, a legacy contact submits confirmation of passing — accepted documents include death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record. Review the submission, verify the document, then click "Activate" to begin the continuation window. Verification and admin approval are required, with a follow-up confirmation of death once received. The Stripe payment is non-refundable once processed.
            </p>
          </div>
        </div>

        {/* Paid fees table */}
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background:"rgba(255,255,255,0.08)", borderColor:"rgba(91,110,225,0.08)" }}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>Paid Legacy Continuation Fees</h3>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
              <Search size={13} color="#8A9AB8"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:15, width:160 }}/>
            </div>
          </div>

          {/* Table header */}
          <div className="grid px-5 py-3" style={{ gridTemplateColumns:"auto 1fr auto auto auto auto auto", background:"rgba(255,255,255,0.06)", borderBottom:"1px solid rgba(91,110,225,0.08)", gap:16, alignItems:"center" }}>
            {["ID","User","Paid By","Date","Amount","Status","Action"].map(h => (
              <div key={h} style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{h.toUpperCase()}</div>
            ))}
          </div>

          {filtered.map((fee, i) => (
            <div key={fee.id} className="grid px-5 py-4 items-center border-b" style={{ gridTemplateColumns:"auto 1fr auto auto auto auto auto", background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderColor:"rgba(91,110,225,0.06)", gap:16 }}>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{fee.id}</span>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:500 }}>{fee.user}</div>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>{fee.email} · {fee.plan}</div>
              </div>
              <span style={{ color:"#8A9AB8", fontSize:15 }}>{fee.paidBy}</span>
              <span style={{ color:"#8A9AB8", fontSize:15 }}>{fee.paidDate}</span>
              <span style={{ color:"#6E90C9", fontSize:16, fontWeight:700, ...MONO }}>${fee.amount}</span>
              <div>
                {fee.activated ? (
                  <div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(91,167,214,0.12)", color:"#6FAE8B", ...MONO, fontSize:11 }}>ACTIVATED</span>
                    <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:2 }}>Expires: {fee.expiresDate}</div>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(72,187,120,0.12)", color:"#D99A6B", ...MONO, fontSize:11 }}>PAID · PENDING ACTIVATION</span>
                )}
              </div>
              <div>
                {!fee.activated ? (
                  <button onClick={() => activateFee(fee.id, fee.user)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold"
                    style={{ background:"rgba(91,167,214,0.12)", color:"#6FAE8B", border:"1px solid rgba(91,167,214,0.25)" }}>
                    <Shield size={11}/> Activate
                  </button>
                ) : (
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>Active since {fee.activatedDate}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 rounded-2xl border" style={{ background:"rgba(91,110,225,0.03)", borderColor:"rgba(91,110,225,0.12)" }}>
          <div style={{ color:"#6E90C9", fontSize:14, ...MONO, fontWeight:700, marginBottom:6 }}>STRIPE WEBHOOK EVENTS TO HANDLE</div>
          <div className="grid md:grid-cols-2 gap-2">
            {["payment_intent.succeeded → mark fee as paid + send confirmation email","customer.subscription.deleted → check for continuation fee before suspending","invoice.payment_failed → send warning before suspension"].map(e => (
              <div key={e} style={{ color:"#8A9AB8", fontSize:15 }}>• {e}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
