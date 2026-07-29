import React, { useState } from "react";
import { CreditCard, Plus, X, Eye, EyeOff, Shield, Calendar, ScanLine, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import heroIDPhoto from "../../imports/idkeeper_hero_photo.png";

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

const ID_TYPES = ["Driver's License","Passport","Social Security Card","Birth Certificate","Military ID","Medicare Card","Medicaid Card","Health Insurance Card","Dental Insurance Card","Vision Insurance Card","Work / Employee ID","Student ID","Global Entry / TSA PreCheck","Green Card / Permanent Resident","Voter Registration","Vehicle Registration","Concealed Carry Permit","Professional License","Other"];

const CATEGORIES: Record<string, { color:string; bg:string; emoji:string }> = {
  "Government ID":   { color:"#6E90C9", bg:"rgba(91,110,225,0.1)",   emoji:"🪪" },
  "Insurance":       { color:"#D99A6B", bg:"rgba(72,187,120,0.1)",  emoji:"🛡️" },
  "Professional":    { color:"#6E90C9", bg:"rgba(91,110,225,0.1)", emoji:"💼" },
  "Military":        { color:"#ED8936", bg:"rgba(237,137,54,0.1)",  emoji:"🎖️" },
  "Other":           { color:"rgba(255,255,255,0.65)", bg:"rgba(138,154,184,0.1)", emoji:"📋" },
};

const typeCategory: Record<string, string> = {
  "Driver's License":"Government ID","Passport":"Government ID","Social Security Card":"Government ID",
  "Birth Certificate":"Government ID","Green Card / Permanent Resident":"Government ID",
  "Voter Registration":"Government ID","Vehicle Registration":"Government ID",
  "Medicare Card":"Insurance","Medicaid Card":"Insurance","Health Insurance Card":"Insurance",
  "Dental Insurance Card":"Insurance","Vision Insurance Card":"Insurance",
  "Military ID":"Military","Work / Employee ID":"Professional","Student ID":"Professional",
  "Professional License":"Professional","Concealed Carry Permit":"Professional",
  "Global Entry / TSA PreCheck":"Professional",
};

interface IDRecord {
  id: number;
  type: string;
  idNumber: string;
  holder: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
  documentScanned: boolean;
  masked: boolean;
}

const initIDs: IDRecord[] = [
  { id:1, type:"Driver's License", idNumber:"D1234567", holder:"James William Doe", issuedBy:"CA DMV", issueDate:"Mar 12, 2021", expiryDate:"Mar 12, 2029", notes:"Real ID compliant. Star on upper right corner.", documentScanned:true, masked:true },
  { id:2, type:"Passport", idNumber:"A12345678", holder:"James William Doe", issuedBy:"U.S. Department of State", issueDate:"Jun 5, 2019", expiryDate:"Jun 4, 2029", notes:"Valid for international travel. Keep with travel documents.", documentScanned:true, masked:true },
  { id:3, type:"Social Security Card", idNumber:"XXX-XX-4821", holder:"James William Doe", issuedBy:"Social Security Administration", issueDate:"N/A", expiryDate:"No Expiry", notes:"Original card stored in home safe. Do not carry in wallet.", documentScanned:false, masked:true },
  { id:4, type:"Medicare Card", idNumber:"1EG4-TE5-MK72", holder:"James William Doe", issuedBy:"Centers for Medicare & Medicaid", issueDate:"Jan 1, 2024", expiryDate:"No Expiry", notes:"Medicare Part A and B. Supplemental plan through Aetna.", documentScanned:true, masked:false },
  { id:5, type:"Health Insurance Card", idNumber:"GEH292847200", holder:"James William Doe", issuedBy:"Blue Shield of California", issueDate:"Jan 1, 2026", expiryDate:"Dec 31, 2026", notes:"Group plan through TechCorp Inc. Rx Group: BSC-RX-2024. PCP: Dr. Karen Fields.", documentScanned:true, masked:false },
  { id:6, type:"Global Entry / TSA PreCheck", idNumber:"KTN: 882941024", holder:"James William Doe", issuedBy:"U.S. Customs & Border Protection", issueDate:"Sep 15, 2022", expiryDate:"Sep 14, 2027", notes:"Known Traveler Number. Add to all airline bookings for PreCheck lanes.", documentScanned:false, masked:false },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-idk so nothing else in the app is affected. */
const IDK_CSS = `
.fpd-idk{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-idk *{box-sizing:border-box;}
.fpd-idk-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-idk .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* ── Hero banner ── */
.fpd-idk .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-idk .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-idk .hbanner:hover .art{transform:scale(1.08);}
.fpd-idk .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-idk .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-idk .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-idk .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-idk .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-idk .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-idk .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-idk .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-idk .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-idk .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-idk .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-idk .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-idk .hbanner{min-height:auto;} .fpd-idk .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-idk .hbanner h1{font-size:29px;}}

.fpd-idk .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-idk .card.pad{padding:28px;}
.fpd-idk .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-idk .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-idk .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-idk .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-idk .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-idk .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-idk .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-idk .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-idk .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-idk .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-idk .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-idk .kpi-mini-txt{flex:1;min-width:0;}
.fpd-idk .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-idk .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-idk .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-idk .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-idk .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:420px){.fpd-idk .kpi-stack{grid-template-columns:1fr;}}

/* filter chips */
.fpd-idk .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-idk .chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:99px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}

/* ID cards */
.fpd-idk .igrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media (max-width:820px){.fpd-idk .igrid{grid-template-columns:1fr;}}
.fpd-idk .iico{width:48px;height:48px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:27.5px;}
.fpd-idk .itype{color:${TEXT};font-size:17.5px;font-weight:600;}
.fpd-idk .iholder{color:${MUTED};font-size:15px;margin-top:1px;}
.fpd-idk .ibadge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:99px;font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:0.03em;}
.fpd-idk .idnum-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:16px;margin:14px 0 12px;background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.16);}
.fpd-idk .idnum-lbl{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:3px;}
.fpd-idk .idnum-val{font-family:var(--font-mono);font-size:17.5px;font-weight:700;color:${TEXT};}
.fpd-idk .eye-btn{color:${MUTED};background:none;border:none;cursor:pointer;display:flex;}
.fpd-idk .igrid2{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;align-items:start;}
.fpd-idk .itile{padding:9px 10px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-idk .itile .tk{font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;color:${MUTED};margin-bottom:2px;}
.fpd-idk .itile .tv{color:${TEXT};font-size:15px;}
.fpd-idk .inotes{color:${MUTED};font-size:15px;line-height:1.55;}

/* modal */
.fpd-idk .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-idk .modal{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;}
.fpd-idk .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-idk .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-idk .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-idk .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-idk .scan-box{padding:16px;border-radius:16px;border:2px dashed rgba(91,110,225,0.28);background:rgba(91,110,225,0.03);}
.fpd-idk .scan-lbl{font-family:var(--font-mono);font-size:13.5px;letter-spacing:0.06em;color:${MUTED};margin-bottom:10px;font-weight:600;}
.fpd-idk .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-idk .field input,.fpd-idk .field select{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-idk .field input::placeholder{color:${FAINT};}
.fpd-idk .field input:focus,.fpd-idk .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-idk .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-idk .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-idk .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function IDKeeper() {
  const [ids, setIds] = useState<IDRecord[]>(initIDs);
  const [showAdd, setShowAdd] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [form, setForm] = useState({ type:ID_TYPES[0], idNumber:"", holder:"James William Doe", issuedBy:"", issueDate:"", expiryDate:"", notes:"", photo:"" });
  const idListRef = React.useRef<HTMLDivElement>(null);

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function toggleMask(id:number) {
    setIds(p => p.map(r => r.id===id ? {...r,masked:!r.masked} : r));
  }

  function addID() {
    if (!form.type || !form.holder) { toast.error("ID type and holder name required"); return; }
    setIds(p => [...p, { ...form, id:Date.now(), documentScanned:form.photo?true:false, masked:true }]);
    toast.success(`${form.type} added to ID Keeper`);
    setForm({ type:ID_TYPES[0], idNumber:"", holder:"James William Doe", issuedBy:"", issueDate:"", expiryDate:"", notes:"", photo:"" });
    setShowAdd(false);
  }

  function isExpiringSoon(expiry:string) {
    if (expiry === "No Expiry" || expiry === "N/A") return false;
    const d = new Date(expiry);
    const diff = (d.getTime() - Date.now()) / (1000*60*60*24);
    return diff < 180 && diff > 0;
  }
  function isExpired(expiry:string) {
    if (expiry === "No Expiry" || expiry === "N/A") return false;
    return new Date(expiry) < new Date();
  }

  const filtered = ids.filter(r => {
    const cat = typeCategory[r.type] || "Other";
    return activeCategory === "all" || cat === activeCategory;
  });

  const categories = ["all", ...Object.keys(CATEGORIES)];

  const scannedCount = ids.filter(r => r.documentScanned).length;
  const expiringCount = ids.filter(r => isExpiringSoon(r.expiryDate)).length;
  const expiredCount = ids.filter(r => isExpired(r.expiryDate)).length;

  const kpis = [
    { label: "IDs on File", value: String(ids.length), sub: "Across all categories", icon: <CreditCard size={14} />, dot: ACCENT2 },
    { label: "Scanned", value: String(scannedCount), sub: "Document image on record", icon: <CheckCircle2 size={14} />, dot: POS },
    { label: "Expiring Soon", value: String(expiringCount), sub: "Within 180 days", icon: <Calendar size={14} />, dot: expiringCount > 0 ? WARN : POS },
    { label: "Expired", value: String(expiredCount), sub: "Needs renewal", icon: <Shield size={14} />, dot: expiredCount > 0 ? NEG : POS },
  ];

  return (
    <div className="fpd-idk">
      <style dangerouslySetInnerHTML={{ __html: IDK_CSS }} />
      <div className="fpd-idk-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroIDPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Every ID, One Secure Place</span>
            <h1>Passports, licenses, and cards — <span className="accent">never misplaced again.</span></h1>
            <p>Scan and store every identification document you own, with renewal reminders before anything expires.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setShowAdd(true)}>
                <Plus size={15}/> Add ID
              </button>
              <button className="hbtn ghost" onClick={() => idListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <CreditCard size={15}/> View All IDs
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><CreditCard size={12} /> IDENTIFICATION</div>
            <h1 className="pg-h1">ID Keeper</h1>
            <div className="pg-sub">
              Securely store all identification documents — government IDs, insurance cards, professional licenses, and more.
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add ID
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background:`linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Category filter ── */}
        <div className="filters">
          {categories.map(cat => {
            const meta = cat === "all" ? null : CATEGORIES[cat];
            const on = activeCategory === cat;
            const color = meta?.color || ACCENT2;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="chip"
                style={{ background: on ? `${color}22` : "rgba(255,255,255,0.03)", color: on ? color : MUTED, borderColor: on ? `${color}55` : "rgba(255,255,255,0.08)" }}>
                {meta ? `${meta.emoji} ${cat}` : "📂 All IDs"}
              </button>
            );
          })}
        </div>

        {/* ── ID grid ── */}
        <div className="igrid" ref={idListRef}>
          {filtered.map(r => {
            const cat = typeCategory[r.type] || "Other";
            const meta = CATEGORIES[cat];
            const expired = isExpired(r.expiryDate);
            const expiring = isExpiringSoon(r.expiryDate);

            return (
              <div key={r.id} className="card pad">
                <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
                  <div className="flex items-center gap-3">
                    <div className="iico" style={{ background: meta.bg }}>{meta.emoji}</div>
                    <div>
                      <div className="itype">{r.type}</div>
                      <div className="iholder">{r.holder}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {expired && <span className="ibadge" style={{ background: "rgba(208,107,107,0.16)", color: NEG }}>EXPIRED</span>}
                    {expiring && !expired && <span className="ibadge" style={{ background: "rgba(217,165,94,0.16)", color: WARN }}>EXPIRING SOON</span>}
                    {r.documentScanned && <span className="ibadge" style={{ background: "rgba(95,190,145,0.14)", color: "#D99A6B" }}>✓ SCANNED</span>}
                  </div>
                </div>

                <div className="idnum-row">
                  <div>
                    <div className="idnum-lbl">ID NUMBER</div>
                    <div className="idnum-val">{r.masked ? r.idNumber.replace(/[A-Z0-9]/g,"•") : r.idNumber}</div>
                  </div>
                  <button className="eye-btn" onClick={() => toggleMask(r.id)}>
                    {r.masked ? <Eye size={16}/> : <EyeOff size={16}/>}
                  </button>
                </div>

                <div className="igrid2">
                  {[["Issued By",r.issuedBy],["Issue Date",r.issueDate],["Expiry Date",r.expiryDate]].map(([label,value])=>(
                    <div key={label} className="itile">
                      <div className="tk">{label.toUpperCase()}</div>
                      <div className="tv" style={{ color: label==="Expiry Date" && expired ? NEG : TEXT }}>{value||"—"}</div>
                    </div>
                  ))}
                </div>

                {r.notes && <div className="inotes">{r.notes}</div>}

                {!r.documentScanned && (
                  <div className="mt-3">
                    <ScanButton folder="personal" onUpload={doc => { setIds(p=>p.map(x=>x.id===r.id?{...x,documentScanned:true}:x)); toast.success(`${r.type} scanned and saved`); }} size="sm" label="Scan & Upload ID Document"/>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Add modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>Add ID Document</h3>
                <button onClick={()=>setShowAdd(false)}><X size={16}/></button>
              </div>
              <div className="modal-body">
                <div className="scan-box">
                  <div className="scan-lbl">SCAN OR UPLOAD ID DOCUMENT</div>
                  <div className="flex gap-2 flex-wrap">
                    <ScanButton folder="personal" onUpload={doc => { setForm(p=>({...p,documentScanned:"true" as any})); toast.success(`"${doc.name}" scanned and attached`); }} size="sm" label="📷 Scan with Camera"/>
                  </div>
                  <div className="mt-3">
                    <PhotoPicker value={form.photo} onChange={url => setForm(p=>({...p,photo:url}))} label="Or upload a photo of the ID" aspectRatio="16/9"/>
                  </div>
                </div>
                <div className="field">
                  <label>ID TYPE</label>
                  <select value={form.type} onChange={F("type")}>
                    {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                {[["ID / Document Number","idNumber","e.g. D1234567"],["ID Holder (Full Legal Name)","holder",""],["Issued By","issuedBy","e.g. CA DMV"],["Issue Date","issueDate","e.g. Jan 15, 2022"],["Expiry Date","expiryDate","e.g. Jan 14, 2030 or No Expiry"],["Notes","notes","Any important details"]].map(([label,key,ph])=>(
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addID}>Add to ID Keeper</button>
                <button className="btn-sec" onClick={()=>setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
