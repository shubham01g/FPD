import React, { useState, useEffect, useCallback } from "react";
import { Baby, Plus, X, Phone, MapPin, Clock, ChevronDown, ChevronUp, CheckCircle, AlertCircle, FileText, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";
import heroDaycarePhoto from "../../imports/daycare_hero_photo.webp";

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

interface AuthorizedPerson {
  name: string;
  relationship: string;
  phone: string;
  photoId: string;
}

interface DaycareRecord {
  id: string;
  facilityName: string;
  childName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  directorName: string;
  teacherName: string;
  teacherPhone: string;
  dropoffTime: string;
  pickupTime: string;
  days: string;
  tuition: string;
  tuitionDue: string;
  paymentMethod: string;
  allergiesOnFile: string;
  medicationsOnFile: string;
  emergencyContact: string;
  emergencyPhone: string;
  enrollDate: string;
  status: "active" | "inactive";
  notes: string;
  authorizedPickups: AuthorizedPerson[];
  documents: string[];
}

/* Rows come from the `daycare_records` table — the screen used to open on
   sample enrolments identical for every account and lost on refresh. */

// `days` is TEXT[] in the table but a single comma-separated field in the form.
const toDays = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
const fromDays = (v: string) => v.split(",").map(d => d.trim()).filter(Boolean);
const fromMoney = (v: string) => { const n = Number(String(v).replace(/[^0-9.]/g, "")); return Number.isFinite(n) && String(v).trim() !== "" ? n : null; };
const toMoney = (n: number | null | undefined) => (n === null || n === undefined ? "" : `$${Number(n).toLocaleString()}`);

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-daycare so nothing else in the app is affected. */
const DAYCARE_CSS = `
.fpd-daycare{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-daycare *{box-sizing:border-box;}
.fpd-daycare-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-daycare .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-daycare .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-daycare .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-daycare .hbanner:hover .art{transform:scale(1.08);}
.fpd-daycare .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-daycare .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-daycare .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-daycare .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-daycare .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-daycare .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-daycare .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-daycare .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-daycare .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-daycare .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-daycare .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-daycare .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-daycare .hbanner{min-height:auto;} .fpd-daycare .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-daycare .hbanner h1{font-size:29px;}}

.fpd-daycare .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-daycare .card.pad{padding:28px;}
.fpd-daycare .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-daycare .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-daycare .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-daycare .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-daycare .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-daycare .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-daycare .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented sub-tabs (per record) */
.fpd-daycare .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-daycare .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-daycare .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* record cards */
.fpd-daycare .rlist{display:flex;flex-direction:column;gap:14px;}
.fpd-daycare .rhead{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;background:none;border:none;cursor:pointer;text-align:left;}
.fpd-daycare .rico{width:46px;height:46px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-daycare .rtitle{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;}
.fpd-daycare .rname{font-family:var(--font-display);font-size:20.5px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-daycare .rchild{color:${SOFT};font-size:16px;font-weight:500;margin-bottom:6px;}
.fpd-daycare .rmeta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.fpd-daycare .rmeta span{display:flex;align-items:center;gap:5px;color:${MUTED};font-size:14.5px;}
.fpd-daycare .stat-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;}
.fpd-daycare .rbody{border-top:1px solid rgba(255,255,255,0.08);}
.fpd-daycare .rtabbar{padding:16px 22px 0;}
.fpd-daycare .rpanel{padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px;}

/* facility info tile grid */
.fpd-daycare .igrid{display:grid;grid-template-columns:1fr 1fr;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;}
.fpd-daycare .igrid .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-daycare .igrid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
@media (max-width:900px){
.fpd-daycare .igrid{grid-template-columns:1fr;}
.fpd-daycare .igrid .tile:nth-child(2n){border-left:none;}
.fpd-daycare .igrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}
.fpd-daycare .tile{padding:12px 14px;}
.fpd-daycare .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-daycare .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}

/* alert / notes */
.fpd-daycare .alert{display:flex;align-items:flex-start;gap:10px;padding:13px 15px;border-radius:16px;background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.28);}
.fpd-daycare .alert .ak{color:${NEG};font-family:var(--font-mono);font-size:13.5px;font-weight:700;letter-spacing:0.06em;margin-bottom:4px;}
.fpd-daycare .alert .av{color:${TEXT};font-size:16px;}
.fpd-daycare .alert .am{color:${MUTED};font-size:15px;margin-top:4px;}
.fpd-daycare .notebox{padding:13px 15px;border-radius:16px;background:rgba(217,165,94,0.07);border:1px solid rgba(217,165,94,0.22);}
.fpd-daycare .notebox .nk{color:${WARN};font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.06em;margin-bottom:6px;}
.fpd-daycare .notebox .nv{color:${TEXT};font-size:16px;line-height:1.6;}

/* authorized pickups */
.fpd-daycare .pickup-intro{color:${MUTED};font-size:15.5px;line-height:1.65;}
.fpd-daycare .pcard{display:flex;align-items:flex-start;gap:14px;padding:15px 16px;border-radius:16px;background:rgba(91,110,225,0.04);border:1px solid rgba(91,110,225,0.14);}
.fpd-daycare .pavatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.14);color:#6FAE8B;font-family:var(--font-display);font-weight:700;font-size:17.5px;}
.fpd-daycare .pinfo-name{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.fpd-daycare .pinfo-name b{color:${TEXT};font-size:17.5px;font-weight:600;}
.fpd-daycare .pinfo-name span{color:${MUTED};font-size:15px;}
.fpd-daycare .pinfo-row{display:flex;align-items:center;gap:6px;color:${MUTED};font-size:14.5px;}
.fpd-daycare .pinfo-row.ok{color:#D99A6B;margin-top:3px;}
.fpd-daycare .adddash{width:100%;padding:12px;border-radius:16px;border:1px dashed rgba(91,110,225,0.4);background:rgba(91,110,225,0.04);color:#6FAE8B;font-size:15.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-daycare .adddash:hover{background:rgba(91,110,225,0.09);}

/* documents */
.fpd-daycare .docrow{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-daycare .docchip{display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border-radius:18px;font-size:15px;background:rgba(91,110,225,0.08);color:#6FAE8B;border:1px solid rgba(91,110,225,0.18);cursor:pointer;font-family:var(--font-body);transition:background .16s;}
.fpd-daycare .docchip:hover{background:rgba(91,110,225,0.16);}

/* modal */
.fpd-daycare .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-daycare .modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
.fpd-daycare .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-daycare .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-daycare .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-daycare .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-daycare .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-daycare .field input,.fpd-daycare .field select,.fpd-daycare .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-daycare .field input::placeholder,.fpd-daycare .field textarea::placeholder{color:${FAINT};}
.fpd-daycare .field input:focus,.fpd-daycare .field select:focus,.fpd-daycare .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-daycare .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;}
.fpd-daycare .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-daycare .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function DaycareInfo() {
  const { authUser } = useAuth();
  const [records, setRecords] = useState<DaycareRecord[]>([]);

  const reload = useCallback(async () => {
    if (!authUser) { setRecords([]); return; }
    const { data, error } = await tables.daycareRecords.list(authUser.id);
    if (error) { toast.error(`Could not load daycare records: ${error.message}`); return; }
    setRecords((data ?? []).map(r => ({
      id: String(r.id),
      facilityName: String(r.facility_name ?? ""),
      childName: String(r.child_name ?? ""),
      address: String(r.address ?? ""),
      phone: String(r.phone ?? ""),
      email: String(r.email ?? ""),
      website: String(r.website ?? ""),
      directorName: String(r.director_name ?? ""),
      teacherName: String(r.teacher_name ?? ""),
      teacherPhone: String(r.teacher_phone ?? ""),
      dropoffTime: String(r.dropoff_time ?? ""),
      pickupTime: String(r.pickup_time ?? ""),
      days: toDays(r.days),
      tuition: toMoney(r.tuition as number | null),
      tuitionDue: String(r.tuition_due ?? ""),
      paymentMethod: String(r.payment_method ?? ""),
      allergiesOnFile: String(r.allergies_on_file ?? ""),
      medicationsOnFile: String(r.medications_on_file ?? ""),
      emergencyContact: String(r.emergency_contact ?? ""),
      emergencyPhone: String(r.emergency_phone ?? ""),
      enrollDate: String(r.enroll_date ?? ""),
      status: (r.status as DaycareRecord["status"]) ?? "active",
      notes: String(r.notes ?? ""),
      authorizedPickups: (r.authorized_pickups as AuthorizedPerson[] | null) ?? [],
      documents: (r.document_urls as string[] | null) ?? [],
    })));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DaycareRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"info"|"pickups"|"docs">("info");
  const recordsRef = React.useRef<HTMLDivElement>(null);
  const emptyForm = { facilityName:"", childName:"", address:"", phone:"", email:"", directorName:"", teacherName:"", dropoffTime:"", pickupTime:"", days:"Monday – Friday", tuition:"", allergiesOnFile:"None known", emergencyContact:"", emergencyPhone:"", notes:"" };
  const [form, setForm] = useState(emptyForm);

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function openAddRecord() {
    setEditingRecord(null);
    setForm(emptyForm);
    setShowAdd(true);
  }

  function openEditRecord(rec: DaycareRecord) {
    setEditingRecord(rec);
    setForm({
      facilityName: rec.facilityName, childName: rec.childName, address: rec.address, phone: rec.phone,
      email: rec.email, directorName: rec.directorName, teacherName: rec.teacherName,
      dropoffTime: rec.dropoffTime, pickupTime: rec.pickupTime, days: rec.days, tuition: rec.tuition,
      allergiesOnFile: rec.allergiesOnFile, emergencyContact: rec.emergencyContact, emergencyPhone: rec.emergencyPhone,
      notes: rec.notes,
    });
    setShowAdd(true);
  }

  function closeDaycareModal() {
    setShowAdd(false);
    setEditingRecord(null);
    setForm(emptyForm);
  }

  async function saveRecord() {
    if (!form.facilityName || !form.childName) { toast.error("Facility name and child's name required"); return; }
    if (!authUser) { toast.error("Sign in to save daycare records."); return; }

    const row = {
      facility_name: form.facilityName, child_name: form.childName,
      address: form.address, phone: form.phone, email: form.email,
      director_name: form.directorName, teacher_name: form.teacherName,
      dropoff_time: form.dropoffTime, pickup_time: form.pickupTime,
      days: fromDays(form.days), tuition: fromMoney(form.tuition),
      allergies_on_file: form.allergiesOnFile, emergency_contact: form.emergencyContact,
      emergency_phone: form.emergencyPhone, notes: form.notes,
      ...(editingRecord ? {} : {
        medications_on_file: "None",
        enroll_date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        status: "active",
      }),
    };

    const { error } = editingRecord
      ? await tables.daycareRecords.update(editingRecord.id, row)
      : await tables.daycareRecords.add(authUser.id, row);

    if (error) { toast.error(`Could not save: ${error.message}`); return; }

    await reload();
    toast.success(`${form.childName} at ${form.facilityName} ${editingRecord ? "updated" : "added"}`);
    closeDaycareModal();
  }

  const statusColor: Record<string, string> = { active: POS, inactive: MUTED };

  return (
    <div className="fpd-daycare">
      <style dangerouslySetInnerHTML={{ __html: DAYCARE_CSS }} />
      <div className="fpd-daycare-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroDaycarePhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Where They Spend Their Day</span>
            <h1>Facility details, <span className="accent">ready for anyone who needs them.</span></h1>
            <p>Contacts, schedules, allergies, and authorized pickups — everything a caregiver or emergency contact would need to know, in one place.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAddRecord}><Plus size={15} /> Add Daycare</button>
              <button className="hbtn ghost" onClick={() => recordsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><Baby size={15} /> View All Records</button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Baby size={12} /> Childcare Records</div>
            <h1 className="pg-h1">Daycare Information</h1>
            <div className="pg-sub">Facility details, authorized pickup persons, allergies, schedules, and important documents for each child.</div>
          </div>
          <button className="btn-primary" onClick={openAddRecord}>
            <Plus size={14} /> Add Daycare
          </button>
        </div>

        {/* ── Records ── */}
        <div className="rlist" ref={recordsRef}>
          {records.map(rec => (
            <div key={rec.id} className="card">
              <div className="rhead" role="button" tabIndex={0} onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="rico"><Baby size={22} /></div>
                  <div>
                    <div className="rtitle">
                      <span className="rname">{rec.facilityName}</span>
                      <span className="stat-badge" style={{ background: rec.status === "active" ? "rgba(95,190,145,0.14)" : "rgba(140,151,180,0.14)", color: statusColor[rec.status] }}>{rec.status.toUpperCase()}</span>
                    </div>
                    <div className="rchild">Child: {rec.childName}</div>
                    <div className="rmeta">
                      <span><Clock size={10} />{rec.dropoffTime} drop-off · {rec.pickupTime} pickup</span>
                      <span><MapPin size={10} />{rec.address.split(",")[1]?.trim()}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button className="btn-sec" onClick={(e) => { e.stopPropagation(); openEditRecord(rec); }} title="Edit daycare record" style={{ padding: "6px 10px" }}>
                    <Edit2 size={13} />
                  </button>
                  {expanded === rec.id ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
                </div>
              </div>

              {expanded === rec.id && (
                <div className="rbody">
                  {/* ── Segmented sub-tabs ── */}
                  <div className="rtabbar">
                    <div className="seg">
                      {([["info","📋 Facility Info"],["pickups","🚗 Authorized Pickups"],["docs","📄 Documents"]] as const).map(([id,label]) => (
                        <button key={id} className={activeTab === id ? "on" : ""} onClick={() => setActiveTab(id)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rpanel">
                    {activeTab === "info" && (
                      <>
                        <div className="igrid">
                          {[
                            ["Director",rec.directorName],["Teacher / Caregiver",rec.teacherName],
                            ["Teacher Phone",rec.teacherPhone||"—"],["Facility Phone",rec.phone],
                            ["Email",rec.email],["Website",rec.website],
                            ["Days",rec.days],["Drop-off Time",rec.dropoffTime],
                            ["Pickup Time",rec.pickupTime],["Tuition",rec.tuition],
                            ["Tuition Due",rec.tuitionDue],["Payment Method",rec.paymentMethod],
                            ["Emergency Contact",rec.emergencyContact],["Emergency Phone",rec.emergencyPhone],
                            ["Enrolled",rec.enrollDate],["Address",rec.address],
                          ].map(([label,value]) => (
                            <div key={label} className="tile">
                              <div className="tk">{label}</div>
                              <div className="tv">{value}</div>
                            </div>
                          ))}
                        </div>
                        {rec.allergiesOnFile !== "None known" && (
                          <div className="alert">
                            <AlertCircle size={14} color={NEG} style={{ marginTop: 1, flexShrink: 0 }} />
                            <div>
                              <div className="ak">ALLERGIES ON FILE</div>
                              <div className="av">{rec.allergiesOnFile}</div>
                              {rec.medicationsOnFile !== "None" && <div className="am">Medications: {rec.medicationsOnFile}</div>}
                            </div>
                          </div>
                        )}
                        {rec.notes && (
                          <div className="notebox">
                            <div className="nk">NOTES</div>
                            <div className="nv">{rec.notes}</div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === "pickups" && (
                      <>
                        <div className="pickup-intro">
                          These individuals are authorized to pick up {rec.childName}. All must present a government-issued photo ID to facility staff.
                        </div>
                        {rec.authorizedPickups.map((p,i) => (
                          <div key={i} className="pcard">
                            <div className="pavatar">{p.name.split(" ").map((w:string)=>w[0]).join("").slice(0,2)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="pinfo-name">
                                <b>{p.name}</b>
                                <span>{p.relationship}</span>
                              </div>
                              <div className="pinfo-row"><Phone size={10} />{p.phone}</div>
                              <div className="pinfo-row ok"><CheckCircle size={10} />{p.photoId}</div>
                            </div>
                          </div>
                        ))}
                        <button className="adddash" onClick={() => toast.success("Add authorized pickup — opens form (demo)")}>
                          <Plus size={13} /> Add Authorized Pickup Person
                        </button>
                      </>
                    )}

                    {activeTab === "docs" && (
                      <>
                        <div className="docrow">
                          {rec.documents.map(d => (
                            <button key={d} className="docchip" onClick={() => toast.success(`Opening: ${d}`)}>
                              <FileText size={12} /> {d}
                            </button>
                          ))}
                        </div>
                        <ScanButton folder="personal" onUpload={doc => { setRecords(p=>p.map(r=>r.id===rec.id?{...r,documents:[...r.documents,doc.name]}:r)); toast.success(`"${doc.name}" added`); }} size="sm" label="Scan or Upload Document" />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Add daycare modal ── */}
        {showAdd && (
          <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeDaycareModal(); }}>
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingRecord ? "Edit Daycare / Childcare" : "Add Daycare / Childcare"}</h3>
                <button onClick={closeDaycareModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                {[["Child's Full Name *","childName",""],["Facility Name *","facilityName",""],["Address","address",""],["Phone","phone",""],["Email","email",""],["Director's Name","directorName",""],["Teacher / Caregiver","teacherName",""],["Drop-off Time","dropoffTime","e.g. 7:30 AM"],["Pickup Time","pickupTime","e.g. 5:30 PM"],["Days Attended","days","e.g. Monday – Friday"],["Monthly Tuition","tuition","e.g. $1,200/month"],["Allergies on File","allergiesOnFile","e.g. Peanuts or None known"],["Emergency Contact","emergencyContact",""],["Emergency Phone","emergencyPhone",""],["Notes","notes",""]].map(([label,key,ph]) => (
                  <div className="field" key={key}>
                    <label>{label.toUpperCase()}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (enrollment agreement, immunization records)" sectionId="daycare-info" sectionLabel="Daycare Information" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={saveRecord}>{editingRecord ? "Save Changes" : "Add Daycare"}</button>
                <button className="btn-sec" onClick={closeDaycareModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
