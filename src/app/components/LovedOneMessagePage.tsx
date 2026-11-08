/**
 * /message/:token — where a delivered Message to Loved Ones is opened
 * (migration 050). The recipient has no account; the private link from the
 * delivery email is the only key. Reads GET /public/message/:token.
 */
import React, { useEffect, useState } from "react";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { publicApi, PublicApiError } from "../services/publicApi";

interface Delivered {
  from: string; to: string; title: string; medium: "letter" | "voice" | "video" | string;
  body: string; mediaUrl: string | null; deliveredAt: string | null;
}

export function LovedOneMessagePage({ token }: { token: string }) {
  const [msg, setMsg] = useState<Delivered | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    publicApi.get<Delivered>(`/message/${encodeURIComponent(token)}`)
      .then(setMsg)
      .catch((err) => setProblem(
        err instanceof PublicApiError && err.status === 410
          ? "This message link has expired. Contact Final Pass Down support if you need it again."
          : "This message link isn't valid. Check that you opened the full link from the email.",
      ));
  }, [token]);

  return (
    <div style={{ minHeight: "100%", background: "#070A12", color: "#E8EDF5", fontFamily: "var(--font-body)", padding: "32px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <img src={fpdFullLogo} alt="Final Pass Down" style={{ height: 48, width: 73, objectFit: "contain", marginBottom: 24 }}/>
        {problem && <p style={{ color: "#A3ADC9", fontSize: 17 }}>{problem}</p>}
        {!problem && !msg && <p style={{ color: "#A3ADC9" }}>Opening your message…</p>}
        {msg && (
          <article style={{ background: "#101728", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 26px" }}>
            <div style={{ color: "#A3ADC9", fontSize: 14, marginBottom: 6 }}>
              {msg.to ? `For ${msg.to} · ` : ""}from {msg.from || "someone who cares about you"}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, margin: "0 0 18px", lineHeight: 1.2 }}>{msg.title || "A message for you"}</h1>
            {msg.mediaUrl && (msg.medium === "video"
              ? <video src={msg.mediaUrl} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000", marginBottom: 18 }}/>
              : <audio src={msg.mediaUrl} controls style={{ width: "100%", marginBottom: 18 }}/>)}
            {msg.body && <div style={{ whiteSpace: "pre-wrap", fontSize: 18, lineHeight: 1.75, color: "#DDE3F0" }}>{msg.body}</div>}
            {msg.deliveredAt && (
              <div style={{ color: "#6B7FA8", fontSize: 13, marginTop: 22 }}>
                Delivered by Final Pass Down on {new Date(msg.deliveredAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
