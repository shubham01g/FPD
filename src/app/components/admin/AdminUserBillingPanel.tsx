import React, { useState } from "react";
import { Loader2, RefreshCw, ExternalLink, Gift, RotateCcw, ArrowUpDown, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { usePlans } from "../../utils/planCatalog";

/* One account's billing for admins (GET /admin/user-billing/:id): what it
   has, what it paid, and the actions that change it. Every action goes
   through Stripe and the billing tables — plans are never edited directly. */

interface Row { [k: string]: any }
interface Billing {
  account: Row; subscriptions: Row[]; consents: Row[]; usagePeriods: Row[]; closures: Row[];
  refunds: Row[]; payments: Row[]; wgCard: Row | null; commissions: Row[]; invoices: Row[];
  invoiceError: string | null; livemode: boolean; stripeCustomerId: string | null;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const CARD: React.CSSProperties = { background: "#101728", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 };
const INPUT: React.CSSProperties = { background: "#141B2E", border: "1px solid rgba(91,167,214,0.3)", color: "#fff", fontSize: 14.5, outline: "none", borderRadius: 10, padding: "7px 10px" };
const usd = (cents: number) => `$${(Number(cents) / 100).toFixed(2)}`;
const day = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const ACCESS = ["active", "trialing", "past_due"];

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO, marginBottom: 10, letterSpacing: "0.06em" }}>{children}</div>;
}

function Btn({ children, onClick, disabled, tone = "neutral" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "neutral" | "danger" | "primary" }) {
  const styles = {
    neutral: { background: "rgba(255,255,255,0.06)", color: "#C9D3E6" },
    danger: { background: "rgba(252,129,129,0.12)", color: "#FC8181" },
    primary: { background: "linear-gradient(135deg,#7E6BD8,#5B6EE1)", color: "#fff" },
  }[tone];
  return <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={styles}>{children}</button>;
}

