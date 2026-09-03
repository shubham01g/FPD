import React, { useState } from "react";
import { Folder, Bell, Calendar, Plus, Trash2, CheckCircle, X, Cake, Heart, PartyPopper, Scale, Landmark, HeartPulse, House, ShieldCheck, Mail, Image as ImageIcon, Lock, Car, PawPrint, Clock, ArrowRight } from "lucide-react";
import { useDemo, type Reminder, type Occasion } from "../context/DemoContext";
import { toast } from "sonner";
import heroFoldersPhoto from "../../imports/folders_hero_photo.webp";
import heroReminderPhoto from "../../imports/reminder_hero_photo.webp";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet & legacy vault) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

type Tab = "folders"|"reminders"|"occasions";

/* Refined per-folder accent — the same nine-hue harmonised family used across
   the Calendar, File Cabinet and Legacy Vault. */
const RAMP = ["#5BA7D6","#5BA7D6","#7E6BD8","#6F9E94","#6FAE8B","#97A2C6","#7E6BD8","#5BA7D6","#5B6EE1"];

const folders = [
  { id:1, name:"Legal Documents",  files:8,   size:"12.4 MB", color:ACCENT2,   desc:"Wills, trusts, power of attorney",   icon:Scale,       updated:"2 days ago" },
  { id:2, name:"Financial Records",files:15,  size:"24.8 MB", color:ACCENT,    desc:"Bank statements, tax returns",       icon:Landmark,    updated:"5 days ago" },
  { id:3, name:"Medical Records",  files:6,   size:"8.1 MB",  color:"#7E6BD8", desc:"Test results, prescriptions",        icon:HeartPulse,  updated:"1 week ago" },
  { id:4, name:"Property Records", files:4,   size:"5.2 MB",  color:"#6F9E94", desc:"Deeds, mortgage statements",         icon:House,       updated:"3 weeks ago" },
  { id:5, name:"Insurance Policies",files:5,  size:"7.9 MB",  color:"#6FAE8B", desc:"Life, home, auto policies",          icon:ShieldCheck, updated:"2 weeks ago" },
  { id:6, name:"Personal Letters", files:12,  size:"3.4 MB",  color:"#97A2C6", desc:"Letters to family",                  icon:Mail,        updated:"4 days ago" },
  { id:7, name:"Photo Archive",    files:847, size:"4.2 GB",  color:"#A98CC7", desc:"Scanned family photos",              icon:ImageIcon,   updated:"Yesterday" },
  { id:8, name:"Secret Vault", files:3,   size:"0.8 MB",  color:NEG, desc:"Encrypted — seed phrases, combinations", icon:Lock, locked:true, updated:"1 month ago" },
];

const remCatIcon: Record<string, any> = { Legal:Scale, Financial:Landmark, Medical:HeartPulse, Legacy:Heart, Vehicles:Car, Pets:PawPrint };

function dateChip(due: string) {
  const m = due.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2})/);
  return m ? { mon: m[1].toUpperCase(), day: m[2] } : null;
}

