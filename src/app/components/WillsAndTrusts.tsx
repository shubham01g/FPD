import React, { useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { FileText, Plus, Edit2, CheckCircle, Shield, X, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import heroWillsPhoto from "../../imports/wills_hero_photo.png";
import trustSidePhoto from "../../imports/trust_side_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders & final wishes) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";

const DOCUMENT_TYPES = [
  "Last Will & Testament",
  "Living Will / Advance Directive",
  "Durable Power of Attorney",
  "Healthcare Power of Attorney",
  "Revocable Living Trust",
  "Irrevocable Trust",
  "Special Needs Trust",
  "Pour-Over Will",
  "QTIP Trust",
  "Charitable Remainder Trust",
];

const initWills = [
  { id:1, type:"Last Will & Testament",          attorney:"Linda Torres, Esq.", dateExecuted:"March 15, 2026", lastReviewed:"March 15, 2026", status:"current", location:"Original: Safe deposit box, Copy: Legacy Vault" },
  { id:2, type:"Living Will / Advance Directive", attorney:"Linda Torres, Esq.", dateExecuted:"March 15, 2026", lastReviewed:"March 15, 2026", status:"current", location:"On file with Dr. Karen Fields & Legacy Vault" },
  { id:3, type:"Durable Power of Attorney",       attorney:"Linda Torres, Esq.", dateExecuted:"March 15, 2026", lastReviewed:"March 15, 2026", status:"current", location:"Legacy Vault" },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-wills so nothing else in the app is affected. */
const WILLS_CSS = `
.fpd-wills{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-wills *{box-sizing:border-box;}
.fpd-wills-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-wills .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-wills .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-wills .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-wills .hbanner:hover .art{transform:scale(1.08);}
.fpd-wills .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-wills .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-wills .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-wills .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-wills .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-wills .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-wills .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-wills .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-wills .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-wills .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-wills .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-wills .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-wills .hbanner{min-height:auto;} .fpd-wills .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-wills .hbanner h1{font-size:29px;}}

/* info row — existing info banner paired with a side photo card */
.fpd-wills .infogrid{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:stretch;}
.fpd-wills .side-photo{position:relative;border-radius:22px;overflow:hidden;min-height:120px;border:1px solid rgba(255,255,255,0.08);}
.fpd-wills .side-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.fpd-wills .side-photo .sp-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,10,18,0) 45%,rgba(7,10,18,0.6) 100%);}
.fpd-wills .side-photo .sp-label{position:absolute;left:14px;bottom:12px;right:14px;color:#fff;font-family:var(--font-display);font-size:16px;font-weight:600;letter-spacing:-0.01em;}
@media (max-width:760px){.fpd-wills .infogrid{grid-template-columns:1fr;}}

.fpd-wills .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-wills .card.pad{padding:28px;}
.fpd-wills .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-wills .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-wills .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-wills .pg-sub{color:${MUTED};font-size:16px;max-width:640px;line-height:1.6;}
.fpd-wills .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-wills .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-wills .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-wills .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-wills .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-wills .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:22px;}
.fpd-wills .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.08);position:relative;text-align:left;overflow:hidden;}
.fpd-wills .kcell:first-child{border-left:none;}
.fpd-wills .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-wills .kcell .klbl{font-size:12px;font-weight:600;color:${MUTED};}
.fpd-wills .kcell .kico{width:27px;height:27px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-wills .kcell .kval{font-family:var(--font-display);font-size:32.5px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-wills .kcell .ksub{font-size:14.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-wills .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-wills .kstrip{grid-template-columns:1fr 1fr;}.fpd-wills .kcell:nth-child(3){border-left:none;}.fpd-wills .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}}

/* info banner */
.fpd-wills .foot{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-wills .foot .ft{color:${MUTED};font-size:15.5px;line-height:1.7;}
.fpd-wills .foot .ft b{color:${SOFT};font-weight:600;}

/* document cards */
.fpd-wills .dlist{display:flex;flex-direction:column;gap:14px;}
.fpd-wills .dtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;}
.fpd-wills .dico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-wills .dtype{font-family:var(--font-display);font-size:21.5px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-wills .dattorney{color:${MUTED};font-size:15.5px;}
.fpd-wills .dbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;background:rgba(95,190,145,0.14);color:#D99A6B;flex-shrink:0;}
.fpd-wills .dgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-bottom:16px;}
.fpd-wills .dgrid .tile:nth-child(3n+2),.fpd-wills .dgrid .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-wills .dgrid .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-wills .tile{padding:12px 14px;}
.fpd-wills .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-wills .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
.fpd-wills .dacts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
@media (max-width:760px){
.fpd-wills .dgrid{grid-template-columns:1fr;}
.fpd-wills .dgrid .tile:nth-child(3n+2),.fpd-wills .dgrid .tile:nth-child(3n){border-left:none;}
.fpd-wills .dgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

/* empty state */
.fpd-wills .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:52px 12px;}
.fpd-wills .empty .ei{width:52px;height:52px;border-radius:18px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:14px;}
.fpd-wills .empty .et{color:${SOFT};font-size:17.5px;margin-bottom:8px;}
.fpd-wills .empty .elink{background:none;border:none;color:#6FAE8B;font-size:16px;cursor:pointer;text-decoration:underline;font-family:var(--font-body);}

/* modal */
.fpd-wills .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-wills .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-wills .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-wills .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-wills .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-wills .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-wills .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-wills .field input,.fpd-wills .field select{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-wills .field input::placeholder{color:${FAINT};}
.fpd-wills .field input:focus,.fpd-wills .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-wills .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-wills .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-wills .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function WillsAndTrusts() {
  const [wills, setWills] = useState(initWills);
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ type: DOCUMENT_TYPES[0], attorney:"", dateExecuted:"", location:"", notes:"" });

  useEscapeKey(showAdd, () => setShowAdd(false));

  function addDocument() {
    if (!newDoc.attorney.trim()) { toast.error("Attorney name is required"); return; }
    const doc = {
      id: Date.now(),
      type: newDoc.type,
      attorney: newDoc.attorney,
      dateExecuted: newDoc.dateExecuted || new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
      lastReviewed: new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
      status: "current",
      location: newDoc.location || "Legacy Vault",
    };
    setWills(prev => [doc, ...prev]);
    toast.success(`${newDoc.type} added`);
    setNewDoc({ type:DOCUMENT_TYPES[0], attorney:"", dateExecuted:"", location:"", notes:"" });
    setShowAdd(false);
  }

  const currentCount = wills.filter(w => w.status === "current").length;
  const attorneyCount = new Set(wills.map(w => w.attorney)).size;
  const kpis = [
    { label: "Documents on File", value: String(wills.length), sub: "Legal instruments on record", icon: <FileText size={14} />, dot: ACCENT2 },
    { label: "Status", value: `${currentCount}/${wills.length}`, sub: "Verified current", icon: <CheckCircle size={14} />, dot: POS },
    { label: "Attorneys of Record", value: String(attorneyCount), sub: attorneyCount === 1 ? "Law firm on file" : "Law firms on file", icon: <Users size={14} />, dot: ACCENT2 },
    { label: "Last Reviewed", value: wills[0]?.lastReviewed?.split(",")[0] ?? "—", sub: "Most recent record", icon: <Clock size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-wills">
      <style dangerouslySetInnerHTML={{ __html: WILLS_CSS }} />
      <div className="fpd-wills-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroWillsPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Made Legal, Made Certain</span>
            <h1>The documents that make <span className="accent">your wishes binding.</span></h1>
            <p>Wills, trusts, and powers of attorney — executed with your attorney and kept current, so your intentions carry the full weight of the law.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Document</button>
              <button className="hbtn ghost" onClick={() => toast.success(`Opening ${wills[0]?.type ?? "your documents"} in Legacy Vault`)}><Shield size={15} /> View in Vault</button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><FileText size={12} /> Legal Documents</div>
            <h1 className="pg-h1">Wills and Living Trusts</h1>
            <div className="pg-sub">
              Legal documents executed with your attorney. All originals should be stored securely — keep certified
              copies in your Legacy Vault.
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Document
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip">
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

        {/* ── Info banner, paired with a trust-themed side photo ── */}
        <div className="infogrid">
          <div className="foot">
            <Shield size={16} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="ft">
              <b>Important:</b> Your legal documents should be prepared and executed by a licensed estate attorney.
              Store the original in a fireproof safe or safe deposit box, and upload a certified copy to your Legacy
              Vault so your legacy contacts can access it when needed.
            </div>
          </div>
          <div className="side-photo">
            <img src={trustSidePhoto} alt="" />
            <div className="sp-scrim" />
            <div className="sp-label">Built on trust</div>
          </div>
        </div>

        {/* ── Document list ── */}
        {wills.length === 0 && (
          <div className="card empty">
            <div className="ei"><FileText size={24} /></div>
            <div className="et">No legal documents added yet.</div>
            <button className="elink" onClick={() => setShowAdd(true)}>Add your first document</button>
          </div>
        )}

        <div className="dlist">
          {wills.map(will => (
            <div key={will.id} className="card pad">
              <div className="dtop">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="dico"><FileText size={20} /></div>
                  <div>
                    <div className="dtype">{will.type}</div>
                    <div className="dattorney">Prepared by {will.attorney}</div>
                  </div>
                </div>
                <span className="dbadge"><CheckCircle size={11} /> CURRENT</span>
              </div>

              <div className="dgrid">
                {[
                  { label: "Date Executed", value: will.dateExecuted },
                  { label: "Last Reviewed", value: will.lastReviewed },
                  { label: "Document Location", value: will.location },
                ].map(f => (
                  <div key={f.label} className="tile">
                    <div className="tk">{f.label}</div>
                    <div className="tv">{f.value}</div>
                  </div>
                ))}
              </div>

              <div className="dacts">
                <button className="btn-ghost" onClick={() => toast.success(`Opening ${will.type} in Legacy Vault`)}>
                  <FileText size={13} /> View in Vault
                </button>
                <button className="btn-sec" onClick={() => toast.success("Update record — opens edit form")}>
                  <Edit2 size={13} /> Update Record
                </button>
                <ScanButton
                  folder="legal"
                  onUpload={doc => toast.success(`"${doc.name}" uploaded and linked to ${will.type}`)}
                  size="sm"
                  label="Scan & Upload Copy"
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Add document modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>Add Legal Document</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>DOCUMENT TYPE</label>
                  <select value={newDoc.type} onChange={e => setNewDoc(p=>({...p,type:e.target.value}))}>
                    {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>ATTORNEY / LAW FIRM *</label>
                  <input value={newDoc.attorney} onChange={e => setNewDoc(p=>({...p,attorney:e.target.value}))}
                    placeholder="e.g. Jane Smith, Esq. / Smith & Associates" />
                </div>
                <div className="field">
                  <label>DATE EXECUTED</label>
                  <input type="date" value={newDoc.dateExecuted} onChange={e => setNewDoc(p=>({...p,dateExecuted:e.target.value}))} />
                </div>
                <div className="field">
                  <label>ORIGINAL DOCUMENT LOCATION</label>
                  <input value={newDoc.location} onChange={e => setNewDoc(p=>({...p,location:e.target.value}))}
                    placeholder="e.g. Safe deposit box at First National Bank" />
                </div>
                <div className="field">
                  <label>UPLOAD CERTIFIED COPY (optional)</label>
                  <ScanButton
                    folder="legal"
                    onUpload={doc => toast.success(`"${doc.name}" will be linked to this document`)}
                    size="sm"
                    label="Scan or Upload Document"
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addDocument}>Add Document</button>
                <button className="btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
