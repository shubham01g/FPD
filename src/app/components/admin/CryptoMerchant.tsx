import React, { useEffect, useState } from "react";
import {
  Shield, CheckCircle, AlertCircle, ExternalLink, Copy,
  TrendingUp, DollarSign, Settings, Plus, X, ToggleLeft,
  ToggleRight, RefreshCw, Clock, ArrowUpRight, Building,
  Eye, EyeOff, Zap, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../utils/clipboard";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import {
  getProcessorConfigs, patchProcessor, revealProcessor, saveCryptoSettings,
  DEFAULT_CRYPTO_SETTINGS,
} from "../../services/processorConfig";
import type { ProcessorConfig, CryptoSettings } from "../../services/processorConfig";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

type Tab = "processors" | "transactions" | "wallets" | "settings";

/* ── Crypto payment processors ───────────────────────────────────── */
/* Static catalog: the marketing copy and the credential field names each
   processor needs. Live state — enabled, default, and the stored (encrypted)
   credentials — comes from /admin/crypto and is merged in at render time.
   Each id must match a row in crypto_processor_configs (migration 025). */
interface ProcessorMeta {
  id: string; name: string; logo: string; color: string;
  website: string; description: string;
  features: string[];
  settlementOptions: string[];
  fees: string;
  /** Credential field names in display order; the values live server-side. */
  fields: string[];
}

type ProcessorStatus = "connected" | "available" | "pending";

const PROCESSOR_CATALOG: ProcessorMeta[] = [
  {
    id:"coinbase",
    name:"Coinbase Commerce",
    logo:"🔵",
    color:"#0052FF",
    website:"commerce.coinbase.com",
    description:"Institutional-grade crypto payments from Coinbase. Accept 10+ cryptocurrencies and settle to USD daily.",
    features:["BTC, ETH, USDC, LTC, DAI, and more","Auto-converts to USD","Fraud protection","PCI-DSS compliant","Webhook support","Global coverage"],
    settlementOptions:["USD (daily)","USDC","Hold as crypto"],
    fees:"1% per transaction",
    fields:["apiKey","webhookSecret","settlementCurrency"],
  },
  {
    id:"bitpay",
    name:"BitPay",
    logo:"🟢",
    color:"#00C89C",
    website:"bitpay.com",
    description:"World's largest Bitcoin payment processor. Accept BTC, ETH, XRP, and stablecoins with next-day USD settlement.",
    features:["Bitcoin & Ethereum native","XRP support","Next-day USD settlement","Refund management","Invoice API","Business dashboards"],
    settlementOptions:["USD (next business day)","EUR","GBP","Hold as BTC"],
    fees:"1% per transaction",
    fields:["apiToken","merchantId","notificationURL"],
  },
  {
    id:"nowpayments",
    name:"NOWPayments",
    logo:"🟡",
    color:"#FFD700",
    website:"nowpayments.io",
    description:"Accept 300+ cryptocurrencies. Keep crypto or auto-convert. Great for international users paying with altcoins.",
    features:["300+ cryptocurrencies","Keep crypto or convert","Mass payouts","Auto coin detection","Hosted payment pages","No KYC for users"],
    settlementOptions:["USD","BTC","ETH","Keep as received crypto"],
    fees:"0.5% per transaction",
    fields:["apiKey","ipnSecret"],
  },
  {
    id:"stripe_crypto",
    name:"Stripe Crypto Payments",
    logo:"🟣",
    color:"#6772E5",
    website:"stripe.com/crypto",
    description:"Stripe's native crypto acceptance. Seamlessly integrates with your existing Stripe setup. USDC on-ramp and off-ramp.",
    features:["USDC native","On-ramp / off-ramp","Same Stripe dashboard","Existing customer support","Instant settlement","Web3 wallet connect"],
    settlementOptions:["USD (Stripe balance)","USDC"],
    fees:"1.5% per transaction",
    fields:["stripePublishableKey","enableCrypto"],
  },
  {
    id:"cryptodotcom",
    name:"Crypto.com Pay",
    logo:"🔴",
    color:"#002D74",
    website:"crypto.com/pay",
    description:"Accept 20+ tokens via Crypto.com Pay. Tap into 80M+ Crypto.com users. Instant settlement in CRO or USD.",
    features:["20+ tokens accepted","80M+ Crypto.com users","Instant settlement","CRO rewards for merchants","Mobile-first UI","API + plugin support"],
    settlementOptions:["USD","CRO","USDT"],
    fees:"0.5% + 0.10 per transaction",
    fields:["merchantId","secretKey","payoutAddress"],
  },
  {
    id:"strike",
    name:"Strike (Lightning)",
    logo:"⚡",
    color:"#5B21D9",
    website:"strike.me",
    description:"Lightning Network Bitcoin payments. Near-instant, sub-cent fees. Ideal for small recurring charges and micropayments.",
    features:["Lightning Network speed","< $0.01 fees","Instant settlement","USD or BTC payout","No chargebacks","Open API"],
    settlementOptions:["USD","BTC (Lightning)"],
    fees:"< $0.01 per payment",
    fields:["apiKey","webhookUrl"],
  },
];

