import React, { useState } from "react";
import { DollarSign, CheckCircle, Clock, Download, Search, TrendingUp, Users, Handshake, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";
import { downloadCSV } from "../../utils/exportCsv";

type PayoutType = "all" | "affiliate" | "partnership";
type PayoutStatus = "all" | "pending" | "processing" | "paid" | "failed" | "cancelled";

interface PayoutRow {
  id: string;
  recipient_user_id: string;
  payout_type: "affiliate" | "partnership";
  amount: number;
  billing_period: string;
  payment_method: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  processed_at: string | null;
  created_at: string;
  users: { email: string; full_name: string } | null;
}

// payout_type is DB-constrained to 'affiliate' | 'partnership' — there is no
// 'white-label' payout row type in the schema, so that filter option was dropped.
const typeConfig: Record<Exclude<PayoutType, "all">, { label: string; color: string; icon: React.ReactNode }> = {
  affiliate: { label: "Affiliate", color: "var(--gold)", icon: <Users size={12} color="var(--gold)" /> },
  partnership: { label: "Partnership", color: "#6FAE8B", icon: <Handshake size={12} color="#FFFFFF" /> },
};

const statusConfig: Record<Exclude<PayoutStatus, "all">, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "PENDING", color: "#F6AD55", bg: "rgba(246,173,85,0.12)", icon: <Clock size={12} /> },
  processing: { label: "PROCESSING", color: "#6FAE8B", bg: "rgba(91,167,214,0.12)", icon: <TrendingUp size={12} /> },
  paid: { label: "PAID", color: "#D99A6B", bg: "rgba(72,187,120,0.12)", icon: <CheckCircle size={12} /> },
  failed: { label: "FAILED", color: "#FC8181", bg: "rgba(252,129,129,0.12)", icon: <AlertCircle size={12} /> },
  cancelled: { label: "CANCELLED", color: "var(--muted-foreground)", bg: "rgba(148,163,184,0.12)", icon: <Clock size={12} /> },
};