export function AdminUserBillingPanel({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const { data, loading, error, refetch } = useAdminFetch(() => adminApi.get<Billing>(`/user-billing/${userId}`), [userId]);
  const plans = usePlans().filter(p => p.billable);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<null | "refund-end" | "comp" | "change">(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [planId, setPlanId] = useState("foundation");
  const [interval, setIntervalChoice] = useState<"month" | "year">("month");

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      setForm(null); setReason(""); setAmount("");
      refetch(); onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "#8A9AB8" }}><Loader2 size={16} className="animate-spin"/> Loading billing…</div>;
  if (error || !data) return <div style={{ color: "#FC8181", padding: 16 }}>{error ?? "Billing unavailable"}</div>;

  const live = data.subscriptions.filter(s => ACCESS.includes(s.status));
  const planSub = live.find(s => s.product_line === "plan");
  const comped = planSub?.id?.startsWith("comp_");
  const paidPlan = planSub && !comped ? planSub : null;
  const planName = (id?: string | null) => plans.find(p => p.id === id)?.name ?? id ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div style={{ color: "#C9D3E6", fontSize: 15 }}>
          {data.livemode ? "Live" : "Test"} mode · Stripe customer <span style={MONO}>{data.stripeCustomerId ?? "none yet"}</span> · status <strong>{data.account.plan_status}</strong>
          {data.account.overage_blocked && <span style={{ color: "#FC8181" }}> · overage blocked</span>}
        </div>
        <Btn onClick={() => refetch()}><RefreshCw size={12}/> Refresh</Btn>
      </div>

      {/* Actions */}
      <div style={CARD}>
        <Title>ACTIONS</Title>
        <div className="flex flex-wrap gap-2">
          {paidPlan && <Btn tone="danger" disabled={busy !== null} onClick={() => setForm(form === "refund-end" ? null : "refund-end")}><RotateCcw size={12}/> Refund &amp; end plan</Btn>}
          {paidPlan && <Btn disabled={busy !== null} onClick={() => setForm(form === "change" ? null : "change")}><ArrowUpDown size={12}/> Change plan</Btn>}
          {!paidPlan && !comped && <Btn disabled={busy !== null} onClick={() => setForm(form === "comp" ? null : "comp")}><Gift size={12}/> Comp a plan</Btn>}
          {comped && <Btn tone="danger" disabled={busy !== null} onClick={() => { if (window.confirm("End this comped plan? The account will be asked to choose a paid plan.")) void act("uncomp", () => adminApi.del(`/user-billing/${userId}/comp`), "Comped plan ended"); }}>End comped plan</Btn>}
        </div>

        {form === "refund-end" && paidPlan && (
          <div className="flex flex-wrap items-end gap-2 mt-4">
            <input placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} style={{ ...INPUT, flex: 1, minWidth: 220 }}/>
            <input placeholder="Amount $ (blank = full)" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...INPUT, width: 170 }}/>
            <Btn tone="danger" disabled={!reason.trim() || busy !== null} onClick={() => {
              if (!window.confirm(`Refund ${amount ? `$${amount}` : "the latest payment in full"} and cancel ${planName(paidPlan.plan_id)} now?`)) return;
              void act("refund-end", () => adminApi.post(`/user-billing/${userId}/refund-and-end`, {
                reason, productLine: "plan", ...(amount ? { amountCents: Math.round(Number(amount) * 100) } : {}),
              }), "Refunded and cancelled");
            }}>{busy === "refund-end" ? "Working…" : "Refund & end"}</Btn>
          </div>
        )}

        {(form === "comp" || form === "change") && (
          <div className="flex flex-wrap items-end gap-2 mt-4">
            <select value={planId} onChange={e => setPlanId(e.target.value)} style={INPUT}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {form === "change" && (
              <select value={interval} onChange={e => setIntervalChoice(e.target.value as "month" | "year")} style={INPUT}>
                <option value="month">Monthly</option><option value="year">Yearly</option>
              </select>
            )}
            {form === "comp" && <input placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} style={{ ...INPUT, flex: 1, minWidth: 220 }}/>}
            <Btn tone="primary" disabled={busy !== null || (form === "comp" && !reason.trim())} onClick={() => form === "comp"
              ? void act("comp", () => adminApi.post(`/user-billing/${userId}/comp`, { planId, reason }), `${planName(planId)} comped`)
              : void act("change", () => adminApi.post(`/user-billing/${userId}/change-plan`, { planId, interval }), "Plan change applied (upgrades now, downgrades at period end)")}>
              {busy ? "Working…" : form === "comp" ? "Comp plan" : "Change plan"}
            </Btn>
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div style={CARD}>
        <Title>SUBSCRIPTIONS</Title>
        {data.subscriptions.length === 0 && <div style={{ color: "#8A9AB8", fontSize: 14.5 }}>None. {data.account.plan === "starter" ? "On the free Starter plan." : "Plan predates card billing."}</div>}
        {data.subscriptions.map(s => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 14.5, color: "#C9D3E6" }}>
            <span style={{ ...MONO, fontSize: 12.5, color: "#8A9AB8", minWidth: 190 }}>{s.id}</span>
            <span style={{ flex: 1 }}>
              {s.product_line === "plan" ? planName(s.plan_id) : "Disaster Recovery"} {s.interval ? `· ${s.interval}ly` : ""} · <strong>{s.status}</strong>
              {s.current_period_end ? ` · ${s.cancel_at_period_end ? "ends" : "renews"} ${day(s.current_period_end)}` : ""}
              {s.pending_plan_id ? ` · switching to ${planName(s.pending_plan_id)} on ${day(s.pending_change_at)}` : ""}
              {s.comp_reason ? ` · comp: ${s.comp_reason} (${s.comp_granted_by ?? "admin"})` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Payments + invoices */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div style={CARD}>
          <Title>PAYMENTS</Title>
          {data.payments.length === 0 && <div style={{ color: "#8A9AB8", fontSize: 14.5 }}>No card payments.</div>}
          {data.payments.map(p => (
            <div key={p.id} className="flex items-center gap-2 py-1.5" style={{ fontSize: 14, color: "#C9D3E6" }}>
              <span style={{ flex: 1 }}>{day(p.paid_at ?? p.created_at)} · {p.type} · {p.status}{Number(p.refunded_amount_usd) > 0 ? ` (refunded $${Number(p.refunded_amount_usd).toFixed(2)})` : ""}</span>
              <span style={{ ...MONO }}>${Number(p.amount_usd).toFixed(2)}</span>
              {p.stripe_charge_id && p.status === "succeeded" && ["continuation_fee", "wg_setup", "wg_session", "overage"].includes(p.type) && (
                <button title="Refund this charge" disabled={busy !== null} style={{ color: "#FC8181" }} onClick={() => {
                  const why = window.prompt(`Refund $${Number(p.amount_usd).toFixed(2)} (${p.type})? Reason:`);
                  if (why?.trim()) void act(`refund-${p.id}`, () => adminApi.post(`/user-billing/${userId}/refund`, { chargeId: p.stripe_charge_id, reason: why }), "Refund issued");
                }}><Undo2 size={13}/></button>
              )}
            </div>
          ))}
        </div>
        <div style={CARD}>
          <Title>STRIPE INVOICES</Title>
          {data.invoiceError && <div style={{ color: "#FC8181", fontSize: 14 }}>{data.invoiceError}</div>}
          {data.invoices.length === 0 && !data.invoiceError && <div style={{ color: "#8A9AB8", fontSize: 14.5 }}>No invoices.</div>}
          {data.invoices.map(i => (
            <div key={i.id} className="flex items-center gap-2 py-1.5" style={{ fontSize: 14, color: "#C9D3E6" }}>
              <span style={{ flex: 1 }}>{new Date(i.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {i.billingReason ?? i.purpose ?? "invoice"} · {i.status}</span>
              <span style={MONO}>{usd(i.amountPaid || i.amountDue)}</span>
              {i.hostedInvoiceUrl && <a href={i.hostedInvoiceUrl} target="_blank" rel="noreferrer" style={{ color: "#AEB9F5" }}><ExternalLink size={13}/></a>}
            </div>
          ))}
        </div>
      </div>

      {/* Usage, refunds, consents, commissions */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div style={CARD}>
          <Title>STORAGE USAGE PERIODS</Title>
          {data.usagePeriods.map(u => (
            <div key={u.id} style={{ fontSize: 14, color: "#C9D3E6", padding: "4px 0" }}>
              {day(u.period_start)} – {day(u.period_end)} · {u.status} · peak {(u.peak_bytes / 1024 ** 3).toFixed(2)} of {(u.included_bytes / 1024 ** 3).toFixed(0)} GB · {usd(u.billable_cents)}
            </div>
          ))}
          {data.closures.filter(c => c.amount_cents > 0 || c.skipped_reason === "comped").map(c => (
            <div key={c.id} style={{ fontSize: 13.5, color: "#8A9AB8", padding: "2px 0", ...MONO }}>
              closure {day(c.period_end)} {usd(c.amount_cents)} {c.skipped_reason ?? (c.paid_at ? "paid" : c.payment_failed_at ? "FAILED" : c.billed_at ? `billed (${c.billed_via})` : "unbilled")}
            </div>
          ))}
        </div>
        <div style={CARD}>
          <Title>REFUNDS · CONSENTS · COMMISSIONS</Title>
          {data.refunds.map(r => <div key={r.id} style={{ fontSize: 14, color: "#C9D3E6", padding: "2px 0" }}>Refund {usd(r.amount_cents)} · {r.source} · {r.reason ?? ""} · {r.initiated_by ?? ""} · {day(r.created_at)}</div>)}
          {data.consents.map(c => <div key={c.id} style={{ fontSize: 14, color: "#C9D3E6", padding: "2px 0" }}>Consent {c.purpose} {c.interval ?? ""} {usd(c.amount_cents)} · v{c.consent_version} · {day(c.created_at)}{c.completed_at ? " · paid" : ""}</div>)}
          {data.commissions.map(c => <div key={c.id} style={{ fontSize: 14, color: "#C9D3E6", padding: "2px 0" }}>Commission {c.kind} {usd(c.amount_cents)} · {day(c.created_at)}</div>)}
          {!data.refunds.length && !data.consents.length && !data.commissions.length && <div style={{ color: "#8A9AB8", fontSize: 14.5 }}>Nothing yet.</div>}
          {data.wgCard && <div style={{ fontSize: 14, color: "#C9D3E6", marginTop: 8 }}>White Glove card: {String(data.wgCard.card_brand ?? "").toUpperCase()} ****{data.wgCard.card_last4}</div>}
        </div>
      </div>
    </div>
  );
}
