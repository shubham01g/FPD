import React, { useState } from "react";
import { Zap, Plus, X, Phone, Globe, Hash, CircleDollarSign, Boxes } from "lucide-react";
import { toast } from "sonner";
import { AttachDocumentField } from "./AttachDocumentField";
import heroUtilitiesPhoto from "../../imports/personalassets_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the rest of Life Records) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

interface Utility {
  id: number;
  service: string;
  provider: string;
  accountNum: string;
  phone: string;
  website: string;
  autopay: boolean;
  monthlyAvg: string;
  notes: string;
  attachedDoc?: string | null;
}

const initUtilities: Utility[] = [
  { id: 1, service: "Electricity", provider: "SMUD", accountNum: "SMUD-9284-01", phone: "(916) 452-3211", website: "smud.org", autopay: true, monthlyAvg: "$142", notes: "" },
  { id: 2, service: "Natural Gas", provider: "PG&E", accountNum: "PGE-481-2291-X", phone: "1-800-743-5000", website: "pge.com", autopay: true, monthlyAvg: "$68", notes: "" },
  { id: 3, service: "Internet", provider: "AT&T Fiber", accountNum: "ATT-882-4291", phone: "1-800-288-2020", website: "att.com", autopay: true, monthlyAvg: "$65", notes: "1 Gig plan. Router in home office closet." },
  { id: 4, service: "Water / Sewer", provider: "Sacramento Water District", accountNum: "SWD-2941-B", phone: "(916) 808-5454", website: "cityofsacramento.org", autopay: false, monthlyAvg: "$88", notes: "Bill arrives first of month." },
  { id: 5, service: "Trash Collection", provider: "Republic Services", accountNum: "RS-4821-SAC", phone: "1-800-237-9840", website: "republicservices.com", autopay: true, monthlyAvg: "$44", notes: "Pickup Tuesdays." },
  { id: 6, service: "HOA", provider: "Oak Ridge HOA", accountNum: "ORHA-29", phone: "(916) 555-0192", website: "oakridgehoa.com", autopay: false, monthlyAvg: "$220", notes: "Quarterly billing — $660/quarter." },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-util so nothing else in the app is affected. */
const UTIL_CSS = `
.fpd-util{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-util *{box-sizing:border-box;}
.fpd-util-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-util .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* hero banner */
.fpd-util .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-util .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-util .hbanner:hover .art{transform:scale(1.08);}
.fpd-util .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-util .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-util .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-util .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-util .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-util .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-util .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-util .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-util .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-util .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-util .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-util .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-util .hbanner{min-height:auto;} .fpd-util .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-util .hbanner h1{font-size:29px;}}

.fpd-util .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-util .card.pad{padding:28px;}
.fpd-util .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-util .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-util .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-util .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-util .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-util .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-util .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-util .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-util .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-util .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-util .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-util .kpi-mini-txt{flex:1;min-width:0;}
.fpd-util .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-util .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-util .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-util .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-util .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:420px){.fpd-util .kpi-stack{grid-template-columns:1fr;}}

/* record cards */
.fpd-util .dlist{display:flex;flex-direction:column;gap:14px;}
.fpd-util .dtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px;}
.fpd-util .dleft{display:flex;align-items:flex-start;gap:14px;min-width:0;}
.fpd-util .dico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-util .dtype{font-family:var(--font-display);font-size:19.5px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-util .dsub{color:${MUTED};font-size:15.5px;}
.fpd-util .dright{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-util .damt{font-family:var(--font-mono);color:#6FAE8B;font-size:17.5px;font-weight:700;white-space:nowrap;}
.fpd-util .damt span{color:${MUTED};font-weight:500;font-size:14px;}
.fpd-util .dbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;background:rgba(95,190,145,0.14);color:#D99A6B;}

.fpd-util .dgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-bottom:4px;}
.fpd-util .dgrid .tile:nth-child(3n+2),.fpd-util .dgrid .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-util .dgrid .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-util .tile{padding:12px 14px;}
.fpd-util .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;display:flex;align-items:center;gap:5px;}
.fpd-util .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
@media (max-width:760px){
.fpd-util .dgrid{grid-template-columns:1fr;}
.fpd-util .dgrid .tile:nth-child(3n+2),.fpd-util .dgrid .tile:nth-child(3n){border-left:none;}
.fpd-util .dgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

.fpd-util .notemuted{color:${MUTED};font-size:15px;margin-top:10px;line-height:1.6;}
.fpd-util .docpill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:99px;font-size:15px;background:rgba(95,190,145,0.08);color:#D99A6B;border:1px solid rgba(95,190,145,0.22);margin-top:14px;}

/* modal */
.fpd-util .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-util .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-util .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-util .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-util .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-util .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-util .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-util .field input,.fpd-util .field select,.fpd-util .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-util .field input::placeholder,.fpd-util .field textarea::placeholder{color:${FAINT};}
.fpd-util .field input:focus,.fpd-util .field select:focus,.fpd-util .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-util .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-util .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-util .modal-foot .save:hover{filter:brightness(1.08);}
`;

function parseDollars(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function Utilities() {
  const [utilityList, setUtilityList] = useState<Utility[]>(initUtilities);
  const [showAdd, setShowAdd] = useState(false);
  const [uForm, setUForm] = useState({ service: "", provider: "", accountNum: "", phone: "", website: "", monthlyAvg: "", notes: "" });
  const [uDoc, setUDoc] = useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  function addUtility() {
    if (!uForm.service || !uForm.provider) { toast.error("Service and provider required"); return; }
    setUtilityList(p => [...p, { id: Date.now(), service: uForm.service, provider: uForm.provider, accountNum: uForm.accountNum, phone: uForm.phone, website: uForm.website, autopay: false, monthlyAvg: uForm.monthlyAvg || "$0", notes: uForm.notes, attachedDoc: uDoc }]);
    toast.success(`${uForm.service} — ${uForm.provider} added`);
    setUForm({ service: "", provider: "", accountNum: "", phone: "", website: "", monthlyAvg: "", notes: "" });
    setUDoc(null);
    setShowAdd(false);
  }

  const onAutopay = utilityList.filter(u => u.autopay).length;
  const monthlyTotal = utilityList.reduce((s, u) => s + parseDollars(u.monthlyAvg), 0);

  const kpis = [
    { label: "Total Accounts", value: String(utilityList.length), sub: "On file", icon: <Zap size={14} />, dot: ACCENT2 },
    { label: "On Autopay", value: String(onAutopay), sub: `${utilityList.length - onAutopay} manual`, icon: <CircleDollarSign size={14} />, dot: POS },
    { label: "Monthly Total", value: `$${monthlyTotal.toLocaleString()}`, sub: "Combined average", icon: <Boxes size={14} />, dot: ACCENT2 },
    { label: "Providers", value: String(new Set(utilityList.map(u => u.provider)).size), sub: "Unique companies", icon: <Globe size={14} />, dot: WARN },
  ];

  return (
    <div className="fpd-util">
      <style dangerouslySetInnerHTML={{ __html: UTIL_CSS }} />
      <div className="fpd-util-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroUtilitiesPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">The Household, Accounted For</span>
            <h1>Every utility account, <span className="accent">in one place.</span></h1>
            <p>Electricity, water, internet, trash, HOA — provider details and account numbers your family will need.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add Utility
              </button>
              <button className="hbtn ghost" onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Zap size={15} /> View All Accounts
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Zap size={12} /> Life Records</div>
            <h1 className="pg-h1">Utilities</h1>
            <div className="pg-sub">Service accounts for the home — provider, account number, and monthly cost, kept separate from vehicles and valuables.</div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Utility
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background: `linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Utilities list ── */}
        <div className="dlist" ref={listRef}>
          {utilityList.map(u => (
            <div key={u.id} className="card pad">
              <div className="dtop">
                <div className="dleft">
                  <div className="dico"><Zap size={18} /></div>
                  <div>
                    <div className="dtype">{u.service}</div>
                    <div className="dsub">{u.provider}</div>
                  </div>
                </div>
                <div className="dright">
                  {u.autopay && <span className="dbadge">AUTOPAY</span>}
                  <span className="damt">{u.monthlyAvg}<span>/mo</span></span>
                </div>
              </div>
              <div className="dgrid">
                <div className="tile"><div className="tk"><Hash size={11} /> Account #</div><div className="tv">{u.accountNum || "—"}</div></div>
                <div className="tile"><div className="tk"><Phone size={11} /> Phone</div><div className="tv">{u.phone || "—"}</div></div>
                <div className="tile"><div className="tk"><Globe size={11} /> Website</div><div className="tv">{u.website || "—"}</div></div>
              </div>
              {u.notes && <div className="notemuted">{u.notes}</div>}
              {u.attachedDoc && <div className="docpill">📄 {u.attachedDoc}</div>}
            </div>
          ))}
        </div>

        {/* ── Add Utility Modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>Add Utility Account</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                {([["Service Type", "service", "e.g. Electricity, Internet, Water"], ["Provider", "provider", "e.g. AT&T, PG&E"], ["Account Number", "accountNum", ""], ["Phone", "phone", ""], ["Website", "website", ""], ["Monthly Average", "monthlyAvg", "e.g. $85"], ["Notes", "notes", "Optional"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(uForm as any)[key]} onChange={e => setUForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={uDoc} onChange={setUDoc} folder="utilities" sectionId="utilities" sectionLabel="Utilities" label="Attach Document (bill, statement, account setup)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addUtility}>Add Utility</button>
                <button className="btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}