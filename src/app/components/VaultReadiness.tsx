import React from "react";
import { ShieldCheck, ArrowRight, Check } from "lucide-react";

/* ── Royal Vault Blue palette (shared with UserDashboard) ── */
const TEXT    = "#FFFFFF";
const SOFT    = "#B8C8E0";
const MUTED   = "#8A9AB8";
const FAINT   = "#5A6A88";
const HILITE  = "#5BA7D6";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#7E6BD8";
const SUCCESS = "#48BB78";
const WARN    = "#F6AD55";

export interface ReadinessItem {
  label: string;
  done: boolean;
  /** Page to open when the essential is tapped. */
  page: string;
}

interface VaultReadinessProps {
  items: ReadinessItem[];
  onNavigate: (page: string) => void;
}

/* Emblem geometry — one source of truth so the SVG and the badge stay aligned. */
const SIZE = 176;
const C = SIZE / 2;
const R_ARC = 70;          // progress arc radius
const R_TICK_IN = 52;      // radial tick inner radius
const R_TICK_OUT = 60;
const TICKS = 60;
const ARC_CIRC = 2 * Math.PI * R_ARC;

/**
 * Circular "vault prepared" emblem: a radial tick dial wrapped in a progress
 * arc, with a shield badge at the centre. Reads as a security seal rather than
 * a progress chart — the number is the headline, the ring is the reassurance.
 */
export function VaultReadiness({ items, onNavigate }: VaultReadinessProps) {
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const sealed = done === total && total > 0;

  const arcOffset = ARC_CIRC * (1 - pct / 100);
  const litTicks = Math.round((pct / 100) * TICKS);
  const statusColor = sealed ? SUCCESS : WARN;
  const nextUp = items.find(i => !i.done);

  return (
    <div
      className="fpd-fade-in-up glow-surface"
      style={{
        background: "linear-gradient(135deg,#0C1322 0%,#101A2E 55%,#0C1322 100%)",
        border: "1px solid rgba(91,110,225,0.22)",
        borderRadius: 22,
        padding: "26px 28px",
        display: "flex",
        alignItems: "center",
        gap: 30,
        flexWrap: "wrap",
      }}
    >
      {/* ── Emblem ── */}
      <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
        {/* Ambient bloom behind the dial */}
        <div
          className="fpd-breathe"
          aria-hidden
          style={{
            position: "absolute", inset: 14, borderRadius: "50%",
            background: `radial-gradient(circle, ${ACCENT}55 0%, transparent 68%)`,
            filter: "blur(14px)",
          }}
        />

        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "relative" }}>
          <defs>
            <linearGradient id="vrArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ACCENT2} />
              <stop offset="55%" stopColor={HILITE} />
              <stop offset="100%" stopColor={ACCENT2} />
            </linearGradient>
            <radialGradient id="vrCore" cx="50%" cy="42%" r="60%">
              <stop offset="0%" stopColor="rgba(91,110,225,0.30)" />
              <stop offset="100%" stopColor="rgba(10,16,32,0.85)" />
            </radialGradient>
            <filter id="vrGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer hairline ring */}
          <circle cx={C} cy={C} r={84} fill="none" stroke="rgba(91,167,214,0.12)" strokeWidth="1" />

          {/* Radial tick dial — lit ticks track completion */}
          <g>
            {Array.from({ length: TICKS }).map((_, i) => {
              const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
              const lit = i < litTicks;
              return (
                <line
                  key={i}
                  x1={C + Math.cos(a) * R_TICK_IN} y1={C + Math.sin(a) * R_TICK_IN}
                  x2={C + Math.cos(a) * R_TICK_OUT} y2={C + Math.sin(a) * R_TICK_OUT}
                  stroke={lit ? HILITE : "rgba(91,167,214,0.14)"}
                  strokeWidth={lit ? 1.6 : 1}
                  strokeLinecap="round"
                  opacity={lit ? (i % 5 === 0 ? 0.95 : 0.55) : 1}
                />
              );
            })}
          </g>

          {/* Core disc */}
          <circle cx={C} cy={C} r={46} fill="url(#vrCore)" stroke="rgba(91,167,214,0.18)" strokeWidth="1" />

          {/* Progress arc */}
          <circle
            cx={C} cy={C} r={R_ARC} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="3"
          />
          <circle
            cx={C} cy={C} r={R_ARC} fill="none"
            stroke="url(#vrArc)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={ARC_CIRC} strokeDashoffset={arcOffset}
            transform={`rotate(-90 ${C} ${C})`}
            filter="url(#vrGlow)"
            style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
          />

          {/* Slow orbiting marker on the arc */}
          <g className="fpd-spin-slow" style={{ transformOrigin: `${C}px ${C}px` }}>
            <circle cx={C} cy={C - 84} r="2" fill={HILITE} opacity="0.8" />
          </g>
        </svg>

        {/* Shield badge */}
        <div
          style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: 54, height: 54, borderRadius: 16,
            background: `linear-gradient(140deg,${ACCENT},${ACCENT2})`,
            boxShadow: `0 0 26px ${ACCENT}88, inset 0 1px 0 rgba(255,255,255,0.25)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ShieldCheck size={26} color="#FFFFFF" strokeWidth={1.9} />
        </div>
      </div>

      {/* ── Status copy ── */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
          <span
            className="fpd-pulse-dot"
            style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: statusColor, fontWeight: 700 }}>
            {sealed ? "SECURED & SEALED" : "SEALING IN PROGRESS"}
          </span>
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 34, lineHeight: 1.12, color: TEXT, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Vault {pct}% Prepared
        </h2>

        <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.55, maxWidth: 420 }}>
          {sealed
            ? <>All {total} essentials in place, encrypted end-to-end.</>
            : <>{done} of {total} essentials in place. {nextUp ? <>Next up — {nextUp.label.toLowerCase()}.</> : null}</>}
        </p>

        {/* Essentials as compact chips */}
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.page)}
              className="flex items-center fpd-btn-lift"
              style={{
                gap: 6, padding: "6px 11px", borderRadius: 999,
                background: item.done ? "rgba(72,187,120,0.10)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${item.done ? "rgba(72,187,120,0.26)" : "rgba(91,167,214,0.16)"}`,
                color: item.done ? SOFT : MUTED, fontSize: 11.5,
              }}
            >
              <span
                style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: item.done ? SUCCESS : "transparent",
                  border: item.done ? "none" : `1px solid ${FAINT}`,
                }}
              >
                {item.done && <Check size={9} color="#0A1020" strokeWidth={3.5} />}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        {!sealed && nextUp && (
          <button
            onClick={() => onNavigate(nextUp.page)}
            className="flex items-center fpd-btn-lift"
            style={{
              gap: 6, marginTop: 16, padding: "9px 16px", borderRadius: 12,
              background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              color: "#fff", fontSize: 12.5, fontWeight: 650,
            }}
          >
            Finish your vault <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
