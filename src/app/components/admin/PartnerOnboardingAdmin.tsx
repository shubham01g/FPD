import React, { useState, useEffect } from "react";
import {
  Copy, CheckCircle, Send, Building, Search, Globe,
  Edit2, Plus, X, Save, DollarSign, Percent, Users,
  ToggleLeft, ToggleRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../utils/clipboard";
import {
  getPackages, updatePackage, createPackage,
  getSales, getProcessors, updateProcessor, calcMonthlyCharge,
} from "../../services/wlPackages";
import type { WLPackage, WLSale, PaymentProcessor, BillingModel } from "../../services/wlPackages";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = {
  background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)",
  color:"#FFFFFF", fontSize:13, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%",
};

type Tab = "packages" | "sales" | "links" | "processors";

/* ── Billing model editor ─────────────────────────────────────────── */
function BillingEditor({
  billing, onChange,
}: { billing: BillingModel; onChange: (b: BillingModel) => void }) {
  const setupFee = billing.setupFee;
  const modelTypes = [
    { id:"flat_monthly",       label:"Flat Monthly",    icon:<DollarSign size={13}/>, desc:"Fixed charge each month" },
    { id:"per_user_flat",      label:"$/User/Month",    icon:<Users size={13}/>,      desc:"$X per user, with a floor" },
    { id:"per_user_percentage",label:"% of Revenue",   icon:<Percent size={13}/>,    desc:"% of partner's user MRR" },
  ];

  function switchModel(id: string) {
    const flat = (billing as any).flatMonthly ?? (billing as any).minMonthly ?? 2999;
    if (id === "flat_monthly") onChange({ type:"flat_monthly", flatMonthly:flat, setupFee });
    if (id === "per_user_flat") onChange({ type:"per_user_flat", perUserAmount:2.99, setupFee, minMonthly:flat });
    if (id === "per_user_percentage") onChange({ type:"per_user_percentage", percentOfRevenue:15, setupFee, minMonthly:flat });
  }

  return (
    <div className="space-y-4">
      <div>
        <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:8 }}>BILLING MODEL</label>
        <div className="grid grid-cols-3 gap-2">
          {modelTypes.map(t => (
            <button key={t.id} onClick={() => switchModel(t.id)}
              className="flex flex-col items-center gap-1 p-3 rounded-2xl transition-all"
              style={{ background:billing.type===t.id?"rgba(91,110,225,0.1)":"rgba(91,110,225,0.04)",
                border:`1px solid ${billing.type===t.id?"#5B6EE1":"rgba(91,110,225,0.12)"}`,
                color:billing.type===t.id?"#FFFFFF":"#8A9AB8" }}>
              {t.icon}
              <span style={{ fontSize:10, fontWeight:700 }}>{t.label}</span>
              <span style={{ fontSize:9, color:"#8A9AB8", lineHeight:1.3, textAlign:"center" }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>ONE-TIME SETUP FEE ($)</label>
        <input type="number" value={billing.setupFee}
          onChange={e => onChange({ ...billing, setupFee:Number(e.target.value) } as BillingModel)}
          style={INPUT}/>
      </div>

      {billing.type === "flat_monthly" && (
        <div>
          <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>FLAT MONTHLY ($)</label>
          <input type="number" value={billing.flatMonthly}
            onChange={e => onChange({ ...billing, flatMonthly:Number(e.target.value) })}
            style={INPUT}/>
        </div>
      )}

      {billing.type === "per_user_flat" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>$ PER USER/MO</label>
            <input type="number" step="0.01" value={billing.perUserAmount}
              onChange={e => onChange({ ...billing, perUserAmount:Number(e.target.value) })}
              style={INPUT}/>
          </div>
          <div>
            <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>MINIMUM MONTHLY ($)</label>
            <input type="number" value={billing.minMonthly}
              onChange={e => onChange({ ...billing, minMonthly:Number(e.target.value) })}
              style={INPUT}/>
          </div>
        </div>
      )}

      {billing.type === "per_user_percentage" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>% OF USER REVENUE</label>
            <input type="number" step="0.1" value={billing.percentOfRevenue}
              onChange={e => onChange({ ...billing, percentOfRevenue:Number(e.target.value) })}
              style={INPUT}/>
          </div>
          <div>
            <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>MINIMUM MONTHLY ($)</label>
            <input type="number" value={billing.minMonthly}
              onChange={e => onChange({ ...billing, minMonthly:Number(e.target.value) })}
              style={INPUT}/>
          </div>
        </div>
      )}

      {/* Live charge preview */}
      <div className="p-3 rounded-2xl" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
        <div style={{ color:"#D99A6B", fontSize:9, ...MONO, marginBottom:6 }}>CHARGE PREVIEW</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[50, 200, 1000].map(n => (
            <div key={n}>
              <div style={{ color:"#8A9AB8", fontSize:8, ...MONO }}>{n} USERS</div>
              <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:700 }}>${calcMonthlyCharge(billing, n).toLocaleString()}/mo</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Package editor modal ─────────────────────────────────────────── */
const DEFAULT_PKG: WLPackage = {
  id:"", name:"New Package", tier:"CUSTOM", userLimit:500, userLimitLabel:"Up to 500 users",
  billing:{ type:"flat_monthly", flatMonthly:2999, setupFee:2500 },
  commission:20, color:"#6E90C9", badge:null, features:["Feature 1"],
  active:true, stripeProductId:null, stripePriceId:null,
  onboardingLink:"finalpassdown.com/partner/onboard?tier=custom",
  processorOverride:null,
};

function PackageModal({ pkg, onClose, onSave }: {
  pkg: WLPackage | null; onClose: () => void; onSave: () => void;
}) {
  const isNew = !pkg;
  const [form, setForm] = useState<WLPackage>(pkg ?? DEFAULT_PKG);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) { toast.error("Package name required"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await createPackage(form);
        toast.success("Package created — website pricing updated live");
      } else {
        await updatePackage(form.id, form);
        toast.success("Package saved — website pricing updated live");
      }
      onSave();
      onClose();
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-y-auto" style={{ ...CARD, maxHeight:"92vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ background:"#0A0F1A", borderColor:"rgba(91,110,225,0.2)" }}>
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#E8EDF5" }}>
            {isNew ? "Create Package" : `Edit: ${form.name}`}
          </h3>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {([ ["name","PACKAGE NAME","Agency Partner"], ["tier","TIER LABEL","AGENCY"], ["userLimitLabel","USER LIMIT","Up to 500 users"] ] as [keyof WLPackage, string, string][]).map(([k, lbl, ph]) => (
              <div key={k as string}>
                <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>{lbl}</label>
                <input value={String(form[k] ?? "")} placeholder={ph}
                  onChange={e => setForm(p => ({ ...p, [k]: k==="tier" ? e.target.value.toUpperCase() : e.target.value }))}
                  style={INPUT}/>
              </div>
            ))}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>COMMISSION % (lifetime)</label>
              <input type="number" value={form.commission}
                onChange={e => setForm(p => ({ ...p, commission:Number(e.target.value) }))}
                style={INPUT}/>
            </div>
            <div>
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>ACCENT COLOR</label>
              <div className="flex gap-2">
                <input type="color" value={form.color}
                  onChange={e => setForm(p => ({ ...p, color:e.target.value }))}
                  style={{ width:40, height:36, borderRadius:8, border:"1px solid rgba(91,110,225,0.2)", padding:2 }}/>
                <input value={form.color} onChange={e => setForm(p => ({ ...p, color:e.target.value }))} style={{ ...INPUT, flex:1 }}/>
              </div>
            </div>
            <div>
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>BADGE (optional)</label>
              <input value={form.badge ?? ""} placeholder="Most Popular"
                onChange={e => setForm(p => ({ ...p, badge:e.target.value || null }))}
                style={INPUT}/>
            </div>
          </div>

          <div className="p-4 rounded-2xl" style={{ background:"rgba(91,110,225,0.03)", border:"1px solid rgba(91,110,225,0.1)" }}>
            <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:600, marginBottom:12 }}>Billing Configuration</div>
            <BillingEditor billing={form.billing} onChange={b => setForm(p => ({ ...p, billing:b }))}/>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>FEATURES LIST</label>
              <button onClick={() => setForm(p => ({ ...p, features:[...p.features,"New feature"] }))}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-xl"
                style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
                <Plus size={11}/> Add
              </button>
            </div>
            <div className="space-y-2">
              {form.features.map((feat, i) => (
                <div key={i} className="flex gap-2">
                  <input value={feat} style={{ ...INPUT, flex:1 }}
                    onChange={e => { const f=[...form.features]; f[i]=e.target.value; setForm(p=>({...p,features:f})); }}/>
                  <button onClick={() => setForm(p => ({ ...p, features:p.features.filter((_,j)=>j!==i) }))}
                    style={{ color:"#FC8181" }}><X size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>STRIPE PRODUCT ID</label>
              <input value={form.stripeProductId ?? ""} placeholder="prod_..."
                onChange={e => setForm(p => ({ ...p, stripeProductId:e.target.value||null }))}
                style={INPUT}/>
            </div>
            <div>
              <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>STRIPE PRICE ID</label>
              <input value={form.stripePriceId ?? ""} placeholder="price_..."
                onChange={e => setForm(p => ({ ...p, stripePriceId:e.target.value||null }))}
                style={INPUT}/>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
            <div>
              <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:500 }}>Package Active</div>
              <div style={{ color:"#8A9AB8", fontSize:11 }}>When off, hidden from the website and onboarding</div>
            </div>
            <button onClick={() => setForm(p => ({ ...p, active:!p.active }))}
              style={{ color:form.active?"#D99A6B":"#8A9AB8" }}>
              {form.active ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", opacity:saving?0.7:1 }}>
              <Save size={14}/>{saving ? "Saving…" : isNew ? "Create Package" : "Save Changes"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-2xl text-sm"
              style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export function PartnerOnboardingAdmin() {
  const [tab, setTab] = useState<Tab>("packages");
  const [packages, setPackages] = useState<WLPackage[]>([]);
  const [sales, setSales] = useState<WLSale[]>([]);
  const [processors, setProcessors] = useState<PaymentProcessor[]>([]);
  const [editPkg, setEditPkg] = useState<WLPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendPkgId, setSendPkgId] = useState("agency");

  async function reload() {
    setPackages(await getPackages());
    setSales(await getSales());
    setProcessors(await getProcessors());
  }
  useEffect(() => { reload(); }, []);

  function doCopy(tierId: string) {
    const link = `https://finalpassdown.com/partner/onboard?tier=${tierId}&token=${Date.now().toString(36).toUpperCase()}`;
    copyToClipboard(link);
    setCopiedId(tierId);
    toast.success("Onboarding link copied");
    setTimeout(() => setCopiedId(null), 3000);
  }

  const activeSales = sales.filter(s => s.status === "active");
  const totalMRR = activeSales.reduce((s, a) => s + a.mrr, 0);
  const totalUsers = activeSales.reduce((s, a) => s + a.users, 0);
  const totalRevenue = sales.reduce((s, a) => s + a.totalPaid, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id:"packages",   label:"📦 Packages" },
    { id:"sales",      label:"📊 WL Sales" },
    { id:"links",      label:"🔗 Onboarding Links" },
    { id:"processors", label:"💳 Payment Processors" },
  ];

  return (
    <div style={{ background:"transparent", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }} className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building size={15} color="#FFFFFF"/>
              <span style={{ color:"#6E90C9", fontSize:11, ...MONO, letterSpacing:"0.1em" }}>ADMIN · WL ONBOARDING CONTROL</span>
            </div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#E8EDF5" }}>WL Onboarding Control</h1>
            <p style={{ color:"#8A9AB8", fontSize:13, marginTop:4 }}>
              Edit packages + billing models, track sales, manage payment processors. Changes reflect live on the website.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9", border:"1px solid rgba(91,110,225,0.2)" }}>
              <Plus size={14}/> New Package
            </button>
            <button onClick={() => setShowSend(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#fff", boxShadow:"0 4px 12px rgba(91,110,225,0.3)" }}>
              <Send size={14}/> Send Invite
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Active WL Accounts",  value:activeSales.length,                  color:"#6E90C9" },
            { label:"Total WL Users",       value:totalUsers.toLocaleString(),         color:"#D99A6B" },
            { label:"WL Platform MRR",      value:`$${totalMRR.toLocaleString()}`,     color:"#6FAE8B" },
            { label:"Total WL Revenue",     value:`$${totalRevenue.toLocaleString()}`, color:"#F6AD55" },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:24, color:s.color }}>{s.value}</div>
              <div style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:"#0A0F1A", border:"1px solid rgba(91,110,225,0.25)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background:tab===t.id?"#5B6EE1":"transparent", color:tab===t.id?"#fff":"#8A9AB8" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        {(tab === "packages" || tab === "sales") && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={CARD}>
            <Search size={13} color="#8A9AB8"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:13, flex:1 }}/>
          </div>
        )}

        {/* ── Packages ── */}
        {tab === "packages" && (
          <div className="space-y-4">
            {packages.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(pkg => {
              const b = pkg.billing;
              const billingStr = b.type === "flat_monthly"
                ? `$${b.flatMonthly.toLocaleString()}/mo flat`
                : b.type === "per_user_flat"
                  ? `$${b.perUserAmount}/user/mo (min $${b.minMonthly.toLocaleString()})`
                  : `${b.percentOfRevenue}% of revenue (min $${b.minMonthly.toLocaleString()})`;
              return (
                <div key={pkg.id} className="p-5 rounded-2xl" style={CARD}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ width:36, height:36, borderRadius:10, background:`${pkg.color}15`, border:`1px solid ${pkg.color}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:pkg.color }}/>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#E8EDF5" }}>{pkg.name}</span>
                          {pkg.badge && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background:`${pkg.color}15`, color:pkg.color, ...MONO }}>{pkg.badge}</span>}
                          {!pkg.active && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(107,114,128,0.12)", color:"#6B7FA8", ...MONO }}>INACTIVE</span>}
                        </div>
                        <div style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>{pkg.userLimitLabel} · {pkg.commission}% lifetime commission</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditPkg(pkg)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
                        <Edit2 size={11}/> Edit
                      </button>
                      <button onClick={async () => {
                        await updatePackage(pkg.id, { active:!pkg.active });
                        reload();
                        toast.success(pkg.active ? "Package deactivated" : "Package activated — live on website");
                      }} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ background:pkg.active?"rgba(229,62,62,0.08)":"rgba(72,187,120,0.08)", color:pkg.active?"#FC8181":"#D99A6B" }}>
                        {pkg.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>BILLING MODEL</div>
                      <div style={{ color:"#E8EDF5", fontSize:11, fontWeight:600, marginTop:2 }}>{billingStr}</div>
                    </div>
                    <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>SETUP FEE</div>
                      <div style={{ color:"#E8EDF5", fontSize:12, fontWeight:700, marginTop:2 }}>${b.setupFee.toLocaleString()}</div>
                    </div>
                    <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>STRIPE PRODUCT</div>
                      <div style={{ color:pkg.stripeProductId?"#6E90C9":"#FC8181", fontSize:11, ...MONO, marginTop:2 }}>
                        {pkg.stripeProductId ?? "⚠ Not linked"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-3">
                    {[50, 200, 1000].map(n => (
                      <div key={n} className="flex-1 text-center px-2 py-1.5 rounded-xl" style={{ background:"rgba(91,110,225,0.05)" }}>
                        <div style={{ color:"#8A9AB8", fontSize:8, ...MONO }}>{n} USERS</div>
                        <div style={{ color:pkg.color, fontSize:12, fontWeight:700 }}>
                          ${calcMonthlyCharge(pkg.billing, n).toLocaleString()}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── WL Sales ── */}
        {tab === "sales" && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#E8EDF5", marginBottom:14 }}>Revenue by Package</div>
              <div className="space-y-3">
                {packages.map(pkg => {
                  const pkgMRR = activeSales.filter(s => s.packageId === pkg.id).reduce((s, a) => s + a.mrr, 0);
                  const count = activeSales.filter(s => s.packageId === pkg.id).length;
                  const maxMRR = Math.max(...packages.map(p => activeSales.filter(s=>s.packageId===p.id).reduce((s,a)=>s+a.mrr,0)), 1);
                  return (
                    <div key={pkg.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ color:"#E8EDF5", fontSize:13 }}>{pkg.name}</span>
                        <span style={{ color:pkg.color, fontSize:12, fontWeight:700, ...MONO }}>${pkgMRR.toLocaleString()}/mo · {count} accounts</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                        <div className="h-2 rounded-full" style={{ width:`${(pkgMRR/maxMRR)*100}%`, background:pkg.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl overflow-auto" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background:"rgba(255,255,255,0.08)", borderBottom:"1px solid rgba(91,110,225,0.1)" }}>
                    {["ID","Organization","Package","Users","MRR","Total Paid","Processor","Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left" style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.filter(s => !search || s.org.toLowerCase().includes(search.toLowerCase())).map((s, i) => {
                    const pkg = packages.find(p => p.id === s.packageId);
                    const statusColor = ({ active:"#48BB78", pending:"#F6AD55", suspended:"#FC8181", cancelled:"#8A9AB8" } as Record<string,string>)[s.status] ?? "#8A9AB8";
                    return (
                      <tr key={s.id} style={{ background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderBottom:"1px solid rgba(91,110,225,0.06)" }}>
                        <td className="px-4 py-3" style={{ color:"#6E90C9", fontSize:10, ...MONO }}>{s.id}</td>
                        <td className="px-4 py-3">
                          <div style={{ color:"#E8EDF5", fontSize:12, fontWeight:500 }}>{s.org}</div>
                          <div style={{ color:"#8A9AB8", fontSize:10 }}>{s.subdomain}</div>
                        </td>
                        <td className="px-4 py-3" style={{ color:pkg?.color ?? "#8A9AB8", fontSize:11, fontWeight:600 }}>{pkg?.name ?? s.packageId}</td>
                        <td className="px-4 py-3" style={{ color:"#E8EDF5", fontSize:12, ...MONO }}>{s.users.toLocaleString()}</td>
                        <td className="px-4 py-3" style={{ color:"#6FAE8B", fontSize:12, fontWeight:700, ...MONO }}>${s.mrr.toLocaleString()}</td>
                        <td className="px-4 py-3" style={{ color:"#E8EDF5", fontSize:12, ...MONO }}>${s.totalPaid.toLocaleString()}</td>
                        <td className="px-4 py-3" style={{ color:"#8A9AB8", fontSize:11 }}>{s.processor}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ background:`${statusColor}18`, color:statusColor, ...MONO }}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Onboarding Links ── */}
        {tab === "links" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.15)" }}>
              <AlertCircle size={14} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
              <p style={{ color:"#8A9AB8", fontSize:12 }}>
                Each link includes a one-time token. When a prospect clicks it, the onboarding wizard opens pre-set to that package. Copy and share directly, or use Email Invite.
              </p>
            </div>

            {packages.map(pkg => (
              <div key={pkg.id} className="p-5 rounded-2xl" style={CARD}>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ width:8, height:8, borderRadius:"50%", background:pkg.color }}/>
                  <span style={{ color:pkg.color, fontSize:11, fontWeight:700, ...MONO }}>{pkg.tier}</span>
                  <span style={{ color:"#E8EDF5", fontSize:14, fontWeight:500 }}>{pkg.name}</span>
                  {!pkg.active && <span style={{ color:"#8A9AB8", fontSize:10 }}>(inactive)</span>}
                </div>
                <div className="flex items-center gap-2 p-3 rounded-2xl mb-3"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(91,110,225,0.1)" }}>
                  <Globe size={11} color="#8A9AB8"/>
                  <span style={{ color:"#8A9AB8", fontSize:11, ...MONO, flex:1 }} className="truncate">
                    https://finalpassdown.com/partner/onboard?tier={pkg.id}&token=XXXXXX
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => doCopy(pkg.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold flex-1"
                    style={{ background:copiedId===pkg.id?"rgba(72,187,120,0.12)":`${pkg.color}12`, color:copiedId===pkg.id?"#D99A6B":pkg.color }}>
                    {copiedId===pkg.id ? <><CheckCircle size={11}/>Copied!</> : <><Copy size={11}/>Copy Unique Link</>}
                  </button>
                  <button onClick={() => { setSendPkgId(pkg.id); setShowSend(true); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{ background:"rgba(91,110,225,0.06)", color:"#6E90C9" }}>
                    <Send size={11}/> Email Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Payment Processors ── */}
        {tab === "processors" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl" style={{ background:"rgba(91,110,225,0.03)", border:"1px solid rgba(91,110,225,0.15)" }}>
              <p style={{ color:"#8A9AB8", fontSize:12 }}>
                Enable processors for WL billing. The <strong>default</strong> is used for new WL accounts.
                WL partners can also bring their own processor — configure a per-package override in the package editor.
              </p>
            </div>

            {processors.map(proc => (
              <div key={proc.id} className="p-5 rounded-2xl" style={CARD}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize:28 }}>{proc.logo}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#E8EDF5" }}>{proc.name}</span>
                        {proc.isDefault && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(91,110,225,0.1)", color:"#6E90C9", ...MONO }}>DEFAULT</span>}
                      </div>
                      <div style={{ color:"#8A9AB8", fontSize:11, marginTop:2 }}>
                        {proc.enabled ? "Active" : "Disabled"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {proc.enabled && !proc.isDefault && (
                      <button onClick={async () => {
                        await updateProcessor(proc.id, { isDefault:true });
                        setProcessors(await getProcessors());
                        toast.success(`${proc.name} set as default processor`);
                      }} className="text-xs px-3 py-1.5 rounded-xl font-semibold"
                        style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
                        Set Default
                      </button>
                    )}
                    <button onClick={async () => {
                      await updateProcessor(proc.id, { enabled:!proc.enabled });
                      setProcessors(await getProcessors());
                      toast.success(`${proc.name} ${proc.enabled ? "disabled" : "enabled"}`);
                    }} style={{ color:proc.enabled?"#D99A6B":"#8A9AB8" }}>
                      {proc.enabled ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                    </button>
                  </div>
                </div>

                {proc.enabled ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(proc.config).map(([key, val]) => (
                      <div key={key}>
                        <label style={{ color:"#8A9AB8", fontSize:9, ...MONO, display:"block", marginBottom:4 }}>
                          {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                        </label>
                        <input defaultValue={val}
                          type={key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") ? "password" : "text"}
                          placeholder={key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") ? "••••••••••" : `Enter ${key}`}
                          style={INPUT}
                          onChange={e => updateProcessor(proc.id, { config:{ ...proc.config, [key]:e.target.value } })}/>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3" style={{ color:"#8A9AB8", fontSize:12 }}>
                    Enable to configure credentials
                  </div>
                )}
              </div>
            ))}

            <div className="p-5 text-center rounded-2xl"
              style={{ border:"2px dashed rgba(91,110,225,0.2)", borderRadius:22 }}>
              <div style={{ color:"#8A9AB8", fontSize:13, fontWeight:500, marginBottom:4 }}>Need a custom processor deal?</div>
              <div style={{ color:"#8A9AB8", fontSize:12, marginBottom:12 }}>
                Contact integrations@finalpassdown.com to add a processor or integrate a WL partner's existing payment system.
              </div>
              <button onClick={() => toast.success("Request sent to integrations team")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold"
                style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
                <Plus size={13}/> Request Custom Integration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send invite modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-7" style={CARD}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#E8EDF5" }}>Send Onboarding Invite</h3>
              <button onClick={() => setShowSend(false)} style={{ color:"#8A9AB8" }}><X size={16}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>PACKAGE</label>
                <div className="flex flex-wrap gap-2">
                  {packages.filter(p => p.active).map(p => (
                    <button key={p.id} onClick={() => setSendPkgId(p.id)}
                      className="px-3 py-1.5 rounded-2xl text-xs font-bold"
                      style={{ background:sendPkgId===p.id?`${p.color}15`:"rgba(91,110,225,0.04)",
                        border:`1px solid ${sendPkgId===p.id?p.color:"rgba(91,110,225,0.12)"}`,
                        color:sendPkgId===p.id?p.color:"#8A9AB8" }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>RECIPIENT EMAIL</label>
                <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                  placeholder="contact@organization.com" style={INPUT}/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => {
                  if (!sendEmail) { toast.error("Email required"); return; }
                  toast.success(`Invite sent to ${sendEmail}`);
                  setSendEmail(""); setShowSend(false);
                }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                  style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
                  <Send size={14}/> Send Invite
                </button>
                <button onClick={() => setShowSend(false)} className="px-5 py-3 rounded-2xl text-sm"
                  style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package modal */}
      {(editPkg !== null || creating) && (
        <PackageModal
          pkg={editPkg}
          onClose={() => { setEditPkg(null); setCreating(false); }}
          onSave={reload}/>
      )}
    </div>
  );
}
