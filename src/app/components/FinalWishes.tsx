import React, { useState } from "react";
import {
  Heart, Church, HelpCircle, Plus, X,
  CheckCircle, Edit2, Trash2, ChevronDown, ArrowRight, Layers
} from "lucide-react";
import { toast } from "sonner";
import heroWishesPhoto from "../../imports/finalwishes_hero_photo.png";
import heroFuneralPhoto from "../../imports/funeral_hero_photo.png";
import heroQuestionnairePhoto from "../../imports/questionnaire_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault & folders) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const LAVENDER= "#7E6BD8";
const POS     = "#5FBE91";
const NEG     = "#D06B6B";

type Tab = "wishes" | "funeral" | "questionnaire";

const questionnaireCategories = [
  {
    title: "Personal Values & Beliefs",
    questions: [
      { id: "q1", q: "What values do you most want passed on to your family?", a: "Integrity, compassion, and always putting family first. Work hard but never sacrifice health for money." },
      { id: "q2", q: "What is your religious or spiritual preference for end-of-life?", a: "Non-denominational Christian service preferred. Simple and intimate." },
      { id: "q3", q: "Do you have any cultural traditions to be honored?", a: "" },
    ],
  },
  {
    title: "Medical Wishes",
    questions: [
      { id: "q4", q: "Do you have a Do Not Resuscitate (DNR) order?", a: "Yes — on file with my primary care physician Dr. Karen Fields." },
      { id: "q5", q: "Do you wish to be an organ donor?", a: "Yes, all viable organs." },
      { id: "q6", q: "Your wishes regarding life-sustaining treatment?", a: "If in a permanent vegetative state, discontinue life support after 30 days." },
    ],
  },
  {
    title: "Final Arrangements",
    questions: [
      { id: "q7", q: "Burial or cremation?", a: "Cremation. Scatter ashes at Big Sur, California." },
      { id: "q8", q: "Preferred funeral home or service?", a: "Green Valley Funeral Services, Sacramento CA." },
      { id: "q9", q: "Music or readings for memorial service?", a: "Amazing Grace, reading from Psalm 23." },
    ],
  },
];

const funeralPlan = {
  serviceType: "Memorial Service",
  location: "Green Valley Funeral Services, 1240 Oak Street, Sacramento, CA 95814",
  preferredDate: "Within 10 days of passing",
  budget: "$8,000–$12,000",
  prearranged: true,
  prearrangedWith: "Green Valley Funeral Services — Contract #GV-2024-8821",
  music: ["Amazing Grace", "How Great Thou Art", "Fly Me to the Moon"],
  readings: ["Psalm 23", "John 14:1-6"],
  flowers: "White lilies and blue hydrangeas",
  reception: "Family home — catered by Mario's Italian Kitchen",
  obituaryDraft: "James William Doe, beloved husband, father, and friend, passed peacefully surrounded by his family...",
  specialRequests: "No black attire — please wear bright colors to celebrate a life well lived.",
};

const WISH_CATEGORIES = ["Personal Property", "Sentimental Items", "Financial", "Digital", "Charitable", "Other"];

interface Wish {
  id: number; category: string; item: string; recipient: string; notes: string;
}

