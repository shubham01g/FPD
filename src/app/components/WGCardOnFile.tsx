/**
 * WGCardOnFile — the card a White Glove client saved when they paid the $99
 * setup fee through Stripe Checkout (with consent to per-session charges).
 *
 * Read-only: card numbers are never typed into Final Pass Down. A client
 * changes their card by paying setup again or through Manage billing. Reads
 * GET /admin/white-glove/clients/:id/billing, so it works in the admin
 * console only; elsewhere it says billing is handled by an admin.
 */
import React, { useEffect, useState } from "react";
import { CreditCard, AlertCircle } from "lucide-react";
import { adminApi } from "../services/adminApi";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

interface CardInfo { card_brand: string | null; card_last4: string | null; card_expiry: string | null }

export function useWGBilling(clientId: string, refreshKey = 0) {
  const [card, setCard] = useState<CardInfo | null>(null);
  const [sessions, setSessions] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    adminApi.get<{ card: CardInfo | null; sessions: Record<string, any>[] }>(`/white-glove/clients/${clientId}/billing`)
      .then(r => { if (alive) { setCard(r.card); setSessions(r.sessions); setError(null); } })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Unavailable"); })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [clientId, refreshKey]);
  return { card, sessions, error, loaded };
}

export function WGCardOnFile({ clientId, compact = false }: { clientId: string; clientName?: string; onSaved?: () => void; compact?: boolean }) {
  const { card, error, loaded } = useWGBilling(clientId);
  const label = card?.card_last4 ? `${(card.card_brand ?? "card").toUpperCase()} ****${card.card_last4}` : null;

  if (compact) {
    if (!loaded || error) return null;
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
        style={label ? { background: "rgba(72,187,120,0.1)", color: "#6FAE8B", ...MONO } : { background: "rgba(252,129,129,0.1)", color: "#FC8181", ...MONO }}>
        {label ? `${label} ON FILE` : "NO CARD"}
      </span>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "rgba(91,110,225,0.04)", border: "1px solid rgba(91,110,225,0.12)" }}>
      {label ? <CreditCard size={16} color="#6FAE8B" style={{ marginTop: 2 }}/> : <AlertCircle size={16} color="#FC8181" style={{ marginTop: 2 }}/>}
      <div style={{ fontSize: 15, color: "#C9D3E6", lineHeight: 1.55 }}>
        {!loaded ? "Loading…"
          : error ? "Card details are handled by an admin."
          : label ? <><strong style={{ color: "#E8EDF5" }}>{label}</strong>{card?.card_expiry ? ` · expires ${card.card_expiry}` : ""}. Sessions are charged to this card.</>
          : "No card on file yet. The client saves one by paying the $99 setup on their White Glove page."}
      </div>
    </div>
  );
}