export function PayoutManagement() {
  const [typeFilter, setTypeFilter] = useState<PayoutType>("all");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<{ payouts: PayoutRow[] }>("/payouts"),
    [],
    ADMIN_LIVE_POLL_MS,
  );

  const payouts = data?.payouts ?? [];

  const filtered = payouts.filter(
    (p) =>
      (typeFilter === "all" || p.payout_type === typeFilter) &&
      (statusFilter === "all" || p.status === statusFilter) &&
      ((p.users?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) || p.id.includes(search))
  );

  const pendingTotal = payouts.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);
  const processingTotal = payouts.filter(p => p.status === "processing").reduce((sum, p) => sum + Number(p.amount), 0);
  // "Paid This Month" = payouts marked paid since the 1st of this month.
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const paidThisMonth = payouts.filter(p => p.status === "paid" && p.processed_at && new Date(p.processed_at).getTime() >= monthStart);
  const paidTotal = paidThisMonth.reduce((sum, p) => sum + Number(p.amount), 0);

  /* Pending/processing payouts can be moved on by hand: processing (sent,
     not settled), failed or cancelled. Paid goes through Mark Paid. */
  async function setStatus(id: string, status: "processing" | "failed" | "cancelled") {
    try {
      await adminApi.patch(`/payouts/${id}`, { status });
      toast.success(`Payout marked ${status}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the payout");
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedPending = filtered.filter(p => selected.has(p.id) && p.status === "pending");

  function exportCsv() {
    const rows = filtered.map(p => ({
      id: p.id, type: p.payout_type, recipient: p.users?.full_name ?? "", email: p.users?.email ?? "",
      amount: p.amount, billing_period: p.billing_period, payment_method: p.payment_method,
      status: p.status, processed_at: p.processed_at ?? "", created_at: p.created_at,
    }));
    const count = downloadCSV(`fpd-payouts-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success(count === 0 ? "No matching payouts — downloaded an empty file" : `Exported ${count} payouts`);
  }

  const [generating, setGenerating] = useState<"affiliate" | "partnership" | null>(null);
  async function generatePayouts(type: "affiliate" | "partnership") {
    const who = type === "affiliate" ? "affiliate" : "partner";
    if (!window.confirm(`Create a pending payout for every ${who} with an unpaid commission balance?`)) return;
    setGenerating(type);
    try {
      const { created, period } = await adminApi.post<{ created: number; period: string }>("/payouts/generate", { type });
      toast.success(created === 0 ? `No unpaid ${who} balances to pay` : `${created} ${who} payout${created === 1 ? "" : "s"} created for ${period}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create payouts");
    } finally {
      setGenerating(null);
    }
  }

  async function processSelected() {
    setProcessing(true);
    try {
      // One result per payout: with Promise.all a single failure reported the
      // whole batch as failed even though the others had been marked paid.
      // This records the payment only; the money itself is sent outside FPD.
      const results = await Promise.allSettled(selectedPending.map(p => adminApi.post(`/payouts/${p.id}/mark-paid`)));
      const failedIds = new Set<string>();
      let firstError = "";
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          failedIds.add(selectedPending[i].id);
          if (!firstError) firstError = r.reason instanceof Error ? r.reason.message : String(r.reason);
        }
      });
      const ok = results.length - failedIds.size;
      if (ok > 0) toast.success(`${ok} payout${ok === 1 ? "" : "s"} marked paid`);
      if (failedIds.size > 0) toast.error(`${failedIds.size} could not be marked paid and are still selected: ${firstError}`);
      setSelected(failedIds);
      refetch();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} color="var(--gold)" />
            <span style={{ color: "var(--gold)", fontSize: 15, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · PAYOUTS</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)" }}>Payout Management</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginTop: 4 }}>Affiliate and partner commissions are earned automatically from referred accounts' Stripe payments. Create payouts to turn unpaid balances into payouts, send the money outside FPD, then mark them paid.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {(["affiliate", "partnership"] as const).map(t => (
          <button key={t}
            onClick={() => void generatePayouts(t)}
            disabled={generating !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 17.5, opacity: generating && generating !== t ? 0.5 : 1 }}
          >
            {generating === t ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
            Create {t === "affiliate" ? "affiliate" : "partner"} payouts
          </button>
        ))}
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 17.5 }}
        >
          <Download size={14} /> Export CSV
        </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--muted-foreground)" }}>
          <Loader2 size={18} className="animate-spin" /> Loading payouts…
        </div>
      )}

      {!loading && <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div style={{ color: "var(--muted-foreground)", fontSize: 15, marginTop: 2 }}>{paidThisMonth.length} recipients</div>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedPending.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border" style={{ background: "rgba(72,187,120,0.08)", borderColor: "rgba(72,187,120,0.3)" }}>
          <span style={{ color: "var(--foreground)", fontSize: 17.5 }}>{selectedPending.length} selected · ${selectedPending.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)} total</span>
          <button
            onClick={processSelected}
            disabled={processing}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl ml-auto disabled:opacity-50"
            style={{ background: "rgba(72,187,120,0.2)", color: "#D99A6B", border: "1px solid rgba(72,187,120,0.4)", fontWeight: 600, fontSize: 17.5 }}
          >
            <CheckCircle size={15} /> {processing ? "Processing…" : "Process Selected Payouts"}
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
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <div
          className="grid px-5 py-3"
          style={{ gridTemplateColumns: "auto auto 1fr auto auto auto auto auto", background: "rgba(255,255,255,0.08)", borderBottom: "1px solid var(--border)", gap: 16, alignItems: "center" }}
        >
          <div />
          <div />
          {["Recipient", "Type", "Period", "Method", "Amount", "Status"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No payouts match this filter.</div>
        )}
        {filtered.map((payout, i) => {
          const statusCfg = statusConfig[payout.status];
          return (
            <div
              key={payout.id}
              className="grid px-5 py-3 items-center border-b"
              style={{ gridTemplateColumns: "auto auto 1fr auto auto auto auto auto", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)", gap: 16 }}
            >
              <input
                type="checkbox"
                checked={selected.has(payout.id)}
                onChange={() => toggleSelect(payout.id)}
                disabled={payout.status !== "pending"}
                style={{ accentColor: "var(--gold)", width: 16, height: 16 }}
              />
              <UserAvatar name={payout.users?.full_name ?? "?"} />
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{payout.users?.full_name ?? "Unknown"}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{payout.users?.email ?? "—"} · {payout.id.slice(0, 8)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {typeConfig[payout.payout_type].icon}
                <span style={{ color: typeConfig[payout.payout_type].color, fontSize: 15 }}>{typeConfig[payout.payout_type].label}</span>
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 16 }}>{payout.billing_period}</div>
              <div style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 16 }}>{payout.payment_method}</div>
              <div style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>${Number(payout.amount).toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl" style={{ background: statusCfg.bg, color: statusCfg.color, width: "fit-content" }}>
                  {statusCfg.icon}
                  <span style={{ fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{statusCfg.label}</span>
                </div>
                {(payout.status === "pending" || payout.status === "processing") && (
                  <select value="" onChange={e => { if (e.target.value) void setStatus(payout.id, e.target.value as "processing" | "failed" | "cancelled"); }}
                    aria-label="Change payout status"
                    style={{ background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, padding: "3px 6px" }}>
                    <option value="">Change…</option>
                    {payout.status === "pending" && <option value="processing">Processing</option>}
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>}
    </div>
  );
}