const remStatus = {
  overdue:  { color:NEG,  label:"OVERDUE" },
  due_soon: { color:WARN, label:"DUE SOON" },
  upcoming: { color:"#D99A6B",  label:"UPCOMING" },
  completed:{ color:FAINT,label:"DONE" },
};
const occType = {
  birthday:    { color:"#6FAE8B",    Icon:Cake },
  anniversary: { color:"#A98CC7",  Icon:Heart },
  holiday:     { color:WARN,       Icon:PartyPopper },
};

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-org so nothing else in the app is affected. */
const ORG_CSS = `
.fpd-org{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-org *{box-sizing:border-box;}
.fpd-org-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-org .wrap{max-width:1180px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only.
   One banner per sub-section (folders / reminders), swapped by active tab. */
.fpd-org .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:200px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-org .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-org .hbanner:hover .art{transform:scale(1.08);}
.fpd-org .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-org .hbanner .hcontent{position:relative;z-index:2;padding:28px 32px;display:flex;flex-direction:column;justify-content:center;max-width:460px;}
.fpd-org .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:13px;font-family:var(--font-mono);}
.fpd-org .hbanner h1{font-family:var(--font-display);font-size:32.5px;font-weight:700;line-height:1.16;letter-spacing:-0.02em;margin:0 0 9px;color:${TEXT};}
.fpd-org .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-org .hbanner p{color:${SOFT};font-size:16px;line-height:1.6;max-width:390px;margin:0 0 18px;}
.fpd-org .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-org .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-org .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-org .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-org .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-org .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-org .hbanner{min-height:auto;} .fpd-org .hbanner .hcontent{padding:22px 20px;max-width:none;} .fpd-org .hbanner h1{font-size:26.5px;}}

.fpd-org .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-org .card.pad{padding:28px;}
.fpd-org .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-org .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-org .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-org .pg-sub{color:${MUTED};font-size:16px;max-width:620px;line-height:1.6;}
.fpd-org .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-org .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}

/* segmented tabs */
.fpd-org .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;}
.fpd-org .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-org .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-org .toolbar{display:flex;justify-content:flex-end;}

/* folder grid */
.fpd-org .fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:16px;}
.fpd-org .fcard{position:relative;text-align:left;border-radius:22px;overflow:hidden;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);cursor:pointer;transition:transform .2s cubic-bezier(.16,1,.3,1),border-color .2s,box-shadow .2s;display:flex;flex-direction:column;}
.fpd-org .fcard:hover{transform:translateY(-3px);border-color:rgba(91,110,225,0.34);box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 18px 40px -16px rgba(0,0,0,0.75);}
.fpd-org .fcard.locked{background:linear-gradient(180deg,#171016 0%,#0F0A0C 100%);}
.fpd-org .fcard.locked:hover{border-color:rgba(208,107,107,0.4);}
.fpd-org .fcard .bar{height:3px;}
.fpd-org .fcard .fbody{padding:18px;display:flex;flex-direction:column;gap:12px;flex:1;}
.fpd-org .fcard .ftop{display:flex;align-items:center;gap:12px;}
.fpd-org .fcard .fico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:transform .2s;}
.fpd-org .fcard:hover .fico{transform:scale(1.06);}
.fpd-org .fcard .ftitle{color:${TEXT};font-size:17px;font-weight:600;font-family:var(--font-display);}
.fpd-org .fcard .fmeta{color:${MUTED};font-family:var(--font-mono);font-size:12.5px;margin-top:2px;}
.fpd-org .fcard .flocked{margin-left:auto;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;background:rgba(208,107,107,0.13);color:${NEG};font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.06em;flex-shrink:0;}
.fpd-org .fcard .fdesc{color:${MUTED};font-size:14.5px;line-height:1.55;flex:1;}
.fpd-org .fcard .ffoot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);}
.fpd-org .fcard .fupdated{display:flex;align-items:center;gap:5px;color:${FAINT};font-size:12px;font-family:var(--font-mono);}
.fpd-org .fcard .fopen{display:flex;align-items:center;gap:4px;color:${MUTED};font-size:13px;font-weight:600;opacity:0;transform:translateX(-4px);transition:opacity .2s,transform .2s,color .2s;flex-shrink:0;}
.fpd-org .fcard:hover .fopen{opacity:1;transform:translateX(0);color:#fff;}

/* reminders */
.fpd-org .rlist{display:flex;flex-direction:column;gap:22px;}
.fpd-org .rsection{display:flex;flex-direction:column;gap:10px;}
.fpd-org .rsec-head{display:flex;align-items:center;gap:8px;padding:0 2px;}
.fpd-org .rsec-dot{width:8px;height:8px;border-radius:99px;flex-shrink:0;}
.fpd-org .rsec-title{font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-family:var(--font-mono);}
.fpd-org .rsec-count{font-size:12px;color:${FAINT};background:rgba(255,255,255,0.05);border-radius:99px;padding:1px 8px;}
.fpd-org .rrow{display:flex;align-items:center;gap:14px;padding:15px 18px;border-radius:18px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.08);transition:border-color .18s ease,background .18s ease,transform .18s ease;}
.fpd-org .rrow:hover{border-color:rgba(255,255,255,0.16);background:rgba(255,255,255,0.03);transform:translateY(-1px);}
.fpd-org .rdate{width:52px;height:52px;flex-shrink:0;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.09);display:flex;flex-direction:column;align-items:center;justify-content:center;}
.fpd-org .rdate-mon{font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:0.06em;}
.fpd-org .rdate-day{font-family:var(--font-display);font-size:20px;font-weight:700;color:${TEXT};line-height:1;margin-top:2px;}
.fpd-org .rrow .rtop{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.fpd-org .rrow .rtitle{color:${TEXT};font-size:17px;font-weight:600;font-family:var(--font-display);}
.fpd-org .rrow .rmeta{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:4px;}
.fpd-org .rrow .rmeta span{color:${MUTED};font-size:15px;}
.fpd-org .rrow .rmeta strong{color:${TEXT};font-weight:600;}
.fpd-org .rrow .rcat{padding:2px 8px;border-radius:6px;font-size:13.5px;background:rgba(255,255,255,0.04);color:${SOFT};}
.fpd-org .rrow .rnotes{color:${MUTED};font-size:14.5px;margin-top:3px;}
.fpd-org .rrow .racts{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.fpd-org .rrow .rbadge{padding:4px 9px;border-radius:7px;font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:0.05em;flex-shrink:0;}
.fpd-org .rrow .racts button{background:rgba(255,255,255,0.03);border:none;border-radius:10px;cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;transition:background .16s,filter .16s;flex-shrink:0;}
.fpd-org .rrow .racts button.done:hover{background:rgba(111,174,139,0.15);}
.fpd-org .rrow .racts button.del:hover{background:rgba(208,107,107,0.15);}

/* occasions */
.fpd-org .osections{display:flex;flex-direction:column;gap:22px;}
.fpd-org .ogrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:14px;}
.fpd-org .ocard{padding:18px;border-radius:22px;transition:transform .18s,border-color .18s;}
.fpd-org .ocard:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.14);}
.fpd-org .ocard .otop{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.fpd-org .ocard .oname{color:${TEXT};font-size:17px;font-weight:600;font-family:var(--font-display);}
.fpd-org .ocard .orec{color:${MUTED};font-size:14.5px;margin-top:1px;}
.fpd-org .ocard .onotes{color:${MUTED};font-size:14.5px;font-style:italic;padding-top:10px;margin-top:2px;border-top:1px solid rgba(255,255,255,0.06);}
.fpd-org .ocard .oannual{margin-left:auto;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;background:rgba(217,154,107,0.13);color:#D99A6B;font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.06em;flex-shrink:0;align-self:flex-start;}

/* new-tile / empty */
.fpd-org .newtile{border-radius:22px;border:1.5px dashed rgba(255,255,255,0.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:150px;color:${MUTED};cursor:pointer;transition:border-color .2s,background .2s;background:rgba(255,255,255,0.008);font-family:var(--font-body);}
.fpd-org .newtile:hover{border-color:rgba(91,110,225,0.4);background:rgba(91,110,225,0.03);}
.fpd-org .newtile-ico{width:44px;height:44px;border-radius:16px;background:rgba(91,110,225,0.1);border:1px solid rgba(91,110,225,0.25);display:flex;align-items:center;justify-content:center;color:${ACCENT2};margin-bottom:4px;transition:background .2s,transform .2s;}
.fpd-org .newtile:hover .newtile-ico{background:rgba(91,110,225,0.2);transform:scale(1.08);}
.fpd-org .newtile-title{font-size:16px;font-weight:600;color:${SOFT};}
.fpd-org .newtile-sub{font-size:13px;color:${FAINT};}
.fpd-org .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 12px;}
.fpd-org .empty .ei{width:46px;height:46px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:12px;}
.fpd-org .empty .et{color:${SOFT};font-size:16px;font-weight:600;font-family:var(--font-display);}

/* modal */
.fpd-org .backdrop{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-org .modal{width:100%;max-width:380px;padding:24px;}
.fpd-org .modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.fpd-org .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-org .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-org .field{margin-bottom:12px;}
.fpd-org .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-org .field input,.fpd-org .field select{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-org .field input::placeholder{color:${FAINT};}
.fpd-org .field input:focus,.fpd-org .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-org .modal-acts{display:flex;gap:10px;margin-top:6px;}
.fpd-org .modal-acts .save{flex:1;padding:11px;border-radius:18px;font-size:16px;font-weight:600;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-org .modal-acts .save:hover{filter:brightness(1.08);}
.fpd-org .modal-acts .save:disabled{opacity:.6;cursor:default;}
.fpd-org .modal-acts .cancel{padding:11px 16px;border-radius:18px;font-size:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};cursor:pointer;font-family:var(--font-body);}

@media (max-width:640px){.fpd-org .fgrid,.fpd-org .ogrid{grid-template-columns:1fr;}}
`;

function AddReminderModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(r:Omit<Reminder,"id">)=>Promise<void> }) {
  const [form, setForm] = useState({ title:"", dueDate:"", frequency:"Annual", category:"Legal", status:"upcoming" as Reminder["status"], notes:"" });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.title || !form.dueDate) { toast.error("Title and due date required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head"><h3>Add Reminder</h3><button onClick={onClose}><X size={15}/></button></div>
        {[{key:"title",label:"REMINDER TITLE",ph:"e.g. Update Will"},{key:"dueDate",label:"DUE DATE",ph:"e.g. Sep 15, 2026"},{key:"notes",label:"NOTES",ph:"Optional notes"}].map(f=>(
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}/>
          </div>
        ))}
        <div className="field">
          <label>FREQUENCY</label>
          <select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
            <option>Annual</option><option>Quarterly</option><option>Monthly</option><option>6 months</option><option>One-time</option>
          </select>
        </div>
        <div className="field">
          <label>CATEGORY</label>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
            <option>Legal</option><option>Financial</option><option>Medical</option><option>Legacy</option><option>Vehicles</option><option>Pets</option>
          </select>
        </div>
        <div className="modal-acts">
          <button className="save" onClick={submit} disabled={loading}>{loading?"Saving...":"Create Reminder"}</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddOccasionModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(o:Omit<Occasion,"id">)=>Promise<void> }) {
  const [form, setForm] = useState({ name:"", date:"", type:"birthday" as Occasion["type"], recipient:"", notes:"", recurring:true });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.name || !form.date) { toast.error("Name and date required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head"><h3>Add Occasion</h3><button onClick={onClose}><X size={15}/></button></div>
        {[{key:"name",label:"OCCASION NAME",ph:"e.g. Sarah's Birthday"},{key:"date",label:"DATE",ph:"e.g. Aug 14"},{key:"recipient",label:"RECIPIENT",ph:"e.g. Sarah Johnson"},{key:"notes",label:"NOTES",ph:"Optional notes"}].map(f=>(
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}/>
          </div>
        ))}
        <div className="field">
          <label>TYPE</label>
          <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))}>
            <option value="birthday">Birthday</option><option value="anniversary">Anniversary</option><option value="holiday">Holiday</option>
          </select>
        </div>
        <div className="modal-acts">
          <button className="save" onClick={submit} disabled={loading}>{loading?"Saving...":"Save Occasion"}</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddFolderModal({ onClose, onAdd, form, setForm }: { onClose:()=>void; onAdd:()=>void; form:{name:string;desc:string}; setForm:(f:{name:string;desc:string})=>void }) {
  return (
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head"><h3>Create New Folder</h3><button onClick={onClose}><X size={15}/></button></div>
        <div className="field">
          <label>FOLDER NAME *</label>
          <input value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} placeholder="e.g. Medical Directives"/>
        </div>
        <div className="field">
          <label>DESCRIPTION (optional)</label>
          <input value={form.desc} onChange={e=>setForm({ ...form, desc:e.target.value })} placeholder="What this folder is for"/>
        </div>
        <div className="modal-acts">
          <button className="save" onClick={onAdd}>Create Folder</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function OrganizeHub({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const { reminders, occasions, addReminder, completeReminder, removeReminder, addOccasion } = useDemo();
  const [tab, setTab] = useState<Tab>("folders");
  const [showAddRem, setShowAddRem] = useState(false);
  const [showAddOcc, setShowAddOcc] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderList, setFolderList] = useState(folders);
  const [newFolder, setNewFolder] = useState({ name:"", desc:"" });
  const fgridRef = React.useRef<HTMLDivElement>(null);
  const rlistRef = React.useRef<HTMLDivElement>(null);

  function addFolder() {
    if (!newFolder.name.trim()) { toast.error("Folder name required"); return; }
    const color = RAMP[folderList.length % RAMP.length];
    setFolderList(prev => [...prev, { id: Date.now(), name: newFolder.name, files: 0, size: "0 MB", color, desc: newFolder.desc }]);
    toast.success(`"${newFolder.name}" folder created`);
    setNewFolder({ name:"", desc:"" });
    setShowAddFolder(false);
  }

  const tabs = [
    { id:"folders" as Tab, label:"Folders", icon:<Folder size={13}/> },
    { id:"reminders" as Tab, label:`Reminders (${reminders.length})`, icon:<Bell size={13}/> },
    { id:"occasions" as Tab, label:`Occasions (${occasions.length})`, icon:<Calendar size={13}/> },
  ];

  return (
    <div className="fpd-org">
      <style dangerouslySetInnerHTML={{ __html: ORG_CSS }} />
      <div className="fpd-org-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth:0 }}>
            <div className="eyebrow"><Folder size={12}/> Personal Organization</div>
            <h1 className="pg-h1">Folders &amp; Reminders</h1>
            <div className="pg-sub">Personal folders, recurring reminders, and important family occasions — fully interactive in demo mode.</div>
          </div>
          <div className="seg">
            {tabs.map(t=>(
              <button key={t.id} className={tab===t.id ? "on" : ""} onClick={()=>setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab==="folders" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="hbanner">
              <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroFoldersPhoto})` }} />
              <div className="scrim" />
              <div className="hcontent">
                <span className="heyebrow">Personal Organization</span>
                <h1>Every keepsake, <span className="accent">exactly where it belongs.</span></h1>
                <p>Custom folders for the documents, letters, and records that matter most — organized your way.</p>
                <div className="hactions">
                  <button className="hbtn primary" onClick={()=>setShowAddFolder(true)}><Plus size={15}/> Create New Folder</button>
                  <button className="hbtn ghost" onClick={()=>fgridRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}><Folder size={15}/> Browse Folders</button>
                </div>
              </div>
            </div>
            <div className="toolbar">
              <button className="btn-primary" onClick={()=>setShowAddFolder(true)}><Plus size={14}/> Create New Folder</button>
            </div>
            <div className="fgrid" ref={fgridRef}>
              {folderList.map(f=>{
                const Icon = (f as any).icon || Folder;
                const locked = (f as any).locked;
                return (
                  <button key={f.id} className={`fcard${locked ? " locked" : ""}`} onClick={()=>toast.success(`Opened: ${f.name}`)}>
                    <div className="bar" style={{ background:`linear-gradient(90deg,${f.color},${f.color}66)` }}/>
                    <div className="fbody">
                      <div className="ftop">
                        <div className="fico" style={{ background:`linear-gradient(150deg, ${f.color}52, ${f.color}17)`, color:f.color, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)" }}><Icon size={20}/></div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="ftitle">{f.name}</div>
                          <div className="fmeta">{f.files} files · {f.size}</div>
                        </div>
                        {locked && <span className="flocked"><Lock size={10}/> LOCKED</span>}
                      </div>
                      <div className="fdesc">{f.desc}</div>
                      <div className="ffoot">
                        <span className="fupdated"><Clock size={11}/> Updated {(f as any).updated}</span>
                        <span className="fopen">Open <ArrowRight size={13}/></span>
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="newtile" onClick={()=>setShowAddFolder(true)}>
                <div className="newtile-ico"><Plus size={20}/></div>
                <span className="newtile-title">New Custom Folder</span>
                <span className="newtile-sub">Organize it your way</span>
              </div>
            </div>
          </div>
        )}

        {tab==="reminders" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="hbanner">
              <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroReminderPhoto})` }} />
              <div className="scrim" />
              <div className="hcontent">
                <span className="heyebrow">Never Miss What Matters</span>
                <h1>Friendly nudges for the <span className="accent">things worth remembering.</span></h1>
                <p>Recurring reminders for wills, policies, checkups and more — so nothing important is left until it's too late.</p>
                <div className="hactions">
                  <button className="hbtn primary" onClick={()=>setShowAddRem(true)}><Plus size={15}/> Add Reminder</button>
                  <button className="hbtn ghost" onClick={()=>rlistRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}><Bell size={15}/> View All Reminders</button>
                </div>
              </div>
            </div>
            <div className="toolbar">
              <button className="btn-primary" onClick={()=>setShowAddRem(true)}><Plus size={14}/> Add Reminder</button>
            </div>
            {reminders.length===0 && (
              <div className="card empty">
                <div className="ei"><Bell size={20}/></div>
                <div className="et">No reminders yet</div>
              </div>
            )}
            <div className="rlist" ref={rlistRef}>
              {(["overdue","due_soon","upcoming","completed"] as const).map(key=>{
                const list = reminders.filter(r=>r.status===key);
                if (!list.length) return null;
                const s = remStatus[key];
                const sectionTitle = { overdue:"Overdue", due_soon:"Due Soon", upcoming:"Upcoming", completed:"Completed" }[key];
                return (
                  <div className="rsection" key={key}>
                    <div className="rsec-head">
                      <span className="rsec-dot" style={{ background:s.color }}/>
                      <span className="rsec-title" style={{ color:s.color }}>{sectionTitle}</span>
                      <span className="rsec-count">{list.length}</span>
                    </div>
                    {list.map(r=>{
                      const CatIcon = remCatIcon[r.category] || Bell;
                      const chip = dateChip(r.dueDate);
                      return (
                        <div key={r.id} className="card rrow">
                          <div className="rdate" style={{ borderColor:`${s.color}44` }}>
                            {chip ? <><span className="rdate-mon" style={{ color:s.color }}>{chip.mon}</span><span className="rdate-day">{chip.day}</span></> : <Bell size={16} style={{ color:s.color }}/>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div className="rtop">
                              <CatIcon size={15} style={{ color:s.color, flexShrink:0 }}/>
                              <span className="rtitle">{r.title}</span>
                              <span className="rcat">{r.category}</span>
                            </div>
                            <div className="rmeta">
                              <span>Due <strong>{r.dueDate}</strong></span>
                              <span>Repeats {r.frequency}</span>
                            </div>
                            {r.notes && <div className="rnotes">{r.notes}</div>}
                          </div>
                          <div className="racts">
                            <span className="rbadge" style={{ background:`${s.color}22`, color:s.color }}>{s.label}</span>
                            {r.status!=="completed" && (
                              <button className="done" onClick={()=>completeReminder(r.id)} style={{ color:"#6FAE8B" }}><CheckCircle size={15}/></button>
                            )}
                            <button className="del" onClick={()=>removeReminder(r.id)} style={{ color:NEG }}><Trash2 size={14}/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {showAddRem && <AddReminderModal onClose={()=>setShowAddRem(false)} onAdd={addReminder}/>}
          </div>
        )}

        {tab==="occasions" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="pg-head">
              <div style={{ minWidth:0 }}>
                <div className="eyebrow"><Calendar size={12}/> Never Forget a Special Day</div>
                <div className="pg-sub" style={{ marginTop:6 }}>Birthdays, anniversaries, and holidays that matter to your family — with a friendly heads-up every year.</div>
              </div>
              <button className="btn-primary" onClick={()=>setShowAddOcc(true)}><Plus size={14}/> Add Occasion</button>
            </div>
            {occasions.length===0 && (
              <div className="card empty">
                <div className="ei"><Calendar size={20}/></div>
                <div className="et">No occasions yet</div>
              </div>
            )}
            <div className="osections">
              {(["birthday","anniversary","holiday"] as const).map(type=>{
                const list = occasions.filter(o=>o.type===type);
                if (!list.length) return null;
                const ot = occType[type];
                const title = { birthday:"Birthdays", anniversary:"Anniversaries", holiday:"Holidays" }[type];
                return (
                  <div className="rsection" key={type}>
                    <div className="rsec-head">
                      <span className="rsec-dot" style={{ background:ot.color }}/>
                      <span className="rsec-title" style={{ color:ot.color }}>{title}</span>
                      <span className="rsec-count">{list.length}</span>
                    </div>
                    <div className="ogrid">
                      {list.map(o=>{
                        const chip = dateChip(o.date);
                        return (
                          <div key={o.id} className="card ocard">
                            <div className="otop">
                              <div className="rdate" style={{ borderColor:`${ot.color}44` }}>
                                {chip ? <><span className="rdate-mon" style={{ color:ot.color }}>{chip.mon}</span><span className="rdate-day">{chip.day}</span></> : <ot.Icon size={16} style={{ color:ot.color }}/>}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div className="oname">{o.name}</div>
                                <div className="orec">{o.recipient}</div>
                              </div>
                              {o.recurring && <span className="oannual"><ot.Icon size={11}/> ANNUAL</span>}
                            </div>
                            {o.notes && <div className="onotes">{o.notes}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {showAddOcc && <AddOccasionModal onClose={()=>setShowAddOcc(false)} onAdd={addOccasion}/>}
          </div>
        )}

        {showAddFolder && (
          <AddFolderModal
            onClose={()=>setShowAddFolder(false)}
            onAdd={addFolder}
            form={newFolder}
            setForm={setNewFolder}
          />
        )}
      </div>
    </div>
  );
}
