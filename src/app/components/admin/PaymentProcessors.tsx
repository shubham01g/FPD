import React, { useEffect, useMemo, useState } from "react";
import {
  CreditCard, Activity, Globe, Settings, Zap, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, Eye, EyeOff, ToggleLeft, ToggleRight, AlertCircle, Save, Info, Loader2, RefreshCw, Plus, Trash2, X, Copy, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { CARD_PROCESSORS, type CatalogProcessor } from "./processorCatalog";
import { copyToClipboard } from "../../utils/clipboard";

/* Developer → Payment Processors. The card-processor counterpart of Crypto
   Payments: both read and write crypto_processor_configs through /admin/crypto
   (credentials AES-encrypted server-side, masked on read). Saving credentials
   here records them — no checkout is wired to a processor yet, so nothing is
   charged through them. */

const CARD: React.CSSProperties = {
  background: "#101728", border: "1px solid rgba(91,110,225,0.1)",
  boxShadow: "0 2px 12px rgba(91,110,225,0.06)", borderRadius: 16,
};
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const INPUT: React.CSSProperties = {
  background: "rgba(91,110,225,0.05)", border: "1px solid rgba(91,110,225,0.18)", color: "#E8EDF5",
  fontSize: 13, outline: "none", borderRadius: 10, padding: "9px 12px", width: "100%", colorScheme: "dark",
};

type Tab = "processors" | "transactions" | "webhooks" | "settings";
type ProcessorStatus = "active" | "connected" | "available";

/* Row shape from GET /admin/crypto — see routes/cryptoConfig.ts */
interface ProcessorRow {
  id: string; name: string; enabled: boolean; isDefault: boolean;
  config: Record<string, string>; hasCredentials: boolean; unreadable: boolean;
}
/* Row shape from GET /admin/crypto/payments */
interface PaymentRow {
  id: string; type: string; amount_usd: number; currency: string; status: string;
  description: string | null; created_at: string; users: { full_name: string; email: string } | null;
}

interface Processor extends CatalogProcessor {
  status: ProcessorStatus;
  testMode: boolean;
  config: Record<string, string>;
  /** False when migration 028 hasn't seeded this processor's row yet. */
  available: boolean;
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  succeeded: "#5FBE91", pending: "#F6AD55", failed: "#FC8181", refunded: "#8A9AB8", disputed: "#D9A55E",
};

/* The signed endpoint Stripe calls — see routes/public.ts. */
const STRIPE_WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/server/make-server-b5ad85e0/public/stripe/webhook`;

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fieldLabel = (key: string) => key.replace(/([A-Z])/g, " $1").toUpperCase();

const DEFAULT_PAYMENT_SETTINGS = {
  currency: "USD", retries: "3", retryWindowDays: "7",
  failureEmail: true, receiptEmail: true, statementDescriptor: "FINAL PASS DOWN",
};

/* ─── One processor ───────────────────────────────────────────────── */
function ProcessorCard({ p, onChanged, onRequestActive }: { p: Processor; onChanged: () => void; onRequestActive: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  const statusColor = p.status === "active" ? "#5FBE91" : p.status === "connected" ? "#AEB9F5" : "#8A9AB8";
  const statusLabel = p.status === "active" ? "ACTIVE" : p.status === "connected" ? "CONNECTED" : "AVAILABLE";
  const value = (field: string) => draft[field] ?? revealed?.[field] ?? p.config[field] ?? "";
  const missing = p.fields.some(f => !(draft[f] ?? p.config[f]));

  async function patch(body: Record<string, unknown>, message: string) {
    setSaving(true);
    try {
      await adminApi.patch(`/crypto/processors/${p.id}`, body);
      toast.success(message);
      setDraft({});
      setRevealed(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update this processor");
    } finally {
      setSaving(false);
    }
  }

  /* A real call to the processor with the stored credentials (Stripe, PayPal
     and Square have a cheap read-only endpoint; the others report that no
     automatic check exists). */
  async function testConnection() {
    setSaving(true);
    try {
      const res = await adminApi.post<{ ok: boolean; message: string }>(`/crypto/processors/${p.id}/test`);
      if (res.ok) toast.success(res.message); else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleKeys() {
    if (revealed) { setRevealed(null); return; }
    try {
      const { config } = await adminApi.post<{ config: Record<string, string> }>(`/crypto/processors/${p.id}/reveal`);
      setRevealed(config);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reveal credentials");
    }
  }

  const pill = (text: string, color: string, icon?: React.ReactNode) => (
    <span className="flex items-center gap-1" style={{ fontSize: 9, ...MONO, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {icon}{text}
    </span>
  );
  const action: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
    background: "rgba(91,110,225,0.08)", color: "#AEB9F5", border: "1px solid rgba(91,110,225,0.18)",
  };

  return (
    <div style={{ ...CARD, borderColor: p.status === "active" ? "rgba(95,190,145,0.35)" : "rgba(91,110,225,0.1)" }}>
      {/* Header row */}
      <div className="flex items-center gap-4 p-5">
        <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
          style={{ width: 48, height: 48, background: `${p.color}22`, border: `1.5px solid ${p.color}55` }}>
          <span style={{ color: "#E8EDF5", fontWeight: 900, fontSize: 14, ...MONO }}>{p.logo}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>{p.name}</span>
            {p.status === "active" && pill("ACTIVE PROCESSOR", "#5FBE91", <Zap size={8}/>)}
            {pill(statusLabel, statusColor)}
            {p.status !== "available" && p.testMode && pill("TEST MODE", "#D9A55E")}
          </div>
          <p style={{ color: "#8A9AB8", fontSize: 12, lineHeight: 1.4 }}>{p.description}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{ color: "#8A9AB8", background: "rgba(91,110,225,0.06)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}>
          {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-5 pb-4 flex-wrap">
        {p.status === "connected" && (
          <button onClick={onRequestActive} style={{ ...action, background: "rgba(95,190,145,0.1)", color: "#5FBE91", border: "1px solid rgba(95,190,145,0.25)" }}>
            <Zap size={11}/> Set as Active Processor
          </button>
        )}
        {p.status === "available" && (
          <button onClick={() => { setExpanded(true); toast.info(`Configure ${p.name} credentials below to connect`); }} style={action}>
            <Settings size={11}/> Connect Processor
          </button>
        )}
        {p.status !== "available" && (
          <button onClick={() => void testConnection()} disabled={saving} style={action}>
            <RefreshCw size={11}/> Test Connection
          </button>
        )}
        {p.status !== "available" && (
          <button onClick={() => void patch({ enabled: false }, `${p.name} disconnected`)} disabled={saving} style={{ ...action, color: "#8A9AB8" }}>
            Disconnect
          </button>
        )}
        {p.website && (
          <button onClick={() => window.open(`https://${p.website}`, "_blank", "noopener")} style={{ ...action, color: "#8A9AB8" }}>
            <ExternalLink size={11}/> Docs
          </button>
        )}
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t px-5 py-5 space-y-5" style={{ borderColor: "rgba(91,110,225,0.08)" }}>
          {p.fees && <div className="grid grid-cols-2 gap-3">
            {[["TRANSACTION FEES", p.fees], ["SETTLEMENT", p.settlement]].map(([label, val]) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: "rgba(91,110,225,0.03)", border: "1px solid rgba(91,110,225,0.08)" }}>
                <div style={{ color: "#8A9AB8", fontSize: 11, ...MONO, marginBottom: 3 }}>{label}</div>
                <div style={{ color: "#E8EDF5", fontSize: 12, fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>}

          {p.features.length > 0 && <div>
            <div style={{ color: "#8A9AB8", fontSize: 11, ...MONO, marginBottom: 8 }}>FEATURES</div>
            <div className="flex flex-wrap gap-2">
              {p.features.map(f => (
                <span key={f} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: "rgba(95,190,145,0.07)", color: "#5FBE91", border: "1px solid rgba(95,190,145,0.15)" }}>
                  <CheckCircle size={9}/>{f}
                </span>
              ))}
            </div>
          </div>}

          {/* API Credentials */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "#8A9AB8", fontSize: 11, ...MONO }}>API CREDENTIALS</div>
              <div className="flex gap-2">
                <button onClick={() => void patch({ config: { mode: p.testMode ? "live" : "test" } }, `${p.name} switched to ${p.testMode ? "Live" : "Test"} mode`)}
                  disabled={saving || !p.available} style={{ ...action, padding: "5px 10px", fontSize: 11 }}>
                  {p.testMode ? <ToggleLeft size={12}/> : <ToggleRight size={12}/>}
                  {p.testMode ? "Test Mode" : "Live Mode"}
                </button>
                <button onClick={() => void toggleKeys()} disabled={!p.available} style={{ ...action, padding: "5px 10px", fontSize: 11 }}>
                  {revealed ? <EyeOff size={12}/> : <Eye size={12}/>}
                  {revealed ? "Hide" : "Show"} Keys
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {p.fields.map(field => (
                <div key={field} className="flex items-center gap-3">
                  <span style={{ color: "#8A9AB8", fontSize: 11, ...MONO, width: 150, flexShrink: 0 }}>{fieldLabel(field)}</span>
                  <input value={value(field)} placeholder="Not configured" disabled={!p.available}
                    onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                    style={{ ...INPUT, ...MONO, fontSize: 12 }}/>
                </div>
              ))}
            </div>
            {!p.available ? (
              <p style={{ color: "#D9A55E", fontSize: 11, marginTop: 8 }}>⚠ This processor is not in the database yet — apply migration 028 to configure it.</p>
            ) : missing && (
              <p style={{ color: "#D9A55E", fontSize: 11, marginTop: 8 }}>⚠ Missing credentials — processor cannot go live until all fields are configured.</p>
            )}
            <button onClick={() => void patch({ config: draft, enabled: true }, `${p.name} credentials saved`)}
              disabled={saving || !p.available || Object.keys(draft).length === 0}
              className="mt-3 flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#5B6EE1,#7E6BD8)", color: "#fff", border: "none", cursor: "pointer" }}>
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} Save &amp; Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Add Custom Processor ────────────────────────────────────────── */
function AddCustomProcessorModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [pairs, setPairs] = useState<{ key: string; value: string }[]>([{ key: "apiKey", value: "" }]);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) { toast.error("Processor name is required"); return; }
    setSaving(true);
    try {
      await adminApi.post("/crypto/processors", {
        name: name.trim(),
        config: Object.fromEntries(pairs.filter(c => c.key.trim()).map(c => [c.key.trim(), c.value])),
      });
      toast.success(`${name.trim()} added as a custom processor`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the processor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(4,8,15,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...CARD, padding: 26, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#E8EDF5" }}>Add Custom Processor</h3>
          <button onClick={onClose} style={{ color: "#8A9AB8", background: "none", border: "none", cursor: "pointer" }}><X size={16}/></button>
        </div>
        <label style={{ color: "#A3ADC9", fontSize: 12, display: "block", marginBottom: 4 }}>Processor Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Worldpay" style={INPUT}/>

        <div style={{ color: "#8A9AB8", fontSize: 11, ...MONO, margin: "18px 0 8px" }}>API CREDENTIALS</div>
        <div className="space-y-2">
          {pairs.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c.key} onChange={e => setPairs(list => list.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                placeholder="Field name (e.g. apiKey)" style={{ ...INPUT, ...MONO, fontSize: 12, width: 190 }}/>
              <input value={c.value} onChange={e => setPairs(list => list.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                placeholder="Value" style={{ ...INPUT, ...MONO, fontSize: 12 }}/>
              <button onClick={() => setPairs(list => list.filter((_, j) => j !== i))} style={{ color: "#FC8181", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
        <button onClick={() => setPairs(list => [...list, { key: "", value: "" }])} className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: "#AEB9F5", background: "none", border: "none", cursor: "pointer" }}>
          <Plus size={12}/> Add field
        </button>
        <p style={{ color: "#8A9AB8", fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>
          Fields whose name contains key, secret, token or password are stored encrypted and shown masked.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(91,110,225,0.06)", color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => void add()} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#5B6EE1,#7E6BD8)", color: "#fff", border: "none", cursor: "pointer" }}>Add Processor</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────── */
export function PaymentProcessors() {
  const [tab, setTab] = useState<Tab>("processors");
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, loading, error, refetch } = useAdminFetch(() => adminApi.get<{ processors: ProcessorRow[] }>("/crypto"), []);
  const { data: payData, loading: payLoading, error: payError } = useAdminFetch(
    () => adminApi.get<{ payments: PaymentRow[] }>("/crypto/payments"), []);
  const { data: settingsData } = useAdminFetch(
    () => adminApi.get<{ settings: { payments?: Partial<typeof DEFAULT_PAYMENT_SETTINGS> } }>("/settings"), []);

  const processors: Processor[] = useMemo(() => {
    // Processors an admin added by hand (ids "custom_*") sit after the catalog.
    const custom: CatalogProcessor[] = (data?.processors ?? []).filter(r => r.id.startsWith("custom_")).map(r => ({
      id: r.id, name: r.name, logo: r.name.slice(0, 2).toUpperCase(), color: "#5B6EE1", website: "",
      description: "Custom processor added by an admin.", features: [], fees: "", settlement: "",
      fields: Object.keys(r.config).filter(f => f !== "mode"),
    }));
    return [...CARD_PROCESSORS, ...custom].map(cat => {
    const row = data?.processors.find(r => r.id === cat.id);
    const connected = Boolean(row?.enabled && row.hasCredentials);
    return {
      ...cat,
      available: Boolean(row),
      status: connected ? (row!.isDefault ? "active" : "connected") : "available",
      testMode: row?.config.mode === "test",
      config: row?.config ?? {},
    };
    });
  }, [data]);
  const activeProcessor = processors.find(p => p.status === "active");
  const connectedCount = processors.filter(p => p.status !== "available").length;
  const stripeLive = activeProcessor?.id === "stripe";

  const payments = payData?.payments ?? [];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const mtd = payments.filter(p => p.status === "succeeded" && new Date(p.created_at) >= monthStart);

  const [settings, setSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  useEffect(() => {
    if (settingsData?.settings.payments) setSettings(s => ({ ...s, ...settingsData.settings.payments }));
  }, [settingsData]);

  async function setActive(id: string) {
    setConfirmSwitch(null);
    try {
      await adminApi.patch(`/crypto/processors/${id}`, { isDefault: true });
      toast.success(`${processors.find(p => p.id === id)?.name} is now the active payment processor`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not switch the active processor");
    }
  }

  async function saveSettings() {
    try {
      await adminApi.put("/settings/payments", { value: settings });
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save payment settings");
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "processors",   label: "Processors",   icon: <CreditCard size={13}/> },
    { id: "transactions", label: "Transactions", icon: <Activity size={13}/> },
    { id: "webhooks",     label: "Webhooks",     icon: <Globe size={13}/> },
    { id: "settings",     label: "Settings",     icon: <Settings size={13}/> },
  ];

  const toggle = (on: boolean, onClick: () => void) => (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
      style={{ background: on ? "rgba(95,190,145,0.12)" : "rgba(139,154,184,0.1)", color: on ? "#5FBE91" : "#8A9AB8",
        border: `1px solid ${on ? "rgba(95,190,145,0.3)" : "rgba(139,154,184,0.2)"}`, cursor: "pointer" }}>
      {on ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>} {on ? "Enabled" : "Disabled"}
    </button>
  );
  const notice = (text: string) => (
    <div className="flex items-start gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.2)" }}>
      <Info size={14} color="#D9A55E" style={{ marginTop: 2, flexShrink: 0 }}/>
      <p style={{ color: "#D9A55E", fontSize: 13, lineHeight: 1.6 }}>{text}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#E8EDF5", marginBottom: 4 }}>Payment Processors</h1>
          <p style={{ color: "#8A9AB8", fontSize: 14 }}>Configure and manage card payment processors. Only one processor is active at a time.</p>
        </div>
        {activeProcessor && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-shrink-0" style={{ background: "rgba(95,190,145,0.07)", border: "1px solid rgba(95,190,145,0.25)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5FBE91", boxShadow: "0 0 6px #5FBE91" }}/>
            <div>
              <div style={{ fontSize: 10, ...MONO, color: "#5FBE91", fontWeight: 700, letterSpacing: "0.06em" }}>ACTIVE PROCESSOR</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#E8EDF5", fontWeight: 700 }}>{activeProcessor.name}</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)", color: "#FC8181", fontSize: 13 }}>
          <AlertCircle size={14}/> {error}
        </div>
      )}

      {/* Confirm switch modal */}
      {confirmSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(4,8,15,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ ...CARD, padding: 28, maxWidth: 400, width: "100%" }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ background: "rgba(217,165,94,0.1)", borderRadius: 10, padding: 8 }}><AlertCircle size={18} color="#D9A55E"/></div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#E8EDF5" }}>Switch Active Processor?</h3>
            </div>
            <p style={{ color: "#A3ADC9", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              You are switching {activeProcessor ? <>from <strong>{activeProcessor.name}</strong> </> : null}to{" "}
              <strong>{processors.find(p => p.id === confirmSwitch)?.name}</strong> as the active payment processor.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSwitch(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(91,110,225,0.06)", color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => void setActive(confirmSwitch)} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#5B6EE1,#7E6BD8)", color: "#fff", border: "none", cursor: "pointer" }}>Confirm Switch</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && <AddCustomProcessorModal onClose={() => setShowAddModal(false)} onAdded={refetch}/>}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: "rgba(91,110,225,0.05)", border: "1px solid rgba(91,110,225,0.1)", width: "fit-content", maxWidth: "100%" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
            style={{ background: tab === t.id ? "rgba(91,110,225,0.18)" : "transparent", color: tab === t.id ? "#AEB9F5" : "#8A9AB8", border: "none", cursor: "pointer" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Processors tab ── */}
      {tab === "processors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p style={{ color: "#8A9AB8", fontSize: 13 }}>
              {connectedCount} connected · {processors.length - connectedCount} available
            </p>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(91,110,225,0.1)", color: "#AEB9F5", border: "1px solid rgba(91,110,225,0.2)", cursor: "pointer" }}>
              <Plus size={14}/> Add Custom Processor
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Volume MTD",   val: fmt(mtd.reduce((s, p) => s + Number(p.amount_usd), 0)), color: "#AEB9F5" },
              { label: "Total Transactions", val: mtd.length.toLocaleString(), color: "#5FBE91" },
              { label: "Active Processor",   val: activeProcessor?.name ?? "None", color: "#D9A55E" },
              { label: "Connected",          val: `${connectedCount} of ${processors.length}`, color: "#9F7AEA" },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, padding: 18 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ color: "#8A9AB8", fontSize: 12, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {notice("Plan upgrades and the $199 Legacy Continuation Fee are charged through Stripe when it is connected and set as the active processor. The other processors store credentials only — checkout is not built for them. The volume above counts every recorded payment.")}
          {loading
            ? <div style={{ color: "#8A9AB8", fontSize: 14, textAlign: "center", padding: 32 }}>Loading processors…</div>
            : processors.map(p => <ProcessorCard key={p.id} p={p} onChanged={refetch} onRequestActive={() => setConfirmSwitch(p.id)}/>)}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {tab === "transactions" && (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div className="p-5 border-b" style={{ borderColor: "rgba(91,110,225,0.1)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#E8EDF5" }}>Recent Transactions</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(91,110,225,0.04)" }}>
                  {["ID", "Customer", "Type", "Amount", "Status", "Date"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, ...MONO, color: "#8A9AB8", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: "1px solid rgba(91,110,225,0.06)", background: i % 2 ? "rgba(91,110,225,0.015)" : "transparent" }}>
                    <td style={{ padding: "11px 14px", fontSize: 11, ...MONO, color: "#AEB9F5" }}>{t.id.slice(0, 8)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#E8EDF5" }}>{t.users?.full_name ?? "—"}<div style={{ color: "#8A9AB8", fontSize: 11 }}>{t.users?.email}</div></td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#A3ADC9" }}>{t.type.replace(/_/g, " ")}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: "#E8EDF5", ...MONO }}>{fmt(Number(t.amount_usd))}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 9, ...MONO, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                        background: `${PAYMENT_STATUS_COLOR[t.status] ?? "#8A9AB8"}18`, color: PAYMENT_STATUS_COLOR[t.status] ?? "#8A9AB8" }}>{t.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#8A9AB8", whiteSpace: "nowrap" }}>{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: payError ? "#FC8181" : "#8A9AB8", fontSize: 13 }}>
                    {payError ?? (payLoading ? "Loading transactions…" : "No payments have been recorded yet.")}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Webhooks tab ── */}
      {tab === "webhooks" && (
        <div className="space-y-4">
          <div style={{ ...CARD, padding: 20 }}>
            <div className="flex items-center gap-3 mb-4">
              <Globe size={16} color="#AEB9F5"/>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#E8EDF5" }}>Webhook Endpoints</h3>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(91,110,225,0.04)", border: "1px solid rgba(91,110,225,0.1)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: stripeLive ? "#5FBE91" : "#8A9AB8" }}/>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 2 }}>
                  checkout.session.completed · invoice.paid · invoice.payment_failed · customer.subscription.deleted
                </div>
                <div style={{ fontSize: 11, ...MONO, color: "#8A9AB8", wordBreak: "break-all" }}>{STRIPE_WEBHOOK_URL}</div>
              </div>
              <span style={{ fontSize: 11, ...MONO, padding: "2px 8px", borderRadius: 99, background: "rgba(99,91,255,0.15)", color: "#AEB9F5" }}>Stripe</span>
            </div>
          </div>
          <div style={{ ...CARD, padding: 20 }}>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "#E8EDF5", marginBottom: 12 }}>Stripe Webhook URL</h4>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(91,110,225,0.04)", border: "1px solid rgba(91,110,225,0.1)" }}>
              <Lock size={13} color="#8A9AB8"/>
              <span style={{ flex: 1, ...MONO, fontSize: 12, color: "#E8EDF5", wordBreak: "break-all" }}>{STRIPE_WEBHOOK_URL}</span>
              <button onClick={() => { copyToClipboard(STRIPE_WEBHOOK_URL); toast.success("URL copied"); }}
                style={{ color: "#8A9AB8", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Copy size={13}/>
              </button>
            </div>
            <p style={{ color: "#8A9AB8", fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
              In the Stripe dashboard, add this URL as a webhook endpoint for the four events above, then paste its signing secret into Stripe's Webhook Secret field on the Processors tab. Every incoming event is rejected unless its signature matches that secret. Delivery history is in the Stripe dashboard; this app does not keep a copy.
            </p>
          </div>
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <div className="space-y-5">
          {[
            {
              title: "Default Currency", desc: "All transactions are processed and settled in this currency.",
              control: (
                <select className="fpd-select-dark" value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} style={{ ...INPUT, width: 200 }}>
                  <option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option><option value="CAD">CAD — Canadian Dollar</option>
                </select>
              ),
            },
            {
              title: "Retry Failed Payments", desc: "Automatically retry failed subscription payments before marking as past due.",
              control: (
                <div className="flex items-center gap-3">
                  <select className="fpd-select-dark" value={settings.retries} onChange={e => setSettings(s => ({ ...s, retries: e.target.value }))} style={{ ...INPUT, width: 120 }}>
                    {["1", "2", "3", "5"].map(n => <option key={n} value={n}>{n} {n === "1" ? "retry" : "retries"}</option>)}
                  </select>
                  <span style={{ color: "#8A9AB8", fontSize: 13 }}>over</span>
                  <select className="fpd-select-dark" value={settings.retryWindowDays} onChange={e => setSettings(s => ({ ...s, retryWindowDays: e.target.value }))} style={{ ...INPUT, width: 120 }}>
                    {["3", "7", "14"].map(n => <option key={n} value={n}>{n} days</option>)}
                  </select>
                </div>
              ),
            },
            {
              title: "Payment Failure Email", desc: "Send an automatic email to the user when a payment fails.",
              control: toggle(settings.failureEmail, () => setSettings(s => ({ ...s, failureEmail: !s.failureEmail }))),
            },
            {
              title: "Receipt Emails", desc: "Automatically email a payment receipt to the customer after every successful charge.",
              control: toggle(settings.receiptEmail, () => setSettings(s => ({ ...s, receiptEmail: !s.receiptEmail }))),
            },
            {
              title: "Statement Descriptor", desc: "What appears on the customer's bank statement.",
              control: <input value={settings.statementDescriptor} onChange={e => setSettings(s => ({ ...s, statementDescriptor: e.target.value }))} style={{ ...INPUT, width: 240 }}/>,
            },
          ].map(s => (
            <div key={s.title} style={{ ...CARD, padding: 20 }}>
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex-1">
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#E8EDF5", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: "#8A9AB8", fontSize: 13 }}>{s.desc}</div>
                </div>
                <div className="flex-shrink-0">{s.control}</div>
              </div>
            </div>
          ))}
          {notice("These preferences are saved, but nothing applies them yet: there is no live checkout to retry, and no email provider to send failure notices or receipts.")}
          <button onClick={() => void saveSettings()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#5B6EE1,#7E6BD8)", color: "#fff", border: "none", cursor: "pointer" }}>
            <Save size={13}/> Save Settings
          </button>
        </div>
      )}
    </div>
  );
}
