import React, { useState } from "react";
import { CheckCircle, AlertTriangle, RefreshCw, Loader2, CreditCard, Copy, Activity } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { copyToClipboard } from "../../utils/clipboard";

/* Stripe billing setup and health (Admin → Subscription Config).
   Keys are never shown or entered here: they are edge-function secrets
   pasted by the owner. This panel reports the mode from the server, makes
   Stripe's prices match the plans and products (dry run first), configures
   the customer portal, and checks the webhook endpoint. */

interface Status {
  stripeConfigured: boolean; webhookConfigured: boolean; livemode: boolean; mode: "test" | "live" | null;
  billingPaused: boolean; consentRequired: boolean; taxEnabled: boolean; returnUrlConfigured: boolean; apiVersion: string;
  functionName: string; webhookUrl: string; webhookEvents: string[]; portalConfigured: boolean;
  catalogInSync: boolean; unsyncedPlans: string[]; unsyncedProducts: string[];
}
interface SyncLine { item: string; action: string; amountCents: number; error?: string }
interface SyncResult { mode: string | null; dryRun: boolean; would_create: SyncLine[]; would_reprice: SyncLine[]; up_to_date: SyncLine[]; errors: SyncLine[] }
interface WebhookCheck { ok: boolean; message: string; endpoints: { id: string; url: string; status: string; missingEvents: string[]; pointsHere: boolean }[] }
interface Health { failedOrStuckEvents: unknown[]; unbilledClosuresOver2h: unknown[]; declinedOverage: unknown[]; disputes90d: number; payments90d: number; disputeRatePct: number }

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const box: React.CSSProperties = { background: "var(--card)", borderColor: "var(--border)" };

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ ...MONO, fontSize: 12.5, fontWeight: 700,
      background: ok ? "rgba(95,190,145,0.12)" : "rgba(246,173,85,0.12)", color: ok ? "#5FBE91" : "#F6AD55" }}>
      {ok ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>} {label}
    </span>
  );
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export function StripeBillingPanel({ onSynced }: { onSynced?: () => void }) {
  const { data: status, loading, error, refetch: refresh } = useAdminFetch(() => adminApi.get<Status>("/billing/status"), []);
  const [sync, setSync] = useState<SyncResult | null>(null);
  const [webhook, setWebhook] = useState<WebhookCheck | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async <T,>(key: string, fn: () => Promise<T>, then: (r: T) => void) => {
    setBusy(key);
    try { then(await fn()); } catch (err) { toast.error(err instanceof Error ? err.message : "Request failed"); } finally { setBusy(null); }
  };

  const dryRun = () => run("dry", () => adminApi.post<SyncResult>("/billing/catalog/sync", { dryRun: true }), setSync);
  const applySync = () => run("sync", () => adminApi.post<SyncResult>("/billing/catalog/sync", { dryRun: false }), (r) => {
    setSync(r);
    if (r.errors.length) toast.error(`${r.errors.length} item(s) failed — see below`);
    else toast.success(`Stripe catalog updated: ${r.would_create.length} created, ${r.would_reprice.length} repriced`);
    refresh(); onSynced?.();
  });

  if (loading) return <div className="p-6 rounded-2xl border flex items-center gap-2" style={box}><Loader2 size={16} className="animate-spin"/> Loading Stripe status…</div>;
  if (error || !status) return <div className="p-6 rounded-2xl border" style={{ ...box, color: "#FC8181" }}>{error ?? "Stripe status unavailable"}</div>;

  const pending = sync ? sync.would_create.length + sync.would_reprice.length : 0;

  return (
    <div className="p-6 rounded-2xl border space-y-5" style={box}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CreditCard size={18} color="var(--gold)"/>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)" }}>Stripe Billing</h2>
          {status.mode && (
            <span className="px-2.5 py-1 rounded-full" style={{ ...MONO, fontSize: 12.5, fontWeight: 700,
              background: status.livemode ? "rgba(229,62,62,0.14)" : "rgba(91,110,225,0.14)", color: status.livemode ? "#FC8181" : "#AEB9F5" }}>
              {status.livemode ? "LIVE MODE" : "TEST MODE"}
            </span>
          )}
        </div>
        <button onClick={() => refresh()} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", fontSize: 14 }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Pill ok={status.stripeConfigured} label={status.stripeConfigured ? "KEY SET" : "NO STRIPE KEY"}/>
        <Pill ok={status.webhookConfigured} label={status.webhookConfigured ? "WEBHOOK SECRET SET" : "NO WEBHOOK SECRET"}/>
        <Pill ok={status.returnUrlConfigured} label={status.returnUrlConfigured ? "APP_URL SET" : "APP_URL MISSING"}/>
        <Pill ok={status.catalogInSync} label={status.catalogInSync ? "CATALOG IN SYNC" : "CATALOG NEEDS SYNC"}/>
        <Pill ok={status.portalConfigured} label={status.portalConfigured ? "PORTAL SET UP" : "PORTAL NOT SET UP"}/>
        <Pill ok={!status.billingPaused} label={status.billingPaused ? "BILLING PAUSED" : "BILLING ON"}/>
        <Pill ok={status.consentRequired} label={status.consentRequired ? "CONSENT REQUIRED" : "CONSENT NOT ENFORCED"}/>
        <Pill ok={true} label={status.taxEnabled ? "STRIPE TAX ON" : "STRIPE TAX OFF"}/>
      </div>

      {!status.stripeConfigured && (
        <p style={{ color: "var(--muted-foreground)", fontSize: 15, lineHeight: 1.6 }}>
          Stripe keys are set as Supabase Edge Function secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) for the <strong>{status.functionName}</strong> function — never in this console. See GO_LIVE_CHECKLIST.md.
        </p>
      )}

      <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div style={{ color: "var(--muted-foreground)", fontSize: 13, ...MONO, marginBottom: 6 }}>WEBHOOK ENDPOINT URL ({status.webhookEvents.length} EVENTS · API {status.apiVersion})</div>
        <div className="flex items-center gap-2">
          <code style={{ fontSize: 13.5, color: "var(--foreground)", wordBreak: "break-all", flex: 1 }}>{status.webhookUrl}</code>
          <button onClick={() => { copyToClipboard(status.webhookUrl); toast.success("Copied"); }} style={{ color: "var(--muted-foreground)" }}><Copy size={14}/></button>
        </div>
        <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{status.webhookEvents.join(" · ")}</div>
      </div>

      {status.stripeConfigured && (
        <div className="flex flex-wrap gap-3">
          <button disabled={busy !== null} onClick={() => void dryRun()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: "#fff", fontWeight: 600, fontSize: 15 }}>
            {busy === "dry" ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} Sync catalog (dry run)
          </button>
          <button disabled={busy !== null} onClick={() => void run("portal", () => adminApi.post<{ created: boolean }>("/billing/setup/portal"), r => { toast.success(r.created ? "Customer portal created" : "Customer portal updated"); refresh(); })}
            className="px-4 py-2.5 rounded-xl disabled:opacity-50" style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: 15 }}>
            {busy === "portal" ? "Setting up…" : "Set up customer portal"}
          </button>
          <button disabled={busy !== null} onClick={() => void run("hook", () => adminApi.get<WebhookCheck>("/billing/setup/webhook"), setWebhook)}
            className="px-4 py-2.5 rounded-xl disabled:opacity-50" style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: 15 }}>
            {busy === "hook" ? "Checking…" : "Check webhook"}
          </button>
          <button disabled={busy !== null} onClick={() => void run("health", () => adminApi.get<Health>("/billing/health"), setHealth)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl disabled:opacity-50" style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: 15 }}>
            <Activity size={14}/> {busy === "health" ? "Checking…" : "Billing health"}
          </button>
        </div>
      )}

      {sync && (
        <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div style={{ color: "var(--foreground)", fontSize: 15.5, fontWeight: 600 }}>
            {sync.dryRun ? "Dry run" : "Sync"} ({sync.mode} mode): {sync.would_create.length} to create · {sync.would_reprice.length} to reprice · {sync.up_to_date.length} up to date · {sync.errors.length} errors
          </div>
          {[...sync.would_create.map(l => ({ ...l, tag: "CREATE" })), ...sync.would_reprice.map(l => ({ ...l, tag: "REPRICE" })), ...sync.errors.map(l => ({ ...l, tag: "ERROR" }))].map(l => (
            <div key={`${l.tag}${l.item}`} style={{ fontSize: 14, color: l.tag === "ERROR" ? "#FC8181" : "var(--muted-foreground)", ...MONO }}>
              {l.tag} {l.item} {usd(l.amountCents)}{l.error ? ` — ${l.error}` : ""}
            </div>
          ))}
          {sync.dryRun && pending > 0 && (
            <button disabled={busy !== null} onClick={() => { if (window.confirm(`Create ${pending} price(s) in Stripe ${sync.mode} mode? Replaced prices are archived; current subscribers keep their price.`)) void applySync(); }}
              className="mt-2 px-4 py-2 rounded-xl disabled:opacity-50" style={{ background: "#5FBE91", color: "#06110B", fontWeight: 700, fontSize: 15 }}>
              {busy === "sync" ? "Applying…" : `Apply: create ${pending} price(s)`}
            </button>
          )}
        </div>
      )}

      {webhook && (
        <div className="p-4 rounded-xl space-y-1" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Pill ok={webhook.ok} label={webhook.message.toUpperCase()}/>
          {webhook.endpoints.map(e => (
            <div key={e.id} style={{ fontSize: 13.5, color: "var(--muted-foreground)", ...MONO }}>
              {e.pointsHere ? "→ " : "  "}{e.url} [{e.status}]{e.missingEvents.length ? ` missing: ${e.missingEvents.join(", ")}` : ""}
            </div>
          ))}
        </div>
      )}

      {health && (
        <div className="p-4 rounded-xl grid sm:grid-cols-2 gap-2" style={{ background: "rgba(255,255,255,0.04)", fontSize: 14.5, color: "var(--muted-foreground)" }}>
          <div>Webhook events failed or stuck: <strong style={{ color: health.failedOrStuckEvents.length ? "#FC8181" : "#5FBE91" }}>{health.failedOrStuckEvents.length}</strong></div>
          <div>Overage unbilled after 2h: <strong style={{ color: health.unbilledClosuresOver2h.length ? "#F6AD55" : "#5FBE91" }}>{health.unbilledClosuresOver2h.length}</strong></div>
          <div>Declined overage: <strong>{health.declinedOverage.length}</strong></div>
          <div>Dispute rate (90 days): <strong style={{ color: health.disputeRatePct >= 0.75 ? "#FC8181" : "#5FBE91" }}>{health.disputeRatePct}%</strong> ({health.disputes90d}/{health.payments90d})</div>
        </div>
      )}

      <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.6 }}>
        White Label and enterprise deals are invoiced by hand: <a href="https://dashboard.stripe.com/invoices/create" target="_blank" rel="noreferrer" style={{ color: "#AEB9F5" }}>create an invoice in Stripe</a>.
      </p>
    </div>
  );
}
