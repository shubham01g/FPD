import React, { useState } from "react";
import { Shield, Plus, X, Calendar, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Phone, Globe } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

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
  if (date.includes("Lifetime") || date === "—") return <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(72,187,120,0.12)", color:"#48BB78", ...MONO }}>LIFETIME</span>;
  const days = getDaysUntilExpiry(date);
  if (days < 0) return <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(252,129,129,0.12)", color:"#FC8181", ...MONO }}>EXPIRED</span>;
  if (days < 90) return <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(246,173,85,0.12)", color:"#F6AD55", ...MONO }}>EXPIRES IN {days}d</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(72,187,120,0.12)", color:"#48BB78", ...MONO }}>ACTIVE</span>;
}

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

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Warranties</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Track warranties for all products — when they expire, how to claim, and where the documents are stored.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Warranty
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total",value:warranties.length,color:"var(--primary)"},{label:"Active",value:active,color:"#48BB78"},{label:"Expiring < 90 Days",value:expiringSoon,color:"#F6AD55"},{label:"Expired",value:expired,color:"#FC8181"}].map(s=>(
          <div key={s.label} className="p-4 rounded-2xl text-center glow-surface" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {["all",...CATEGORIES].map(cat=>(
          <button key={cat} onClick={()=>setFilterCat(cat)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background:filterCat===cat?"var(--primary)":"rgba(58,91,217,0.05)", color:filterCat===cat?"#070D1A":"var(--muted-foreground)", border:`1px solid ${filterCat===cat?"var(--primary)":"rgba(58,91,217,0.12)"}` }}>
            {cat==="all" ? "All" : cat}
          </button>
        ))}
      </div>

      {/* Warranty list */}
      <div className="space-y-3">
        {filtered.map(w => (
          <div key={w.id} className="rounded-2xl overflow-hidden glow-surface" style={CARD}>
            {(w as any).photo && <img src={(w as any).photo} alt={w.product} style={{ width:"100%", height:160, objectFit:"cover" }}/>}
            <button className="w-full p-5 text-left" onClick={()=>setExpanded(expanded===w.id?null:w.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width:44, height:44, background:"rgba(58,91,217,0.08)" }}>
                    <Shield size={20} color="var(--primary)"/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontFamily:"var(--font-display)", fontSize:15, color:"var(--foreground)" }}>{w.product}</span>
                      <span style={{ color:"var(--muted-foreground)", fontSize:12 }}>{w.brand}</span>
                      <ExpiryBadge date={w.expiryDate}/>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Calendar size={10}/> Expires: {w.expiryDate}</span>
                      <span className="text-xs" style={{ color:"var(--muted-foreground)" }}>{w.warrantyType}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background:"rgba(58,91,217,0.07)", color:"var(--primary)" }}>{w.category}</span>
                    </div>
                  </div>
                </div>
                {expanded===w.id ? <ChevronUp size={16} color="var(--muted-foreground)"/> : <ChevronDown size={16} color="var(--muted-foreground)"/>}
              </div>
            </button>

            {expanded===w.id && (
              <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"var(--border)" }}>
                <div className="grid md:grid-cols-2 gap-3 pt-4">
                  {[["Brand / Make",w.brand],["Model",w.model],["Serial / Item #",w.serialNum||"—"],["Purchase Date",w.purchaseDate],["Purchased From",w.purchasedFrom],["Purchase Price",w.price],["Warranty Provider",w.provider],["Provider Phone",w.providerPhone||"—"],["Provider Website",w.providerWebsite||"—"],["Expiry Date",w.expiryDate]].map(([label,value])=>(
                    <div key={label} className="px-4 py-3 rounded-xl" style={{ background:"#141B2E" }}>
                      <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:3 }}>{(label as string).toUpperCase()}</div>
                      <div style={{ color:"var(--foreground)", fontSize:13 }}>{value||"—"}</div>
                    </div>
                  ))}
                </div>

                {w.coverageDetails && (
                  <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(72,187,120,0.05)", border:"1px solid rgba(72,187,120,0.2)" }}>
                    <div style={{ color:"#48BB78", fontSize:10, ...MONO, marginBottom:4 }}>WHAT'S COVERED</div>
                    <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.7 }}>{w.coverageDetails}</div>
                  </div>
                )}

                {w.claimInstructions && (
                  <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.12)" }}>
                    <div style={{ color:"var(--primary)", fontSize:10, ...MONO, marginBottom:4 }}>HOW TO CLAIM</div>
                    <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.7 }}>{w.claimInstructions}</div>
                  </div>
                )}

                {w.notes && (
                  <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.05)", border:"1px solid rgba(246,173,85,0.15)" }}>
                    <div style={{ color:"#F6AD55", fontSize:10, ...MONO, marginBottom:4 }}>NOTES</div>
                    <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{w.notes}</div>
                  </div>
                )}

                {/* Documents */}
                <div>
                  <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:8 }}>DOCUMENTS ({w.documents.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {w.documents.map(d=>(
                      <button key={d} onClick={()=>toast.success(`Opening: ${d}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                        style={{ background:"rgba(58,91,217,0.07)", color:"var(--primary)", border:"1px solid rgba(58,91,217,0.15)" }}>
                        📄 {d}
                      </button>
                    ))}
                    <ScanButton folder="personal" onUpload={doc=>{ setWarranties(p=>p.map(x=>x.id===w.id?{...x,documents:[...x.documents,doc.name]}:x)); toast.success(`"${doc.name}" added`); }} size="sm" label="Scan Document"/>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {w.providerPhone && (
                    <button onClick={()=>toast.success(`Calling warranty support: ${w.providerPhone}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                      style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}>
                      <Phone size={11}/> Call Support
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Warranty</h3>
              <button onClick={()=>setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            <PhotoPicker value={form.photo} onChange={url=>setForm(p=>({...p,photo:url}))} label="Product Photo (optional)" aspectRatio="4/3"/>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>CATEGORY</label>
              <select value={form.category} onChange={F("category")} style={INPUT}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            {([
              ["Product Name *","product","e.g. 55\" OLED Smart TV"],
              ["Brand / Make","brand","e.g. LG, Samsung, Toyota"],
              ["Model Number","model",""],
              ["Serial Number","serialNum",""],
              ["Purchase Date","purchaseDate","e.g. Nov 25, 2023"],
              ["Purchased From","purchasedFrom","e.g. Best Buy"],
              ["Purchase Price","price","e.g. $1,299"],
              ["Warranty Type","warrantyType","e.g. Manufacturer 3-year, Extended Plan"],
              ["Warranty Provider","provider","e.g. LG, Geek Squad"],
              ["Provider Phone","providerPhone",""],
              ["Provider Website","providerWebsite",""],
              ["Expiry Date","expiryDate","e.g. Nov 25, 2026 or Lifetime"],
              ["What's Covered","coverageDetails","Describe what is and isn't covered"],
              ["How to Claim","claimInstructions","Steps to make a warranty claim"],
              ["Notes","notes",""],
            ] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={addWarranty} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Warranty</button>
              <button onClick={()=>setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
