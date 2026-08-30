import React, { useEffect, useMemo, useState } from "react";
import { Shield, Settings, CheckCircle, Clock, DollarSign, Search, Save, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";

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
}

interface ThresholdSetting { key: string; value: string; updated_at: string; }

const PAID_BY_LABEL: Record<FeeRow["paid_by_type"], string> = { account_owner: "Account Owner", legacy_contact: "Legacy Contact" };

export function ContinuationFeeAdmin() {
  const [feeAmount, setFeeAmount] = useState("199.00");
  const [periodMonths, setPeriodMonths] = useState("24");
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState(false);
  const [search, setSearch] = useState("");
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
    () => adminApi.get<{ fees: FeeRow[] }>("/subscriptions?status=paid"),
    [],
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
      toast.success(`Configuration updated: $${feeAmount} · ${periodMonths} month activation window`);
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
      toast.success(`Continuation fee activated for ${userName}. Vault will remain active for ${periodMonths} months.`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate continuation fee");
    } finally {
      setActivatingId(null);
    }
  };

  const filtered = fees.filter(f => {
    const name = f.users?.full_name ?? "";
    const email = f.users?.email ?? "";
    return name.toLowerCase().includes(search.toLowerCase()) || email.includes(search) || f.id.includes(search);
  });

  const totalRevenue = fees.reduce((s, f) => s + Number(f.amount_usd), 0);
  const activated = fees.filter(f => f.activated_at).length;
  const pending = fees.filter(f => !f.activated_at).length;

  return (
    <div style={{ background:"transparent", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }} className="space-y-6">

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} color="#FFFFFF"/>
            <span style={{ color:"#6E90C9", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>ADMIN · LEGACY CONTINUATION FEE</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Legacy Continuation Fee Control</h1>
          <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>Set the fee amount and activation period. Manually activate accounts when a user passes away.</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
            <AlertCircle size={15} color="#FC8181" />
            <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Total Revenue", value:`$${totalRevenue.toLocaleString()}`, color:"#6E90C9" },
            { label:"Fees Collected", value:fees.length, color:"#D99A6B" },
            { label:"Currently Activated", value:activated, color:"#6FAE8B" },
            { label:"Pending Activation", value:pending, color:"#F6AD55" },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:s.color }}>{s.value}</div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Admin Configuration */}
        <div className="p-6 rounded-2xl" style={CARD}>
          <div className="flex items-center gap-2 mb-5">
            <Settings size={16} color="#FFFFFF"/>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Fee Configuration</h3>
            <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background:"rgba(246,173,85,0.1)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.25)", ...MONO, fontSize:11 }}>ADMIN ONLY — Changes affect all future payments</span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ONE-TIME FEE AMOUNT ($)</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
                <DollarSign size={15} color="#FFFFFF"/>
                <input type="number" step="0.01" value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                  style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:22.5, fontWeight:700, ...MONO, width:"100%" }}/>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:4 }}>Currently displayed as ${feeAmount} to users</div>
            </div>
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ACTIVATION WINDOW (MONTHS)</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
                <Clock size={15} color="#FFFFFF"/>
                <input type="number" step="1" min="1" max="120" value={periodMonths} onChange={e => setPeriodMonths(e.target.value)}
                  style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:22.5, fontWeight:700, ...MONO, width:"100%" }}/>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:4 }}>How long vault stays active after death activation</div>
            </div>
            <div className="flex flex-col justify-end">
              <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-50"
                style={{ background: savedConfig ? "rgba(72,187,120,0.12)" : "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: savedConfig ? "#D99A6B" : "#fff", border: savedConfig ? "1px solid rgba(72,187,120,0.3)" : "none", boxShadow: savedConfig ? "none" : "0 4px 12px rgba(91,110,225,0.3)" }}>
                {savedConfig ? <CheckCircle size={15}/> : saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
                {savedConfig ? "Configuration Saved!" : saving ? "Saving…" : "Save Configuration"}
              </button>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:6 }}>Changes update in real-time via Supabase</div>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-2xl border" style={{ background:"rgba(246,173,85,0.05)", borderColor:"rgba(246,173,85,0.25)" }}>
            <AlertTriangle size={14} color="#F6AD55" style={{ marginTop:2, flexShrink:0 }}/>
            <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>
              <strong>Activation is a manual process.</strong> When a user is reported as no longer living, a legacy contact submits confirmation of passing — accepted documents include death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record. Review the submission, verify the document, then click "Activate" to begin the continuation window. Verification and admin approval are required, with a follow-up confirmation of death once received. The Stripe payment is non-refundable once processed.
            </p>
          </div>
        </div>

        {/* Paid fees table */}
        <div className="rounded-2xl overflow-x-auto" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background:"rgba(255,255,255,0.08)", borderColor:"rgba(91,110,225,0.08)" }}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>Paid Legacy Continuation Fees</h3>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)" }}>
              <Search size={13} color="#8A9AB8"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ background:"transparent", border:"none", outline:"none", color:"#E8EDF5", fontSize:15, width:160 }}/>
            </div>
          </div>

          {/* Table header */}
          <div className="grid px-5 py-3" style={{ gridTemplateColumns:"auto auto 1fr auto auto auto auto auto", background:"rgba(255,255,255,0.06)", borderBottom:"1px solid rgba(91,110,225,0.08)", gap:16, alignItems:"center" }}>
            {["","ID","User","Paid By","Date","Amount","Status","Action"].map(h => (
              <div key={h} style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{h.toUpperCase()}</div>
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "#8A9AB8" }}>
              <Loader2 size={16} className="animate-spin" /> Loading fees…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center" style={{ color: "#8A9AB8" }}>No paid continuation fees yet.</div>
          )}

          {filtered.map((fee, i) => (
            <div key={fee.id} className="grid px-5 py-4 items-center border-b" style={{ gridTemplateColumns:"auto auto 1fr auto auto auto auto auto", background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderColor:"rgba(91,110,225,0.06)", gap:16 }}>
              <UserAvatar name={fee.users?.full_name ?? "?"}/>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{fee.id.slice(0, 8)}</span>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:500 }}>{fee.users?.full_name ?? "Unknown"}</div>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>{fee.users?.email ?? "—"} · {fee.users?.plan ?? "—"}</div>
              </div>
              <span style={{ color:"#8A9AB8", fontSize:15 }}>{PAID_BY_LABEL[fee.paid_by_type]}</span>
              <span style={{ color:"#8A9AB8", fontSize:15 }}>{fee.paid_at ? new Date(fee.paid_at).toLocaleDateString() : "—"}</span>
              <span style={{ color:"#6E90C9", fontSize:16, fontWeight:700, ...MONO }}>${Number(fee.amount_usd)}</span>
              <div>
                {fee.activated_at ? (
                  <div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(91,167,214,0.12)", color:"#6FAE8B", ...MONO, fontSize:11 }}>ACTIVATED</span>
                    <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:2 }}>Expires: {fee.expires_at ? new Date(fee.expires_at).toLocaleDateString() : "—"}</div>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(72,187,120,0.12)", color:"#D99A6B", ...MONO, fontSize:11 }}>PAID · PENDING ACTIVATION</span>
                )}
              </div>
              <div>
                {!fee.activated_at ? (
                  <button onClick={() => activateFee(fee.id, fee.users?.full_name ?? "this user")}
                    disabled={activatingId === fee.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold disabled:opacity-50"
                    style={{ background:"rgba(91,167,214,0.12)", color:"#6FAE8B", border:"1px solid rgba(91,167,214,0.25)" }}>
                    <Shield size={11}/> {activatingId === fee.id ? "Activating…" : "Activate"}
                  </button>
                ) : (
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>Active since {fee.activated_at ? new Date(fee.activated_at).toLocaleDateString() : "—"}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 rounded-2xl border" style={{ background:"rgba(91,110,225,0.03)", borderColor:"rgba(91,110,225,0.12)" }}>
          <div style={{ color:"#6E90C9", fontSize:14, ...MONO, fontWeight:700, marginBottom:6 }}>STRIPE WEBHOOK EVENTS TO HANDLE</div>
          <div className="grid md:grid-cols-2 gap-2">
            {["payment_intent.succeeded → mark fee as paid + send confirmation email","customer.subscription.deleted → check for continuation fee before suspending","invoice.payment_failed → send warning before suspension"].map(e => (
              <div key={e} style={{ color:"#8A9AB8", fontSize:15 }}>• {e}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
