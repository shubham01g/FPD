import React, { useState, useRef, useEffect, useCallback } from "react";
import { Zap, Plus, X, Boxes, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";
import heroUtilitiesPhoto from "../../imports/utilities_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the rest of Life Records) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";

interface UtilityRow {
  id: string; service: string; provider: string; accountNum: string;
  phone: string; website: string; autopay: boolean; monthlyAvg: string;
  notes: string; attachedDoc?: string | null;
}

/* The screen used to open on six hardcoded sample providers, identical for
   every account and gone on refresh. Rows now come from the `utilities` table,
   so a new account starts empty and what you enter is still there tomorrow. */

// The table stores monthly_avg as NUMERIC; the UI has always shown it as a
// "$142"-style string, so convert at the boundary rather than changing either.
const toMoney = (n: number | null | undefined) => (n === null || n === undefined ? "$0" : `$${Number(n).toFixed(0)}`);
const fromMoney = (v: string) => { const n = Number(String(v).replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };


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
.fpd-util .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-util .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-util .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-util .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-util .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

.fpd-util .toolbar-end{display:flex;justify-content:flex-end;}

/* record cards */
.fpd-util .dlist{display:flex;flex-direction:column;gap:14px;}
.fpd-util .dtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}
.fpd-util .dleft{display:flex;align-items:flex-start;gap:14px;min-width:0;}
.fpd-util .dico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-util .dtype{font-family:var(--font-display);font-size:21.5px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-util .dsub{color:${MUTED};font-size:15.5px;}
.fpd-util .dright{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-util .damt{font-family:var(--font-mono);color:#6FAE8B;font-size:17.5px;font-weight:700;white-space:nowrap;}
.fpd-util .damt span{color:${MUTED};font-weight:500;font-size:14px;}
.fpd-util .dbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-util .dbadge.autopay{background:rgba(95,190,145,0.14);color:#D99A6B;}

.fpd-util .dgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-bottom:4px;}
.fpd-util .dgrid .tile:nth-child(3n+2),.fpd-util .dgrid .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-util .dgrid .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-util .tile{padding:12px 14px;}
.fpd-util .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-util .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
@media (max-width:900px){
.fpd-util .dgrid{grid-template-columns:1fr;}
.fpd-util .dgrid .tile:nth-child(3n+2),.fpd-util .dgrid .tile:nth-child(3n){border-left:none;}
.fpd-util .dgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

.fpd-util .notemuted{color:${MUTED};font-size:15px;margin-top:10px;line-height:1.6;}
.fpd-util .dacts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;}

/* modal */
.fpd-util .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-util .modal{width:100%;max-width:540px;max-height:90vh;overflow-y:auto;}
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

export function Utilities() {
  const { authUser } = useAuth();
  const [utilityList, setUtilityList] = useState<UtilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [uForm, setUForm] = useState({ service: "", provider: "", accountNum: "", phone: "", website: "", monthlyAvg: "", notes: "" });
  const [uDoc, setUDoc] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!authUser) { setUtilityList([]); setLoading(false); return; }
    const { data, error } = await tables.utilities.list(authUser.id);
    if (error) { toast.error(`Could not load utilities: ${error.message}`); setLoading(false); return; }
    setUtilityList((data ?? []).map(r => ({
      id: String(r.id),
      service: String(r.service ?? ""),
      provider: String(r.provider ?? ""),
      accountNum: String(r.account_number ?? ""),
      phone: String(r.phone ?? ""),
      website: String(r.website ?? ""),
      autopay: Boolean(r.autopay),
      monthlyAvg: toMoney(r.monthly_avg as number | null),
      notes: String(r.notes ?? ""),
      attachedDoc: (r.document_url as string | null) ?? null,
    })));
    setLoading(false);
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);

  function resetUtilityForm() {
    setUForm({ service: "", provider: "", accountNum: "", phone: "", website: "", monthlyAvg: "", notes: "" });
    setUDoc(null);
  }

  function openAddUtility() {
    resetUtilityForm();
    setEditingId(null);
    setShowAdd(true);
  }

  function openEditUtility(u: UtilityRow) {
    setUForm({ service: u.service, provider: u.provider, accountNum: u.accountNum, phone: u.phone, website: u.website, monthlyAvg: u.monthlyAvg, notes: u.notes });
    setUDoc(u.attachedDoc ?? null);
    setEditingId(u.id);
    setShowAdd(true);
  }

  function closeUtilityModal() {
    setShowAdd(false);
    setEditingId(null);
    resetUtilityForm();
  }

  async function saveUtility() {
    if (!uForm.service || !uForm.provider) { toast.error("Service and provider required"); return; }
    if (!authUser) { toast.error("Sign in to save utilities."); return; }

    const row = {
      service: uForm.service,
      provider: uForm.provider,
      account_number: uForm.accountNum,
      phone: uForm.phone,
      website: uForm.website,
      monthly_avg: fromMoney(uForm.monthlyAvg),
      notes: uForm.notes,
      document_url: uDoc,
    };

    const { error } = editingId !== null
      ? await tables.utilities.update(editingId, row)
      : await tables.utilities.add(authUser.id, { ...row, autopay: false });

    if (error) { toast.error(`Could not save: ${error.message}`); return; }

    // Re-read rather than patching local state, so what is on screen is what
    // the database actually holds (defaults, triggers and all).
    await reload();
    toast.success(`${uForm.service} — ${uForm.provider} ${editingId !== null ? "updated" : "added"}`);
    resetUtilityForm();
    setEditingId(null);
    setShowAdd(false);
  }

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="tile">
      <div className="tk">{label}</div>
      <div className="tv">{value}</div>
    </div>
  );

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
            <span className="heyebrow">Household Accounts, On Record</span>
            <h1>Every utility account — <span className="accent">documented and easy to find.</span></h1>
            <p>Electricity, gas, internet, water, trash, and HOA — provider details, account numbers, and autopay status in one place.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAddUtility}>
                <Plus size={15} /> Add Utility
              </button>
              <button className="hbtn ghost" onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Boxes size={15} /> View All Accounts
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Zap size={12} /> Household Accounts</div>
          <h1 className="pg-h1">Utilities</h1>
          <div className="pg-sub">Service providers, account numbers, and autopay status for every household utility.</div>
        </div>

        <div className="toolbar-end">
          <button className="btn-primary" onClick={openAddUtility}><Plus size={14} /> Add Utility</button>
        </div>

        {/* ── Utilities list ── */}
        <div className="dlist" ref={listRef}>
          {/* The list can genuinely be empty now that it is not seeded with
              sample providers, so both states need saying out loud. */}
          {loading && (
            <div className="card pad" style={{ textAlign: "center", color: MUTED }}>
              Loading your utilities…
            </div>
          )}
          {!loading && utilityList.length === 0 && (
            <div className="card pad" style={{ textAlign: "center", color: MUTED }}>
              No utilities saved yet — add your first provider above and it will be here next time you sign in.
            </div>
          )}
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
                  {u.autopay && <span className="dbadge autopay">AUTOPAY</span>}
                  <span className="damt">{u.monthlyAvg}<span>/mo</span></span>
                </div>
              </div>
              <div className="dgrid">
                <Field label="Account #" value={u.accountNum || "—"} />
                <Field label="Phone" value={u.phone || "—"} />
                <Field label="Website" value={u.website || "—"} />
              </div>
              {u.notes && <div className="notemuted">{u.notes}</div>}
              {(u as any).attachedDoc && <div className="notemuted">📄 {(u as any).attachedDoc}</div>}
              <div className="dacts">
                <button className="btn-sec" onClick={() => openEditUtility(u)}><Edit2 size={13} /> Edit</button>
                <ScanButton folder="utilities" onUpload={doc => { setUtilityList(p => p.map(x => x.id === u.id ? { ...x, attachedDoc: doc.name } : x)); toast.success(`"${doc.name}" linked to ${u.service}`); }} size="sm" label="Scan Document" />
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit Utility Modal */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Utility" : "Add Utility Account"}</h3>
                <button onClick={closeUtilityModal}><X size={16} /></button>
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
                <button className="save" onClick={saveUtility}>{editingId !== null ? "Save Changes" : "Add Utility"}</button>
                <button className="btn-sec" onClick={closeUtilityModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
