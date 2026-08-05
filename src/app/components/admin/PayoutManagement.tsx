import React, { useState } from "react";
import { DollarSign, CheckCircle, Clock, Filter, Download, Search, TrendingUp, Users, Handshake, Layers } from "lucide-react";

type PayoutType = "all" | "affiliate" | "partnership" | "white-label";
type PayoutStatus = "all" | "pending" | "processing" | "paid";

const payouts = [
  { id: "PAY-2026-0912", recipient: "James Doe", type: "affiliate", amount: 189.50, period: "Jun 2026", accounts: 6, rate: 20, status: "pending", method: "ACH", email: "james.doe@email.com" },
  { id: "PAY-2026-0911", recipient: "Sarah Chen", type: "affiliate", amount: 847.20, period: "Jun 2026", accounts: 32, rate: 25, status: "pending", method: "ACH", email: "s.chen@email.com" },
  { id: "PAY-2026-0910", recipient: "Greenfield Law Offices", type: "partnership", amount: 3359.88, period: "Jun 2026", accounts: 112, rate: 30, status: "pending", method: "Wire", email: "billing@greenfieldlaw.com" },
  { id: "PAY-2026-0908", recipient: "Summit Financial Group", type: "partnership", amount: 1049.74, period: "Jun 2026", accounts: 34, rate: 25, status: "processing", method: "ACH", email: "ap@summitfg.com" },
  { id: "PAY-2026-0907", recipient: "Marcus Johnson", type: "affiliate", amount: 312.80, period: "May 2026", accounts: 14, rate: 20, status: "paid", paidDate: "Jun 1, 2026", method: "PayPal", email: "m.johnson@email.com" },
  { id: "PAY-2026-0906", recipient: "First National Bank", type: "partnership", amount: 2840.22, period: "May 2026", accounts: 112, rate: 30, status: "paid", paidDate: "Jun 1, 2026", method: "Wire", email: "banking@fnb.com" },
  { id: "PAY-2026-0905", recipient: "Amanda Torres", type: "affiliate", amount: 124.30, period: "May 2026", accounts: 7, rate: 20, status: "paid", paidDate: "Jun 1, 2026", method: "ACH", email: "a.torres@email.com" },
  { id: "PAY-2026-0904", recipient: "Heritage Trust Co. (White Label)", type: "white-label", amount: 4210.60, period: "Jun 2026", accounts: 148, rate: 35, status: "pending", method: "Wire", email: "finance@heritagetrust.com" },
  { id: "PAY-2026-0903", recipient: "Meridian Estate Partners (White Label)", type: "white-label", amount: 1985.40, period: "May 2026", accounts: 61, rate: 35, status: "paid", paidDate: "Jun 1, 2026", method: "Wire", email: "ap@meridianestate.com" },
];

const typeConfig: Record<Exclude<PayoutType, "all">, { label: string; color: string; icon: React.ReactNode }> = {
  affiliate: { label: "Affiliate", color: "var(--gold)", icon: <Users size={12} color="var(--gold)" /> },
  partnership: { label: "Partnership", color: "#6FAE8B", icon: <Handshake size={12} color="#FFFFFF" /> },
  "white-label": { label: "White Label", color: "#8CA6E0", icon: <Layers size={12} color="#8CA6E0" /> },
};

const statusConfig = {
  pending: { label: "PENDING", color: "#F6AD55", bg: "rgba(246,173,85,0.12)", icon: <Clock size={12} /> },
  processing: { label: "PROCESSING", color: "#6FAE8B", bg: "rgba(91,167,214,0.12)", icon: <TrendingUp size={12} /> },
  paid: { label: "PAID", color: "#D99A6B", bg: "rgba(72,187,120,0.12)", icon: <CheckCircle size={12} /> },
};

