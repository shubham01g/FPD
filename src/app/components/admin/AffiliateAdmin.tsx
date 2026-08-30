import React, { useMemo, useState } from "react";
import { Users, Search, Eye, Edit, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";

interface AffiliateRow {
  id: string;
  referral_code: string;
  tier: 1 | 2 | 3;
  commission_rate: number;
  total_referrals: number;
  active_referrals: number;
  total_earned: number;
  pending_payout: number;
  status: "active" | "suspended" | "inactive";
  created_at: string;
  users: { email: string; full_name: string } | null;
}

const tierColors = { 1: "#5BA7D6", 2: "#5B6EE1", 3: "#48BB78" };
const tierLabels = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };

export function AffiliateAdmin() {
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<{ affiliates: AffiliateRow[] }>("/affiliates"),
    [],
  );

  const affiliates = data?.affiliates ?? [];

  const filtered = affiliates.filter((a) => {
    const name = a.users?.full_name ?? "";
    const email = a.users?.email ?? "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.referral_code.toLowerCase().includes(q);
  });

  const summary = useMemo(() => {
    const totalAffiliates = affiliates.length;
    const activeReferrals = affiliates.reduce((sum, a) => sum + a.active_referrals, 0);
    const commissionPool = affiliates.reduce((sum, a) => sum + Number(a.pending_payout), 0);
    const avgEarn = totalAffiliates ? affiliates.reduce((sum, a) => sum + Number(a.total_earned), 0) / totalAffiliates : 0;
    return { totalAffiliates, activeReferrals, commissionPool, avgEarn };
  }, [affiliates]);

  const tierDistribution = useMemo(() => {
    const byTier: Record<1 | 2 | 3, { count: number; earn: number }> = { 1: { count: 0, earn: 0 }, 2: { count: 0, earn: 0 }, 3: { count: 0, earn: 0 } };
    for (const a of affiliates) {
      byTier[a.tier].count += 1;
      byTier[a.tier].earn += Number(a.pending_payout);
    }
    return [
      { tier: "Tier 1 (5–24)", affiliates: byTier[1].count, earn: byTier[1].earn },
      { tier: "Tier 2 (25–74)", affiliates: byTier[2].count, earn: byTier[2].earn },
      { tier: "Tier 3 (74+)", affiliates: byTier[3].count, earn: byTier[3].earn },
    ];
  }, [affiliates]);

  async function toggleStatus(aff: AffiliateRow) {
    const nextStatus = aff.status === "active" ? "suspended" : "active";
    setSavingId(aff.id);
    try {
      await adminApi.patch(`/affiliates/${aff.id}`, { status: nextStatus });
      toast.success(`Affiliate ${nextStatus === "active" ? "reactivated" : "suspended"}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update affiliate");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} color="var(--gold)" />
          <span style={{ color: "var(--gold)", fontSize: 15, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · AFFILIATE PROGRAM</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)" }}>Affiliate Management</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginTop: 4 }}>Monitor all affiliates, tier progression, and commission activity.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--muted-foreground)" }}>
          <Loader2 size={18} className="animate-spin" /> Loading affiliates…
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Affiliates", value: summary.totalAffiliates, sub: "All-time", color: "#6FAE8B" },
              { label: "Active Referrals", value: summary.activeReferrals.toLocaleString(), sub: "Within 12-month cap", color: "var(--gold)" },
              { label: "Pending Commission Pool", value: `$${summary.commissionPool.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "Unpaid + processing", color: "#D99A6B" },
              { label: "Avg Earned/Affiliate", value: `$${summary.avgEarn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "Lifetime average", color: "#6FAE8B" },
            ].map((stat) => (
              <div key={stat.label} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{stat.label}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 2 }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Tier distribution */}
          <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)", marginBottom: 16 }}>Tier Distribution & Pending Payout</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {tierDistribution.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: "var(--foreground)", fontSize: 16 }}>{t.tier}</span>
                      <div>
                        <span style={{ color: "var(--muted-foreground)", fontSize: 15, fontFamily: "var(--font-mono)" }}>{t.affiliates} affiliates · </span>
                        <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 15 }}>${t.earn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
                      <div className="h-3 rounded-full" style={{ width: `${summary.totalAffiliates ? (t.affiliates / summary.totalAffiliates) * 100 : 0}%`, background: [
                        "linear-gradient(90deg, #5BA7D6, #5BA7D6)",
                        "linear-gradient(90deg, #5B6EE1, #5B6EE1)",
                        "linear-gradient(90deg, #48BB78, #68D391)",
                      ][i] }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:12, height:150 }}>
                {tierDistribution.map((t, i) => {
                  const maxEarn = Math.max(1, ...tierDistribution.map(x => x.earn));
                  const h = Math.round((t.earn / maxEarn) * 120);
                  const colors = ["#5BA7D6","#5B6EE1","#48BB78"];
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <span style={{ color:"var(--muted-foreground)", fontSize:11, fontFamily:"var(--font-mono)" }}>${(t.earn/1000).toFixed(1)}k</span>
                      <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                        <div style={{ width:"100%", height:h, background:colors[i], borderRadius:"4px 4px 0 0", opacity:0.8 }}/>
                      </div>
                      <span style={{ color:"var(--muted-foreground)", fontSize:11, fontFamily:"var(--font-mono)", textAlign:"center" }}>{t.tier.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <Search size={14} color="var(--muted-foreground)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search affiliates by name, email, or ID..."
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 17.5, width: "100%" }}
            />
          </div>

          {/* Affiliates table */}
          <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
            <div
              className="grid px-5 py-3"
              style={{ gridTemplateColumns: "auto auto 1fr auto auto auto auto auto auto", background: "rgba(255,255,255,0.08)", borderBottom: "1px solid var(--border)", gap: 16, alignItems: "center" }}
            >
              {["", "ID", "Affiliate", "Tier", "Active Refs", "Pending Payout", "Total Earned", "Status", "Actions"].map((h) => (
                <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No affiliates match this search.</div>
            )}
            {filtered.map((aff, i) => (
              <div
                key={aff.id}
                className="grid px-5 py-3 items-center border-b"
                style={{ gridTemplateColumns: "auto auto 1fr auto auto auto auto auto auto", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)", gap: 16 }}
              >
                <UserAvatar name={aff.users?.full_name ?? "?"} />
                <span style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{aff.referral_code}</span>
                <div>
                  <div style={{ color: "var(--foreground)", fontSize: 16 }}>{aff.users?.full_name ?? "Unknown"}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{aff.users?.email ?? "—"}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full" style={{ width: 8, height: 8, background: tierColors[aff.tier] }} />
                  <span style={{ color: tierColors[aff.tier], fontSize: 15, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{tierLabels[aff.tier]} · {Math.round(aff.commission_rate * 100)}%</span>
                </div>
                <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 16 }}>{aff.active_referrals}</span>
                <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 16 }}>${Number(aff.pending_payout).toFixed(2)}</span>
                <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 16 }}>${Number(aff.total_earned).toLocaleString()}</span>
                <div
                  className="px-2 py-1 rounded"
                  style={{
                    background: aff.status === "active" ? "rgba(72,187,120,0.12)" : "rgba(252,129,129,0.12)",
                    color: aff.status === "active" ? "#D99A6B" : "#FC8181",
                    fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600, width: "fit-content",
                  }}
                >
                  {aff.status.toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  <button style={{ color: "var(--gold)" }}><Eye size={14} /></button>
                  <button style={{ color: "var(--muted-foreground)" }}><Edit size={14} /></button>
                  <button
                    disabled={savingId === aff.id}
                    onClick={() => toggleStatus(aff)}
                    style={{ color: aff.status === "active" ? "#FC8181" : "#D99A6B", opacity: savingId === aff.id ? 0.5 : 1 }}
                  >
                    {aff.status === "active" ? <XCircle size={14} /> : <CheckCircle size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
