/**
 * LifeCalendar — the unified calendar.
 *
 * One view over every dated thing in the account: auto-pay charges, reminders,
 * birthdays and anniversaries, warranty and document expiry, travel, medical
 * appointments and concierge sessions. Nothing is authored here — the Calendar
 * reads from services/calendarEvents and links back to the owning section.
 */
import React, { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight,
  List, Grid3x3, DollarSign, CircleAlert,
} from "lucide-react";
import {
  eventsForMonth, upcomingEvents, monthlyBillingTotal, iso, daysInMonth,
  SOURCE_META, type CalendarEvent, type EventSource,
} from "../services/calendarEvents";
import { Page, PageHeader, Card, CardTitle, StatGrid, EmptyState, MONO } from "./ui/PageShell";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ALL_SOURCES = Object.keys(SOURCE_META) as EventSource[];

const fmtDate = (isoStr: string) => {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

/* ── One event row, used in the day panel and the upcoming rail ── */
function EventRow({ ev, onNavigate, showDate }: { ev: CalendarEvent; onNavigate?: (p: string) => void; showDate?: boolean }) {
  const meta = SOURCE_META[ev.source];
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{ background: "#141B2E", border: `1px solid ${meta.color}22` }}
    >
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: 34, height: 34, background: `${meta.color}1A`, fontSize: 15 }}
      >
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 2 }}>
          <span style={{ color: "var(--foreground)", fontSize: 13.5, fontWeight: 600 }}>{ev.title}</span>
          {ev.amount !== undefined && (
            <span style={{ color: meta.color, fontSize: 12.5, fontWeight: 700, ...MONO }}>
              ${ev.amount.toFixed(2)}
            </span>
          )}
        </div>
        {showDate && (
          <div style={{ color: meta.color, fontSize: 11, ...MONO, marginBottom: 2 }}>
            {fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}
          </div>
        )}
        {!showDate && ev.time && (
          <div style={{ color: meta.color, fontSize: 11, ...MONO, marginBottom: 2 }}>{ev.time}</div>
        )}
        {ev.detail && (
          <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, lineHeight: 1.5 }}>{ev.detail}</div>
        )}
      </div>
      {ev.linkPage && onNavigate && (
        <button
          onClick={() => onNavigate(ev.linkPage!)}
          title={`Open ${ev.linkLabel}`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg flex-shrink-0"
          style={{ background: `${meta.color}14`, color: meta.color, fontSize: 11, fontWeight: 600 }}
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

  /** date -> events, for painting dots on the grid */
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

  return (
    <Page>
      <PageHeader
        eyebrow="UNIFIED VIEW · ALL SECTIONS"
        icon={<CalendarIcon size={13} />}
        title="Calendar"
        description="Every dated item across your account in one place — auto-pay charges, reminders, birthdays, warranty and ID expiry, travel, medical appointments and concierge sessions. Entries are owned by their own sections; open one to edit it there."
        actions={
          <>
            <button
              onClick={goToday}
              className="px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(58,91,217,0.12)", color: "#8AA0FF", border: "1px solid rgba(58,91,217,0.25)", fontWeight: 600 }}
            >
              Today
            </button>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {([["month", <Grid3x3 size={14} key="g" />], ["agenda", <List size={14} key="l" />]] as const).map(([id, ic]) => (
                <button
                  key={id}
                  onClick={() => setView(id as "month" | "agenda")}
                  title={id === "month" ? "Month grid" : "Agenda list"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: view === id ? "linear-gradient(135deg,#3A5BD9,#5B7BF5)" : "transparent",
                    color: view === id ? "#fff" : "var(--muted-foreground)",
                    fontWeight: 600, textTransform: "capitalize",
                  }}
                >
                  {ic} {id}
                </button>
              ))}
            </div>
          </>
        }
      />

      <StatGrid
        stats={[
          { label: "Events This Month", value: monthEvents.length, sub: `${MONTHS[month]} ${year}`, color: "#3A5BD9" },
          { label: "Auto-Pay Scheduled", value: `$${billingTotal.toFixed(2)}`, sub: `${monthEvents.filter(e => e.source === "billing").length} charges`, color: "#5B7BF5" },
          { label: "Needs Attention", value: overdueCount, sub: "Expired warranties & IDs", color: overdueCount > 0 ? "#FC8181" : "#48BB78" },
          { label: "Next 6 Months", value: upcomingEvents(999).length, sub: "Upcoming entries", color: "#6E8BFF" },
        ]}
      />

      {/* Source filters */}
      <Card padding={16}>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: "var(--muted-foreground)", fontSize: 11, ...MONO, letterSpacing: "0.1em", marginRight: 4 }}>
            FILTER
          </span>
          {ALL_SOURCES.map(s => {
            const meta = SOURCE_META[s];
            const on = active.has(s);
            const n = monthEvents.filter(e => e.source === s).length;
            return (
              <button
                key={s}
                onClick={() => toggleSource(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: on ? `${meta.color}1F` : "transparent",
                  color: on ? meta.color : "var(--muted-foreground)",
                  border: `1px solid ${on ? `${meta.color}44` : "var(--border)"}`,
                  fontWeight: 600, opacity: on ? 1 : 0.55,
                }}
              >
                <span>{meta.icon}</span>
                {meta.label}
                <span style={{ ...MONO, opacity: 0.75 }}>{n}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {view === "month" ? (
        <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Month grid */}
            <div className="lg:col-span-2">
              <Card padding={20}>
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--foreground)" }}>
                    {MONTHS[month]} {year}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => shift(-1)}
                      title="Previous month"
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 32, height: 32, background: "rgba(58,91,217,0.1)", border: "1px solid var(--border)", color: "#8AA0FF" }}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      onClick={() => shift(1)}
                      title="Next month"
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 32, height: 32, background: "rgba(58,91,217,0.1)", border: "1px solid var(--border)", color: "#8AA0FF" }}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7" style={{ gap: 6, marginBottom: 6 }}>
                  {DOW.map(d => (
                    <div key={d} style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: 10, ...MONO, letterSpacing: "0.08em", padding: "4px 0" }}>
                      {d.toUpperCase()}
                    </div>
                  ))}
                </div>

                {/* Cells */}
                <div className="grid grid-cols-7" style={{ gap: 6 }}>
                  {cells.map((day, i) => {
                    if (day === null) return <div key={`b${i}`} />;
                    const dIso = iso(year, month, day);
                    const evs = byDate.get(dIso) ?? [];
                    const isToday = dIso === todayIso;
                    const isSel = dIso === selected;
                    return (
                      <button
                        key={dIso}
                        onClick={() => setSelected(dIso)}
                        className="flex flex-col rounded-lg transition-all"
                        style={{
                          minHeight: 76, padding: "6px 6px 5px", alignItems: "stretch", textAlign: "left",
                          background: isSel ? "rgba(58,91,217,0.22)" : evs.length ? "rgba(58,91,217,0.05)" : "transparent",
                          border: isSel
                            ? "1.5px solid #5B7BF5"
                            : isToday
                              ? "1.5px solid rgba(72,187,120,0.6)"
                              : "1px solid var(--border)",
                        }}
                      >
                        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 12, ...MONO, fontWeight: isToday || isSel ? 700 : 500,
                              color: isToday ? "#48BB78" : isSel ? "#FFFFFF" : "var(--foreground)",
                            }}
                          >
                            {day}
                          </span>
                          {evs.length > 2 && (
                            <span style={{ fontSize: 9, ...MONO, color: "var(--muted-foreground)" }}>+{evs.length - 2}</span>
                          )}
                        </div>
                        <div className="flex flex-col" style={{ gap: 2 }}>
                          {evs.slice(0, 2).map(e => (
                            <div
                              key={e.id}
                              title={e.title}
                              style={{
                                fontSize: 9.5, lineHeight: 1.3, padding: "2px 4px", borderRadius: 4,
                                background: `${SOURCE_META[e.source].color}26`,
                                color: SOURCE_META[e.source].color,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600,
                              }}
                            >
                              {e.title}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Right rail — selected day + upcoming */}
            <div className="space-y-6">
              <Card padding={20}>
                <CardTitle right={<span style={{ color: "var(--muted-foreground)", fontSize: 11, ...MONO }}>{selectedEvents.length} item{selectedEvents.length === 1 ? "" : "s"}</span>}>
                  {selected === todayIso ? "Today" : fmtDate(selected)}
                </CardTitle>
                {selectedEvents.length === 0 ? (
                  <div className="text-center" style={{ padding: "28px 8px" }}>
                    <CalendarIcon size={26} color="rgba(58,91,217,0.3)" style={{ margin: "0 auto 10px" }} />
                    <div style={{ color: "var(--muted-foreground)", fontSize: 12.5 }}>Nothing scheduled on this day.</div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedEvents.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} />)}
                  </div>
                )}
              </Card>

              <Card padding={20}>
                <CardTitle>Coming Up</CardTitle>
                {upcoming.length === 0 ? (
                  <div style={{ color: "var(--muted-foreground)", fontSize: 12.5, textAlign: "center", padding: "20px 0" }}>
                    No upcoming events match your filters.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcoming.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} showDate />)}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* ── Agenda view — flat chronological list for the month ── */
        <Card padding={20}>
          <CardTitle
            right={
              <div className="flex items-center gap-1">
                <button onClick={() => shift(-1)} className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: "rgba(58,91,217,0.1)", color: "#8AA0FF" }}>
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => shift(1)} className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: "rgba(58,91,217,0.1)", color: "#8AA0FF" }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            }
          >
            {MONTHS[month]} {year} — Agenda
          </CardTitle>

          {visible.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={22} />}
              title="Nothing scheduled this month"
              description="Either this month is genuinely clear, or your source filters are hiding everything. Try turning filters back on above."
            />
          ) : (
            <div className="space-y-5">
              {Object.entries(
                visible.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
                  (acc[e.date] ??= []).push(e);
                  return acc;
                }, {})
              ).map(([date, evs]) => {
                const isToday = date === todayIso;
                const isPast = date < todayIso;
                return (
                  <div key={date}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <span
                        style={{
                          color: isToday ? "#48BB78" : isPast ? "var(--muted-foreground)" : "var(--foreground)",
                          fontSize: 12.5, fontWeight: 700, ...MONO,
                        }}
                      >
                        {fmtDate(date)}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded" style={{ background: "rgba(72,187,120,0.15)", color: "#48BB78", fontSize: 9.5, ...MONO, fontWeight: 700 }}>
                          TODAY
                        </span>
                      )}
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                    <div className="space-y-2.5" style={{ opacity: isPast ? 0.55 : 1 }}>
                      {evs.map(e => <EventRow key={e.id} ev={e} onNavigate={onNavigate} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Footnote */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl" style={{ background: "rgba(58,91,217,0.03)", border: "1px solid rgba(58,91,217,0.1)" }}>
        <CircleAlert size={16} color="#5B7BF5" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ color: "var(--muted-foreground)", fontSize: 12.5, lineHeight: 1.7 }}>
          <strong style={{ color: "var(--foreground)" }}>This calendar is read-only by design.</strong> Every entry is owned by the
          section that created it, so editing a warranty date in Warranties updates it here automatically — there is no second copy to
          keep in sync. Use <span style={{ color: "#8AA0FF" }}>Open</span> on any entry to jump to its source.
        </div>
      </div>
    </Page>
  );
}
