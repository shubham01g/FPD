import React, { useState, useEffect, useCallback } from "react";
import { Star, Plus, X, Clock, MapPin, Phone, ChevronDown, ChevronUp, DollarSign, Car, Users, FileText, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";
import heroKidsPhoto from "../../imports/kidsactivities_hero_photo.webp";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders & final wishes) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

const ACTIVITY_TYPES = ["Soccer","Baseball / Softball","Basketball","Football","Swimming","Tennis","Gymnastics","Dance","Martial Arts","Track & Field","Volleyball","Cheerleading","Music / Band","Piano","Guitar","Violin","Drama / Theater","Art Class","Coding / STEM","Chess","Scouts / Scouting","Religious Education","Tutoring","Language Class","Yoga / Fitness","Other"];

const ACT_META: Record<string, {emoji:string; color:string; bg:string}> = {
  "Soccer":          {emoji:"⚽",color:"#D99A6B",bg:"rgba(72,187,120,0.1)"},
  "Baseball / Softball":{emoji:"⚾",color:"#F6AD55",bg:"rgba(246,173,85,0.1)"},
  "Basketball":      {emoji:"🏀",color:"#ED8936",bg:"rgba(237,137,54,0.1)"},
  "Football":        {emoji:"🏈",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Swimming":        {emoji:"🏊",color:"#6FAE8B",bg:"rgba(91,167,214,0.1)"},
  "Gymnastics":      {emoji:"🤸",color:"#FC8181",bg:"rgba(252,129,129,0.1)"},
  "Dance":           {emoji:"💃",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Martial Arts":    {emoji:"🥋",color:"#ED8936",bg:"rgba(237,137,54,0.1)"},
  "Music / Band":    {emoji:"🎵",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Piano":           {emoji:"🎹",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Guitar":          {emoji:"🎸",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Drama / Theater": {emoji:"🎭",color:"#FC8181",bg:"rgba(252,129,129,0.1)"},
  "Art Class":       {emoji:"🎨",color:"#ED8936",bg:"rgba(237,137,54,0.1)"},
  "Coding / STEM":   {emoji:"💻",color:"#D99A6B",bg:"rgba(72,187,120,0.1)"},
  "Chess":           {emoji:"♟️",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Scouts / Scouting":{emoji:"🏕️",color:"#D99A6B",bg:"rgba(72,187,120,0.1)"},
  "Religious Education":{emoji:"⛪",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
  "Tutoring":        {emoji:"📚",color:"#F6AD55",bg:"rgba(246,173,85,0.1)"},
  "Tennis":          {emoji:"🎾",color:"#D99A6B",bg:"rgba(72,187,120,0.1)"},
  "Violin":          {emoji:"🎻",color:"#6E90C9",bg:"rgba(91,110,225,0.1)"},
};
function getMeta(type:string) { return ACT_META[type] || {emoji:"⭐",color:"rgba(255,255,255,0.65)",bg:"rgba(138,154,184,0.1)"}; }

interface Activity {
  id: string;
  childName: string;
  activityType: string;
  organizationName: string;
  teamOrGroup: string;
  location: string;
  locationPhone: string;
  coachInstructor: string;
  coachPhone: string;
  schedule: string;
  seasonDates: string;
  monthlyCost: string;
  paymentDue: string;
  uniformRequired: string;
  transportationNotes: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
  status: "active"|"inactive"|"seasonal";
  documents: string[];
}

/* Rows come from the `kids_activities` table — the screen used to open on
   sample activities identical for every account and lost on refresh. */

const toMoney = (n: number | null | undefined) => (n === null || n === undefined ? "" : `$${Number(n).toLocaleString()}`);
const fromMoney = (v: string) => { const n = Number(String(v).replace(/[^0-9.]/g, "")); return Number.isFinite(n) && String(v).trim() !== "" ? n : null; };

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-kids so nothing else in the app is affected. */
const KIDS_CSS = `
.fpd-kids{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-kids *{box-sizing:border-box;}
.fpd-kids-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-kids .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-kids .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-kids .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-kids .hbanner:hover .art{transform:scale(1.08);}
.fpd-kids .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-kids .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-kids .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-kids .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-kids .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-kids .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-kids .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-kids .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-kids .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-kids .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-kids .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-kids .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-kids .hbanner{min-height:auto;} .fpd-kids .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-kids .hbanner h1{font-size:29px;}}

.fpd-kids .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-kids .card.pad{padding:28px;}
.fpd-kids .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-kids .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-kids .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-kids .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-kids .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-kids .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-kids .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger (3 metrics for this page) */
.fpd-kids .kpi-stack{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.fpd-kids .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-kids .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-kids .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-kids .kpi-mini-txt{flex:1;min-width:0;}
.fpd-kids .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-kids .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-kids .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-kids .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-kids .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-kids .kpi-stack{grid-template-columns:1fr;}}

/* child filter */
.fpd-kids .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-kids .chip{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:99px;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-kids .chip.off{opacity:.6;}
.fpd-kids .chip.off:hover{opacity:.85;}

/* activity cards */
.fpd-kids .alist{display:flex;flex-direction:column;gap:14px;}
.fpd-kids .ahead{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;background:none;border:none;cursor:pointer;text-align:left;}
.fpd-kids .aico{width:50px;height:50px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:29px;}
.fpd-kids .atitle{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;}
.fpd-kids .aname{font-family:var(--font-display);font-size:20.5px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-kids .aorg{color:${SOFT};font-size:16px;font-weight:500;margin-bottom:6px;}
.fpd-kids .ameta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.fpd-kids .ameta span{display:flex;align-items:center;gap:5px;color:${MUTED};font-size:14.5px;}
.fpd-kids .stat-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;}
.fpd-kids .abody{border-top:1px solid rgba(255,255,255,0.08);padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px;}

/* info tile grid */
.fpd-kids .igrid{display:grid;grid-template-columns:1fr 1fr;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;}
.fpd-kids .igrid .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-kids .igrid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
@media (max-width:900px){
.fpd-kids .igrid{grid-template-columns:1fr;}
.fpd-kids .igrid .tile:nth-child(2n){border-left:none;}
.fpd-kids .igrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}
.fpd-kids .tile{padding:12px 14px;}
.fpd-kids .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-kids .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}

/* transportation / notes */
.fpd-kids .infobox{padding:13px 15px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);}
.fpd-kids .infobox .ik{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#6FAE8B;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.06em;}
.fpd-kids .infobox .iv{color:${TEXT};font-size:16px;line-height:1.7;}
.fpd-kids .notebox{padding:13px 15px;border-radius:16px;background:rgba(217,165,94,0.07);border:1px solid rgba(217,165,94,0.22);}
.fpd-kids .notebox .nk{color:${WARN};font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.06em;margin-bottom:6px;}
.fpd-kids .notebox .nv{color:${TEXT};font-size:16px;line-height:1.7;}

/* documents */
.fpd-kids .doclbl{color:${MUTED};font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.08em;margin-bottom:8px;}
.fpd-kids .docrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.fpd-kids .docchip{display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border-radius:18px;font-size:15px;background:rgba(91,110,225,0.08);color:#6FAE8B;border:1px solid rgba(91,110,225,0.18);cursor:pointer;font-family:var(--font-body);transition:background .16s;}
.fpd-kids .docchip:hover{background:rgba(91,110,225,0.16);}

/* modal */
.fpd-kids .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-kids .modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
.fpd-kids .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-kids .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-kids .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-kids .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-kids .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-kids .field input,.fpd-kids .field select,.fpd-kids .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-kids .field input::placeholder,.fpd-kids .field textarea::placeholder{color:${FAINT};}
.fpd-kids .field input:focus,.fpd-kids .field select:focus,.fpd-kids .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-kids .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;}
.fpd-kids .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-kids .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function KidsActivities() {
  const { authUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);

  const reload = useCallback(async () => {
    if (!authUser) { setActivities([]); return; }
    const { data, error } = await tables.kidsActivities.list(authUser.id);
    if (error) { toast.error(`Could not load activities: ${error.message}`); return; }
    setActivities((data ?? []).map(r => ({
      id: String(r.id),
      childName: String(r.child_name ?? ""),
      activityType: String(r.activity_type ?? ""),
      organizationName: String(r.organization_name ?? ""),
      teamOrGroup: String(r.team_or_group ?? ""),
      location: String(r.location ?? ""),
      locationPhone: String(r.location_phone ?? ""),
      coachInstructor: String(r.coach_name ?? ""),
      coachPhone: String(r.coach_phone ?? ""),
      schedule: String(r.schedule ?? ""),
      seasonDates: String(r.season_dates ?? ""),
      monthlyCost: toMoney(r.monthly_cost as number | null),
      paymentDue: String(r.payment_due ?? ""),
      // The form describes the uniform rather than answering yes/no, so the
      // text lives in its own column and the boolean stays a plain flag.
      uniformRequired: String(r.uniform_details ?? ""),
      transportationNotes: String(r.transportation_notes ?? ""),
      emergencyContact: String(r.emergency_contact ?? ""),
      emergencyPhone: String(r.emergency_phone ?? ""),
      notes: String(r.notes ?? ""),
      status: (r.status as Activity["status"]) ?? "active",
      documents: (r.document_urls as string[] | null) ?? [],
    })));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterChild, setFilterChild] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const activitiesRef = React.useRef<HTMLDivElement>(null);
  const blankForm = {
    childName:"", activityType:ACTIVITY_TYPES[0], organizationName:"", teamOrGroup:"",
    location:"", locationPhone:"", coachInstructor:"", coachPhone:"", schedule:"",
    seasonDates:"", monthlyCost:"", paymentDue:"", uniformRequired:"", transportationNotes:"",
    emergencyContact:"", emergencyPhone:"", notes:"", status:"active" as "active"|"inactive"|"seasonal",
  };
  const [form, setForm] = useState(blankForm);

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function openAdd() {
    setForm(blankForm);
    setEditingId(null);
    setShowAdd(true);
  }

  function openEdit(act: Activity) {
    const { id, documents, ...rest } = act;
    setForm(rest);
    setEditingId(act.id);
    setShowAdd(true);
  }

  function closeModal() {
    setShowAdd(false);
    setEditingId(null);
  }

  async function saveActivity() {
    if (!form.childName || !form.activityType) { toast.error("Child name and activity type required"); return; }
    if (!authUser) { toast.error("Sign in to save activities."); return; }

    const row = {
      child_name: form.childName, activity_type: form.activityType,
      organization_name: form.organizationName, team_or_group: form.teamOrGroup,
      location: form.location, location_phone: form.locationPhone,
      coach_name: form.coachInstructor, coach_phone: form.coachPhone,
      schedule: form.schedule, season_dates: form.seasonDates,
      monthly_cost: fromMoney(form.monthlyCost), payment_due: form.paymentDue,
      uniform_details: form.uniformRequired,
      uniform_required: Boolean(form.uniformRequired.trim()),
      transportation_notes: form.transportationNotes,
      emergency_contact: form.emergencyContact, emergency_phone: form.emergencyPhone,
      notes: form.notes, status: form.status,
    };

    const { error } = editingId != null
      ? await tables.kidsActivities.update(editingId, row)
      : await tables.kidsActivities.add(authUser.id, row);

    if (error) { toast.error(`Could not save: ${error.message}`); return; }

    await reload();
    toast.success(editingId != null ? "Activity updated" : `${form.activityType} added for ${form.childName}`);
    setForm(blankForm);
    setEditingId(null);
    setShowAdd(false);
  }

  const children = ["all", ...Array.from(new Set(activities.map(a=>a.childName)))];
  const filtered = activities.filter(a => filterChild==="all" || a.childName===filterChild);

  const statusColors: Record<string,string> = { active: POS, inactive: MUTED, seasonal: WARN };
  const statusBgs: Record<string,string>   = { active: "rgba(95,190,145,0.14)", inactive: "rgba(140,151,180,0.14)", seasonal: "rgba(217,165,94,0.14)" };

  const kpis = [
    { label: "Total Activities", value: String(activities.length), sub: "Across all children", icon: <Star size={14} />, dot: ACCENT2 },
    { label: "Active", value: String(activities.filter(a=>a.status==="active").length), sub: "Currently enrolled", icon: <Clock size={14} />, dot: POS },
    { label: "Children", value: String(new Set(activities.map(a=>a.childName)).size), sub: "With tracked activities", icon: <Users size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-kids">
      <style dangerouslySetInnerHTML={{ __html: KIDS_CSS }} />
      <div className="fpd-kids-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroKidsPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Every Practice, Every Recital</span>
            <h1>The schedules, coaches, and costs — <span className="accent">all in one place.</span></h1>
            <p>Teams, instructors, transportation, and paperwork for every activity your kids are enrolled in — so nothing gets missed.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAdd}><Plus size={15} /> Add Activity</button>
              <button className="hbtn ghost" onClick={() => activitiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><Star size={15} /> View All Activities</button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Star size={12} /> Children's Schedules</div>
            <h1 className="pg-h1">Kids' Activities</h1>
            <div className="pg-sub">Track every activity for every child — schedules, coaches, transportation, costs, and important documents.</div>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Activity
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

        {/* ── Child filter ── */}
        <div className="filters">
          {children.map(child => {
            const on = filterChild === child;
            return (
              <button
                key={child}
                onClick={() => setFilterChild(child)}
                className={`chip ${on ? "" : "off"}`}
                style={{
                  background: on ? "rgba(91,110,225,0.16)" : "rgba(91,110,225,0.05)",
                  color: on ? "#6FAE8B" : MUTED,
                  borderColor: on ? "rgba(91,110,225,0.4)" : "rgba(255,255,255,0.09)",
                }}
              >
                {child === "all" ? "👦👧 All Children" : `👧 ${child}`}
              </button>
            );
          })}
        </div>

        {/* ── Activity cards ── */}
        <div className="alist" ref={activitiesRef}>
          {filtered.map(act => {
            const meta = getMeta(act.activityType);
            return (
              <div key={act.id} className="card">
                <div className="ahead" role="button" tabIndex={0} onClick={() => setExpanded(expanded === act.id ? null : act.id)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div className="aico" style={{ background: meta.bg }}>{meta.emoji}</div>
                    <div>
                      <div className="atitle">
                        <span className="aname">{act.activityType}</span>
                        <span className="stat-badge" style={{ background: statusBgs[act.status], color: statusColors[act.status] }}>{act.status.toUpperCase()}</span>
                      </div>
                      <div className="aorg">{act.childName} · {act.organizationName}</div>
                      <div className="ameta">
                        <span><Clock size={10} />{act.schedule}</span>
                        <span><DollarSign size={10} />{act.monthlyCost}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button
                      title="Edit activity"
                      onClick={(e) => { e.stopPropagation(); openEdit(act); }}
                      style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 6, display: "flex" }}
                    ><Edit2 size={14} /></button>
                    {expanded === act.id ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
                  </div>
                </div>

                {expanded === act.id && (
                  <div className="abody">
                    <div className="igrid">
                      {[
                        ["Team / Group",act.teamOrGroup||"—"],
                        ["Coach / Instructor",act.coachInstructor||"—"],
                        ["Coach Phone",act.coachPhone||"—"],
                        ["Location",act.location],
                        ["Location Phone",act.locationPhone||"—"],
                        ["Schedule",act.schedule],
                        ["Season / Dates",act.seasonDates],
                        ["Cost",act.monthlyCost],
                        ["Payment Due",act.paymentDue||"—"],
                        ["Uniform / Equipment",act.uniformRequired||"—"],
                        ["Emergency Contact",act.emergencyContact],
                        ["Emergency Phone",act.emergencyPhone],
                      ].map(([label,value]) => (
                        <div key={label} className="tile">
                          <div className="tk">{label}</div>
                          <div className="tv">{value}</div>
                        </div>
                      ))}
                    </div>

                    {act.transportationNotes && (
                      <div className="infobox">
                        <div className="ik"><Car size={13} color="#FFFFFF" />TRANSPORTATION & PICKUP NOTES</div>
                        <div className="iv">{act.transportationNotes}</div>
                      </div>
                    )}

                    {act.notes && (
                      <div className="notebox">
                        <div className="nk">NOTES</div>
                        <div className="nv">{act.notes}</div>
                      </div>
                    )}

                    <div>
                      <div className="doclbl">DOCUMENTS ({act.documents.length})</div>
                      <div className="docrow">
                        {act.documents.map(d => (
                          <button key={d} className="docchip" onClick={() => toast.success(`Opening: ${d}`)}>
                            <FileText size={12} /> {d}
                          </button>
                        ))}
                        <ScanButton folder="personal" onUpload={doc => { setActivities(p=>p.map(a=>a.id===act.id?{...a,documents:[...a.documents,doc.name]}:a)); toast.success(`"${doc.name}" added`); }} size="sm" label="Add Document" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Add activity modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId != null ? "Edit Activity" : "Add Activity"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>ACTIVITY TYPE</label>
                  <select value={form.activityType} onChange={F("activityType")}>
                    {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>STATUS</label>
                  <select value={form.status} onChange={F("status")}>
                    <option value="active">Active</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {[
                  ["Child's Full Name *","childName","e.g. Emma Doe"],
                  ["Organization / Club Name","organizationName","e.g. Sacramento Youth Soccer League"],
                  ["Team or Group","teamOrGroup","e.g. U6 Ladybugs — Team #14"],
                  ["Location","location","Address or facility name"],
                  ["Location Phone","locationPhone",""],
                  ["Coach / Instructor","coachInstructor",""],
                  ["Coach Phone","coachPhone",""],
                  ["Schedule","schedule","e.g. Saturdays 9:00 AM – 10:30 AM"],
                  ["Season / Dates","seasonDates","e.g. Sep 2025 – Nov 2025"],
                  ["Cost","monthlyCost","e.g. $85/month"],
                  ["Payment Due","paymentDue","e.g. 1st of month"],
                  ["Uniform / Equipment","uniformRequired","What the child needs"],
                  ["Transportation Notes","transportationNotes","Who drops off, picks up, carpool info"],
                  ["Emergency Contact","emergencyContact",""],
                  ["Emergency Phone","emergencyPhone",""],
                  ["Notes","notes","Anything else important"],
                ].map(([label,key,ph]) => (
                  <div className="field" key={key}>
                    <label>{label.toUpperCase()}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (registration form, waiver, medical clearance)" sectionId="kids-activities" sectionLabel="Kids Activities" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={saveActivity}>{editingId != null ? "Save Changes" : "Add Activity"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
