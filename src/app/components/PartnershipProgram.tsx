import React, { useState } from "react";
import { Handshake, TrendingUp, DollarSign, Users, CheckCircle, Copy, Link, Star, Info, Building } from "lucide-react";

const partnerReferrals = [
  { name: "Greenfield Law Offices", type: "Estate Attorney", accounts: 18, joined: "Jan 15, 2025", revenue: 449.82, status: "active", recurring: true },
  { name: "Summit Financial Group", type: "Financial Advisor", accounts: 34, joined: "Mar 3, 2025", revenue: 1049.74, status: "active", recurring: true },
  { name: "Heritage Planning LLC", type: "Estate Planner", accounts: 7, joined: "Apr 20, 2026", revenue: 174.93, status: "active", recurring: true },
  { name: "First National Bank", type: "Banking Partner", accounts: 112, joined: "Nov 1, 2024", revenue: 3359.88, status: "active", recurring: true },
  { name: "Sunrise Senior Living", type: "Senior Care", accounts: 52, joined: "Feb 28, 2025", revenue: 1299.48, status: "active", recurring: true },
];

const recurringHistory = [
  { month: "Jan", earned: 892 }, { month: "Feb", earned: 1140 }, { month: "Mar", earned: 1389 },
  { month: "Apr", earned: 1782 }, { month: "May", earned: 2341 }, { month: "Jun", earned: 2897 },
];

const tiers = [
  { tier: 1, range: "0–50 accounts", rate: 20, color: "#6FAE8B" },
  { tier: 2, range: "51–100 accounts", rate: 25, color: "#6E90C9" },
  { tier: 3, range: "101+ accounts", rate: 30, color: "#D99A6B" },
];

