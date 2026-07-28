import React, { useState } from "react";
import { Users, TrendingUp, DollarSign, Search, Filter, Eye, Edit, CheckCircle, XCircle, ArrowUp } from "lucide-react";

const affiliates = [
  { id: "AFF-0081", name: "Sarah Chen", email: "s.chen@email.com", joined: "Nov 15, 2024", activeReferrals: 32, totalReferrals: 38, tier: 2, rate: 25, monthlyEarn: 847.20, totalEarned: 6821.40, status: "active" },
  { id: "AFF-0062", name: "Marcus Johnson", email: "m.johnson@email.com", joined: "Jan 20, 2025", activeReferrals: 14, totalReferrals: 19, tier: 1, rate: 20, monthlyEarn: 312.80, totalEarned: 2134.90, status: "active" },
  { id: "AFF-0041", name: "James Doe", email: "james.doe@email.com", joined: "Apr 8, 2026", activeReferrals: 6, totalReferrals: 8, tier: 1, rate: 20, monthlyEarn: 189.50, totalEarned: 565.50, status: "active" },
  { id: "AFF-0023", name: "Patricia Wells", email: "p.wells@email.com", joined: "Sep 3, 2024", activeReferrals: 81, totalReferrals: 94, tier: 3, rate: 30, monthlyEarn: 2841.30, totalEarned: 22891.60, status: "active" },
  { id: "AFF-0018", name: "Derek Mills", email: "d.mills@email.com", joined: "Jul 12, 2024", activeReferrals: 0, totalReferrals: 12, tier: 1, rate: 0, monthlyEarn: 0, totalEarned: 891.20, status: "suspended" },
];

const tierDistribution = [
  { tier: "Tier 1 (5–24)", affiliates: 124, earn: 14820 },
  { tier: "Tier 2 (25–74)", affiliates: 48, earn: 38410 },
  { tier: "Tier 3 (74+)", affiliates: 9, earn: 22891 },
];

const tierColors = { 1: "#5BA7D6", 2: "#5B6EE1", 3: "#48BB78" };
const tierLabels = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };

export function AffiliateAdmin() {
  const [search, setSearch] = useState("");

  const filtered = affiliates.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.includes(search) || a.id.includes(search)
  );

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1200 }}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} color="var(--gold)" />
          <span style={{ color: "var(--gold)", fontSize: 13.5, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · AFFILIATE PROGRAM</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 29, color: "var(--foreground)" }}>Affiliate Management</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 15.5, marginTop: 4 }}>Monitor all affiliates, tier progression, and commission activity.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Affiliates", value: 181, sub: "12 joined this month", color: "#6FAE8B" },
          { label: "Active Referrals", value: "4,841", sub: "Within 12-month cap", color: "var(--gold)" },
          { label: "Jun Commission Pool", value: "$76,122", sub: "Unpaid + processing", color: "#D99A6B" },
          { label: "Avg Earn/Affiliate", value: "$421", sub: "Monthly average", color: "#6FAE8B" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 27, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ color: "var(--foreground)", fontSize: 14.5 }}>{stat.label}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 12.5, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Tier distribution */}
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--foreground)", marginBottom: 16 }}>Tier Distribution & Earnings</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {tierDistribution.map((t, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: "var(--foreground)", fontSize: 14.5 }}>{t.tier}</span>
                  <div>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 13.5, fontFamily: "var(--font-mono)" }}>{t.affiliates} affiliates · </span>
                    <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 13.5 }}>${t.earn.toLocaleString()}/mo</span>
                  </div>
                </div>
                <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
                  <div className="h-3 rounded-full" style={{ width: `${(t.affiliates / 181) * 100}%`, background: [
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
              const maxEarn = Math.max(...tierDistribution.map(x => x.earn));
              const h = Math.round((t.earn / maxEarn) * 120);
              const colors = ["#5BA7D6","#5B6EE1","#48BB78"];
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ color:"var(--muted-foreground)", fontSize:10, fontFamily:"var(--font-mono)" }}>${(t.earn/1000).toFixed(1)}k</span>
                  <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                    <div style={{ width:"100%", height:h, background:colors[i], borderRadius:"4px 4px 0 0", opacity:0.8 }}/>
                  </div>
                  <span style={{ color:"var(--muted-foreground)", fontSize:10, fontFamily:"var(--font-mono)", textAlign:"center" }}>{t.tier.split(" ")[0]}</span>
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
          style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 15.5, width: "100%" }}
        />
      </div>

      {/* Affiliates table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="grid px-5 py-3"
          style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", background: "rgba(255,255,255,0.08)", borderBottom: "1px solid var(--border)", gap: 16, alignItems: "center" }}
        >
          {["ID", "Affiliate", "Tier", "Active Refs", "Monthly Earn", "Total Earned", "Status", "Actions"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 12.5, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {filtered.map((aff, i) => (
          <div
            key={aff.id}
            className="grid px-5 py-3 items-center border-b"
            style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)", gap: 16 }}
          >
            <span style={{ color: "var(--muted-foreground)", fontSize: 12.5, fontFamily: "var(--font-mono)" }}>{aff.id}</span>
            <div>
              <div style={{ color: "var(--foreground)", fontSize: 14.5 }}>{aff.name}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 12.5 }}>{aff.email}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="rounded-full" style={{ width: 8, height: 8, background: (tierColors as any)[aff.tier] }} />
              <span style={{ color: (tierColors as any)[aff.tier], fontSize: 13.5, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{(tierLabels as any)[aff.tier]} · {aff.rate}%</span>
            </div>
            <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 14.5 }}>{aff.activeReferrals}</span>
            <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 14.5 }}>${aff.monthlyEarn.toFixed(2)}</span>
            <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 14.5 }}>${aff.totalEarned.toLocaleString()}</span>
            <div
              className="px-2 py-1 rounded"
              style={{
                background: aff.status === "active" ? "rgba(72,187,120,0.12)" : "rgba(252,129,129,0.12)",
                color: aff.status === "active" ? "#D99A6B" : "#FC8181",
                fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 600, width: "fit-content",
              }}
            >
              {aff.status.toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <button style={{ color: "var(--gold)" }}><Eye size={14} /></button>
              <button style={{ color: "var(--muted-foreground)" }}><Edit size={14} /></button>
              {aff.status === "active"
                ? <button style={{ color: "#FC8181" }}><XCircle size={14} /></button>
                : <button style={{ color: "#D99A6B" }}><CheckCircle size={14} /></button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