export function PayoutManagement() {
  const [typeFilter, setTypeFilter] = useState<PayoutType>("all");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = payouts.filter(
    (p) =>
      (typeFilter === "all" || p.type === typeFilter) &&
      (statusFilter === "all" || p.status === statusFilter) &&
      (p.recipient.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search))
  );

  const pendingTotal = payouts.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const processingTotal = payouts.filter(p => p.status === "processing").reduce((sum, p) => sum + p.amount, 0);
  const paidTotal = payouts.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedPending = filtered.filter(p => selected.has(p.id) && p.status === "pending");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} color="var(--gold)" />
            <span style={{ color: "var(--gold)", fontSize: 15, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · PAYOUTS</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)" }}>Payout Management</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginTop: 4 }}>Manage affiliate and partnership commission payouts. Payouts cycle on the 1st of each month.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 17.5 }}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} color="#F6AD55" />
            <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Pending Payouts</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "#F6AD55" }}>${pendingTotal.toFixed(2)}</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 15, marginTop: 2 }}>{payouts.filter(p => p.status === "pending").length} recipients</div>
        </div>
        <div className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} color="#FFFFFF" />
            <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Processing</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "#6FAE8B" }}>${processingTotal.toFixed(2)}</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 15, marginTop: 2 }}>{payouts.filter(p => p.status === "processing").length} in transit</div>
        </div>
        <div className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} color="#FFFFFF" />
            <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Paid This Month</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "#D99A6B" }}>${paidTotal.toFixed(2)}</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 15, marginTop: 2 }}>{payouts.filter(p => p.status === "paid").length} recipients</div>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedPending.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border" style={{ background: "rgba(72,187,120,0.08)", borderColor: "rgba(72,187,120,0.3)" }}>
          <span style={{ color: "var(--foreground)", fontSize: 17.5 }}>{selectedPending.length} selected · ${selectedPending.reduce((s, p) => s + p.amount, 0).toFixed(2)} total</span>
          <button
            className="flex items-center gap-2 px-5 py-2 rounded-2xl ml-auto"
            style={{ background: "rgba(72,187,120,0.2)", color: "#D99A6B", border: "1px solid rgba(72,187,120,0.4)", fontWeight: 600, fontSize: 17.5 }}
          >
            <CheckCircle size={15} /> Process Selected Payouts
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--card)" }}>
          {[
            { id: "all", label: "All Types" },
            { id: "affiliate", label: "Affiliate", icon: <Users size={12} /> },
            { id: "partnership", label: "Partnership", icon: <Handshake size={12} /> },
            { id: "white-label", label: "White Label", icon: <Layers size={12} /> },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id as PayoutType)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: typeFilter === f.id ? "var(--gold)" : "transparent", color: typeFilter === f.id ? "#070D1A" : "var(--muted-foreground)" }}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--card)" }}>
          {["all", "pending", "processing", "paid"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as PayoutStatus)}
              className="px-4 py-2 rounded-xl text-sm capitalize transition-all"
              style={{ background: statusFilter === s ? "var(--secondary)" : "transparent", color: statusFilter === s ? "var(--foreground)" : "var(--muted-foreground)" }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl flex-1 min-w-48" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Search size={14} color="var(--muted-foreground)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient or payout ID..."
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16, width: "100%" }}
          />
        </div>
      </div>

      {/* Payout table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="grid px-5 py-3"
          style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto", background: "rgba(255,255,255,0.08)", borderBottom: "1px solid var(--border)", gap: 16, alignItems: "center" }}
        >
          <div />
          {["Recipient", "Type", "Period", "Rate", "Amount", "Status"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {filtered.map((payout, i) => {
          const statusCfg = statusConfig[payout.status as keyof typeof statusConfig];
          return (
            <div
              key={payout.id}
              className="grid px-5 py-3 items-center border-b"
              style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)", gap: 16 }}
            >
              <input
                type="checkbox"
                checked={selected.has(payout.id)}
                onChange={() => toggleSelect(payout.id)}
                style={{ accentColor: "var(--gold)", width: 16, height: 16 }}
              />
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{payout.recipient}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{payout.email} · {payout.id}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {typeConfig[payout.type as Exclude<PayoutType, "all">].icon}
                <span style={{ color: typeConfig[payout.type as Exclude<PayoutType, "all">].color, fontSize: 15 }}>{typeConfig[payout.type as Exclude<PayoutType, "all">].label}</span>
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 16 }}>{payout.period}</div>
              <div style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 16 }}>{payout.rate}%</div>
              <div style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>${payout.amount.toFixed(2)}</div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl" style={{ background: statusCfg.bg, color: statusCfg.color, width: "fit-content" }}>
                {statusCfg.icon}
                <span style={{ fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{statusCfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
