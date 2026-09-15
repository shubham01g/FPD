import React, { useState } from "react";
import {
  Shield, CheckCircle, AlertCircle, ExternalLink, Copy,
  TrendingUp, DollarSign, Settings, Plus, X, ToggleLeft,
  ToggleRight, RefreshCw, Clock, ArrowUpRight, Building,
  Eye, EyeOff, Zap
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../utils/clipboard";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

type Tab = "processors" | "transactions" | "wallets" | "settings";

/* ── Crypto payment processors ───────────────────────────────────── */
interface Processor {
  id: string; name: string; logo: string; color: string;
  status: "connected" | "available" | "pending";
  website: string; description: string;
  features: string[];
  settlementOptions: string[];
  fees: string;
  config: Record<string, string>;
  showKeys: boolean;
}

const INITIAL_PROCESSORS: Processor[] = [
  {
    id:"coinbase",
    name:"Coinbase Commerce",
    logo:"🔵",
    color:"#0052FF",
    status:"available",
    website:"commerce.coinbase.com",
    description:"Institutional-grade crypto payments from Coinbase. Accept 10+ cryptocurrencies and settle to USD daily.",
    features:["BTC, ETH, USDC, LTC, DAI, and more","Auto-converts to USD","Fraud protection","PCI-DSS compliant","Webhook support","Global coverage"],
    settlementOptions:["USD (daily)","USDC","Hold as crypto"],
    fees:"1% per transaction",
    config:{ apiKey:"", webhookSecret:"", settlementCurrency:"" },
    showKeys: false,
  },
  {
    id:"bitpay",
    name:"BitPay",
    logo:"🟢",
    color:"#00C89C",
    status:"available",
    website:"bitpay.com",
    description:"World's largest Bitcoin payment processor. Accept BTC, ETH, XRP, and stablecoins with next-day USD settlement.",
    features:["Bitcoin & Ethereum native","XRP support","Next-day USD settlement","Refund management","Invoice API","Business dashboards"],
    settlementOptions:["USD (next business day)","EUR","GBP","Hold as BTC"],
    fees:"1% per transaction",
    config:{ apiToken:"", merchantId:"", notificationURL:"" },
    showKeys: false,
  },
  {
    id:"nowpayments",
    name:"NOWPayments",
    logo:"🟡",
    color:"#FFD700",
    status:"available",
    website:"nowpayments.io",
    description:"Accept 300+ cryptocurrencies. Keep crypto or auto-convert. Great for international users paying with altcoins.",
    features:["300+ cryptocurrencies","Keep crypto or convert","Mass payouts","Auto coin detection","Hosted payment pages","No KYC for users"],
    settlementOptions:["USD","BTC","ETH","Keep as received crypto"],
    fees:"0.5% per transaction",
    config:{ apiKey:"", ipnSecret:"" },
    showKeys: false,
  },
  {
    id:"stripe_crypto",
    name:"Stripe Crypto Payments",
    logo:"🟣",
    color:"#6772E5",
    status:"available",
    website:"stripe.com/crypto",
    description:"Stripe's native crypto acceptance. Seamlessly integrates with your existing Stripe setup. USDC on-ramp and off-ramp.",
    features:["USDC native","On-ramp / off-ramp","Same Stripe dashboard","Existing customer support","Instant settlement","Web3 wallet connect"],
    settlementOptions:["USD (Stripe balance)","USDC"],
    fees:"1.5% per transaction",
    config:{ stripePublishableKey:"", enableCrypto:"" },
    showKeys: false,
  },
  {
    id:"cryptodotcom",
    name:"Crypto.com Pay",
    logo:"🔴",
    color:"#002D74",
    status:"available",
    website:"crypto.com/pay",
    description:"Accept 20+ tokens via Crypto.com Pay. Tap into 80M+ Crypto.com users. Instant settlement in CRO or USD.",
    features:["20+ tokens accepted","80M+ Crypto.com users","Instant settlement","CRO rewards for merchants","Mobile-first UI","API + plugin support"],
    settlementOptions:["USD","CRO","USDT"],
    fees:"0.5% + 0.10 per transaction",
    config:{ merchantId:"", secretKey:"", payoutAddress:"" },
    showKeys: false,
  },
  {
    id:"strike",
    name:"Strike (Lightning)",
    logo:"⚡",
    color:"#5B21D9",
    status:"available",
    website:"strike.me",
    description:"Lightning Network Bitcoin payments. Near-instant, sub-cent fees. Ideal for small recurring charges and micropayments.",
    features:["Lightning Network speed","< $0.01 fees","Instant settlement","USD or BTC payout","No chargebacks","Open API"],
    settlementOptions:["USD","BTC (Lightning)"],
    fees:"< $0.01 per payment",
    config:{ apiKey:"", webhookUrl:"" },
    showKeys: false,
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
function ProcessorCard({ proc, onUpdate }: { proc: Processor; onUpdate: (id: string, changes: Partial<Processor>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState({ ...proc.config });
  const statusColor = { connected:"#48BB78", available:"#8A9AB8", pending:"#F6AD55" }[proc.status];
  const statusBg    = { connected:"rgba(72,187,120,0.1)", available:"rgba(107,114,128,0.1)", pending:"rgba(246,173,85,0.1)" }[proc.status];

  /* Nothing server-side stores or verifies processor credentials yet
     (crypto_processor_configs exists but no backend route writes it), so
     "connecting" here would only flip local state and claim a success that
     never happened. Say so instead. */
  function connect() {
    toast.error(`${proc.name} can't be connected yet — processor credentials aren't stored on the server.`);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-2xl text-2xl"
              style={{ width:52, height:52, background:`${proc.color}12`, border:`1px solid ${proc.color}30` }}>
              {proc.logo}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>{proc.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:statusBg, color:statusColor, ...MONO }}>
                  {proc.status.toUpperCase()}
                </span>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>
                {proc.fees} · Settles to: {proc.settlementOptions[0]}
              </div>
              <a href="#" style={{ color:proc.color, fontSize:14, display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
                {proc.website} <ExternalLink size={10}/>
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
              {expanded ? "Hide" : "Configure"}
            </button>
            <button onClick={connect}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:proc.status==="connected"?"rgba(252,129,129,0.1)":"rgba(72,187,120,0.1)", color:proc.status==="connected"?"#FC8181":"#D99A6B" }}>
              {proc.status === "connected" ? "Disconnect" : "Connect"}
            </button>
          </div>
        </div>

        <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7, marginTop:10 }}>{proc.description}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {proc.features.map(f => (
            <span key={f} className="px-2 py-0.5 rounded-full text-xs"
              style={{ background:`${proc.color}08`, border:`1px solid ${proc.color}20`, color:"#8A9AB8" }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"rgba(91,110,225,0.08)" }}>
          <div className="pt-4">
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:10 }}>API CREDENTIALS</div>
            <div className="space-y-3">
              {Object.entries(localConfig).map(([key, val]) => (
                <div key={key}>
                  <label style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, display:"block", marginBottom:4 }}>
                    {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token") ? (proc.showKeys ? "text" : "password") : "text"}
                      value={val}
                      onChange={e => setLocalConfig(p => ({ ...p, [key]:e.target.value }))}
                      placeholder={key.toLowerCase().includes("key") ? `Enter ${proc.name} ${key}` : val || `Enter ${key}`}
                      style={INPUT}/>
                    {(key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) && (
                      <button onClick={() => onUpdate(proc.id, { showKeys: !proc.showKeys })}
                        style={{ color:"#8A9AB8", flexShrink:0 }}>
                        {proc.showKeys ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>SETTLEMENT OPTIONS</div>
            <div className="flex flex-wrap gap-2">
              {proc.settlementOptions.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-2xl text-xs font-semibold"
                  style={{ background:`${proc.color}10`, border:`1px solid ${proc.color}25`, color:"#E8EDF5" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={connect}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
              Save Credentials
            </button>
            <button onClick={() => { copyToClipboard(`https://api.finalpassdown.com/webhooks/${proc.id}`); toast.success("Webhook URL copied"); }}
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
  const [processors, setProcessors] = useState<Processor[]>(INITIAL_PROCESSORS);

  function updateProcessor(id: string, changes: Partial<Processor>) {
    setProcessors(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }

  const connected = processors.filter(p => p.status === "connected");
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
          {processors.map(p => <ProcessorCard key={p.id} proc={p} onUpdate={updateProcessor}/>)}
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
          <div className="p-5 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:4 }}>Payment Preferences</div>

            {[
              { label:"Default processor for new payments", value:"Coinbase Commerce", type:"select", options:["Coinbase Commerce","BitPay","NOWPayments"] },
              { label:"Settlement currency", value:"USD", type:"select", options:["USD","USDC","BTC","Keep as received"] },
              { label:"Settlement frequency", value:"Daily", type:"select", options:["Daily","Weekly","Monthly","Manual"] },
              { label:"Payment window (minutes)", value:"30", type:"input" },
              { label:"Minimum crypto payment (USD)", value:"4.99", type:"input" },
              { label:"Maximum crypto payment (USD)", value:"9999.00", type:"input" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>
                  {f.label.toUpperCase()}
                </label>
                {f.type === "select" ? (
                  <select defaultValue={f.value} style={INPUT}>
                    {f.options?.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type="text" defaultValue={f.value} style={INPUT}/>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <div>
                <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:500 }}>Show crypto payment option to all users</div>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>When off, crypto is only shown for $199 continuation fee</div>
              </div>
              <ToggleRight size={28} color="#FFFFFF"/>
            </div>

            <button onClick={() => toast.error("Not saved — crypto payment settings have no server-side storage yet.")}
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
              Save Settings
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
