import React, { useState } from "react";
import { Shield, Plus, X, Calendar, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Phone, Globe, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes, wills & personal assets) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#808BAA";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

const CATEGORIES = ["Electronics","Appliances","HVAC / Plumbing","Roofing / Structure","Vehicles","Furniture","Jewelry","Tools / Power Tools","Lawn & Garden","Sporting Goods","Medical Devices","Other"];

interface Warranty {
  id: number;
  product: string;
  brand: string;
  model: string;
  serialNum: string;
  category: string;
  purchaseDate: string;
  purchasedFrom: string;
  price: string;
  warrantyType: string;
  provider: string;
  providerPhone: string;
  providerWebsite: string;
  expiryDate: string;
  coverageDetails: string;
  claimInstructions: string;
  notes: string;
  documents: string[];
  photo: string;
}

const initWarranties: Warranty[] = [
  { id:1, product:"55\" OLED Smart TV", brand:"LG", model:"OLED55C3PUA", serialNum:"LG-SN-8821492", category:"Electronics", purchaseDate:"Nov 25, 2023", purchasedFrom:"Best Buy — Sacramento", price:"$1,299", warrantyType:"Manufacturer + Extended (Geek Squad)", provider:"LG / Best Buy Geek Squad", providerPhone:"1-800-243-0000", providerWebsite:"geeksquad.com", expiryDate:"Nov 25, 2026", coverageDetails:"Manufacturer 1 year (expired). Geek Squad extended 3-year plan covers screen defects, remote, and all components. Does NOT cover physical damage.", claimInstructions:"Call 1-800-GEEKSQUAD or visit Best Buy with proof of purchase. Purchase ID: GSP-8821492.", notes:"Extended protection plan purchased separately. Registration confirmed online.", documents:["LG_Warranty_Card.pdf","Geek_Squad_Protection_Plan.pdf"] },
  { id:2, product:"Central Air Conditioning System", brand:"Carrier", model:"24ACC636A003", serialNum:"CAR-29182-CA", category:"HVAC / Plumbing", purchaseDate:"May 18, 2022", purchasedFrom:"Sacramento Heating & Cooling Co.", price:"$8,400 (installed)", warrantyType:"Manufacturer (10-year parts / 10-year compressor)", provider:"Carrier HVAC", providerPhone:"1-800-227-7437", providerWebsite:"carrier.com/warranty", expiryDate:"May 18, 2032", coverageDetails:"10-year limited warranty on all parts. 10-year compressor warranty. Labor NOT included after first year — use licensed Carrier dealer for service.", claimInstructions:"Call Carrier warranty line or contact Sacramento Heating & Cooling (original installer). Must use authorized dealer or warranty is void.", notes:"Unit is registered with Carrier under our home address. Annual maintenance required to keep warranty valid — scheduled every May.", documents:["Carrier_Warranty_Registration.pdf","Installation_Receipt.pdf"] },
  { id:3, product:"French Door Refrigerator", brand:"Samsung", model:"RF28R7201SR", serialNum:"SN-RF28-0492818", category:"Appliances", purchaseDate:"Jan 12, 2023", purchasedFrom:"Home Depot", price:"$1,899", warrantyType:"Manufacturer (1-year parts & labor / 5-year compressor)", provider:"Samsung Electronics", providerPhone:"1-800-726-7864", providerWebsite:"samsung.com/us/support", expiryDate:"Jan 12, 2028 (compressor)", coverageDetails:"1-year full warranty expired. 5-year sealed system and compressor warranty still active through Jan 2028.", claimInstructions:"Call Samsung support or schedule service at samsung.com. Have model and serial number ready.", notes:"Ice maker had minor issue in 2024 — repaired under original warranty. Compressor warranty still active.", documents:["Samsung_Warranty_Card.pdf"] },
  { id:4, product:"2021 Toyota Camry XSE", brand:"Toyota", model:"Camry XSE", serialNum:"4T1BZ1HK8MU024891", category:"Vehicles", purchaseDate:"Feb 8, 2021", purchasedFrom:"Toyota of Sacramento", price:"$28,400", warrantyType:"Manufacturer (3-year/36k basic + 5-year/60k powertrain)", provider:"Toyota Motor Corp.", providerPhone:"1-800-331-4331", providerWebsite:"toyota.com/upcoming-vehicle-maintenance", expiryDate:"Feb 8, 2026 (powertrain)", coverageDetails:"3-year/36,000-mile bumper-to-bumper expired. 5-year/60,000-mile powertrain warranty active through Feb 2026. Rust perforation 5-year.", claimInstructions:"Take to any Toyota dealership. VIN required. Oil change records must be maintained.", notes:"Current mileage ~48,200. Powertrain warranty still active. Next service due at 50,000 miles.", documents:["Toyota_Warranty_Booklet.pdf","Purchase_Agreement.pdf"] },
  { id:5, product:"Home Warranty — Annual Plan", brand:"American Home Shield", model:"ShieldPlatinum Plan", serialNum:"AHS-PLAN-2029184", category:"Other", purchaseDate:"Jan 1, 2026", purchasedFrom:"American Home Shield", price:"$1,044/year", warrantyType:"Home Warranty (HVAC, plumbing, electrical, appliances)", provider:"American Home Shield", providerPhone:"1-888-429-8247", providerWebsite:"ahs.com", expiryDate:"Dec 31, 2026", coverageDetails:"ShieldPlatinum covers: all major home systems (HVAC, plumbing, electrical), kitchen appliances, washer/dryer, garage door opener. $100 service call fee per claim.", claimInstructions:"Login to ahs.com or call 1-888-429-8247 to submit a claim. Technician dispatched within 24–48 hours. Keep all receipts.", notes:"Auto-renews annually on Jan 1. Can cancel within 30 days. Covers primary residence at 1842 Oak Ridge Drive.", documents:["AHS_Contract_2026.pdf"] },
];