/* ── Transactions ─────────────────────────────────────────────────── */
/* crypto_transactions exists in the schema, but no processor is integrated
   and no admin route reads the table — so there is nothing real to list. */
interface CryptoTx {
  id: string; user: string; type: string; coin: string; amount: string;
  usd: number; processor: string; date: string; status: "confirmed" | "pending"; hash: string;
}
const TXS: CryptoTx[] = [];

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-8 rounded-2xl text-center" style={CARD}>
      <div style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:6 }}>{title}</div>
      <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6, maxWidth:520, margin:"0 auto" }}>{body}</div>
    </div>
  );
}

const COIN_COLORS: Record<string,string> = { BTC:"#F7931A", ETH:"#627EEA", USDC:"#2775CA", USDT:"#26A17B", SOL:"#9945FF", BNB:"#F3BA2F", XRP:"#00A3E0" };
const COIN_LOGOS: Record<string,string>  = { BTC:"₿", ETH:"Ξ", USDC:"$", USDT:"₮", SOL:"◎", BNB:"B", XRP:"✕" };

/* ── Processor card ──────────────────────────────────────────────── */
function ProcessorCard({ meta, row, busy, onSave, onToggle }: {
  meta: ProcessorMeta;
  row: ProcessorConfig | undefined;
  busy: boolean;
  onSave: (id: string, config: Record<string, string>) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [saving, setSaving] = useState(false);
  /* Blank template from the catalog, overlaid with whatever the server has
     (secrets arrive masked). Re-synced whenever the server row changes. */
  const blank = Object.fromEntries(meta.fields.map(f => [f, ""])) as Record<string, string>;
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({ ...blank, ...(row?.config ?? {}) });

  useEffect(() => {
    setLocalConfig({ ...blank, ...(row?.config ?? {}) });
    setShowKeys(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.updatedAt, row?.id]);

  const status: ProcessorStatus = row?.enabled ? "connected" : row?.hasCredentials ? "pending" : "available";
  const statusColor = { connected:"#48BB78", available:"#8A9AB8", pending:"#F6AD55" }[status];
  const statusBg    = { connected:"rgba(72,187,120,0.1)", available:"rgba(107,114,128,0.1)", pending:"rgba(246,173,85,0.1)" }[status];

  const isSecret = (key: string) => /key|secret|token|password/i.test(key);

  /* Credentials are stored encrypted and only ever sent to the browser masked,
     so showing them means asking the server to decrypt — which is audit-logged. */
  async function toggleReveal() {
    if (showKeys) { setShowKeys(false); setLocalConfig({ ...blank, ...(row?.config ?? {}) }); return; }
    if (!row?.hasCredentials) { setShowKeys(true); return; }
    setRevealing(true);
    try {
      const real = await revealProcessor(meta.id);
      setLocalConfig(prev => ({ ...prev, ...real }));
      setShowKeys(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reveal credentials");
    } finally {
      setRevealing(false);
    }
  }

  async function saveCredentials() {
    setSaving(true);
    try {
      await onSave(meta.id, localConfig);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-2xl text-2xl"
              style={{ width:52, height:52, background:`${meta.color}12`, border:`1px solid ${meta.color}30` }}>
              {meta.logo}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>{meta.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:statusBg, color:statusColor, ...MONO }}>
                  {status.toUpperCase()}
                </span>
                {row?.isDefault && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background:"rgba(91,110,225,0.12)", color:"#6E90C9", ...MONO }}>DEFAULT</span>
                )}
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>
                {meta.fees} · Settles to: {meta.settlementOptions[0]}
              </div>
              <a href={`https://${meta.website}`} target="_blank" rel="noreferrer"
                style={{ color:meta.color, fontSize:14, display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
                {meta.website} <ExternalLink size={10}/>
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
              {expanded ? "Hide" : "Configure"}
            </button>
            <button onClick={() => onToggle(meta.id, !row?.enabled)} disabled={busy}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{ background:row?.enabled?"rgba(252,129,129,0.1)":"rgba(72,187,120,0.1)", color:row?.enabled?"#FC8181":"#D99A6B", opacity:busy?0.6:1 }}>
              {busy && <Loader2 size={11} className="animate-spin"/>}
              {row?.enabled ? "Disconnect" : "Connect"}
            </button>
          </div>
        </div>

        <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7, marginTop:10 }}>{meta.description}</p>

        {row?.unreadable && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-xl"
            style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.25)" }}>
            <AlertCircle size={13} color="#FC8181" style={{ marginTop:2, flexShrink:0 }}/>
            <span style={{ color:"#FC8181", fontSize:14, lineHeight:1.6 }}>
              Stored credentials can't be decrypted — the server's encryption secret has changed or is unset. Re-enter them below to fix this.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {meta.features.map(f => (
            <span key={f} className="px-2 py-0.5 rounded-full text-xs"
              style={{ background:`${meta.color}08`, border:`1px solid ${meta.color}20`, color:"#8A9AB8" }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"rgba(91,110,225,0.08)" }}>
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>API CREDENTIALS</span>
              <button onClick={toggleReveal} disabled={revealing}
                className="flex items-center gap-1.5 text-xs"
                style={{ color:"#8A9AB8" }}>
                {revealing ? <Loader2 size={13} className="animate-spin"/> : showKeys ? <EyeOff size={13}/> : <Eye size={13}/>}
                {showKeys ? "Hide" : "Reveal"}
              </button>
            </div>
            <div className="space-y-3">
              {meta.fields.map(key => (
                <div key={key}>
                  <label style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, display:"block", marginBottom:4 }}>
                    {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                    {row?.configuredFields.includes(key) && (
                      <span style={{ color:"#48BB78", marginLeft:6 }}>● SET</span>
                    )}
                  </label>
                  <input
                    type={isSecret(key) && !showKeys ? "password" : "text"}
                    value={localConfig[key] ?? ""}
                    onChange={e => setLocalConfig(p => ({ ...p, [key]:e.target.value }))}
                    placeholder={`Enter ${meta.name} ${key}`}
                    style={INPUT}/>
                </div>
              ))}
            </div>
            <p style={{ color:"#8A9AB8", fontSize:13, marginTop:8, lineHeight:1.6 }}>
              Credentials are encrypted before they're stored. Leaving a secret field untouched keeps the saved value.
            </p>
          </div>

          <div>
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>SETTLEMENT OPTIONS</div>
            <div className="flex flex-wrap gap-2">
              {meta.settlementOptions.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-2xl text-xs font-semibold"
                  style={{ background:`${meta.color}10`, border:`1px solid ${meta.color}25`, color:"#E8EDF5" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveCredentials} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", opacity:saving?0.6:1 }}>
              {saving && <Loader2 size={11} className="animate-spin"/>}
              {saving ? "Saving…" : "Save Credentials"}
            </button>
            <button onClick={() => { copyToClipboard(`https://api.finalpassdown.com/webhooks/${meta.id}`); toast.success("Webhook URL copied"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
              <Copy size={11}/> Copy Webhook URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export function CryptoMerchant() {
  const [tab, setTab] = useState<Tab>("processors");
  const [rows, setRows] = useState<Record<string, ProcessorConfig>>({});
  const [settings, setSettings] = useState<CryptoSettings>(DEFAULT_CRYPTO_SETTINGS);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data, loading, error, refetch } = useAdminFetch(() => getProcessorConfigs(), []);

  useEffect(() => {
    if (!data) return;
    setRows(Object.fromEntries(data.processors.map(p => [p.id, p])));
    setSettings(data.settings);
  }, [data]);

  /* Every write returns the updated row, so the screen re-renders from what
     the server actually stored rather than from optimistic local state. */
  function absorb(row: ProcessorConfig) {
    setRows(prev => {
      const next = { ...prev, [row.id]: row };
      // Only one processor can be the default — reflect the server's clearing
      // of the previous one without a second round trip.
      if (row.isDefault) {
        for (const id of Object.keys(next)) {
          if (id !== row.id && next[id].isDefault) next[id] = { ...next[id], isDefault: false };
        }
      }
      return next;
    });
  }

  async function saveCredentials(id: string, config: Record<string, string>) {
    try {
      absorb(await patchProcessor(id, { config }));
      toast.success("Credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save credentials");
      throw err;
    }
  }

  async function toggleProcessor(id: string, enabled: boolean) {
    setBusyId(id);
    try {
      const row = await patchProcessor(id, { enabled });
      absorb(row);
      toast.success(`${row.name} ${enabled ? "connected" : "disconnected"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update processor");
    } finally {
      setBusyId(null);
    }
  }

  async function persistSettings() {
    setSavingSettings(true);
    try {
      await saveCryptoSettings(settings);
      toast.success("Crypto payment settings saved");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  const connected = PROCESSOR_CATALOG.filter(p => rows[p.id]?.enabled);
  const totalCryptoRevenue = TXS.filter(t=>t.status==="confirmed").reduce((s,t)=>s+t.usd, 0);
  const pendingTxs = TXS.filter(t=>t.status==="pending").length;

  const TABS: { id: Tab; label: string }[] = [
    { id:"processors",   label:"💳 Payment Processors" },
    { id:"transactions", label:"📋 Transactions" },
    { id:"wallets",      label:"🔐 Merchant Wallets" },
    { id:"settings",     label:"⚙️ Settings" },
  ];

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize:22.5 }}>₿</span>
          <span style={{ color:"#F7931A", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>ADMIN · CRYPTO MERCHANT CENTER</span>
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Crypto Payment Merchant</h1>
        <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
          Configure crypto payment processors, manage merchant accounts, track all crypto transactions, and set up settlement preferences.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Connected Processors", value:connected.length,                            color:"#D99A6B" },
          { label:"Crypto Revenue",        value:`$${totalCryptoRevenue.toLocaleString()}`,  color:"#F7931A" },
          { label:"Total Crypto TXNs",     value:TXS.filter(t=>t.status==="confirmed").length, color:"#6E90C9" },
          { label:"Pending Confirmations", value:pendingTxs,                                 color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:30, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Accepted coins strip */}
      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background:"rgba(247,147,26,0.05)", border:"1px solid rgba(247,147,26,0.2)" }}>
        <span style={{ color:"#F7931A", fontSize:15, fontWeight:600 }}>Accepting:</span>
        <div className="flex flex-wrap gap-2 flex-1">
          {["BTC","ETH","USDC","USDT","SOL","BNB","XRP","LTC"].map(coin => (
            <span key={coin} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background:`${COIN_COLORS[coin] ?? "#8A9AB8"}15`, color:COIN_COLORS[coin] ?? "#8A9AB8", border:`1px solid ${COIN_COLORS[coin] ?? "#8A9AB8"}30` }}>
              {COIN_LOGOS[coin] ?? "●"} {coin}
            </span>
          ))}
        </div>
        <span style={{ color:"#8A9AB8", fontSize:14 }}>once a processor is connected</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl w-fit" style={{ background:"#0A0F1A", border:"1px solid rgba(91,110,225,0.25)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background:tab===t.id?"#5B6EE1":"transparent", color:tab===t.id?"#fff":"#8A9AB8" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Processors tab ── */}
      {tab === "processors" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.15)" }}>
            <Shield size={14} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
            <div>
              <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>
                <strong style={{ color:"#E8EDF5" }}>Become a crypto merchant:</strong> Connect one or more processors below. Each processor handles payment routing, fraud screening, and automatic USD settlement so you never hold volatile crypto. We recommend Coinbase Commerce + BitPay for maximum coin coverage.
              </p>
            </div>
          </div>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10" style={{ color:"#8A9AB8" }}>
              <Loader2 size={15} className="animate-spin"/> Loading processor configuration…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-2xl"
              style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.25)" }}>
              <AlertCircle size={14} color="#FC8181" style={{ marginTop:2, flexShrink:0 }}/>
              <span style={{ color:"#FC8181", fontSize:15, lineHeight:1.6 }}>{error}</span>
            </div>
          )}
          {!loading && !error && PROCESSOR_CATALOG.map(meta => (
            <ProcessorCard key={meta.id} meta={meta} row={rows[meta.id]} busy={busyId===meta.id}
              onSave={saveCredentials} onToggle={toggleProcessor}/>
          ))}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {tab === "transactions" && TXS.length === 0 && (
        <EmptyPanel title="No crypto transactions"
          body="No crypto payment processor is integrated yet, so no crypto payments have been taken. Transactions will appear here once a processor is connected and its webhooks record payments."/>
      )}
      {tab === "transactions" && TXS.length > 0 && (
        <div className="space-y-4">
          {/* Volume by coin */}
          <div className="p-5 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:14 }}>Volume by Cryptocurrency</div>
            <div className="space-y-2.5">
              {(["BTC","ETH","USDC","USDT","SOL"] as const).map(coin => {
                const vol = TXS.filter(t=>t.coin===coin&&t.status==="confirmed").reduce((s,t)=>s+t.usd,0);
                const max = Math.max(...(["BTC","ETH","USDC","USDT","SOL"] as const).map(c=>TXS.filter(t=>t.coin===c&&t.status==="confirmed").reduce((s,t)=>s+t.usd,0)), 1);
                if (!vol) return null;
                return (
                  <div key={coin}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color:COIN_COLORS[coin], fontWeight:700 }}>{COIN_LOGOS[coin]}</span>
                        <span style={{ color:"#E8EDF5", fontSize:16 }}>{coin}</span>
                      </div>
                      <span style={{ color:COIN_COLORS[coin], fontSize:15, fontWeight:700, ...MONO }}>${vol.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                      <div className="h-2 rounded-full" style={{ width:`${(vol/max)*100}%`, background:COIN_COLORS[coin] }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction table */}
          <div className="rounded-2xl overflow-auto" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.08)", borderBottom:"1px solid rgba(91,110,225,0.1)" }}>
                  {["TXN ID","User","Type","Coin","Amount (Crypto)","USD Value","Processor","Date","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TXS.map((tx, i) => (
                  <tr key={tx.id} style={{ background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderBottom:"1px solid rgba(91,110,225,0.06)" }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#6E90C9", fontSize:12.5, ...MONO }}>{tx.id}</td>
                    <td className="px-4 py-3" style={{ color:"#E8EDF5", fontSize:15, fontWeight:500, whiteSpace:"nowrap" }}>{tx.user}</td>
                    <td className="px-4 py-3" style={{ color:"#8A9AB8", fontSize:14, whiteSpace:"nowrap" }}>{tx.type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color:COIN_COLORS[tx.coin] ?? "#8A9AB8", fontWeight:700 }}>{COIN_LOGOS[tx.coin] ?? "●"}</span>
                        <span style={{ color:COIN_COLORS[tx.coin] ?? "#8A9AB8", fontSize:14, fontWeight:700, ...MONO }}>{tx.coin}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#E8EDF5", fontSize:14, ...MONO }}>{tx.amount}</td>
                    <td className="px-4 py-3" style={{ color:"#D99A6B", fontSize:15, fontWeight:700, ...MONO }}>${tx.usd.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#8A9AB8", fontSize:14 }}>{tx.processor}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#8A9AB8", fontSize:14 }}>{tx.date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background:tx.status==="confirmed"?"rgba(72,187,120,0.1)":"rgba(246,173,85,0.1)", color:tx.status==="confirmed"?"#D99A6B":"#F6AD55", ...MONO }}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Wallets tab ── */}
      {tab === "wallets" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background:"rgba(247,147,26,0.05)", border:"1px solid rgba(247,147,26,0.2)" }}>
            <span style={{ fontSize:20 }}>🔐</span>
            <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>
              <strong style={{ color:"#E8EDF5" }}>Merchant wallets</strong> are managed by your connected payment processors — you never need to manage private keys directly. If you choose to hold crypto instead of auto-converting to USD, processor custodial wallets are used. For self-custody, configure your own wallet addresses below.
            </p>
          </div>

          <EmptyPanel title="No merchant wallets"
            body="Wallets and balances come from a connected processor's account. None is connected, so there are no addresses or balances to show."/>
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <div className="space-y-5 max-w-lg">
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-2xl"
              style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.25)" }}>
              <AlertCircle size={14} color="#FC8181" style={{ marginTop:2, flexShrink:0 }}/>
              <span style={{ color:"#FC8181", fontSize:15, lineHeight:1.6 }}>{error}</span>
            </div>
          )}
          <div className="p-5 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:4 }}>Payment Preferences</div>

            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>
                DEFAULT PROCESSOR FOR NEW PAYMENTS
              </label>
              <select value={settings.defaultProcessor} style={INPUT}
                onChange={e => setSettings(s => ({ ...s, defaultProcessor:e.target.value }))}>
                {PROCESSOR_CATALOG.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{rows[p.id]?.enabled ? "" : " (not connected)"}
                  </option>
                ))}
              </select>
            </div>

            {[
              { field:"settlementCurrency"   as const, label:"SETTLEMENT CURRENCY",       options:["USD","USDC","BTC","Keep as received"] },
              { field:"settlementFrequency"  as const, label:"SETTLEMENT FREQUENCY",      options:["Daily","Weekly","Monthly","Manual"] },
            ].map(f => (
              <div key={f.field}>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                <select value={settings[f.field]} style={INPUT}
                  onChange={e => setSettings(s => ({ ...s, [f.field]:e.target.value }))}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}

            {[
              { field:"paymentWindowMinutes" as const, label:"PAYMENT WINDOW (MINUTES)" },
              { field:"minPaymentUsd"        as const, label:"MINIMUM CRYPTO PAYMENT (USD)" },
              { field:"maxPaymentUsd"        as const, label:"MAXIMUM CRYPTO PAYMENT (USD)" },
            ].map(f => (
              <div key={f.field}>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                <input type="text" value={settings[f.field]} style={INPUT}
                  onChange={e => setSettings(s => ({ ...s, [f.field]:e.target.value }))}/>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <div>
                <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:500 }}>Show crypto payment option to all users</div>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>When off, crypto is only shown for $199 continuation fee</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, showToAllUsers:!s.showToAllUsers }))}
                style={{ color:settings.showToAllUsers?"#D99A6B":"#8A9AB8", flexShrink:0 }}>
                {settings.showToAllUsers ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
              </button>
            </div>

            <button onClick={persistSettings} disabled={savingSettings || loading}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", opacity:(savingSettings||loading)?0.6:1 }}>
              {savingSettings && <Loader2 size={14} className="animate-spin"/>}
              {savingSettings ? "Saving…" : "Save Settings"}
            </button>
          </div>

          {/* Merchant verification */}
          <div className="p-5 rounded-2xl" style={{ ...CARD, border:"1px solid rgba(247,147,26,0.3)", background:"rgba(247,147,26,0.03)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize:25 }}>₿</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>Merchant Business Verification</span>
            </div>
            <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7, marginBottom:12 }}>
              To unlock higher transaction limits and lower fees, complete business verification with each processor. Required for: transactions over $10,000/day, international payments, and institutional settlement.
            </p>
            <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>
              Verification happens in each processor's own dashboard. Its status isn't tracked here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
