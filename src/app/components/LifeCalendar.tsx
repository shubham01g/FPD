/**
 * LifeCalendar — the unified calendar.
 *
 * One view over every dated thing in the account: auto-pay charges, reminders,
 * birthdays and anniversaries, warranty and document expiry, travel, medical
 * appointments and concierge sessions. Nothing is authored here — the Calendar
 * reads from services/calendarEvents and links back to the owning section.
 *
 * Presentation note: like UserDashboard re-colours the storage breakdown
 * dashboard-side, this page keeps its own refined "Royal Vault Blue" source
 * palette and lucide iconography locally. The shared calendarEvents data —
 * every title, date, amount and detail — is untouched; only the colours and
 * marker icons are restyled here so the calendar reads as one product with the
 * rest of the redesigned portal.
 */
import React, { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, LayoutGrid, List, Info,
  CalendarDays, CalendarClock, AlertTriangle,
  CreditCard, Bell, Cake, ShieldCheck, IdCard, Plane, Pill, Star, Pin,
} from "lucide-react";
import {
  eventsForMonth, upcomingEvents, monthlyBillingTotal, iso, daysInMonth,
  SOURCE_META, type CalendarEvent, type EventSource,
} from "../services/calendarEvents";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard) ── */
const TEXT   = "#EFF2F9";
const SOFT   = "#BCC5DA";
const MUTED  = "#A3ADC9";
const FAINT  = "#929CBC";
const ACCENT = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS    = "#5FBE91";
const WARN   = "#D9A55E";
const NEG    = "#D06B6B";

/* Refined per-source treatment — one harmonised family instead of the old
   web-safe rainbow. Labels still come from SOURCE_META so the data owns them. */