function getDaysUntilExpiry(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.round((d.getTime() - Date.now()) / (1000*60*60*24));
}

function ExpiryBadge({ date }: { date:string }) {
  if (date.includes("Lifetime") || date === "—") return <span className="dbadge pos"><CheckCircle size={11} /> LIFETIME</span>;
  const days = getDaysUntilExpiry(date);
  if (days < 0) return <span className="dbadge neg"><XCircle size={11} /> EXPIRED</span>;
  if (days < 90) return <span className="dbadge warn"><AlertTriangle size={11} /> EXPIRES IN {days}d</span>;
  return <span className="dbadge pos"><CheckCircle size={11} /> ACTIVE</span>;
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-warr so nothing else in the app is affected. */
const WARR_CSS = `
.fpd-warr{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-warr *{box-sizing:border-box;}
.fpd-warr-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-warr .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-warr .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-warr .card.pad{padding:22px;}
.fpd-warr .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-warr .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-warr .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-warr .pg-sub{color:${MUTED};font-size:13px;max-width:640px;line-height:1.6;}
.fpd-warr .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-warr .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-warr .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-warr .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;background:rgba(95,190,145,0.12);color:${POS};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-warr .btn-pos:hover{background:rgba(95,190,145,0.2);}

/* KPI ledger */
.fpd-warr .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-warr .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-warr .kcell:first-child{border-left:none;}
.fpd-warr .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-warr .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-warr .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-warr .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-warr .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-warr .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-warr .kstrip{grid-template-columns:1fr 1fr;}.fpd-warr .kcell:nth-child(3){border-left:none;}.fpd-warr .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* filter chips */
.fpd-warr .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-warr .filters .flabel{font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:${FAINT};margin-right:2px;}
.fpd-warr .chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid rgba(91,110,225,0.32);background:rgba(91,110,225,0.14);color:${ACCENT2};transition:opacity .16s,background .16s,border-color .16s;}
.fpd-warr .chip.off{opacity:.48;background:transparent;border-color:rgba(255,255,255,0.09);color:${MUTED};}
.fpd-warr .chip.off:hover{opacity:.72;}

/* record cards */
.fpd-warr .dlist{display:flex;flex-direction:column;gap:14px;}
.fpd-warr .dico{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:${ACCENT2};}
.fpd-warr .dtype{font-family:var(--font-display);font-size:15.5px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-warr .dbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-warr .dbadge.pos{background:rgba(95,190,145,0.14);color:${POS};}
.fpd-warr .dbadge.warn{background:rgba(217,165,94,0.14);color:${WARN};}
.fpd-warr .dbadge.neg{background:rgba(208,107,107,0.14);color:${NEG};}
.fpd-warr .catbadge{display:inline-flex;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:${ACCENT2};}

/* row header / expand */
.fpd-warr .wr-head{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;background:none;border:none;cursor:pointer;text-align:left;font-family:var(--font-body);}
.fpd-warr .wr-left{display:flex;align-items:flex-start;gap:14px;min-width:0;}
.fpd-warr .wr-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px;}
.fpd-warr .wr-brand{color:${MUTED};font-size:12.5px;}
.fpd-warr .wr-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.fpd-warr .wr-meta span{display:inline-flex;align-items:center;gap:5px;color:${MUTED};font-size:12px;}
.fpd-warr .wr-body{padding:0 22px 22px;border-top:1px solid rgba(255,255,255,0.22);display:flex;flex-direction:column;gap:16px;}

.fpd-warr .dgrid{display:grid;grid-template-columns:repeat(2,1fr);border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);overflow:hidden;margin-top:16px;}
.fpd-warr .dgrid .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-warr .dgrid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}
.fpd-warr .tile{padding:12px 14px;}
.fpd-warr .tile .tk{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-warr .tile .tv{color:${TEXT};font-size:13px;line-height:1.5;}
@media (max-width:640px){
.fpd-warr .dgrid{grid-template-columns:1fr;}
.fpd-warr .dgrid .tile:nth-child(2n){border-left:none;}
.fpd-warr .dgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.22);}
}

/* info notes */
.fpd-warr .note{padding:13px 15px;border-radius:12px;font-size:13px;line-height:1.7;color:${SOFT};}
.fpd-warr .note .nk{font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:5px;}
.fpd-warr .note.pos{background:rgba(95,190,145,0.06);border:1px solid rgba(95,190,145,0.22);}
.fpd-warr .note.pos .nk{color:${POS};}
.fpd-warr .note.info{background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);}
.fpd-warr .note.info .nk{color:${ACCENT2};}
.fpd-warr .note.warn{background:rgba(217,165,94,0.06);border:1px solid rgba(217,165,94,0.2);}
.fpd-warr .note.warn .nk{color:${WARN};}

/* documents */
.fpd-warr .doclbl{font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:8px;}
.fpd-warr .docs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.fpd-warr .docchip{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;font-size:12px;background:rgba(91,110,225,0.08);color:${ACCENT2};border:1px solid rgba(91,110,225,0.18);cursor:pointer;font-family:var(--font-body);}

/* photo frame */
.fpd-warr .photo-frame{position:relative;height:160px;background:#0F1624;border-bottom:1px solid rgba(255,255,255,0.22);overflow:hidden;}
.fpd-warr .photo-frame img{width:100%;height:100%;object-fit:cover;display:block;}

/* modal */
.fpd-warr .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-warr .modal{width:100%;max-width:540px;max-height:90vh;overflow-y:auto;}
.fpd-warr .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-warr .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-warr .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-warr .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-warr .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-warr .field input,.fpd-warr .field select,.fpd-warr .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-warr .field input::placeholder,.fpd-warr .field textarea::placeholder{color:${FAINT};}
.fpd-warr .field input:focus,.fpd-warr .field select:focus,.fpd-warr .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-warr .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-warr .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-warr .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function Warranties() {
  const [warranties, setWarranties] = useState<Warranty[]>(initWarranties);
  const [expanded, setExpanded] = useState<number|null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ product:"", brand:"", model:"", serialNum:"", category:CATEGORIES[0], purchaseDate:"", purchasedFrom:"", price:"", warrantyType:"", provider:"", providerPhone:"", providerWebsite:"", expiryDate:"", coverageDetails:"", claimInstructions:"", notes:"", photo:"" });

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function addWarranty() {
    if (!form.product) { toast.error("Product name required"); return; }
    setWarranties(p => [...p, { ...form, id:Date.now(), documents:[], photo:form.photo||"" }]);
    toast.success(`Warranty for "${form.product}" added`);
    setForm({ product:"", brand:"", model:"", serialNum:"", category:CATEGORIES[0], purchaseDate:"", purchasedFrom:"", price:"", warrantyType:"", provider:"", providerPhone:"", providerWebsite:"", expiryDate:"", coverageDetails:"", claimInstructions:"", notes:"" });
    setShowAdd(false);
  }

  const filtered = warranties.filter(w => filterCat==="all" || w.category===filterCat);
  const active = warranties.filter(w => getDaysUntilExpiry(w.expiryDate) >= 0 || w.expiryDate.includes("Lifetime")).length;
  const expiringSoon = warranties.filter(w => { const d = getDaysUntilExpiry(w.expiryDate); return d>=0 && d<90; }).length;
  const expired = warranties.filter(w => getDaysUntilExpiry(w.expiryDate) < 0 && !w.expiryDate.includes("Lifetime")).length;

  const kpis = [
    { label: "Total", value: String(warranties.length), sub: "Warranties on file", icon: <Shield size={14} />, dot: ACCENT2 },
    { label: "Active", value: String(active), sub: "In good standing", icon: <CheckCircle size={14} />, dot: POS },
    { label: "Expiring < 90 Days", value: String(expiringSoon), sub: "Renew or replace soon", icon: <AlertTriangle size={14} />, dot: WARN },
    { label: "Expired", value: String(expired), sub: "No longer covered", icon: <XCircle size={14} />, dot: NEG },
  ];

  return (
    <div className="fpd-warr">
      <style dangerouslySetInnerHTML={{ __html: WARR_CSS }} />
      <div className="fpd-warr-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Shield size={12} /> Coverage Tracker</div>
            <h1 className="pg-h1">Warranties</h1>
            <div className="pg-sub">Track warranties for all products — when they expire, how to claim, and where the documents are stored.</div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Warranty
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Category filter chips ── */}
        <div className="card pad glow-surface">
          <div className="filters">
            <span className="flabel">FILTER</span>
            {["all", ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`chip ${filterCat === cat ? "" : "off"}`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Warranty list ── */}
        <div className="dlist">
          {filtered.map(w => (
            <div key={w.id} className="card glow-surface" style={{ overflow: "hidden" }}>
              {(w as any).photo && (
                <div className="photo-frame">
                  <img src={(w as any).photo} alt={w.product} />
                </div>
              )}
              <button className="wr-head" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
                <div className="wr-left">
                  <div className="dico"><Shield size={20} /></div>
                  <div>
                    <div className="wr-top">
                      <span className="dtype">{w.product}</span>
                      <span className="wr-brand">{w.brand}</span>
                      <ExpiryBadge date={w.expiryDate} />
                    </div>
                    <div className="wr-meta">
                      <span><Calendar size={10} /> Expires: {w.expiryDate}</span>
                      <span>{w.warrantyType}</span>
                      <span className="catbadge">{w.category}</span>
                    </div>
                  </div>
                </div>
                {expanded === w.id ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
              </button>

              {expanded === w.id && (
                <div className="wr-body">
                  <div className="dgrid">
                    {[["Brand / Make", w.brand], ["Model", w.model], ["Serial / Item #", w.serialNum || "—"], ["Purchase Date", w.purchaseDate], ["Purchased From", w.purchasedFrom], ["Purchase Price", w.price], ["Warranty Provider", w.provider], ["Provider Phone", w.providerPhone || "—"], ["Provider Website", w.providerWebsite || "—"], ["Expiry Date", w.expiryDate]].map(([label, value]) => (
                      <div key={label} className="tile">
                        <div className="tk">{label}</div>
                        <div className="tv">{value || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {w.coverageDetails && (
                    <div className="note pos">
                      <div className="nk">What's Covered</div>
                      <div>{w.coverageDetails}</div>
                    </div>
                  )}

                  {w.claimInstructions && (
                    <div className="note info">
                      <div className="nk">How To Claim</div>
                      <div>{w.claimInstructions}</div>
                    </div>
                  )}

                  {w.notes && (
                    <div className="note warn">
                      <div className="nk">Notes</div>
                      <div>{w.notes}</div>
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <div className="doclbl">Documents ({w.documents.length})</div>
                    <div className="docs">
                      {w.documents.map(d => (
                        <button key={d} className="docchip" onClick={() => toast.success(`Opening: ${d}`)}>
                          <FileText size={12} /> {d}
                        </button>
                      ))}
                      <ScanButton folder="personal" onUpload={doc => { setWarranties(p => p.map(x => x.id === w.id ? { ...x, documents: [...x.documents, doc.name] } : x)); toast.success(`"${doc.name}" added`); }} size="sm" label="Scan Document" />
                    </div>
                  </div>

                  {w.providerPhone && (
                    <div>
                      <button className="btn-pos" onClick={() => toast.success(`Calling warranty support: ${w.providerPhone}`)}>
                        <Phone size={11} /> Call Support
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Add warranty modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Warranty</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={form.photo} onChange={url => setForm(p => ({ ...p, photo: url }))} label="Product Photo (optional)" aspectRatio="4/3" />
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={F("category")}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {([
                  ["Product Name *", "product", "e.g. 55\" OLED Smart TV"],
                  ["Brand / Make", "brand", "e.g. LG, Samsung, Toyota"],
                  ["Model Number", "model", ""],
                  ["Serial Number", "serialNum", ""],
                  ["Purchase Date", "purchaseDate", "e.g. Nov 25, 2023"],
                  ["Purchased From", "purchasedFrom", "e.g. Best Buy"],
                  ["Purchase Price", "price", "e.g. $1,299"],
                  ["Warranty Type", "warrantyType", "e.g. Manufacturer 3-year, Extended Plan"],
                  ["Warranty Provider", "provider", "e.g. LG, Geek Squad"],
                  ["Provider Phone", "providerPhone", ""],
                  ["Provider Website", "providerWebsite", ""],
                  ["Expiry Date", "expiryDate", "e.g. Nov 25, 2026 or Lifetime"],
                  ["What's Covered", "coverageDetails", "Describe what is and isn't covered"],
                  ["How to Claim", "claimInstructions", "Steps to make a warranty claim"],
                  ["Notes", "notes", ""],
                ] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addWarranty}>Add Warranty</button>
                <button className="btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
