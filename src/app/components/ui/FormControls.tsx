import React from "react";

/* ── FPD shared form primitives — Royal Vault Blue ──
   Palette-aligned, focus-glow inputs used across the record modules.
   Field chrome lives in .fpd-field (src/styles/globals.css). */

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function FieldLabel({ children, hint, required }: { children: React.ReactNode; hint?: string; required?: boolean }) {
  if (!children && !hint) return null;
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
      <label style={{ color: "#A3ADC9", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", ...MONO }}>
        {children}{required && <span style={{ color: "#FC8181" }}> *</span>}
      </label>
      {hint && <span style={{ color: "#5A6A88", fontSize: 10 }}>{hint}</span>}
    </div>
  );
}

type BaseProps = { label: string; hint?: string; required?: boolean; icon?: React.ReactNode };

export function TextField({
  label, value, onChange, placeholder, hint, icon, type = "text", required, disabled,
}: BaseProps & {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel hint={hint} required={required}>{label}</FieldLabel>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#5A6A88", display: "flex" }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="fpd-field"
          style={icon ? { paddingLeft: 40 } : undefined}
        />
      </div>
    </div>
  );
}

export function SelectField({
  label, value, onChange, options, hint, required, disabled,
}: BaseProps & {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel hint={hint} required={required}>{label}</FieldLabel>
      <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className="fpd-field">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function TextAreaField({
  label, value, onChange, placeholder, hint, required, rows = 3, disabled,
}: BaseProps & {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel hint={hint} required={required}>{label}</FieldLabel>
      <textarea
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="fpd-field"
      />
    </div>
  );
}

/* Read-only display of a stored value — the "view mode" counterpart to TextField. */
export function InfoField({ label, value, icon, mono }: { label: string; value?: string | null; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col rounded-xl" style={{ gap: 4, padding: "10px 14px", background: "rgba(91,110,225,0.05)", border: "1px solid rgba(91,110,225,0.10)" }}>
      <span style={{ color: "#A3ADC9", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", ...MONO }}>{label}</span>
      <span className="flex items-center gap-2" style={{ color: value ? "#FFFFFF" : "#5A6A88", fontSize: 13, ...(mono ? MONO : {}) }}>
        {icon}{value || "—"}
      </span>
    </div>
  );
}

/* Editable boolean shown as a pill; static when onToggle is omitted. */
export function ToggleChip({ label, active, onToggle }: { label: string; active: boolean; onToggle?: () => void }) {
  const Tag: any = onToggle ? "button" : "span";
  return (
    <Tag
      onClick={onToggle}
      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
      style={{
        background: active ? "rgba(72,187,120,0.12)" : "rgba(107,114,128,0.12)",
        color: active ? "#D99A6B" : "#A3ADC9",
        border: `1px solid ${active ? "rgba(72,187,120,0.3)" : "rgba(107,114,128,0.2)"}`,
        cursor: onToggle ? "pointer" : "default",
      }}
    >
      {active ? "✓" : "✗"} {label}
    </Tag>
  );
}
