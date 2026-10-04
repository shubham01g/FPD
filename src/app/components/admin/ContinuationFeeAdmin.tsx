import React, { useEffect, useState } from "react";
import { Shield, Settings, CheckCircle, Clock, DollarSign, Search, Save, AlertTriangle, Loader2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

interface FeeRow {
  id: string;
  amount_usd: number;
  paid_by_type: "account_owner" | "legacy_contact";
  status: "pending" | "paid" | "failed" | "refunded";
  activation_period_months: number;
  activated_at: string | null;
  expires_at: string | null;
  paid_at: string | null;
  users: { full_name: string; email: string; plan: string } | null;
  /* True once a legacy claim on this account has been approved (Legacy Claims tab). */
  claim_approved: boolean;
  /* The approved claim was submitted without the death certificate. */
  death_cert_override: boolean;
}

interface ThresholdSetting { key: string; value: string; updated_at: string; }

const PAID_BY_LABEL: Record<FeeRow["paid_by_type"], string> = { account_owner: "Account Owner", legacy_contact: "Legacy Contact" };
const PLAN_LABEL: Record<string, string> = {
  starter: "Starter", foundation: "Foundation", family_archive: "Legacy Archive",
  legacy_pro: "Legacy Pro", legacy_vault: "Legacy Vault",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const FEE_GRID = "110px 1fr 130px 120px 90px 220px 140px";

/* Two views of one screen so the sidebar page and the Master Admin tab don't
   duplicate each other: "config" is the fee amount + activation window only,
   "payments" is the paid-fee log with manual activation. */
export function ContinuationFeeAdmin({ view }: { view: "config" | "payments" }) {
  const [feeAmount, setFeeAmount] = useState("199.00");
  const [periodMonths, setPeriodMonths] = useState("24");
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"pending"|"activated"|"awaiting">("all");
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const { data: pricingData } = useAdminFetch(
    () => adminApi.get<{ thresholds: ThresholdSetting[] }>("/pricing"),
    [],
  );

  useEffect(() => {
    if (!pricingData) return;
    const amount = pricingData.thresholds.find(t => t.key === "continuation_fee_amount");
    const period = pricingData.thresholds.find(t => t.key === "continuation_fee_period_months");
    if (amount) setFeeAmount(Number(amount.value).toFixed(2));
    if (period) setPeriodMonths(period.value);
  }, [pricingData]);

  const { data, loading, error, refetch } = useAdminFetch(
    () => view === "payments"
      ? adminApi.get<{ fees: FeeRow[] }>("/subscriptions?status=paid")
      : Promise.resolve({ fees: [] as FeeRow[] }),
    [view],
    view === "payments" ? ADMIN_LIVE_POLL_MS : undefined,
  );

  const fees = data?.fees ?? [];

  const saveConfig = async () => {
    setSaving(true);
    try {
      await Promise.all([
        adminApi.patch("/pricing/settings/continuation_fee_amount", { value: feeAmount }),
        adminApi.patch("/pricing/settings/continuation_fee_period_months", { value: periodMonths }),
      ]);
      setSavedConfig(true);
      toast.success(`Saved — fee is $${feeAmount} · ${periodMonths}-month activation window`);
      setTimeout(() => setSavedConfig(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const activateFee = async (id: string, userName: string) => {
    setActivatingId(id);
    try {
      await adminApi.post(`/subscriptions/${id}/activate`);
      toast.success(`Vault activated for ${userName} — ${periodMonths}-month window started`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate continuation fee");
    } finally {
      setActivatingId(null);
    }
  };

  /* ── Sidebar "$199 Legacy Fee" page: fee amount + activation window only ── */
  if (view === "config") {
    return (
      <div style={{ background:"transparent", minHeight:"100%", padding:24 }}>
        <div style={{ maxWidth:700, margin:"0 auto" }} className="space-y-6">

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} color="#FFFFFF"/>
              <span style={{ color:"#6E90C9", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>ADMIN · LEGACY CONTINUATION FEE</span>
            </div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Fee Configuration</h1>
            <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
              Set the one-time fee amount and vault activation window. Paid accounts and manual activation are managed in the Master Admin <strong style={{ color:"#E8EDF5" }}>Continuation Vault</strong> tab.
            </p>
          </div>

          {/* Config card */}
          <div className="p-6 rounded-2xl" style={CARD}>
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <Settings size={16} color="#FFFFFF"/>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Fee &amp; Activation Settings</h3>
              <span className="ml-2 px-2 py-0.5 rounded" style={{ background:"rgba(246,173,85,0.1)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.25)", ...MONO, fontSize:11, fontWeight:700 }}>
                AFFECTS ALL FUTURE PAYMENTS
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ONE-TIME FEE AMOUNT ($)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background:"#141B2E", border:"2px solid rgba(91,110,225,0.3)" }}>
                  <DollarSign size={15} color="#FFFFFF"/>
                  <input type="number" step="0.01" value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                    style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:22.5, fontWeight:800, ...MONO, width:"100%" }}/>
                </div>
                <div style={{ color:"#8A9AB8", fontSize:14, marginTop:5 }}>
                  Displayed as <strong style={{ color:"#AEB9F5" }}>${feeAmount}</strong> on the user payment page
                </div>
              </div>

              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ACTIVATION WINDOW (MONTHS)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background:"#141B2E", border:"2px solid rgba(91,110,225,0.3)" }}>
                  <Clock size={15} color="#FFFFFF"/>
                  <input type="number" step="1" min="1" max="120" value={periodMonths} onChange={e => setPeriodMonths(e.target.value)}
                    style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:22.5, fontWeight:800, ...MONO, width:"100%" }}/>
                </div>
                <div style={{ color:"#8A9AB8", fontSize:14, marginTop:5 }}>
                  Vault stays active for <strong style={{ color:"#AEB9F5" }}>{periodMonths} months</strong> after death is confirmed
                </div>
              </div>
            </div>

            <button onClick={saveConfig} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
              style={{
                background: savedConfig ? "rgba(72,187,120,0.12)" : "linear-gradient(135deg,#5B6EE1,#7E6BD8)",
                color: savedConfig ? "#6FAE8B" : "#fff",
                border: savedConfig ? "1px solid rgba(72,187,120,0.3)" : "none",
                boxShadow: savedConfig ? "none" : "0 4px 14px rgba(91,110,225,0.3)",
                transition: "all 0.2s",
              }}>
              {savedConfig ? <CheckCircle size={15}/> : saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
              {savedConfig ? "Saved!" : saving ? "Saving…" : "Save Configuration"}
            </button>
          </div>

          {/* Info note */}
          <div className="px-5 py-4 rounded-2xl border flex items-start gap-3"
            style={{ background:"rgba(246,173,85,0.05)", borderColor:"rgba(246,173,85,0.25)" }}>
            <AlertTriangle size={15} color="#F6AD55" style={{ marginTop:2, flexShrink:0 }}/>
            <p style={{ color:"#8A9AB8", fontSize:16, lineHeight:1.7 }}>
              <strong style={{ color:"#E8EDF5" }}>Activation is manual.</strong> When an account holder passes, a legacy contact submits a death certificate
              (or approved override). Once the claim is reviewed and approved in the Legacy Claims queue, go to <strong style={{ color:"#E8EDF5" }}>Master Admin → Continuation Vault</strong> to search for the account and click Activate.
            </p>
          </div>

        </div>
      </div>
    );
  }

  /* ── Master Admin "Continuation Vault" tab: paid fees + manual activation ── */
  const filtered = fees.filter(f => {
    const q = search.toLowerCase();
    const name = f.users?.full_name ?? "";
    const email = f.users?.email ?? "";
    const matchQ = !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || f.id.includes(q);
    const matchF =
      filter === "all"       ? true :
      filter === "activated" ? Boolean(f.activated_at) :
      filter === "pending"   ? (!f.activated_at && f.claim_approved) :
      /* awaiting */           (!f.activated_at && !f.claim_approved);
    return matchQ && matchF;
  });

  const totalRevenue = fees.reduce((s, f) => s + Number(f.amount_usd), 0);
  const activated = fees.filter(f => f.activated_at).length;
  const readyToActivate = fees.filter(f => !f.activated_at && f.claim_approved).length;
  const awaitingClaim = fees.filter(f => !f.activated_at && !f.claim_approved).length;

  const FILTER_OPTS: { val: typeof filter; label: string }[] = [
    { val:"all",       label:"All Payments" },
    { val:"pending",   label:"Ready to Activate" },
    { val:"awaiting",  label:"Awaiting Claim" },
    { val:"activated", label:"Activated" },
  ];

  return (
    <div className="space-y-5">

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181"/>
          <span style={{ color:"#FC8181", fontSize:16 }}>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Total Revenue",     value:`$${totalRevenue.toLocaleString()}`, color:"#6E90C9" },
          { label:"Activated Vaults",  value:activated,                           color:"#9F7AEA" },
          { label:"Ready to Activate", value:readyToActivate,                     color:"#6FAE8B" },
          { label:"Awaiting Claim",    value:awaitingClaim,                       color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border" style={{ background:"rgba(91,110,225,0.05)", borderColor:"rgba(91,110,225,0.18)" }}>
        <Shield size={15} color="#AEB9F5" style={{ marginTop:2, flexShrink:0 }}/>
        <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>
          <strong style={{ color:"#E8EDF5" }}>Activation process:</strong> A legacy contact pays the $199 fee →
          submits a death claim (death cert or override) → admin approves the claim in the Legacy Claims tab →
          come back here and click <strong style={{ color:"#E8EDF5" }}>Activate</strong> to start the vault access window.
          Fee configuration (amount &amp; window length) is managed in the sidebar <strong style={{ color:"#E8EDF5" }}>$199 Legacy Fee</strong> page.
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap items-center p-4 rounded-2xl" style={CARD}>
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", minWidth:220 }}>
          <Search size={13} color="#8A9AB8"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or fee ID..."
            style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:15, flex:1 }}/>
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#8A9AB8", padding:2 }}><X size={12}/></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTS.map(o => (
            <button key={o.val} onClick={() => setFilter(o.val)}
              style={{ padding:"7px 14px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer",
                background: filter === o.val ? "rgba(91,110,225,0.18)" : "transparent",
                color: filter === o.val ? "#AEB9F5" : "#8A9AB8",
                border: `1px solid ${filter === o.val ? "rgba(91,110,225,0.35)" : "rgba(91,110,225,0.12)"}` }}>
              {o.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize:12.5, color:"#8A9AB8", ...MONO, flexShrink:0 }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-x-auto" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
        <div style={{ minWidth:980 }}>
          {/* Header row */}
          <div className="grid px-5 py-3" style={{ gridTemplateColumns:FEE_GRID, background:"rgba(255,255,255,0.06)", borderBottom:"1px solid rgba(91,110,225,0.08)", gap:12, alignItems:"center" }}>
            {["FEE ID","ACCOUNT","PAID BY","DATE","AMOUNT","STATUS","ACTION"].map(h => (
              <div key={h} style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-14 justify-center" style={{ color:"#8A9AB8" }}>
              <Loader2 size={16} className="animate-spin"/> Loading fees…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <Search size={24} color="#8A9AB8" style={{ marginBottom:10 }}/>
              <div style={{ color:"#8A9AB8", fontSize:16 }}>{fees.length === 0 ? "No paid continuation fees yet" : "No records match"}</div>
              {fees.length > 0 && (
                <button onClick={() => { setSearch(""); setFilter("all"); }} style={{ marginTop:10, fontSize:14, color:"#AEB9F5", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Clear filters</button>
              )}
            </div>
          ) : filtered.map((fee, i) => {
            const isActivated = Boolean(fee.activated_at);
            const statusLabel = isActivated ? "ACTIVATED" : fee.claim_approved ? "CLAIM APPROVED — READY" : "AWAITING CLAIM";
            const statusColor = isActivated ? "#9F7AEA" : fee.claim_approved ? "#6FAE8B" : "#F6AD55";
            const statusBg    = isActivated ? "rgba(159,122,234,0.12)" : fee.claim_approved ? "rgba(72,187,120,0.12)" : "rgba(246,173,85,0.12)";
            const userName = fee.users?.full_name ?? "Unknown";

            return (
              <div key={fee.id} className="grid px-5 py-4 items-center border-b"
                style={{ gridTemplateColumns:FEE_GRID, background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderColor:"rgba(91,110,225,0.06)", gap:12 }}>
                <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{fee.id.slice(0, 8)}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>{userName}</div>
                  <div style={{ color:"#8A9AB8", fontSize:14, marginTop:1 }}>{fee.users?.email ?? "—"} · {fee.users ? (PLAN_LABEL[fee.users.plan] ?? fee.users.plan) : "—"}</div>
                  {fee.death_cert_override && (
                    <span style={{ fontSize:11, ...MONO, fontWeight:700, color:"#D9A55E", background:"rgba(217,165,94,0.12)", padding:"1px 6px", borderRadius:4, marginTop:3, display:"inline-block" }}>
                      ⚠ CERT OVERRIDE — PENDING RECEIPT
                    </span>
                  )}
                </div>
                <span style={{ color:"#B8C8E0", fontSize:15 }}>{PAID_BY_LABEL[fee.paid_by_type]}</span>
                <span style={{ color:"#8A9AB8", fontSize:14, ...MONO }}>{fmtDate(fee.paid_at)}</span>
                <span style={{ color:"#6E90C9", fontSize:17, fontWeight:800, ...MONO }}>${Number(fee.amount_usd)}</span>
                <div>
                  <span style={{ fontSize:11, ...MONO, fontWeight:700, padding:"3px 9px", borderRadius:99, background:statusBg, color:statusColor, whiteSpace:"nowrap" }}>
                    {statusLabel}
                  </span>
                  {isActivated && (
                    <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:5 }}>Expires {fmtDate(fee.expires_at)}</div>
                  )}
                </div>
                <div>
                  {!isActivated && fee.claim_approved ? (
                    <button onClick={() => activateFee(fee.id, userName)} disabled={activatingId === fee.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{ background:"rgba(159,122,234,0.12)", color:"#C4A9F5", border:"1px solid rgba(159,122,234,0.3)", whiteSpace:"nowrap" }}>
                      <Shield size={12}/> {activatingId === fee.id ? "Activating…" : "Activate Vault"}
                    </button>
                  ) : isActivated ? (
                    <span style={{ color:"#6FAE8B", fontSize:15, fontWeight:600 }}>✓ Active</span>
                  ) : (
                    <span style={{ color:"#8A9AB8", fontSize:14 }}>Claim pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stripe webhook note */}
      <div className="px-5 py-4 rounded-2xl border" style={{ background:"rgba(91,110,225,0.03)", borderColor:"rgba(91,110,225,0.12)" }}>
        <div style={{ color:"#6E90C9", fontSize:14, ...MONO, fontWeight:700, marginBottom:6 }}>STRIPE WEBHOOK EVENTS</div>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            "payment_intent.succeeded → mark fee as paid + send confirmation email",
            "customer.subscription.deleted → check for continuation fee before suspending",
            "invoice.payment_failed → send warning before suspension",
            "charge.refunded → flag fee as refunded and notify admin",
          ].map(e => (
            <div key={e} style={{ color:"#8A9AB8", fontSize:15 }}>• {e}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
