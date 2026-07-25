import React, { useState, useRef } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { ScanButton } from "./DocumentScanner";
import {
  CreditCard, Plus, X, Search, Trash2, Edit2, Upload,
  Globe, Phone, AlertTriangle, CheckCircle, Calendar,
  DollarSign, Lock, Eye, EyeOff, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes & wills) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

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

const frequencyColor: Record<Frequency,string> = { Weekly:POS, Biweekly:"#5A8078", Monthly:ACCENT, Quarterly:ACCENT2, Yearly:WARN };
const statusColor: Record<string, { color:string; bg:string }> = {
  active:    { color:POS,  bg:"rgba(95,190,145,0.12)" },
  paused:    { color:WARN, bg:"rgba(217,165,94,0.12)" },
  cancelled: { color:NEG,  bg:"rgba(208,107,107,0.12)" },
};

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-sub so nothing else in the app is affected. */
const SUB_CSS = `
.fpd-sub{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-sub *{box-sizing:border-box;}
.fpd-sub-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-sub .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-sub .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-sub .card.pad{padding:22px;}
.fpd-sub .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-sub .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-sub .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-sub .pg-sub{color:${MUTED};font-size:13px;max-width:640px;line-height:1.6;}
.fpd-sub .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-sub .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-sub .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-sub .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-sub .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-sub .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:9px;background:rgba(95,190,145,0.12);color:${POS};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-sub .btn-pos:hover{background:rgba(95,190,145,0.2);}

/* KPI ledger */
.fpd-sub .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-sub .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-sub .kcell:first-child{border-left:none;}
.fpd-sub .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-sub .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-sub .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-sub .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-sub .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-sub .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-sub .kstrip{grid-template-columns:1fr 1fr;}.fpd-sub .kcell:nth-child(3){border-left:none;}.fpd-sub .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* alert banner (warning variant of the shared footnote) */
.fpd-sub .foot{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border-radius:13px;background:rgba(217,165,94,0.06);border:1px solid rgba(217,165,94,0.22);}
.fpd-sub .foot .ft{color:${SOFT};font-size:12.5px;line-height:1.7;}
.fpd-sub .foot .ft b{color:${TEXT};font-weight:600;}

/* search + category filters */
.fpd-sub .toolbar-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.fpd-sub .search{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:11px;background:#0D1421;border:1px solid rgba(255,255,255,0.22);flex:1;min-width:220px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);}
.fpd-sub .search input{background:none;border:none;outline:none;color:${TEXT};font-size:13px;width:100%;font-family:var(--font-body);}
.fpd-sub .search input::placeholder{color:${FAINT};}
.fpd-sub .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-sub .chip{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-sub .chip.off{opacity:.55;}
.fpd-sub .chip.off:hover{opacity:.8;}

/* two-column bento */
.fpd-sub .bento{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:18px;align-items:start;}
@media (max-width:980px){.fpd-sub .bento{grid-template-columns:1fr;}}

/* subscription list rows */
.fpd-sub .plist{display:flex;flex-direction:column;gap:10px;}
.fpd-sub .prow{display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer;transition:border-color .18s,background .18s;}
.fpd-sub .prow.sel{border-color:rgba(91,110,225,0.5);box-shadow:inset 0 0 0 1px rgba(91,110,225,0.4),0 6px 20px -8px rgba(91,110,225,0.45);}
.fpd-sub .pico{width:42px;height:42px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-sub .ptitle-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;}
.fpd-sub .ptitle{font-family:var(--font-display);font-size:14.5px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-sub .pbadge{padding:2.5px 8px;border-radius:99px;font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:0.05em;}
.fpd-sub .autotag{color:${POS};font-size:10px;font-family:var(--font-mono);font-weight:600;letter-spacing:0.04em;}
.fpd-sub .psub{color:${MUTED};font-size:12px;}
.fpd-sub .pamt{text-align:right;flex-shrink:0;}
.fpd-sub .pamt .val{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;font-variant-numeric:tabular-nums;}
.fpd-sub .pamt .freq{font-family:var(--font-mono);font-size:10px;margin-top:2px;}
.fpd-sub .icon-btn{background:none;border:none;cursor:pointer;padding:7px;border-radius:8px;display:flex;color:${MUTED};transition:color .16s,background .16s;flex-shrink:0;}
.fpd-sub .icon-btn:hover{color:${ACCENT2};background:rgba(91,110,225,0.1);}
.fpd-sub .icon-btn.del:hover{color:${NEG};background:rgba(208,107,107,0.1);}

/* detail panel */
.fpd-sub .dpanel{position:sticky;top:16px;}
.fpd-sub .dhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-sub .dhead .dname{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-sub .damt{display:flex;align-items:baseline;gap:8px;margin-bottom:14px;}
.fpd-sub .damt .val{font-family:var(--font-display);font-size:26px;color:${TEXT};font-weight:600;letter-spacing:-0.02em;}
.fpd-sub .damt .freq{font-family:var(--font-mono);font-size:12.5px;}
.fpd-sub .tile-group{display:flex;flex-direction:column;gap:8px;}
.fpd-sub .tile-row{padding:12px 14px;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-sub .tile-row.between{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.fpd-sub .tile-row .tk{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:4px;}
.fpd-sub .tile-row .tv{color:${TEXT};font-size:13px;}
.fpd-sub .tile-row .tv.mono{font-family:var(--font-mono);}
.fpd-sub .cancel-box{padding:13px 15px;border-radius:11px;background:rgba(208,107,107,0.06);border:1px solid rgba(208,107,107,0.22);margin-top:10px;}
.fpd-sub .cancel-box .tk{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${NEG};margin-bottom:4px;}
.fpd-sub .cancel-box .tv{color:${SOFT};font-size:12.5px;line-height:1.7;}
.fpd-sub .notes-box{padding:13px 15px;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);margin-top:10px;}
.fpd-sub .notes-box .tk{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-sub .notes-box .tv{color:${SOFT};font-size:13px;line-height:1.6;}

/* empty state */
.fpd-sub .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 16px;}
.fpd-sub .empty .ei{width:52px;height:52px;border-radius:14px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:${ACCENT2};margin-bottom:14px;}
.fpd-sub .empty .et{color:${SOFT};font-size:13.5px;}

/* modal */
.fpd-sub .check-row{display:flex;align-items:center;gap:9px;cursor:pointer;color:${SOFT};font-size:13px;}
.fpd-sub .check-row input{width:15px;height:15px;accent-color:${ACCENT};}
.fpd-sub .dropzone{flex:1;display:flex;align-items:center;gap:10px;padding:13px 15px;border-radius:11px;border:1.5px dashed rgba(91,110,225,0.28);background:rgba(91,110,225,0.03);cursor:pointer;color:${MUTED};font-size:13px;}
.fpd-sub .pw-wrap{position:relative;}
.fpd-sub .pw-wrap input{padding-right:38px;}
.fpd-sub .pw-toggle{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-sub .login-box{padding:15px;border-radius:12px;background:rgba(91,110,225,0.04);border:1px solid rgba(91,110,225,0.14);display:flex;flex-direction:column;gap:12px;}
.fpd-sub .login-box .lbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${ACCENT2};font-weight:700;}
.fpd-sub .payment-box{padding:15px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-sub .payment-box .lbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:10px;}
.fpd-sub .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-sub .modal{width:100%;max-width:600px;max-height:90vh;overflow-y:auto;}
.fpd-sub .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-sub .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;display:flex;align-items:center;gap:9px;}
.fpd-sub .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-sub .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-sub .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-sub .field input,.fpd-sub .field select,.fpd-sub .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-sub .field input::placeholder,.fpd-sub .field textarea::placeholder{color:${FAINT};}
.fpd-sub .field input:focus,.fpd-sub .field select:focus,.fpd-sub .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-sub .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-sub .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-sub .modal-foot .save{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-sub .modal-foot .save:hover{filter:brightness(1.08);}
.fpd-sub .modal-foot .save[disabled]{opacity:.6;cursor:default;}
@media (max-width:560px){.fpd-sub .field-grid{grid-template-columns:1fr;}}
`;

function AddSubModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(s:Subscription)=>void }) {
  useEscapeKey(true, onClose);
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
    <div className="field">
      <label>{label}</label>
      <input type={type} value={(form as any)[key]??""} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} />
    </div>
  );

  const sel = (key: string, label: string, opts: string[]) => (
    <div className="field">
      <label>{label}</label>
      <select value={(form as any)[key]??""} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal glow-surface">
        <div className="modal-head">
          <h3><CreditCard size={16} color={ACCENT2} /> Add Subscription / Auto Pay</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <div className="field-grid">
            {inp("title","TITLE *","e.g. Netflix, Adobe CC")}
            {sel("category","CATEGORY",categories.filter(c=>c!=="All"))}
          </div>
          <div className="field-grid">
            {inp("amount","MONTHLY AMOUNT ($) *","0.00","number")}
            {sel("frequency","BILLING FREQUENCY",["Weekly","Biweekly","Monthly","Quarterly","Yearly"])}
          </div>
          <div className="field-grid">
            {inp("phone","PHONE NUMBER","1-800-000-0000","tel")}
            {inp("website","WEBSITE / LOGIN URL","https://example.com","url")}
          </div>
          <div className="field-grid">
            {inp("billingAccountNumber","BILLING ACCOUNT NUMBER","e.g. ACC-8821")}
            {inp("nextBilling","NEXT BILLING DATE","e.g. Jul 1, 2026")}
          </div>
          {/* Payment */}
          <div className="payment-box">
            <div className="lbl">PAYMENT METHOD</div>
            <div className="field-grid">
              {sel("paymentType","PAYMENT TYPE",["Checking Account","Savings Account","American Express","Mastercard","Visa","Discover","PayPal","Apple Pay","Google Pay","Bitcoin (BTC)","Ethereum (ETH)","USDC","Other Crypto"])}
              {inp("lastFour","LAST 4 DIGITS","e.g. 8821")}
            </div>
          </div>
          {/* Login details */}
          <div className="login-box">
            <div className="lbl">ACCOUNT LOGIN DETAILS (for legacy contacts)</div>
            <div className="field-grid">
              {inp("username","USERNAME / EMAIL","your.username")}
              <div className="field">
                <label>PASSWORD</label>
                <div className="pw-wrap">
                  <input type={showPw?"text":"password"} value={form.password??""} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="Account password" style={{ fontFamily:"var(--font-mono)" }} />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="field">
            <label>CANCELLATION INSTRUCTIONS</label>
            <textarea style={{ resize:"vertical" }} value={form.cancelInstructions??""} onChange={e => setForm(p=>({...p,cancelInstructions:e.target.value}))} placeholder="Step-by-step instructions to cancel this subscription..." rows={2} />
          </div>
          {inp("notes","ADDITIONAL NOTES","Account details, login quirks, etc.")}
          <label className="check-row">
            <input type="checkbox" checked={form.autoPay??true} onChange={e => setForm(p=>({...p,autoPay:e.target.checked}))} />
            Auto-Pay Enabled
          </label>
          {/* Upload */}
          <div className="field">
            <label>ATTACH DOCUMENTS</label>
            <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e => { if(e.target.files?.[0]) toast.success(`Attached: ${e.target.files[0].name}`); }}/>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div onClick={() => fileRef.current?.click()} className="dropzone">
                <Upload size={14} color={ACCENT2} style={{ opacity:0.7 }}/>
                <span>Attach bill, statement, or agreement</span>
              </div>
              <ScanButton folder="financial" onUpload={doc => toast.success(`"${doc.name}" attached`)} size="sm" label="Scan"/>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="save" onClick={submit} disabled={loading}>
            {loading?"Saving...":"Save Subscription"}
          </button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
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

  /* Chips follow the data. A fixed slice used to cut Utilities off the end,
     leaving live subscriptions with no reachable filter. */
  const activeCategories = ["All", ...categories.filter(c => c !== "All" && subs.some(s => s.category === c))];

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

  const kpis = [
    { label: "Monthly Cost", value: `$${totalMonthly.toFixed(2)}`, sub: "Across active subscriptions", icon: <DollarSign size={14} />, dot: ACCENT2 },
    { label: "Annual Cost", value: `$${(totalMonthly*12).toFixed(0)}`, sub: "Projected per year", icon: <Calendar size={14} />, dot: WARN },
    { label: "Auto-Pay Active", value: String(subs.filter(s=>s.autoPay&&s.status==="active").length), sub: "Charging automatically", icon: <RefreshCw size={14} />, dot: POS },
    { label: "Total Subscriptions", value: String(subs.length), sub: "On record", icon: <CreditCard size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-sub">
      <style dangerouslySetInnerHTML={{ __html: SUB_CSS }} />
      <div className="fpd-sub-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><CreditCard size={12} /> Recurring Billing</div>
            <h1 className="pg-h1">Auto Pay &amp; Subscriptions</h1>
            <div className="pg-sub">{subs.filter(s=>s.status==="active").length} active subscriptions · ~${totalMonthly.toFixed(2)}/month total</div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Subscription
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

        {/* ── Alert ── */}
        <div className="foot">
          <AlertTriangle size={16} color={WARN} style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="ft">
            <b>These subscriptions and accounts need to be cancelled or transferred when a user passes.</b> Ensure legacy contacts have access to this page.
          </div>
        </div>

        {/* ── Search + category filters ── */}
        <div className="toolbar-row">
          <div className="search">
            <Search size={13} color={MUTED} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subscriptions..." />
          </div>
          <div className="filters">
            {activeCategories.map(c => {
              const on = category === c;
              return (
                <button key={c} onClick={() => setCategory(c)} className={`chip ${on ? "" : "off"}`}
                  style={{ background: on ? "rgba(91,110,225,0.16)" : "transparent", color: on ? ACCENT2 : MUTED, borderColor: on ? "rgba(91,110,225,0.4)" : "rgba(255,255,255,0.09)" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bento">
          {/* Subscription list */}
          <div className="plist">
            {filtered.map(sub => (
              <div key={sub.id} className={`card prow glow-surface ${selected?.id===sub.id ? "sel" : ""}`} onClick={() => setSelected(selected?.id===sub.id ? null : sub)}>
                <div className="pico" style={{ background:`${frequencyColor[sub.frequency]}1C` }}>
                  <CreditCard size={18} color={frequencyColor[sub.frequency]}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ptitle-row">
                    <span className="ptitle">{sub.title}</span>
                    <span className="pbadge" style={{ background:statusColor[sub.status].bg, color:statusColor[sub.status].color }}>{sub.status.toUpperCase()}</span>
                    {sub.autoPay && <span className="autotag">AUTO-PAY</span>}
                  </div>
                  <div className="psub">{sub.paymentType}{sub.lastFour ? ` ···· ${sub.lastFour}` : ""} · Next: {sub.nextBilling || "—"}</div>
                </div>
                <div className="pamt">
                  <div className="val">${sub.amount.toFixed(2)}</div>
                  <div className="freq" style={{ color:frequencyColor[sub.frequency] }}>{sub.frequency}</div>
                </div>
                <button className="icon-btn del" onClick={e => { e.stopPropagation(); deleteSub(sub.id); }}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="card pad glow-surface dpanel">
                <div className="dhead">
                  <div className="dname">{selected.title}</div>
                  <button className="icon-btn" onClick={() => setSelected(null)}><X size={13}/></button>
                </div>
                <div className="damt">
                  <span className="val">${selected.amount.toFixed(2)}</span>
                  <span className="freq" style={{ color:frequencyColor[selected.frequency] }}>/{selected.frequency.toLowerCase()}</span>
                </div>
                <div className="tile-group">
                  {[
                    { label:"Payment", value:`${selected.paymentType}${selected.lastFour ? ` ···· ${selected.lastFour}` : ""}` },
                    { label:"Account #", value:selected.billingAccountNumber },
                    { label:"Phone", value:selected.phone },
                    { label:"Website", value:selected.website },
                    { label:"Username", value:selected.username },
                    { label:"Next Billing", value:selected.nextBilling },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="tile-row">
                      <div className="tk">{row.label.toUpperCase()}</div>
                      <div className="tv">{row.value}</div>
                    </div>
                  ))}
                  {selected.password && (
                    <div className="tile-row between">
                      <div>
                        <div className="tk">PASSWORD</div>
                        <div className="tv mono">{showPwFor===selected.id ? selected.password : "••••••••"}</div>
                      </div>
                      <button className="icon-btn" onClick={() => setShowPwFor(showPwFor===selected.id ? null : selected.id)}>
                        {showPwFor===selected.id ? <EyeOff size={12}/> : <Eye size={12}/>}
                      </button>
                    </div>
                  )}
                </div>
                {selected.cancelInstructions && (
                  <div className="cancel-box">
                    <div className="tk">CANCELLATION INSTRUCTIONS</div>
                    <div className="tv">{selected.cancelInstructions}</div>
                  </div>
                )}
                {selected.notes && (
                  <div className="notes-box">
                    <div className="tk">NOTES</div>
                    <div className="tv">{selected.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card empty glow-surface">
                <div className="ei"><CreditCard size={24}/></div>
                <div className="et">Select a subscription to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <AddSubModal onClose={() => setShowAdd(false)} onAdd={s => setSubs(prev => [s, ...prev])}/>}
    </div>
  );
}