export function PartnershipProgram() {
  const [copied, setCopied] = useState(false);
  const partnerCode = "FPD-PARTNER-JDOE-8821";
  const partnerLink = `https://finalpassdown.com/partner/${partnerCode}`;
  const totalAccounts = partnerReferrals.reduce((sum, p) => sum + p.accounts, 0);
  const totalMonthlyRevenue = partnerReferrals.reduce((sum, p) => sum + p.revenue / 12, 0);
  const currentTier = totalAccounts <= 50 ? tiers[0] : totalAccounts <= 100 ? tiers[1] : tiers[2];
  const totalEarned = 6334.85;

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)", marginBottom: 4 }}>Strategic Partnership Program</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 17.5 }}>
          For estate attorneys, financial advisors, and organizations. Earn <strong style={{ color: "var(--gold)" }}>recurring lifetime commissions</strong> — no cap, no expiry.
        </p>
      </div>

      {/* Partnership badge */}
      <div className="p-6 rounded-2xl border" style={{ background: "linear-gradient(135deg, rgba(91,110,225,0.06), rgba(91,167,214,0.04))", borderColor: "var(--gold)" }}>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl p-3" style={{ background: "rgba(91,110,225,0.15)" }}>
            <Star size={28} color="var(--gold)" />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 25, color: "var(--foreground)" }}>Verified Strategic Partner</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 16, marginTop: 4 }}>
              {totalAccounts} total referred accounts · {currentTier.rate}% recurring commission rate
            </div>
          </div>
          <div className="ml-auto text-right">
            <div style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: 35.5, fontWeight: 700 }}>{currentTier.rate}%</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Current Rate</div>
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div
            key={t.tier}
            className="p-5 rounded-2xl border"
            style={{
              background: currentTier.tier === t.tier ? `${t.color}10` : "var(--card)",
              borderColor: currentTier.tier === t.tier ? t.color : "var(--border)",
              borderWidth: currentTier.tier === t.tier ? 2 : 1,
            }}
          >
            {currentTier.tier === t.tier && (
              <div className="text-xs mb-2" style={{ color: t.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>CURRENT TIER</div>
            )}
            <div style={{ color: t.color, fontFamily: "var(--font-display)", fontSize: 35.5, fontWeight: 700, marginBottom: 4 }}>{t.rate}%</div>
            <div style={{ color: "var(--foreground)", fontSize: 17.5, fontWeight: 500 }}>Tier {t.tier}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 16, marginTop: 2 }}>{t.range}</div>
            <div className="flex items-center gap-1 mt-3" style={{ color: "#D99A6B", fontSize: 15 }}>
              <CheckCircle size={12} /> Recurring · Lifetime · No cap
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Partner Organizations", value: partnerReferrals.length, sub: "Active partnerships", color: "#6FAE8B" },
          { label: "Total Accounts", value: totalAccounts, sub: "Across all partners", color: "var(--gold)" },
          { label: "Monthly Recurring", value: `$${totalMonthlyRevenue.toFixed(2)}`, sub: "This month's projection", color: "#D99A6B" },
          { label: "Lifetime Earned", value: `$${totalEarned.toLocaleString()}`, sub: "All time", color: "#6FAE8B" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ color: "var(--foreground)", fontSize: 16, fontWeight: 500 }}>{stat.label}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Partner link */}
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)", marginBottom: 16 }}>Your Partner Referral Link</h3>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-2xl border" style={{ background: "#EAF0FC", borderColor: "var(--border)" }}>
            <Link size={14} color="var(--gold)" />
            <span style={{ color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)" }}>{partnerLink}</span>
          </div>
          <button
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl"
            style={{ background: copied ? "rgba(72, 187, 120, 0.15)" : "var(--gold)", color: copied ? "#D99A6B" : "#070D1A", fontWeight: 600, fontSize: 17.5 }}
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* Recurring chart */}
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)" }}>Monthly Recurring Revenue</h3>
          <div className="flex items-center gap-1" style={{ color: "#D99A6B", fontSize: 16 }}>
            <TrendingUp size={14} /> +24% from last month
          </div>
        </div>
        {(() => {
          const maxEarned = Math.max(...recurringHistory.map(d => d.earned));
          return (
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:180 }}>
              {recurringHistory.map((d, i) => {
                const h = Math.round((d.earned / maxEarned) * 140);
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ color:"var(--muted-foreground)", fontSize:11, fontFamily:"var(--font-mono)" }}>${d.earned.toFixed(0)}</span>
                    <div style={{ width:"100%", height:140, display:"flex", alignItems:"flex-end" }}>
                      <div style={{ width:"100%", height:h, background:"linear-gradient(180deg,#5B6EE1,#5B6EE1)", borderRadius:"4px 4px 0 0", opacity: i === recurringHistory.length-1 ? 1 : 0.55 }}/>
                    </div>
                    <span style={{ color:"var(--muted-foreground)", fontSize:11, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Partner organizations table */}
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--foreground)" }}>Partner Organizations</h3>
        </div>
        <div
          className="grid px-5 py-3"
          style={{ gridTemplateColumns: "1fr auto auto auto auto", background: "#EAF0FC", borderBottom: "1px solid var(--border)", gap: 16 }}
        >
          {["Organization", "Type", "Accounts", "Monthly Revenue", "Status"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {partnerReferrals.map((partner, i) => (
          <div
            key={i}
            className="grid px-5 py-4 items-center border-b"
            style={{ gridTemplateColumns: "1fr auto auto auto auto", background: i % 2 === 0 ? "#FFFFFF" : "#F5F8FE", borderColor: "var(--border)", gap: 16 }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2" style={{ background: "rgba(91,110,225,0.1)" }}>
                <Building size={14} color="var(--gold)" />
              </div>
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{partner.name}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Since {partner.joined}</div>
              </div>
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 16 }}>{partner.type}</div>
            <div style={{ color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)" }}>{partner.accounts}</div>
            <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 16 }}>
              ${(partner.revenue / 12).toFixed(2)}/mo
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={13} color="#FFFFFF" />
              <span style={{ color: "#D99A6B", fontSize: 15, fontFamily: "var(--font-mono)" }}>ACTIVE</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 px-5 py-4 rounded-2xl border" style={{ background: "rgba(91,110,225,0.05)", borderColor: "rgba(91,110,225,0.2)" }}>
        <Info size={15} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ color: "var(--muted-foreground)", fontSize: 16, lineHeight: 1.7 }}>
          <strong style={{ color: "var(--foreground)" }}>Lifetime Recurring Commissions:</strong> Partnership commissions are paid every billing cycle for the lifetime of each referred account — no 12-month cap. As you grow your total account count, your tier upgrades automatically and applies to all existing accounts.
        </div>
      </div>
    </div>
  );
}