type IconCmp = React.ComponentType<{ size?: number }>;
const SRC: Record<EventSource, { color: string; Icon: IconCmp }> = {
  billing:   { color: "#6FAE8B", Icon: CreditCard },  // periwinkle (theme accent)
  reminder:  { color: "#6FAE8B", Icon: Bell },        // soft sky blue
  occasion:  { color: "#A98CC7", Icon: Cake },        // soft lavender
  warranty:  { color: "#6E90C9", Icon: ShieldCheck }, // royal blue
  document:  { color: "#6FAE8B", Icon: IdCard },      // dusty blue
  travel:    { color: "#D68FA8", Icon: Plane },       // calm teal
  medical:   { color: "#D99A6B", Icon: Pill },        // soft sage
  concierge: { color: "#A98CC7", Icon: Star },        // soft lilac
  custom:    { color: "#97A2C6", Icon: Pin },         // slate blue
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ALL_SOURCES = Object.keys(SOURCE_META) as EventSource[];

const fmtDate = (isoStr: string) => {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-cal so nothing else in the app is affected. */
const CAL_CSS = `
.fpd-cal{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 62% -160px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-cal *{box-sizing:border-box;}
.fpd-cal-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-cal .wrap{max-width:1320px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* cards */
.fpd-cal .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-cal .card.pad{padding:28px;}
.fpd-cal .sec-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.fpd-cal .sec-title{font-size:15px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;}
.fpd-cal .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-cal .sec-cnt{color:${MUTED};font-size:11px;font-family:var(--font-mono);}

/* header */
.fpd-cal .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-cal .eyebrow{font-size:10px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-cal .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-cal .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-cal .head-r{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-cal .btn-today{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s,border-color .18s;}
.fpd-cal .btn-today:hover{background:rgba(91,110,225,0.18);}

/* segmented view toggle */
.fpd-cal .seg{display:flex;gap:3px;padding:3px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-cal .seg button{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:7px;font-size:12px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;text-transform:capitalize;}
.fpd-cal .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* KPI ledger */
.fpd-cal .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:22px;}
.fpd-cal .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.08);position:relative;text-align:left;overflow:hidden;}
.fpd-cal .kcell:first-child{border-left:none;}
.fpd-cal .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-cal .kcell .klbl{font-size:9.5px;font-weight:600;color:${MUTED};}
.fpd-cal .kcell .kico{width:27px;height:27px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-cal .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-cal .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-cal .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-cal .kstrip{grid-template-columns:1fr 1fr;}.fpd-cal .kcell:nth-child(3){border-left:none;}.fpd-cal .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}}

/* filters */
.fpd-cal .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-cal .filters .flabel{font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:${FAINT};margin-right:2px;}
.fpd-cal .chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-cal .chip .cn{font-family:var(--font-mono);font-size:10.5px;opacity:.8;}
.fpd-cal .chip.off{opacity:.48;}
.fpd-cal .chip.off:hover{opacity:.72;}

/* bento */
.fpd-cal .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:18px;align-items:start;}
.fpd-cal .col{display:flex;flex-direction:column;gap:18px;min-width:0;}
@media (max-width:1080px){.fpd-cal .bento{grid-template-columns:1fr;}}

/* month grid */
.fpd-cal .navbtn{width:32px;height:32px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${SOFT};cursor:pointer;transition:border-color .18s,color .18s;}
.fpd-cal .navbtn:hover{border-color:rgba(91,110,225,0.4);color:#6FAE8B;}
.fpd-cal .dow{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px;}
.fpd-cal .dow span{text-align:center;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;color:${FAINT};padding:2px 0;}
.fpd-cal .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}
.fpd-cal .cell{min-height:94px;padding:7px 7px 6px;border-radius:18px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.012);display:flex;flex-direction:column;align-items:stretch;text-align:left;cursor:pointer;transition:border-color .16s,background .16s;overflow:hidden;}
.fpd-cal .cell:hover{border-color:rgba(91,110,225,0.32);background:rgba(91,110,225,0.05);}
.fpd-cal .cell.blank{background:none;border:1px solid transparent;cursor:default;}
.fpd-cal .cell.today{border-color:rgba(95,190,145,0.5);box-shadow:inset 0 0 0 1px rgba(95,190,145,0.22),0 0 18px -8px rgba(95,190,145,0.5);}
.fpd-cal .cell.sel{border-color:${ACCENT};background:rgba(91,110,225,0.15);box-shadow:inset 0 0 0 1px rgba(91,110,225,0.5),0 6px 20px -8px rgba(91,110,225,0.55);}
.fpd-cal .cell.today.sel{box-shadow:inset 0 0 0 1px rgba(91,110,225,0.5),0 6px 20px -8px rgba(91,110,225,0.55);}
.fpd-cal .chead{display:flex;align-items:center;justify-content:space-between;}
.fpd-cal .dnum{font-family:var(--font-mono);font-size:12px;font-variant-numeric:tabular-nums;color:${SOFT};}
.fpd-cal .cell.today .dnum{color:#D99A6B;font-weight:700;}
.fpd-cal .cell.sel .dnum{color:#fff;font-weight:700;}
.fpd-cal .cmore{font-family:var(--font-mono);font-size:9px;color:${MUTED};}
.fpd-cal .chips{display:flex;flex-direction:column;gap:3px;margin-top:5px;}
.fpd-cal .cevt{display:flex;align-items:center;gap:5px;padding:2.5px 5px;border-radius:5px;font-size:10px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;}
.fpd-cal .cevt .cbar{width:3px;height:9px;border-radius:2px;flex-shrink:0;}
.fpd-cal .cevt .ct{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* event rows */
.fpd-cal .evlist{display:flex;flex-direction:column;gap:9px;}
.fpd-cal .evrow{display:flex;align-items:flex-start;gap:11px;padding:11px 12px;border-radius:16px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.08);}
.fpd-cal .evico{width:34px;height:34px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-cal .evbody{flex:1;min-width:0;}
.fpd-cal .evtop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-cal .evt{font-size:13px;font-weight:600;color:${TEXT};}
.fpd-cal .evamt{font-family:var(--font-mono);font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;}
.fpd-cal .evmeta{font-family:var(--font-mono);font-size:10.5px;margin-top:3px;}
.fpd-cal .evdet{color:${MUTED};font-size:11.5px;line-height:1.5;margin-top:3px;}
.fpd-cal .evopen{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:16px;font-size:11px;font-weight:600;flex-shrink:0;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-cal .evopen:hover{filter:brightness(1.14);}

/* empty state */
.fpd-cal .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 12px;}
.fpd-cal .empty .ei{width:46px;height:46px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:12px;}
.fpd-cal .empty .et{color:${SOFT};font-size:13px;font-weight:600;font-family:var(--font-display);}
.fpd-cal .empty .ed{color:${MUTED};font-size:12px;line-height:1.6;margin-top:5px;max-width:340px;}

/* agenda */
.fpd-cal .aggroup{margin-top:20px;}
.fpd-cal .aggroup:first-child{margin-top:0;}
.fpd-cal .agday{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.fpd-cal .agd{font-family:var(--font-mono);font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;}
.fpd-cal .agline{flex:1;height:1px;background:rgba(255,255,255,0.07);}
.fpd-cal .agtoday{padding:2px 7px;border-radius:6px;background:rgba(95,190,145,0.14);color:#D99A6B;font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:0.06em;}

/* footnote */
.fpd-cal .foot{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-cal .foot .ft{color:${MUTED};font-size:12.5px;line-height:1.7;}
.fpd-cal .foot .ft b{color:${SOFT};font-weight:600;}
.fpd-cal .foot .ft em{color:#6FAE8B;font-style:normal;}
`;

/* ── One event row — used in the day panel, upcoming rail and agenda ── */
function EventRow({ ev, onNavigate, showDate }: { ev: CalendarEvent; onNavigate?: (p: string) => void; showDate?: boolean }) {
  const { color, Icon } = SRC[ev.source];
  return (
    <div className="evrow" style={{ borderColor: `${color}26` }}>
      <div className="evico" style={{ background: `${color}1C`, color }}>
        <Icon size={16} />
      </div>
      <div className="evbody">
        <div className="evtop">
          <span className="evt">{ev.title}</span>
          {ev.amount !== undefined && (
            <span className="evamt" style={{ color }}>${ev.amount.toFixed(2)}</span>
          )}
        </div>
        {showDate ? (
          <div className="evmeta" style={{ color }}>
            {fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}
          </div>
        ) : ev.time ? (
          <div className="evmeta" style={{ color }}>{ev.time}</div>
        ) : null}
        {ev.detail && <div className="evdet">{ev.detail}</div>}
      </div>
      {ev.linkPage && onNavigate && (
        <button
          className="evopen"
          onClick={() => onNavigate(ev.linkPage!)}
          title={`Open ${ev.linkLabel}`}
          style={{ background: `${color}18`, color }}
        >
          Open <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

export function LifeCalendar({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(todayIso);
  const [view, setView] = useState<"month" | "agenda">("month");
  const [active, setActive] = useState<Set<EventSource>>(new Set(ALL_SOURCES));

  const monthEvents = useMemo(() => eventsForMonth(year, month), [year, month]);
  const visible = useMemo(() => monthEvents.filter(e => active.has(e.source)), [monthEvents, active]);

  /** date -> events, for painting chips on the grid */
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    visible.forEach(e => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [visible]);

  const upcoming = useMemo(() => upcomingEvents(6).filter(e => active.has(e.source)), [active]);
  const billingTotal = useMemo(() => monthlyBillingTotal(year, month), [year, month]);
  const selectedEvents = byDate.get(selected) ?? [];

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(todayIso);
  };

  const toggleSource = (s: EventSource) => {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  /* Build the 6x7 grid, padded with leading/trailing blanks */
  const cells = useMemo(() => {
    const lead = new Date(year, month, 1).getDay();
    const total = daysInMonth(year, month);
    const out: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= total; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  const overdueCount = monthEvents.filter(
    e => e.date < todayIso && (e.source === "warranty" || e.source === "document")
  ).length;
  const billingCount = monthEvents.filter(e => e.source === "billing").length;
  const upcomingTotal = upcomingEvents(999).length;

  const todayLong = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  const kpis = [
    { label: "Events This Month", value: monthEvents.length, sub: `${MONTHS[month]} ${year}`, dot: ACCENT2, icon: <CalendarDays size={14} /> },
    { label: "Auto-Pay Scheduled", value: `$${billingTotal.toFixed(2)}`, sub: `${billingCount} charge${billingCount === 1 ? "" : "s"}`, dot: SRC.billing.color, icon: <CreditCard size={14} /> },
    { label: "Needs Attention", value: overdueCount, sub: "Expired warranties & IDs", dot: overdueCount > 0 ? NEG : POS, icon: <AlertTriangle size={14} /> },
    { label: "Next 6 Months", value: upcomingTotal, sub: "Upcoming entries", dot: ACCENT2, icon: <CalendarClock size={14} /> },
  ];

  return (
    <div className="fpd-cal">
      <style dangerouslySetInnerHTML={{ __html: CAL_CSS }} />
      <div className="fpd-cal-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><CalendarDays size={12} /> UNIFIED VIEW · {todayLong}</div>
            <h1 className="pg-h1">Calendar</h1>
            <div className="pg-sub">
              Every dated item across your account in one place — auto-pay charges, reminders, birthdays,
              warranty and ID expiry, travel, medical appointments and concierge sessions. Entries are owned by
              their own sections; open one to edit it there.
            </div>
          </div>
          <div className="head-r">
            <button className="btn-today" onClick={goToday}>
              <CalendarClock size={13} /> Today
            </button>
            <div className="seg">
              {([["month", <LayoutGrid size={13} key="g" />], ["agenda", <List size={13} key="l" />]] as const).map(([id, ic]) => (
                <button
                  key={id}
                  className={view === id ? "on" : ""}
                  onClick={() => setView(id as "month" | "agenda")}
                  title={id === "month" ? "Month grid" : "Agenda list"}
                >
                  {ic} {id}
                </button>
              ))}
            </div>
          </div>
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

        {/* ── Source filters ── */}
        <div className="card pad">
          <div className="filters">
            <span className="flabel">FILTER</span>
            {ALL_SOURCES.map(s => {
              const { color, Icon } = SRC[s];
              const on = active.has(s);
              const n = monthEvents.filter(e => e.source === s).length;
              return (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  className={`chip ${on ? "" : "off"}`}
                  style={{
                    background: on ? `${color}1C` : "transparent",
                    color: on ? color : MUTED,
                    borderColor: on ? `${color}44` : "rgba(255,255,255,0.09)",
                  }}
                >
                  <Icon size={13} />
                  {SOURCE_META[s].label}
                  <span className="cn">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {view === "month" ? (
          <div className="bento">
            {/* Month grid */}
            <div className="card pad">
              <div className="sec-head">
                <h3 className="sec-title"><span className="tick" />{MONTHS[month]} {year}</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="navbtn" onClick={() => shift(-1)} title="Previous month"><ChevronLeft size={15} /></button>
                  <button className="navbtn" onClick={() => shift(1)} title="Next month"><ChevronRight size={15} /></button>
                </div>
              </div>

              <div className="dow">
                {DOW.map(d => <span key={d}>{d.toUpperCase()}</span>)}
              </div>

              <div className="grid">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`b${i}`} className="cell blank" />;
                  const dIso = iso(year, month, day);
                  const evs = byDate.get(dIso) ?? [];
                  const isToday = dIso === todayIso;
                  const isSel = dIso === selected;
                  return (
                    <button
                      key={dIso}
                      onClick={() => setSelected(dIso)}
                      className={`cell ${isToday ? "today" : ""} ${isSel ? "sel" : ""}`}
                    >
                      <div className="chead">
                        <span className="dnum">{day}</span>
                        {evs.length > 2 && <span className="cmore">+{evs.length - 2}</span>}
                      </div>
                      <div className="chips">
                        {evs.slice(0, 2).map(e => {
                          const c = SRC[e.source].color;
                          return (
                            <div key={e.id} className="cevt" title={e.title} style={{ background: `${c}20`, color: c }}>
                              <span className="cbar" style={{ background: c }} />
                              <span className="ct">{e.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right rail — selected day + upcoming */}
            <div className="col">
              <div className="card pad">
                <div className="sec-head">
                  <h3 className="sec-title"><span className="tick" />{selected === todayIso ? "Today" : fmtDate(selected)}</h3>
                  <span className="sec-cnt">{selectedEvents.length} item{selectedEvents.length === 1 ? "" : "s"}</span>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="empty">
                    <div className="ei"><CalendarDays size={20} /></div>
                    <div className="et">Nothing scheduled</div>
                    <div className="ed">This day is clear. Pick another date on the grid to see what's planned.</div>
                  </div>
                ) : (
                  <div className="evlist">
                    {selectedEvents.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} />)}
                  </div>
                )}
              </div>

              <div className="card pad">
                <div className="sec-head">
                  <h3 className="sec-title"><span className="tick" />Coming Up</h3>
                </div>
                {upcoming.length === 0 ? (
                  <div className="empty">
                    <div className="ei"><CalendarClock size={20} /></div>
                    <div className="et">No upcoming events</div>
                    <div className="ed">Nothing ahead matches your active filters. Turn a few back on above.</div>
                  </div>
                ) : (
                  <div className="evlist">
                    {upcoming.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} showDate />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Agenda view — flat chronological list for the month ── */
          <div className="card pad">
            <div className="sec-head">
              <h3 className="sec-title"><span className="tick" />{MONTHS[month]} {year} — Agenda</h3>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="navbtn" onClick={() => shift(-1)} title="Previous month"><ChevronLeft size={14} /></button>
                <button className="navbtn" onClick={() => shift(1)} title="Next month"><ChevronRight size={14} /></button>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="empty">
                <div className="ei"><CalendarDays size={20} /></div>
                <div className="et">Nothing scheduled this month</div>
                <div className="ed">Either this month is genuinely clear, or your source filters are hiding everything. Try turning filters back on above.</div>
              </div>
            ) : (
              Object.entries(
                visible.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
                  (acc[e.date] ??= []).push(e);
                  return acc;
                }, {})
              ).map(([date, evs]) => {
                const isToday = date === todayIso;
                const isPast = date < todayIso;
                return (
                  <div key={date} className="aggroup">
                    <div className="agday">
                      <span className="agd" style={{ color: isToday ? "#D99A6B" : isPast ? MUTED : SOFT }}>
                        {fmtDate(date)}
                      </span>
                      {isToday && <span className="agtoday">TODAY</span>}
                      <div className="agline" />
                    </div>
                    <div className="evlist" style={{ opacity: isPast ? 0.6 : 1 }}>
                      {evs.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} />)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Footnote ── */}
        <div className="foot">
          <Info size={16} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="ft">
            <b>This calendar is read-only by design.</b> Every entry is owned by the section that created it, so
            editing a warranty date in Warranties updates it here automatically — there is no second copy to keep in
            sync. Use <em>Open</em> on any entry to jump to its source.
          </div>
        </div>
      </div>
    </div>
  );
}
