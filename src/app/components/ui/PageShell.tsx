/**
 * PageShell — shared layout primitives for user-portal pages.
 *
 * Every Milestone-2 page was hand-rolling its own header, stat row, card and
 * tab bar, which is why the spacing and type sizes drifted between them.
 * These components encode the Royal Vault Blue language once so pages read
 * as one product. They are deliberately thin: styling only, no data logic.
 */
import React from "react";

export const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* ── Page wrapper — consistent gutters + max width ── */
export function Page({ children, width = 1240 }: { children: React.ReactNode; width?: number }) {
  return (
    <div className="p-6 space-y-6" style={{ maxWidth: width, margin: "0 auto" }}>
      {children}
    </div>
  );
}

/* ── Page header — eyebrow / title / description / right-hand actions ── */
export function PageHeader({
  eyebrow, title, description, actions, icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            {icon && <span style={{ color: "#3A5BD9", display: "flex" }}>{icon}</span>}
            <span style={{ color: "#3A5BD9", fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, ...MONO }}>
              {eyebrow}
            </span>
          </div>
        )}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4, letterSpacing: "-0.01em" }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.7, maxWidth: 760 }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/* ── Card — the standard bordered surface with cursor glow ── */
export function Card({
  children, padding = 20, className = "", style,
}: {
  children: React.ReactNode; padding?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl border glow-surface ${className}`}
      style={{ background: "var(--card)", borderColor: "var(--border)", padding, ...style }}
    >
      {children}
    </div>
  );
}

/* ── Stat tile row — the 2/4-up metric strip used across pages ── */
export type Stat = { label: string; value: React.ReactNode; sub?: string; color?: string };

export function StatGrid({ stats, columns = 4 }: { stats: Stat[]; columns?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4`}>
      {stats.map(s => (
        <Card key={s.label}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: s.color ?? "var(--foreground)", marginBottom: 4 }}>
            {s.value}
          </div>
          <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>{s.label}</div>
          {s.sub && <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 2 }}>{s.sub}</div>}
        </Card>
      ))}
    </div>
  );
}

/* ── Tab bar — the pill-group pattern from Final Wishes, unified ── */
export type TabDef<T extends string> = { id: T; label: string; icon?: React.ReactNode; count?: number };

export function TabBar<T extends string>({
  tabs, active, onChange,
}: { tabs: TabDef<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--card)", width: "fit-content", border: "1px solid var(--border)" }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              background: on ? "linear-gradient(135deg,#3A5BD9,#5B7BF5)" : "transparent",
              color: on ? "#FFFFFF" : "var(--muted-foreground)",
              fontWeight: on ? 600 : 400,
              boxShadow: on ? "0 4px 14px -4px rgba(58,91,217,0.7)" : "none",
            }}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span
                className="px-1.5 rounded"
                style={{
                  fontSize: 10, ...MONO, fontWeight: 700,
                  background: on ? "rgba(255,255,255,0.22)" : "rgba(58,91,217,0.18)",
                  color: on ? "#FFFFFF" : "#8AA0FF",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Empty state — replaces the ad-hoc "nothing here" blocks ── */
export function EmptyState({
  icon, title, description, action,
}: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center rounded-2xl glow-surface"
      style={{ padding: "48px 24px", background: "var(--card)", border: "1px dashed rgba(58,91,217,0.25)" }}
    >
      {icon && (
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 52, height: 52, background: "rgba(58,91,217,0.1)", color: "#5B7BF5", marginBottom: 14 }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 6 }}>{title}</div>
      {description && (
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.7, maxWidth: 420, marginBottom: action ? 16 : 0 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/* ── Primary / ghost buttons — one definition instead of ten ── */
export function PrimaryButton({
  children, onClick, disabled, full,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm ${full ? "w-full" : ""}`}
      style={{
        background: disabled ? "rgba(58,91,217,0.15)" : "linear-gradient(135deg,#3A5BD9,#5B7BF5)",
        color: disabled ? "rgba(255,255,255,0.4)" : "#FFFFFF",
        fontWeight: 600,
        boxShadow: disabled ? "none" : "0 4px 16px -4px rgba(58,91,217,0.6)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children, onClick, tone = "#8AA0FF", full,
}: { children: React.ReactNode; onClick?: () => void; tone?: string; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm ${full ? "w-full" : ""}`}
      style={{ background: `${tone}14`, color: tone, border: `1px solid ${tone}33`, fontWeight: 600 }}
    >
      {children}
    </button>
  );
}

/* ── Small labelled pill — categories, statuses, tags ── */
export function Pill({ children, color = "#3A5BD9" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded"
      style={{ background: `${color}1A`, color, fontSize: 11, ...MONO, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {children}
    </span>
  );
}

/* ── Section heading inside a card ── */
export function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ marginBottom: 16 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>{children}</h3>
      {right}
    </div>
  );
}