const initialWishes: Wish[] = [
  { id: 1, category: "Personal Property", item: "1967 Ford Mustang (Red)", recipient: "Michael Doe (Son)", notes: "Keep it in the family. Never sell it." },
  { id: 2, category: "Sentimental Items", item: "Grandfather's pocket watch", recipient: "Emily Doe (Daughter)", notes: "Has been in the family since 1892." },
  { id: 3, category: "Financial", item: "Savings account at First National", recipient: "Sarah Johnson (Spouse)", notes: "Primary beneficiary already designated." },
  { id: 4, category: "Personal Property", item: "Book collection (600+ volumes)", recipient: "Local Public Library", notes: "Donate the entire collection." },
  { id: 5, category: "Digital", item: "Photography portfolio (hard drives)", recipient: "Michael Doe (Son)", notes: "Archive and publish the wildlife series." },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-wishes so nothing else in the app is affected. */
const WISHES_CSS = `
.fpd-wishes{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-wishes *{box-sizing:border-box;}
.fpd-wishes-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-wishes .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only.
   One banner per sub-section (wishes / funeral / questionnaire), swapped by active tab. */
.fpd-wishes .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:200px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-wishes .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-wishes .hbanner:hover .art{transform:scale(1.08);}
.fpd-wishes .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-wishes .hbanner .hcontent{position:relative;z-index:2;padding:28px 32px;display:flex;flex-direction:column;justify-content:center;max-width:460px;}
.fpd-wishes .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:13px;font-family:var(--font-mono);}
.fpd-wishes .hbanner h1{font-family:var(--font-display);font-size:32.5px;font-weight:700;line-height:1.16;letter-spacing:-0.02em;margin:0 0 9px;color:${TEXT};}
.fpd-wishes .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-wishes .hbanner p{color:${SOFT};font-size:16px;line-height:1.6;max-width:390px;margin:0 0 18px;}
.fpd-wishes .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-wishes .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-wishes .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-wishes .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-wishes .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-wishes .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-wishes .hbanner{min-height:auto;} .fpd-wishes .hbanner .hcontent{padding:22px 20px;max-width:none;} .fpd-wishes .hbanner h1{font-size:26.5px;}}

.fpd-wishes .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-wishes .card.pad{padding:28px;}
.fpd-wishes .sec-title{font-size:18px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-wishes .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-wishes .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-wishes .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-wishes .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-wishes .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-wishes .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-wishes .btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-wishes .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-wishes .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:99px;background:rgba(95,190,145,0.12);color:#D99A6B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-wishes .btn-pos:hover{background:rgba(95,190,145,0.2);}
.fpd-wishes .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-wishes .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;}
.fpd-wishes .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-wishes .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-wishes .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-wishes .toolbar p{color:${MUTED};font-size:16px;line-height:1.6;}

/* KPI ledger */
.fpd-wishes .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:22px;}
.fpd-wishes .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.08);position:relative;text-align:left;overflow:hidden;}
.fpd-wishes .kcell:first-child{border-left:none;}
.fpd-wishes .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-wishes .kcell .klbl{font-size:12px;font-weight:600;color:${MUTED};}
.fpd-wishes .kcell .kico{width:27px;height:27px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-wishes .kcell .kval{font-family:var(--font-display);font-size:32.5px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-wishes .kcell .ksub{font-size:14.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-wishes .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-wishes .kstrip{grid-template-columns:1fr 1fr;}.fpd-wishes .kcell:nth-child(3){border-left:none;}.fpd-wishes .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}}

/* wish rows */
.fpd-wishes .wlist{display:flex;flex-direction:column;gap:10px;}
.fpd-wishes .wrow{padding:18px 20px;border:1.5px solid rgba(91,110,225,0.4);box-shadow:0 0 0 1px rgba(91,110,225,0.1),0 0 16px -8px rgba(91,110,225,0.35);transition:border-color .18s ease,box-shadow .18s ease;}
.fpd-wishes .wrow:hover{border-color:rgba(91,110,225,0.6);box-shadow:0 0 0 1px rgba(91,110,225,0.14),0 0 22px -6px rgba(91,110,225,0.45);}
.fpd-wishes .wrow .wtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
.fpd-wishes .wcat{display:inline-block;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:#6FAE8B;margin-bottom:9px;}
.fpd-wishes .witem{color:${TEXT};font-size:19px;font-weight:600;font-family:var(--font-display);margin-bottom:5px;}
.fpd-wishes .wrec{color:${MUTED};font-size:15.5px;display:flex;align-items:center;gap:6px;}
.fpd-wishes .wnotes{color:${MUTED};font-size:15px;margin-top:7px;font-style:italic;line-height:1.6;}
.fpd-wishes .wacts{display:flex;gap:4px;flex-shrink:0;}
.fpd-wishes .wacts button{background:none;border:none;cursor:pointer;padding:6px;display:flex;color:${MUTED};transition:color .16s;}
.fpd-wishes .wacts button:hover{color:#6FAE8B;}
.fpd-wishes .wacts button.del:hover{color:${NEG};}

/* empty state */
.fpd-wishes .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 12px;}
.fpd-wishes .empty .ei{width:46px;height:46px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:12px;}
.fpd-wishes .empty .et{color:${SOFT};font-size:17.5px;font-weight:600;font-family:var(--font-display);margin-bottom:4px;}
.fpd-wishes .empty .ed{color:${MUTED};font-size:15.5px;}

/* funeral grid */
.fpd-wishes .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.fpd-wishes .tile{padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-wishes .tile:not(:last-child){border-bottom-left-radius:0;border-bottom-right-radius:0;}
.fpd-wishes .tile + .tile{border-top:none;border-top-left-radius:0;border-top-right-radius:0;}
.fpd-wishes .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:6px;}
.fpd-wishes .tile .tv{color:${TEXT};font-size:16px;line-height:1.55;}
.fpd-wishes .tags{display:flex;flex-wrap:wrap;gap:7px;}
.fpd-wishes .tag{padding:4px 10px;border-radius:7px;font-size:14.5px;font-weight:500;}
.fpd-wishes .tag.music{background:rgba(91,110,225,0.12);color:#6FAE8B;}
.fpd-wishes .tag.read{background:rgba(126,107,216,0.14);color:#A98CC7;}

/* obituary */
.fpd-wishes .obit{padding:16px 18px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${SOFT};font-size:17px;line-height:1.85;white-space:pre-wrap;}
.fpd-wishes textarea,.fpd-wishes .qedit textarea{width:100%;padding:13px 15px;border-radius:16px;background:#0F1624;border:1px solid rgba(91,110,225,0.35);color:${TEXT};font-size:17px;line-height:1.8;outline:none;font-family:var(--font-body);resize:vertical;}
.fpd-wishes .acts-row{display:flex;gap:8px;margin-top:12px;}

/* questionnaire */
.fpd-wishes .qcount{padding:7px 13px;border-radius:99px;background:rgba(91,110,225,0.10);color:#6FAE8B;font-size:15.5px;font-family:var(--font-mono);flex-shrink:0;}
.fpd-wishes .qbar{height:7px;border-radius:99px;background:rgba(255,255,255,0.05);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);}
.fpd-wishes .qbar i{display:block;height:100%;background:linear-gradient(90deg,${ACCENT2},${ACCENT});transition:width .4s cubic-bezier(.4,0,.2,1);}
.fpd-wishes .qcat{border-radius:18px;overflow:hidden;}
.fpd-wishes .qcat + .qcat{margin-top:10px;}
.fpd-wishes .qhead{width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:none;border:none;cursor:pointer;text-align:left;}
.fpd-wishes .qhead .qtitle{font-family:var(--font-display);font-size:18px;color:${TEXT};font-weight:600;}
.fpd-wishes .qhead .qright{display:flex;align-items:center;gap:12px;}
.fpd-wishes .qhead .qn{color:${MUTED};font-size:14.5px;font-family:var(--font-mono);}
.fpd-wishes .qbody{padding:6px 18px 18px;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:16px;}
.fpd-wishes .qq{color:${TEXT};font-size:17px;font-weight:600;margin-bottom:8px;}
.fpd-wishes .qans{position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:border-color .16s;}
.fpd-wishes .qans:hover{border-color:rgba(91,110,225,0.3);}
.fpd-wishes .qans::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;pointer-events:none;background:linear-gradient(90deg,#7E6BD8,#5B6EE1);transform:scaleX(0);transform-origin:left;transition:transform .2s ease;box-shadow:0 0 8px 0 rgba(126,107,216,0.65);}
.fpd-wishes .qans:hover::after{transform:scaleX(1);}
.fpd-wishes .qans .qa-text{flex:1;font-size:16px;line-height:1.6;}
.fpd-wishes .qans .qa-text.filled{color:${SOFT};}
.fpd-wishes .qans .qa-text.empty{color:${FAINT};font-style:italic;}

@media (max-width:820px){.fpd-wishes .fgrid{grid-template-columns:1fr;}}

/* modal (shared pattern) */
.fpd-wishes .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-wishes .modal{width:100%;max-width:520px;}
.fpd-wishes .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-wishes .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-wishes .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-wishes .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-wishes .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-wishes .field input,.fpd-wishes .field select,.fpd-wishes .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-wishes .field input::placeholder,.fpd-wishes .field textarea::placeholder{color:${FAINT};}
.fpd-wishes .field input:focus,.fpd-wishes .field select:focus,.fpd-wishes .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-wishes .modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
`;

/* ── Add / edit a bequest ── */
function WishModal({ editing, onClose, onSave }: {
  editing: Wish | null; onClose: () => void; onSave: (w: Wish) => void;
}) {
  const [form, setForm] = useState<Partial<Wish>>(editing ?? { category: WISH_CATEGORIES[0], item: "", recipient: "", notes: "" });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!form.item?.trim()) return toast.error("Describe the item or asset.");
    if (!form.recipient?.trim()) return toast.error("Name who should receive it.");
    onSave({
      id: editing?.id ?? Date.now(),
      category: form.category ?? WISH_CATEGORIES[0],
      item: form.item.trim(),
      recipient: form.recipient.trim(),
      notes: form.notes?.trim() ?? "",
    });
  };

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal">
        <div className="modal-head">
          <h3>{editing ? "Edit Wish" : "Add a Wish"}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>CATEGORY</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {WISH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>ITEM OR ASSET *</label>
            <input value={form.item ?? ""} onChange={e => setForm(p => ({ ...p, item: e.target.value }))}
              placeholder="e.g. Grandmother's wedding ring" />
          </div>
          <div className="field">
            <label>RECIPIENT *</label>
            <input value={form.recipient ?? ""} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))}
              placeholder="e.g. Emily Doe (Daughter)" />
          </div>
          <div className="field">
            <label>NOTES</label>
            <textarea style={{ minHeight: 80 }} value={form.notes ?? ""}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Why this matters, or any conditions attached" />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-sec" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>
            <CheckCircle size={14} /> {editing ? "Save Changes" : "Add Wish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinalWishes() {
  const [tab, setTab] = useState<Tab>("wishes");
  const [expandedCat, setExpandedCat] = useState<number | null>(0);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [wishes, setWishes] = useState<Wish[]>(initialWishes);
  const [wishModal, setWishModal] = useState(false);
  const [editingWish, setEditingWish] = useState<Wish | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questionnaireCategories.flatMap(c => c.questions).map(q => [q.id, q.a]))
  );

  const saveWish = (w: Wish) => {
    setWishes(prev => editingWish ? prev.map(x => x.id === w.id ? w : x) : [w, ...prev]);
    toast.success(editingWish ? "Wish updated." : `"${w.item}" added to your final wishes.`);
    setWishModal(false);
    setEditingWish(null);
  };

  const deleteWish = (id: number) => {
    const w = wishes.find(x => x.id === id);
    setWishes(prev => prev.filter(x => x.id !== id));
    toast.success(`"${w?.item}" removed.`);
  };

  const [obituary, setObituary] = useState(funeralPlan.obituaryDraft);
  const [editingObit, setEditingObit] = useState(false);
  const wlistRef = React.useRef<HTMLDivElement>(null);
  const funeralGridRef = React.useRef<HTMLDivElement>(null);
  const qlistRef = React.useRef<HTMLDivElement>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "wishes",        label: "Final Wishes",     icon: <Heart size={14} /> },
    { id: "funeral",       label: "Funeral Planning", icon: <Church size={14} /> },
    { id: "questionnaire", label: "Questionnaire",    icon: <HelpCircle size={14} /> },
  ];

  const completedAnswers = Object.values(answers).filter(a => a.trim().length > 0).length;
  const totalQuestions = questionnaireCategories.flatMap(c => c.questions).length;

  const wishCategoryCount = new Set(wishes.map(w => w.category)).size;
  const kpis = [
    { label: "Wishes Recorded", value: String(wishes.length), sub: `${wishCategoryCount} categor${wishCategoryCount === 1 ? "y" : "ies"}`, icon: <Heart size={14} />, dot: ACCENT2 },
    { label: "Categories", value: String(WISH_CATEGORIES.length), sub: "Available to assign", icon: <Layers size={14} />, dot: ACCENT2 },
    { label: "Funeral Plan", value: funeralPlan.prearranged ? "Prearranged" : "Not Set", sub: funeralPlan.prearranged ? "Contract on file" : "Add your plan", icon: <Church size={14} />, dot: funeralPlan.prearranged ? POS : ACCENT2 },
    { label: "Questionnaire", value: `${completedAnswers}/${totalQuestions}`, sub: `${Math.round((completedAnswers / totalQuestions) * 100)}% complete`, icon: <HelpCircle size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-wishes">
      <style dangerouslySetInnerHTML={{ __html: WISHES_CSS }} />
      <div className="fpd-wishes-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Heart size={12} /> Estate Planning</div>
          <h1 className="pg-h1">Final Wishes</h1>
          <div className="pg-sub">Document your wishes, legal instruments, and funeral preferences in one secure place.</div>
        </div>

        {/* ── Hero banner (swaps with the active tab) ── */}
        {tab === "wishes" && (
          <div className="hbanner">
            <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroWishesPhoto})` }} />
            <div className="scrim" />
            <div className="hcontent">
              <span className="heyebrow">Your Wishes, Written Down</span>
              <h1>Say exactly <span className="accent">who gets what.</span></h1>
              <p>Specific items, property, and bequests — recorded clearly so your loved ones never have to guess.</p>
              <div className="hactions">
                <button className="hbtn primary" onClick={() => { setEditingWish(null); setWishModal(true); }}><Plus size={15} /> Add Wish</button>
                <button className="hbtn ghost" onClick={() => wlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><Heart size={15} /> View All Wishes</button>
              </div>
            </div>
          </div>
        )}
        {tab === "funeral" && (
          <div className="hbanner">
            <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroFuneralPhoto})` }} />
            <div className="scrim" />
            <div className="hcontent">
              <span className="heyebrow">A Service, Planned With Care</span>
              <h1>Every detail, <span className="accent">already decided.</span></h1>
              <p>Service type, music, readings, and the obituary draft — so your family can focus on each other, not logistics.</p>
              <div className="hactions">
                <button className="hbtn primary" onClick={() => setEditingObit(true)}><Edit2 size={15} /> Edit Obituary</button>
                <button className="hbtn ghost" onClick={() => funeralGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><Church size={15} /> View Service Details</button>
              </div>
            </div>
          </div>
        )}
        {tab === "questionnaire" && (
          <div className="hbanner">
            <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroQuestionnairePhoto})` }} />
            <div className="scrim" />
            <div className="hcontent">
              <span className="heyebrow">Help Them Understand You</span>
              <h1>Answer a few questions, <span className="accent">ease a hundred decisions.</span></h1>
              <p>Your values, medical wishes, and final arrangements — in your own words, for the people who'll need them most.</p>
              <div className="hactions">
                <button className="hbtn primary" onClick={() => { setExpandedCat(0); qlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><HelpCircle size={15} /> Answer Questions</button>
                <button className="hbtn ghost" onClick={() => qlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><CheckCircle size={15} /> View Progress</button>
              </div>
            </div>
          </div>
        )}

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

        {/* ── Tabs ── */}
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Final Wishes ── */}
        {tab === "wishes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar">
              <p>Specific items, property, or bequests you want to leave to individuals or organizations.</p>
              <button className="btn-primary" onClick={() => { setEditingWish(null); setWishModal(true); }}>
                <Plus size={14} /> Add Wish
              </button>
            </div>

            {wishes.length === 0 && (
              <div className="card empty">
                <div className="ei"><Heart size={20} /></div>
                <div className="et">No wishes recorded yet</div>
                <div className="ed">Add the first item you want passed to someone specific.</div>
              </div>
            )}

            <div className="wlist" ref={wlistRef}>
              {wishes.map((wish) => (
                <div key={wish.id} className="card wrow">
                  <div className="wtop">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="wcat">{wish.category.toUpperCase()}</span>
                      <div className="witem">{wish.item}</div>
                      <div className="wrec"><ArrowRight size={12} color="#FFFFFF" /> {wish.recipient}</div>
                      {wish.notes && <div className="wnotes">"{wish.notes}"</div>}
                    </div>
                    <div className="wacts">
                      <button title="Edit wish" onClick={() => { setEditingWish(wish); setWishModal(true); }}><Edit2 size={14} /></button>
                      <button className="del" title="Delete wish" onClick={() => deleteWish(wish.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Funeral Planning ── */}
        {tab === "funeral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="fgrid" ref={funeralGridRef}>
              <div className="card pad">
                <h3 className="sec-title"><span className="tick" />Service Details</h3>
                {[
                  { label: "Service Type", value: funeralPlan.serviceType },
                  { label: "Location / Funeral Home", value: funeralPlan.location },
                  { label: "Preferred Timing", value: funeralPlan.preferredDate },
                  { label: "Budget Range", value: funeralPlan.budget },
                  { label: "Prearranged Contract", value: funeralPlan.prearranged ? funeralPlan.prearrangedWith : "Not prearranged" },
                ].map(f => (
                  <div key={f.label} className="tile">
                    <div className="tk">{f.label}</div>
                    <div className="tv">{f.value}</div>
                  </div>
                ))}
              </div>

              <div className="card pad">
                <h3 className="sec-title"><span className="tick" />Service Preferences</h3>
                <div className="tile">
                  <div className="tk">Music</div>
                  <div className="tags">
                    {funeralPlan.music.map(m => <span key={m} className="tag music">{m}</span>)}
                  </div>
                </div>
                <div className="tile">
                  <div className="tk">Readings</div>
                  <div className="tags">
                    {funeralPlan.readings.map(r => <span key={r} className="tag read">{r}</span>)}
                  </div>
                </div>
                <div className="tile">
                  <div className="tk">Flowers</div>
                  <div className="tv">{funeralPlan.flowers}</div>
                </div>
                <div className="tile">
                  <div className="tk">Special Requests</div>
                  <div className="tv">{funeralPlan.specialRequests}</div>
                </div>
              </div>
            </div>

            <div className="card pad">
              <h3 className="sec-title"><span className="tick" />Obituary Draft</h3>
              {editingObit ? (
                <>
                  <textarea style={{ minHeight: 160 }} value={obituary} onChange={e => setObituary(e.target.value)} />
                  <div className="acts-row">
                    <button className="btn-pos" onClick={() => { setEditingObit(false); toast.success("Obituary draft saved."); }}>
                      <CheckCircle size={13} /> Save Draft
                    </button>
                    <button className="btn-sec" onClick={() => { setObituary(funeralPlan.obituaryDraft); setEditingObit(false); }}>
                      Revert
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="obit">{obituary}</div>
                  <div className="acts-row">
                    <button className="btn-primary" onClick={() => setEditingObit(true)}>
                      <Edit2 size={13} /> Edit Obituary
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Questionnaire ── */}
        {tab === "questionnaire" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="toolbar">
              <p>Answer these questions to help your loved ones understand your wishes and values.</p>
              <span className="qcount">{completedAnswers}/{totalQuestions} Answered</span>
            </div>
            <div className="qbar" ref={qlistRef}><i style={{ width: `${(completedAnswers / totalQuestions) * 100}%` }} /></div>

            {questionnaireCategories.map((cat, ci) => (
              <div key={ci} className="card qcat">
                <button className="qhead" onClick={() => setExpandedCat(expandedCat === ci ? null : ci)}>
                  <span className="qtitle">{cat.title}</span>
                  <div className="qright">
                    <span className="qn">{cat.questions.filter(q => answers[q.id]?.trim()).length}/{cat.questions.length} answered</span>
                    <ChevronDown size={16} color={MUTED} style={{ transform: expandedCat === ci ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                  </div>
                </button>
                {expandedCat === ci && (
                  <div className="qbody">
                    {cat.questions.map(q => (
                      <div key={q.id}>
                        <div className="qq">{q.q}</div>
                        {editingAnswer === q.id ? (
                          <div className="qedit">
                            <textarea
                              value={answers[q.id]}
                              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                              rows={3}
                            />
                            <div className="acts-row">
                              <button className="btn-pos" onClick={() => setEditingAnswer(null)}>
                                <CheckCircle size={13} /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="qans" onClick={() => setEditingAnswer(q.id)}>
                            <span className={`qa-text ${answers[q.id] ? "filled" : "empty"}`}>
                              {answers[q.id] || "Click to answer..."}
                            </span>
                            <Edit2 size={13} color={MUTED} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {wishModal && (
          <WishModal
            editing={editingWish}
            onClose={() => { setWishModal(false); setEditingWish(null); }}
            onSave={saveWish}
          />
        )}
      </div>
    </div>
  );
}
