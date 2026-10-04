import React from "react";

/* A full-page notice shown in place of a screen the visitor can't use right
   now: maintenance mode, a frozen (deceased) account, closed sign-ups. */
export function PortalNotice({ icon, kicker, title, body, actionLabel, onAction }: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="size-full flex items-center justify-center" style={{ background: "#070A12", padding: 16, fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 480, textAlign: "center", background: "#101728", borderRadius: 20, padding: "40px 28px", border: "1px solid rgba(91,110,225,0.14)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>{icon}</div>
        <div style={{ color: "#D9A55E", fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>{kicker}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#EFF2F9", marginBottom: 10 }}>{title}</h1>
        <p style={{ color: "#A3ADC9", fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-line" }}>{body}</p>
        {actionLabel && onAction && (
          <button onClick={onAction} className="mt-6 px-6 py-2.5 rounded-xl"
            style={{ background: "rgba(91,110,225,0.12)", color: "#AEB9F5", border: "1px solid rgba(91,110,225,0.25)", fontSize: 15, fontWeight: 600 }}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
