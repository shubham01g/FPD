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
 *
 * Layout note: the "At a Glance" stat band and the month grid live in one
 * left-hand column; the day panel and "Coming Up" rail live in a right-hand
 * column pinned (via ResizeObserver) to exactly that column's real height —
 * measured, not guessed — so neither side ever shows a stretched grid or a
 * dead gap. The same pairing exists for the Agenda view's week list + rail.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, LayoutGrid, List, Info,
  CalendarDays, CalendarClock, AlertTriangle,
  CreditCard, Bell, Cake, ShieldCheck, IdCard, Plane, Pill, Star, Pin,
} from "lucide-react";
import {
  eventsForMonth, upcomingEvents, monthlyBillingTotal, iso, daysInMonth,
  SOURCE_META, type CalendarEvent, type EventSource,
} from "../services/calendarEvents";
import heroCalendarPhoto from "../../imports/calendar_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard) ── */
const TEXT   = "#EFF2F9";
const SOFT   = "#BCC5DA";
const MUTED  = "#A3ADC9";
const FAINT  = "#929CBC";
const ACCENT = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS    = "#5FBE91";
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

/* Icon-chip tone → colour, used for the "At a Glance" band — same gradient
   language as the redesigned dashboard's stat chips. */
const KPI_TONES: Record<string, { bg: string; fg: string }> = {
  sky:      { bg: "linear-gradient(150deg, rgba(91,167,214,0.34), rgba(91,167,214,0.08))",   fg: "#9FD3EE" },
  mint:     { bg: "linear-gradient(150deg, rgba(111,174,139,0.34), rgba(111,174,139,0.08))",  fg: "#A9DABC" },
  good:     { bg: "linear-gradient(150deg, rgba(95,190,145,0.30), rgba(95,190,145,0.09))",    fg: "#A9E6C4" },
  critical: { bg: "linear-gradient(150deg, rgba(208,107,107,0.32), rgba(208,107,107,0.08))",  fg: "#F0A9A9" },
  violet:   { bg: "linear-gradient(150deg, rgba(126,107,216,0.34), rgba(126,107,216,0.08))",  fg: "#C9BFF0" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ALL_SOURCES = Object.keys(SOURCE_META) as EventSource[];

const fmtDate = (isoStr: string) => {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

/** Every calendar cell across a month, including the leading/trailing days
 *  borrowed from the previous/next month so week ranges always read correctly
 *  (e.g. "Jun 28 – Jul 4"), then chunked into 7-day week rows. */
function buildWeekRows(year: number, month: number): { label: string; isoDates: string[] }[] {
  const lead = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const dates: Date[] = [];
  for (let i = lead; i > 0; i--) dates.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= total; d++) dates.push(new Date(year, month, d));
  while (dates.length % 7 !== 0) {
    const last = dates[dates.length - 1];
    dates.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  const rows: { label: string; isoDates: string[] }[] = [];
  for (let i = 0; i < dates.length; i += 7) {
    const week = dates.slice(i, i + 7);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    rows.push({
      label: `${fmt(week[0])} – ${fmt(week[6])}`,
      isoDates: week.map(d => iso(d.getFullYear(), d.getMonth(), d.getDate())),
    });
  }
  return rows;
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-cal so nothing else in the app is affected. */
const CAL_CSS = `
.fpd-cal{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 62% -160px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-cal *{box-sizing:border-box;}
.fpd-cal-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-cal .wrap{max-width:1360px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* cards */
.fpd-cal .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-cal .card.pad{padding:28px;}
.fpd-cal .sec-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.fpd-cal .sec-title{font-size:19px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;}
.fpd-cal .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-cal .sec-cnt{color:${MUTED};font-size:14px;font-family:var(--font-mono);}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-cal .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-cal .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-cal .hbanner:hover .art{transform:scale(1.08);}
.fpd-cal .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-cal .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-cal .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-cal .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-cal .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-cal .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-cal .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-cal .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-cal .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-cal .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-cal .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-cal .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-cal .hbanner{min-height:auto;} .fpd-cal .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-cal .hbanner h1{font-size:29px;}}

/* header */
.fpd-cal .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-cal .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-cal .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-cal .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-cal .head-r{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-cal .btn-today{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s,border-color .18s;}
.fpd-cal .btn-today:hover{background:rgba(91,110,225,0.18);}

/* segmented view toggle */
.fpd-cal .seg{display:flex;gap:3px;padding:3px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-cal .seg button{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:14px;font-size:15px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;text-transform:capitalize;}
.fpd-cal .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* "At a Glance" band — plain flat card, same treatment as every other card.
   A single clean cross-divider through the middle of the 2x2 grid instead of
   per-cell borders (which misalign into broken segments). */
.fpd-cal .kpi-stack{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-cal .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-cal .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-cal .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-cal .kpi-mini-txt{flex:1;min-width:0;}
.fpd-cal .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-cal .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-cal .kpi-mini-sub{font-size:14px;color:${SOFT};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-cal .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:520px){.fpd-cal .kpi-stack{grid-template-columns:1fr;}}

/* filters */
.fpd-cal .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-cal .flabel{font-size:13.5px;font-weight:700;letter-spacing:0.1em;color:${FAINT};margin-right:2px;text-transform:uppercase;}
.fpd-cal .chip{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:99px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-cal .chip .cn{font-family:var(--font-mono);font-size:13.5px;opacity:.8;}
.fpd-cal .chip.off{opacity:.48;}
.fpd-cal .chip.off:hover{opacity:.72;}

/* bento — both sides sit in a .col. The right side's height is measured
   from the left side (via ResizeObserver in JS) and applied directly, so the
   two columns always match to the pixel with no CSS stretch/guesswork. */
.fpd-cal .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:18px;align-items:start;}
.fpd-cal .col{display:flex;flex-direction:column;gap:18px;min-width:0;overflow:hidden;}
.fpd-cal .col>.card:last-child{flex:1;min-height:0;display:flex;flex-direction:column;}
.fpd-cal .col>.card:last-child .evlist{flex:1;min-height:0;overflow-y:auto;padding-right:2px;margin-right:-2px;}
@media (max-width:1080px){.fpd-cal .bento{grid-template-columns:1fr;} .fpd-cal .col{height:auto !important;} .fpd-cal .col>.card:last-child .evlist{overflow-y:visible;}}

/* month grid — perfect squares. Width comes from the 7-column track; height
   is locked to width via aspect-ratio, so cells can never be stretched
   tall/narrow no matter what height the card around them ends up at. */
.fpd-cal .gridcard{display:flex;flex-direction:column;}
.fpd-cal .navbtn{width:32px;height:32px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${SOFT};cursor:pointer;transition:border-color .18s,color .18s;}
.fpd-cal .navbtn:hover{border-color:rgba(91,110,225,0.45);color:#6FAE8B;}
.fpd-cal .dow{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-bottom:10px;}
.fpd-cal .dow span{text-align:center;font-size:13.5px;font-weight:700;letter-spacing:0.08em;color:${FAINT};padding:2px 0;}
.fpd-cal .monthgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}
.fpd-cal .cell{aspect-ratio:1/1;border-radius:20%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.014);display:flex;flex-direction:column;align-items:stretch;text-align:left;cursor:pointer;transition:border-color .16s,background .16s,transform .16s;overflow:hidden;padding:10%;position:relative;}
.fpd-cal .cell:hover{border-color:rgba(91,110,225,0.36);background:rgba(91,110,225,0.055);transform:translateY(-1px);}
.fpd-cal .cell.weekend{background:rgba(255,255,255,0.024);}
.fpd-cal .cell.blank{background:none;border:1px solid transparent;cursor:default;}
.fpd-cal .cell.blank:hover{transform:none;}
.fpd-cal .cell.today{border-color:rgba(95,190,145,0.55);box-shadow:inset 0 0 0 1px rgba(95,190,145,0.24),0 0 20px -8px rgba(95,190,145,0.55);}
.fpd-cal .cell.sel{border-color:${ACCENT};background:rgba(91,110,225,0.16);box-shadow:inset 0 0 0 1px rgba(91,110,225,0.55),0 8px 24px -10px rgba(91,110,225,0.6);}
.fpd-cal .cell.today.sel{box-shadow:inset 0 0 0 1px rgba(91,110,225,0.55),0 8px 24px -10px rgba(91,110,225,0.6);}
.fpd-cal .chead{display:flex;align-items:center;justify-content:space-between;}
.fpd-cal .dnum{font-family:var(--font-mono);font-size:16px;font-variant-numeric:tabular-nums;color:${SOFT};font-weight:500;}
.fpd-cal .cell.today .dnum{color:#D99A6B;font-weight:800;}
.fpd-cal .cell.sel .dnum{color:#fff;font-weight:800;}
.fpd-cal .todaydot{font-size:10.5px;font-weight:800;letter-spacing:0.06em;color:#D99A6B;text-transform:uppercase;}
.fpd-cal .cmore{font-family:var(--font-mono);font-size:11px;color:${MUTED};padding:2px 7px;border-radius:99px;background:rgba(255,255,255,0.05);}
.fpd-cal .chips{display:flex;flex-direction:column;gap:3px;margin-top:6px;}
.fpd-cal .cevt{display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:7px;font-size:10.5px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;}
.fpd-cal .cevt svg{flex-shrink:0;opacity:.85;}
.fpd-cal .cevt .ct{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* legend — real, useful content below the grid (which sources are active
   this month); natural height, never expands to fill leftover space */
.fpd-cal .grid-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);}
.fpd-cal .legend-item{display:flex;align-items:center;gap:7px;font-size:14.5px;color:${SOFT};font-weight:500;}
.fpd-cal .legend-item .dt{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* event rows (selected day + coming up + agenda) */
.fpd-cal .evlist{display:flex;flex-direction:column;gap:11px;}
.fpd-cal .evrow{display:flex;align-items:flex-start;gap:14px;padding:16px 18px;border-radius:18px;background:rgba(255,255,255,0.024);border:1px solid rgba(255,255,255,0.08);}
.fpd-cal .evico{width:44px;height:44px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-cal .evbody{flex:1;min-width:0;}
.fpd-cal .evtop{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.fpd-cal .evt{font-size:17.5px;font-weight:600;color:${TEXT};}
.fpd-cal .evamt{font-family:var(--font-mono);font-size:15.5px;font-weight:700;font-variant-numeric:tabular-nums;}
.fpd-cal .evmeta{font-size:14.5px;margin-top:5px;font-weight:600;}
.fpd-cal .evdet{color:${MUTED};font-size:15px;line-height:1.55;margin-top:5px;}
.fpd-cal .evopen{display:inline-flex;align-items:center;gap:5px;padding:8px 13px;border-radius:99px;font-size:14.5px;font-weight:600;flex-shrink:0;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-cal .evopen:hover{filter:brightness(1.15);}

/* compact event rows — Today + Coming Up rails, sized to show 3-4 at once
   instead of 1-2 full-detail rows. */
.fpd-cal .evrow.compact{gap:10px;padding:9px 11px;border-radius:13px;align-items:center;}
.fpd-cal .evrow.compact .evico{width:28px;height:28px;border-radius:9px;}
.fpd-cal .evrow.compact .evt{font-size:13.5px;}
.fpd-cal .evrow.compact .evamt{font-size:12.5px;}
.fpd-cal .evrow.compact .evmeta{font-size:11.5px;margin-top:1px;font-weight:500;}
.fpd-cal .evrow.compact .evopen{padding:6px;border-radius:99px;}
.fpd-cal .evlist.compact{gap:7px;}

/* calendar-themed hero — fills an empty day with a real-data teaser instead
   of dead air, built from CSS/SVG (no external image assets in the app). */
.fpd-cal .cal-hero{position:relative;overflow:hidden;border-radius:18px;padding:24px 22px;background:radial-gradient(420px 220px at 88% -30%,rgba(91,167,214,0.28),transparent 65%),radial-gradient(360px 260px at -10% 120%,rgba(126,107,216,0.24),transparent 60%),linear-gradient(160deg,#141b30 0%,#0d1220 65%,#0c111f 100%);border:1px solid rgba(91,110,225,0.2);}
.fpd-cal .cal-hero-grid{position:absolute;inset:0;opacity:.22;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.09) 1px,transparent 1px);background-size:26px 26px;mask-image:radial-gradient(240px 200px at 100% 0%,#000 0%,transparent 75%);-webkit-mask-image:radial-gradient(240px 200px at 100% 0%,#000 0%,transparent 75%);}
.fpd-cal .cal-hero-mark{position:absolute;right:-14px;top:-14px;opacity:.16;color:${ACCENT2};pointer-events:none;}
.fpd-cal .cal-hero-body{position:relative;}
.fpd-cal .cal-hero-eyebrow{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;background:rgba(91,110,225,0.16);border:1px solid rgba(91,110,225,0.36);color:#C9BFF0;font-size:12.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:13px;}
.fpd-cal .cal-hero-h2{font-family:var(--font-display);font-size:25px;font-weight:700;color:${TEXT};line-height:1.2;letter-spacing:-0.01em;margin-bottom:8px;}
.fpd-cal .cal-hero-h2 .accent{background:linear-gradient(90deg,${ACCENT2},#6FAE8B);-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-cal .cal-hero-sub{color:${SOFT};font-size:15.5px;line-height:1.6;max-width:360px;margin-bottom:18px;}
.fpd-cal .cal-hero-actions{display:flex;gap:9px;flex-wrap:wrap;}
.fpd-cal .cal-hero-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .16s,filter .16s;}
.fpd-cal .cal-hero-btn:hover{transform:translateY(-1px);}
.fpd-cal .cal-hero-btn.primary{background:#fff;color:#12172A;}
.fpd-cal .cal-hero-btn.ghost{background:rgba(91,110,225,0.16);border:1px solid rgba(91,110,225,0.4);color:#fff;}
.fpd-cal .cal-hero-next-wrap{margin-top:14px;}
.fpd-cal .fallback-lbl{font-size:13.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${FAINT};margin-bottom:8px;}

/* empty state (rare — filters hide everything) */
.fpd-cal .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 12px;}
.fpd-cal .empty .ei{width:46px;height:46px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:12px;}
.fpd-cal .empty .et{color:${SOFT};font-size:16px;font-weight:600;font-family:var(--font-display);}
.fpd-cal .empty .ed{color:${MUTED};font-size:15px;line-height:1.6;margin-top:5px;max-width:340px;}

/* category breakdown — real, derived-from-data widget (Agenda view rail) */
.fpd-cal .catlist{display:flex;flex-direction:column;gap:11px;}
.fpd-cal .catrow{display:flex;align-items:center;gap:10px;}
.fpd-cal .catico{width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-cal .catbody{flex:1;min-width:0;}
.fpd-cal .cattop{display:flex;align-items:center;justify-content:space-between;font-size:15px;margin-bottom:5px;}
.fpd-cal .catname{color:${SOFT};font-weight:600;}
.fpd-cal .catnum{font-family:var(--font-mono);color:${MUTED};font-variant-numeric:tabular-nums;}
.fpd-cal .catbar-track{height:6px;border-radius:99px;background:rgba(255,255,255,0.05);overflow:hidden;}
.fpd-cal .catbar-fill{height:100%;border-radius:99px;}

/* agenda view — grouped by real week, every week shown (even quiet ones) */
.fpd-cal .agenda-bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:18px;align-items:start;}
@media (max-width:1080px){.fpd-cal .agenda-bento{grid-template-columns:1fr;} .fpd-cal .agenda-bento .col{height:auto !important;}}
.fpd-cal .weekgroup{border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:14px 16px;margin-bottom:10px;}
.fpd-cal .weekgroup:last-child{margin-bottom:0;}
.fpd-cal .weekhead{display:flex;align-items:center;gap:10px;margin-bottom:2px;}
.fpd-cal .weekrange{font-family:var(--font-mono);font-size:14.5px;font-weight:700;color:${SOFT};}
.fpd-cal .weekline{flex:1;height:1px;background:rgba(255,255,255,0.13);}
.fpd-cal .weektag{padding:2px 8px;border-radius:6px;background:rgba(95,190,145,0.16);color:#D99A6B;font-size:11px;font-weight:700;letter-spacing:0.06em;}
.fpd-cal .weekquiet{color:${FAINT};font-size:15px;padding:8px 2px 2px;font-style:italic;}
.fpd-cal .week-evlist{display:flex;flex-direction:column;gap:8px;margin-top:10px;}

/* footnote */
.fpd-cal .foot{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-cal .foot .ft{color:${MUTED};font-size:15.5px;line-height:1.7;}
.fpd-cal .foot .ft b{color:${SOFT};font-weight:600;}
.fpd-cal .foot .ft em{color:#6FAE8B;font-style:normal;}
`;

/* ── One event row — used in the day panel, upcoming rail and agenda ── */
function EventRow({ ev, onNavigate, showDate, compact }: { ev: CalendarEvent; onNavigate?: (p: string) => void; showDate?: boolean; compact?: boolean }) {
  const { color, Icon } = SRC[ev.source];
  return (
    <div className={`evrow${compact ? " compact" : ""}`} style={{ borderColor: `${color}26` }}>
      <div className="evico" style={{ background: `${color}1C`, color }}>
        <Icon size={compact ? 14 : 18} />
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
        {!compact && ev.detail && <div className="evdet">{ev.detail}</div>}
      </div>
      {ev.linkPage && onNavigate && (
        <button
          className="evopen"
          onClick={() => onNavigate(ev.linkPage!)}
          title={`Open ${ev.linkLabel}`}
          style={{ background: `${color}18`, color }}
        >
          {compact ? <ArrowRight size={12} /> : <>Open <ArrowRight size={12} /></>}
        </button>
      )}
    </div>
  );
}

/* ── Calendar-themed hero — fills an empty day with real-data content
   instead of a plain "nothing scheduled" box. Same eyebrow/heading/subtitle/
   action-pair pattern used elsewhere in the product's hero banners. ── */
function CalHero({
  isToday, next, onNavigate, onViewAgenda, onJumpToNext,
}: {
  isToday: boolean; next: CalendarEvent;
  onNavigate?: (p: string) => void; onViewAgenda: () => void; onJumpToNext: () => void;
}) {
  return (
    <div className="cal-hero">
      <div className="cal-hero-grid" />
      <div className="cal-hero-mark"><CalendarDays size={96} /></div>
      <div className="cal-hero-body">
        <span className="cal-hero-eyebrow">{isToday ? "Today's clear" : "Quiet day"}</span>
        <h4 className="cal-hero-h2">All Your Dates,<br /><span className="accent">One Place</span></h4>
        <p className="cal-hero-sub">
          Auto-pay charges, reminders, birthdays, warranties and appointments — nothing is scheduled{" "}
          {isToday ? "today" : "on this day"}, so it&rsquo;s a good moment to look ahead.
        </p>
        <div className="cal-hero-actions">
          <button className="cal-hero-btn primary" onClick={onViewAgenda}><List size={14} /> View Full Agenda</button>
          <button className="cal-hero-btn ghost" onClick={onJumpToNext}><CalendarClock size={14} /> Jump to Next Event</button>
        </div>
      </div>
      <div className="cal-hero-next-wrap">
        <div className="fallback-lbl">Next up</div>
        <EventRow ev={next} onNavigate={onNavigate} showDate />
      </div>
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
  const nextEvent = upcoming[0];

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

  /* Real week ranges (e.g. "Jun 28 – Jul 4") for the Agenda view, computed
     from actual date arithmetic so it's correct for any month, not just July. */
  const weekRows = useMemo(() => buildWeekRows(year, month), [year, month]);

  /* Which sources actually have events this month — powers both the grid's
     legend and the Agenda view's category breakdown. Real counts, no
     invented rows: a source with zero events this month just doesn't appear. */
  const categoryBreakdown = useMemo(() => {
    const counts = new Map<EventSource, number>();
    visible.forEach(e => counts.set(e.source, (counts.get(e.source) ?? 0) + 1));
    return ALL_SOURCES
      .filter(s => (counts.get(s) ?? 0) > 0)
      .map(s => ({ source: s, count: counts.get(s)! }))
      .sort((a, b) => b.count - a.count);
  }, [visible]);

  const jumpToNextEvent = () => {
    if (!nextEvent) return;
    const [ny, nm] = nextEvent.date.split("-").map(Number);
    if (ny !== year || nm - 1 !== month) { setYear(ny); setMonth(nm - 1); }
    setSelected(nextEvent.date);
    setView("month");
  };

  const overdueCount = monthEvents.filter(
    e => e.date < todayIso && (e.source === "warranty" || e.source === "document")
  ).length;
  const billingCount = monthEvents.filter(e => e.source === "billing").length;
  const upcomingTotal = upcomingEvents(999).length;

  const todayLong = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  const kpis = [
    { label: "Events This Month", value: monthEvents.length, sub: `${MONTHS[month]} ${year}`, dot: ACCENT2, tone: "sky", icon: <CalendarDays size={16} /> },
    { label: "Auto-Pay Scheduled", value: `$${billingTotal.toFixed(2)}`, sub: `${billingCount} charge${billingCount === 1 ? "" : "s"}`, dot: SRC.billing.color, tone: "mint", icon: <CreditCard size={16} /> },
    { label: "Needs Attention", value: overdueCount, sub: "Expired warranties & IDs", dot: overdueCount > 0 ? NEG : POS, tone: overdueCount > 0 ? "critical" : "good", icon: <AlertTriangle size={16} /> },
    { label: "Next 6 Months", value: upcomingTotal, sub: "Upcoming entries", dot: ACCENT2, tone: "violet", icon: <CalendarClock size={16} /> },
  ];

  /* ── Keep the right rail pinned to exactly the left column's real height —
     measured (ResizeObserver), not guessed, so the two sides always match to
     the pixel with no leftover gap and no stretching of the square day cells.
     Same pairing for the Agenda view's week list + its own rail. ── */
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const agendaCardRef = useRef<HTMLDivElement>(null);
  const agendaColRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const pin = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
      if (!source || !target) return;
      if (window.innerWidth <= 1080) { target.style.height = ""; return; }
      target.style.height = `${source.getBoundingClientRect().height}px`;
    };
    const run = () => {
      pin(leftColRef.current, rightColRef.current);
      pin(agendaCardRef.current, agendaColRef.current);
    };
    run();
    window.addEventListener("resize", run);
    const ro = new ResizeObserver(run);
    if (leftColRef.current) ro.observe(leftColRef.current);
    if (agendaCardRef.current) ro.observe(agendaCardRef.current);
    return () => { window.removeEventListener("resize", run); ro.disconnect(); };
  }, [view, year, month, selected, active]);

  return (
    <div className="fpd-cal">
      <style dangerouslySetInnerHTML={{ __html: CAL_CSS }} />
      <div className="fpd-cal-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroCalendarPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Every Date That Matters</span>
            <h1>Never miss a moment <span className="accent">worth planning for.</span></h1>
            <p>Bills, birthdays, warranties, travel and appointments — all in one calendar, so nothing important slips through the cracks.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={goToday}>
                <CalendarClock size={15} /> Jump to Today
              </button>
              <button className="hbtn ghost" onClick={() => setView("agenda")}>
                <List size={15} /> View Agenda
              </button>
            </div>
          </div>
        </div>

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

        {/* ── Source filters ── */}
        <div className="card pad" style={{ padding: "18px 22px" }}>
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
            {/* Left column — At a Glance stat cards + month grid */}
            <div className="col" ref={leftColRef}>
              <div className="kpi-stack">
                {kpis.map(k => {
                  const tone = KPI_TONES[k.tone] ?? KPI_TONES.sky;
                  return (
                    <div key={k.label} className="kpi-mini">
                      <span className="kpi-mini-ico" style={{ background: tone.bg, color: tone.fg }}>{k.icon}</span>
                      <div className="kpi-mini-txt">
                        <div className="kpi-mini-val">{k.value}</div>
                        <div className="kpi-mini-lbl">{k.label}</div>
                        <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card pad gridcard">
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

                <div className="monthgrid">
                  {cells.map((day, i) => {
                    if (day === null) return <div key={`b${i}`} className="cell blank" />;
                    const dIso = iso(year, month, day);
                    const evs = byDate.get(dIso) ?? [];
                    const isToday = dIso === todayIso;
                    const isSel = dIso === selected;
                    const isWeekend = i % 7 === 0 || i % 7 === 6;
                    return (
                      <button
                        key={dIso}
                        onClick={() => setSelected(dIso)}
                        className={`cell ${isWeekend ? "weekend" : ""} ${isToday ? "today" : ""} ${isSel ? "sel" : ""}`}
                      >
                        <div className="chead">
                          <span className="dnum">{day}</span>
                          {isToday ? <span className="todaydot">Today</span> : (evs.length > 3 && <span className="cmore">+{evs.length - 3}</span>)}
                        </div>
                        <div className="chips">
                          {evs.slice(0, 3).map(e => {
                            const c = SRC[e.source].color;
                            const Icon = SRC[e.source].Icon;
                            return (
                              <div key={e.id} className="cevt" title={e.title} style={{ background: `${c}20`, color: c }}>
                                <Icon size={9} />
                                <span className="ct">{e.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {categoryBreakdown.length > 0 && (
                  <div className="grid-legend">
                    {categoryBreakdown.map(({ source }) => (
                      <span key={source} className="legend-item">
                        <span className="dt" style={{ background: SRC[source].color }} />
                        {SOURCE_META[source].label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column — selected day + upcoming, pinned to the left column's height */}
            <div className="col" ref={rightColRef}>
              <div className="card pad">
                <div className="sec-head">
                  <h3 className="sec-title"><span className="tick" />{selected === todayIso ? "Today" : fmtDate(selected)}</h3>
                  <span className="sec-cnt">{selectedEvents.length} item{selectedEvents.length === 1 ? "" : "s"}</span>
                </div>
                {selectedEvents.length > 0 ? (
                  <div className="evlist compact">
                    {selectedEvents.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} compact />)}
                  </div>
                ) : nextEvent ? (
                  <CalHero
                    isToday={selected === todayIso}
                    next={nextEvent}
                    onNavigate={onNavigate}
                    onViewAgenda={() => setView("agenda")}
                    onJumpToNext={jumpToNextEvent}
                  />
                ) : (
                  <div className="empty">
                    <div className="ei"><CalendarDays size={20} /></div>
                    <div className="et">Nothing scheduled</div>
                    <div className="ed">This day is clear, and nothing upcoming matches your active filters. Turn a few back on above.</div>
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
          /* ── Agenda view — chronological by week, every week shown ── */
          <div className="agenda-bento">
            <div className="card pad" ref={agendaCardRef}>
              <div className="sec-head">
                <h3 className="sec-title"><span className="tick" />{MONTHS[month]} {year} — Agenda</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="navbtn" onClick={() => shift(-1)} title="Previous month"><ChevronLeft size={14} /></button>
                  <button className="navbtn" onClick={() => shift(1)} title="Next month"><ChevronRight size={14} /></button>
                </div>
              </div>

              {weekRows.map(week => {
                const evs = week.isoDates.flatMap(d => byDate.get(d) ?? []);
                const hasToday = week.isoDates.includes(todayIso);
                return (
                  <div key={week.label} className="weekgroup">
                    <div className="weekhead">
                      <span className="weekrange">{week.label}</span>
                      {hasToday && <span className="weektag">This week</span>}
                      <div className="weekline" />
                    </div>
                    {evs.length === 0 ? (
                      <div className="weekquiet">Quiet week — nothing scheduled.</div>
                    ) : (
                      <div className="week-evlist">
                        {evs.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="col" ref={agendaColRef}>
              <div className="card pad">
                <div className="sec-head"><h3 className="sec-title"><span className="tick" />This Month by Category</h3></div>
                {categoryBreakdown.length === 0 ? (
                  <div className="empty">
                    <div className="ei"><CalendarDays size={20} /></div>
                    <div className="et">No categories match your filters</div>
                  </div>
                ) : (
                  <div className="catlist">
                    {categoryBreakdown.map(({ source, count }) => {
                      const c = SRC[source].color;
                      const Icon = SRC[source].Icon;
                      const max = categoryBreakdown[0].count;
                      return (
                        <div key={source} className="catrow">
                          <div className="catico" style={{ background: `${c}1C`, color: c }}><Icon size={13} /></div>
                          <div className="catbody">
                            <div className="cattop"><span className="catname">{SOURCE_META[source].label}</span><span className="catnum">{count}</span></div>
                            <div className="catbar-track"><div className="catbar-fill" style={{ width: `${Math.round((count / max) * 100)}%`, background: c }} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card pad">
                <div className="sec-head"><h3 className="sec-title"><span className="tick" />Coming Up</h3></div>
                {upcoming.length === 0 ? (
                  <div className="empty">
                    <div className="ei"><CalendarClock size={20} /></div>
                    <div className="et">No upcoming events</div>
                  </div>
                ) : (
                  <div className="evlist">
                    {upcoming.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} showDate />)}
                  </div>
                )}
              </div>
            </div>
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