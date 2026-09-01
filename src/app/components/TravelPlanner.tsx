import React, { useState, useEffect, useCallback } from "react";
import { Plane, Plus, X, Calendar, Users, DollarSign, ChevronDown, ChevronUp, Globe, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { AttachDocumentField } from "./AttachDocumentField";
import heroTravelPhoto from "../../imports/travel_hero_photo.png";

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

const TRIP_TYPES = ["Vacation","Family Visit","Business Travel","Medical Travel","Honeymoon","Anniversary Trip","Holiday Travel","Road Trip","Cruise","Backpacking","Mission / Volunteer","Other"];

interface TravelDoc { name:string; type:string; }
interface Trip {
  id: string;
  destination: string;
  country: string;
  tripType: string;
  startDate: string;
  endDate: string;
  companions: string;
  accommodation: string;
  accommodationPhone: string;
  confirmationNum: string;
  transportation: string;
  budget: string;
  actualCost: string;
  highlights: string;
  notes: string;
  status: "planned"|"completed"|"cancelled";
  documents: TravelDoc[];
  photo?: string;
}

/* Rows come from the `travel_trips` table — the screen used to open on sample
   trips identical for every account and lost on refresh. */

// budget / actual_cost are NUMERIC in the table but free-text in the form.
const toMoney = (n: number | null | undefined) => (n === null || n === undefined ? "" : `$${Number(n).toLocaleString()}`);
const fromMoney = (v: string) => { const n = Number(String(v).replace(/[^0-9.]/g, "")); return Number.isFinite(n) && String(v).trim() !== "" ? n : null; };

const statusConfig = {
  planned:   { color:"#6FAE8B", bg:"rgba(91,167,214,0.14)", label:"PLANNED" },
  completed: { color:"#D99A6B", bg:"rgba(95,190,145,0.14)",  label:"COMPLETED" },
  cancelled: { color:NEG, bg:"rgba(208,107,107,0.14)", label:"CANCELLED" },
};

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-travel so nothing else in the app is affected. */
const TRAVEL_CSS = `
.fpd-travel{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-travel *{box-sizing:border-box;}
.fpd-travel-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-travel .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-travel .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-travel .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-travel .hbanner:hover .art{transform:scale(1.08);}
.fpd-travel .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-travel .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-travel .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-travel .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-travel .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-travel .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-travel .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-travel .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-travel .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-travel .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-travel .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-travel .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-travel .hbanner{min-height:auto;} .fpd-travel .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-travel .hbanner h1{font-size:29px;}}

.fpd-travel .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-travel .card.pad{padding:28px;}
.fpd-travel .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-travel .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-travel .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-travel .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-travel .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-travel .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-travel .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented status filter */
.fpd-travel .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;}
.fpd-travel .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-travel .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* KPI ledger */
.fpd-travel .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-travel .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-travel .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-travel .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-travel .kpi-mini-txt{flex:1;min-width:0;}
.fpd-travel .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-travel .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-travel .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-travel .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-travel .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-travel .kpi-stack{grid-template-columns:1fr;}}

/* trip cards */
.fpd-travel .tlist{display:flex;flex-direction:column;gap:14px;}
.fpd-travel .tcard{overflow:hidden;}
.fpd-travel .tcover{width:100%;height:180px;object-fit:cover;display:block;}
.fpd-travel .thead{width:100%;text-align:left;padding:20px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-travel .tico{width:52px;height:52px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:30px;background:rgba(91,110,225,0.10);}
.fpd-travel .tdest{font-family:var(--font-display);font-size:22.5px;color:${TEXT};font-weight:600;}
.fpd-travel .tcountry{color:${MUTED};font-size:16px;}
.fpd-travel .tbadge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:0.04em;}
.fpd-travel .tmeta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:6px;}
.fpd-travel .tmeta span{display:flex;align-items:center;gap:5px;font-size:14.5px;color:${MUTED};}
.fpd-travel .tbody{padding:0 20px 20px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-travel .tgrid{display:grid;grid-template-columns:1fr 1fr;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-top:16px;}
.fpd-travel .tgrid .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-travel .tgrid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-travel .tile{padding:12px 14px;}
.fpd-travel .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-travel .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
.fpd-travel .callout{padding:12px 14px;border-radius:16px;margin-top:14px;}
.fpd-travel .callout .ck{font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.06em;margin-bottom:4px;}
.fpd-travel .callout .cv{color:${TEXT};font-size:16px;line-height:1.7;}
.fpd-travel .docs-lbl{font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.08em;color:${MUTED};margin-bottom:8px;margin-top:14px;}
.fpd-travel .docchip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:18px;font-size:14.5px;background:rgba(91,110,225,0.08);color:#6FAE8B;border:1px solid rgba(91,110,225,0.18);cursor:pointer;font-family:var(--font-body);}
@media (max-width:640px){
.fpd-travel .tgrid{grid-template-columns:1fr;}
.fpd-travel .tgrid .tile:nth-child(2n){border-left:none;}
.fpd-travel .tgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

/* modal */
.fpd-travel .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-travel .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-travel .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-travel .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-travel .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-travel .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-travel .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-travel .field input,.fpd-travel .field select{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-travel .field input::placeholder{color:${FAINT};}
.fpd-travel .field input:focus,.fpd-travel .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-travel .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-travel .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-travel .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function TravelPlanner() {
  const { authUser } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);

  const reload = useCallback(async () => {
    if (!authUser) { setTrips([]); return; }
    const { data, error } = await tables.travelTrips.list(authUser.id);
    if (error) { toast.error(`Could not load trips: ${error.message}`); return; }
    setTrips((data ?? []).map(r => ({
      id: String(r.id),
      destination: String(r.destination ?? ""),
      country: String(r.country ?? ""),
      tripType: String(r.trip_type ?? ""),
      startDate: String(r.start_date ?? ""),
      endDate: String(r.end_date ?? ""),
      companions: String(r.companions ?? ""),
      accommodation: String(r.accommodation ?? ""),
      accommodationPhone: String(r.accommodation_phone ?? ""),
      confirmationNum: String(r.confirmation_number ?? ""),
      transportation: String(r.transportation ?? ""),
      budget: toMoney(r.budget as number | null),
      actualCost: toMoney(r.actual_cost as number | null),
      highlights: String(r.highlights ?? ""),
      notes: String(r.notes ?? ""),
      status: (r.status as Trip["status"]) ?? "planned",
      // document_urls is JSONB on this table, so it round-trips as objects.
      documents: (r.document_urls as TravelDoc[] | null) ?? [],
      photo: (r.photo_url as string | null) ?? undefined,
    })));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all"|"planned"|"completed">("all");
  const emptyForm = { destination:"", country:"", tripType:"Vacation", startDate:"", endDate:"", companions:"", accommodation:"", accommodationPhone:"", confirmationNum:"", transportation:"", budget:"", notes:"", status:"planned" as "planned"|"completed", photo:"" };
  const [form, setForm] = useState(emptyForm);
  const tripListRef = React.useRef<HTMLDivElement>(null);

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function openAddModal() {
    setEditingTrip(null);
    setForm(emptyForm);
    setShowAdd(true);
  }

  function openEditModal(trip: Trip) {
    setEditingTrip(trip);
    setForm({
      destination: trip.destination, country: trip.country, tripType: trip.tripType,
      startDate: trip.startDate, endDate: trip.endDate, companions: trip.companions,
      accommodation: trip.accommodation, accommodationPhone: trip.accommodationPhone,
      confirmationNum: trip.confirmationNum, transportation: trip.transportation,
      budget: trip.budget, notes: trip.notes,
      status: (trip.status === "cancelled" ? "planned" : trip.status) as "planned"|"completed",
      photo: trip.photo ?? "",
    });
    setShowAdd(true);
  }

  function closeModal() {
    setShowAdd(false);
    setEditingTrip(null);
  }

  async function saveTrip() {
    if (!form.destination) { toast.error("Destination required"); return; }
    if (!authUser) { toast.error("Sign in to save trips."); return; }

    const row = {
      destination: form.destination, country: form.country, trip_type: form.tripType,
      start_date: form.startDate, end_date: form.endDate, companions: form.companions,
      accommodation: form.accommodation, accommodation_phone: form.accommodationPhone,
      confirmation_number: form.confirmationNum, transportation: form.transportation,
      budget: fromMoney(form.budget), notes: form.notes, status: form.status,
      photo_url: form.photo || null,
    };

    const { error } = editingTrip
      ? await tables.travelTrips.update(editingTrip.id, row)
      : await tables.travelTrips.add(authUser.id, row);

    if (error) { toast.error(`Could not save: ${error.message}`); return; }

    await reload();
    toast.success(editingTrip ? `${form.destination} updated` : `${form.destination} added to Travel Planner`);
    setForm(emptyForm);
    setEditingTrip(null);
    setShowAdd(false);
  }

  const filtered = trips.filter(t => filterStatus==="all" || t.status===filterStatus);
  const stats = { total:trips.length, completed:trips.filter(t=>t.status==="completed").length, planned:trips.filter(t=>t.status==="planned").length, countries:new Set(trips.map(t=>t.country)).size };

  const kpis = [
    { label: "Total Trips", value: String(stats.total), sub: "Recorded in this vault", icon: <Plane size={14} />, dot: ACCENT2 },
    { label: "Completed", value: String(stats.completed), sub: "Trips taken", icon: <Globe size={14} />, dot: POS },
    { label: "Planned", value: String(stats.planned), sub: "Upcoming trips", icon: <Calendar size={14} />, dot: ACCENT2 },
    { label: "Countries", value: String(stats.countries), sub: "Visited or planned", icon: <Globe size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-travel">
      <style dangerouslySetInnerHTML={{ __html: TRAVEL_CSS }} />
      <div className="fpd-travel-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroTravelPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Trips, Planned and Remembered</span>
            <h1>Where you've been, <span className="accent">and where you're headed next.</span></h1>
            <p>Itineraries, bookings, and travel documents for trips past and upcoming — all in one place.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAddModal}>
                <Plus size={15}/> Add Trip
              </button>
              <button className="hbtn ghost" onClick={() => tripListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Globe size={15}/> View All Trips
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Plane size={12} /> TRAVEL RECORDS</div>
            <h1 className="pg-h1">Travel Planner</h1>
            <div className="pg-sub">
              Record every trip — past and future. Attach itineraries, tickets, hotel confirmations, and travel documents.
            </div>
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={14} /> Add Trip
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

        {/* ── Status filter ── */}
        <div className="seg">
          {(["all","planned","completed"] as const).map(s => (
            <button key={s} className={filterStatus === s ? "on" : ""} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Trip list ── */}
        <div className="tlist" ref={tripListRef}>
          {filtered.map(trip => {
            const sc = statusConfig[trip.status];
            return (
              <div key={trip.id} className="card tcard">
                {trip.photo && <img src={trip.photo} alt={trip.destination} className="tcover" />}
                <button className="thead" onClick={() => setExpanded(expanded===trip.id ? null : trip.id)}>
                  <div className="flex items-start gap-4">
                    <div className="tico">{trip.status==="planned" ? "✈️" : "🌍"}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 3 }}>
                        <span className="tdest">{trip.destination}</span>
                        <span className="tcountry">{trip.country}</span>
                        <span className="tbadge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <div className="tmeta">
                        <span><Calendar size={10}/>{trip.startDate} – {trip.endDate}</span>
                        <span><Users size={10}/>{trip.companions || "Solo"}</span>
                        <span><Globe size={10}/>{trip.tripType}</span>
                        {trip.budget && <span><DollarSign size={10}/>Budget: {trip.budget}</span>}
                      </div>
                    </div>
                  </div>
                  {expanded===trip.id ? <ChevronUp size={16} color={MUTED}/> : <ChevronDown size={16} color={MUTED}/>}
                </button>

                {expanded===trip.id && (
                  <div className="tbody">
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
                      <button className="btn-sec" onClick={() => openEditModal(trip)}>
                        <Edit2 size={12} /> Edit Trip
                      </button>
                    </div>
                    <div className="tgrid">
                      {[
                        ["Accommodation",trip.accommodation||"—"],
                        ["Accommodation Phone",trip.accommodationPhone||"—"],
                        ["Confirmation #",trip.confirmationNum||"—"],
                        ["Transportation",trip.transportation||"—"],
                        ["Budget",trip.budget||"—"],
                        ["Actual Cost",trip.actualCost||"—"],
                        ["Travel Companions",trip.companions||"Solo"],
                        ["Trip Type",trip.tripType],
                      ].map(([label,value])=>(
                        <div key={label} className="tile">
                          <div className="tk">{label.toUpperCase()}</div>
                          <div className="tv">{value}</div>
                        </div>
                      ))}
                    </div>

                    {trip.highlights && (
                      <div className="callout" style={{ background: "rgba(95,190,145,0.06)", border: "1px solid rgba(95,190,145,0.2)" }}>
                        <div className="ck" style={{ color: "#D99A6B" }}>HIGHLIGHTS & MEMORIES</div>
                        <div className="cv">{trip.highlights}</div>
                      </div>
                    )}

                    {trip.notes && (
                      <div className="callout" style={{ background: "rgba(217,165,94,0.06)", border: "1px solid rgba(217,165,94,0.15)" }}>
                        <div className="ck" style={{ color: WARN }}>NOTES</div>
                        <div className="cv">{trip.notes}</div>
                      </div>
                    )}

                    <div>
                      <div className="docs-lbl">TRAVEL DOCUMENTS ({trip.documents.length})</div>
                      <div className="flex flex-wrap gap-2">
                        {trip.documents.map(d => (
                          <button key={d.name} className="docchip" onClick={() => toast.success(`Opening: ${d.name}`)}>
                            📄 {d.name} <span style={{ color: MUTED, marginLeft: 4 }}>({d.type})</span>
                          </button>
                        ))}
                        <ScanButton folder="personal" onUpload={doc => { setTrips(p=>p.map(t=>t.id===trip.id?{...t,documents:[...t.documents,{name:doc.name,type:"Document"}]}:t)); toast.success(`"${doc.name}" added to ${trip.destination}`); }} size="sm" label="Add Document"/>
                      </div>
                    </div>
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
                <h3>{editingTrip ? "Edit Trip" : "Add Trip"}</h3>
                <button onClick={closeModal}><X size={16}/></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={form.photo} onChange={url => setForm(p=>({...p,photo:url}))} label="Cover Photo (destination)" aspectRatio="16/9"/>
                <div className="field">
                  <label>TRIP TYPE</label>
                  <select value={form.tripType} onChange={F("tripType")}>{TRIP_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                </div>
                <div className="field">
                  <label>STATUS</label>
                  <select value={form.status} onChange={F("status")}><option value="planned">Planned</option><option value="completed">Completed</option></select>
                </div>
                {[["Destination *","destination","e.g. Paris, France"],["Country","country","e.g. France"],["Start Date","startDate","e.g. Jun 15, 2026"],["End Date","endDate","e.g. Jun 25, 2026"],["Travel Companions","companions","e.g. Sarah, Emma (leave blank for solo)"],["Accommodation","accommodation","Hotel name or Airbnb"],["Accommodation Phone","accommodationPhone",""],["Confirmation Number","confirmationNum",""],["Transportation","transportation","e.g. United Airlines UA-100 (SFO→CDG)"],["Budget","budget","e.g. $5,000"],["Notes","notes","Planning notes, reminders, tips"]].map(([label,key,ph])=>(
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (itinerary, tickets, travel insurance, passport copy)" sectionId="travel-planner" sectionLabel="Travel Planner"/>
              </div>
              <div className="modal-foot">
                <button className="save" onClick={saveTrip}>{editingTrip ? "Save Changes" : "Add Trip"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
