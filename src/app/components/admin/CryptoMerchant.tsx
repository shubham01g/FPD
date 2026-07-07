import React, { useState } from "react";
import {
  Shield, CheckCircle, AlertCircle, ExternalLink, Copy,
  TrendingUp, DollarSign, Settings, Plus, X, ToggleLeft,
  ToggleRight, RefreshCw, Clock, ArrowUpRight, Building,
  Eye, EyeOff, Zap
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../utils/clipboard";

const CARD: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(108,92,231,0.1)", boxShadow:"0 2px 12px rgba(108,92,231,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", color:"#0D1428", fontSize:13, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

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
    status:"connected",
    website:"commerce.coinbase.com",
    description:"Institutional-grade crypto payments from Coinbase. Accept 10+ cryptocurrencies and settle to USD daily.",
    features:["BTC, ETH, USDC, LTC, DAI, and more","Auto-converts to USD","Fraud protection","PCI-DSS compliant","Webhook support","Global coverage"],
    settlementOptions:["USD (daily)","USDC","Hold as crypto"],
    fees:"1% per transaction",
    config:{ apiKey:"coinbase_api_key_fpd_live_xxxxxxxx", webhookSecret:"whsec_coinbase_xxxx", settlementCurrency:"USD" },
    showKeys: false,
  },
  {
    id:"bitpay",
    name:"BitPay",
    logo:"🟢",
    color:"#00C89C",
    status:"connected",
    website:"bitpay.com",
    description:"World's largest Bitcoin payment processor. Accept BTC, ETH, XRP, and stablecoins with next-day USD settlement.",
    features:["Bitcoin & Ethereum native","XRP support","Next-day USD settlement","Refund management","Invoice API","Business dashboards"],
    settlementOptions:["USD (next business day)","EUR","GBP","Hold as BTC"],
    fees:"1% per transaction",
    config:{ apiToken:"bitpay_api_token_fpd_xxxxxxxx", merchantId:"FPD_MERCHANT_ID", notificationURL:"https://api.finalpassdown.com/webhooks/bitpay" },
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
    config:{ stripePublishableKey:"pk_live_...", enableCrypto:"true" },
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

/* ── Mock transactions ────────────────────────────────────────────── */
const MOCK_TXS = [
  { id:"CTXN-001", user:"James Doe",      type:"Continuation Fee", coin:"BTC",  amount:"0.002948 BTC", usd:199.00, processor:"Coinbase Commerce", date:"Jun 18, 2026", status:"confirmed", hash:"bc1q...x8f2" },
  { id:"CTXN-002", user:"Patricia Wells", type:"Premium Plan",     coin:"ETH",  amount:"0.060610 ETH", usd:199.00, processor:"Coinbase Commerce", date:"Jun 17, 2026", status:"confirmed", hash:"0x71c...976f" },
  { id:"CTXN-003", user:"Marcus Johnson", type:"Essential Plan",   coin:"USDC", amount:"9.99 USDC",    usd:9.99,   processor:"BitPay",            date:"Jun 16, 2026", status:"confirmed", hash:"0x4a8...bb21" },
  { id:"CTXN-004", user:"Sarah Chen",     type:"Legacy Pro Plan",  coin:"BTC",  amount:"0.000741 BTC", usd:49.99,  processor:"Coinbase Commerce", date:"Jun 15, 2026", status:"confirmed", hash:"bc1q...3k9m" },
  { id:"CTXN-005", user:"Robert Kim",     type:"Continuation Fee", coin:"SOL",  amount:"1.118 SOL",    usd:199.00, processor:"Coinbase Commerce", date:"Jun 14, 2026", status:"confirmed", hash:"7Ecd...tV4x" },
  { id:"CTXN-006", user:"Amanda Torres",  type:"Essential Plan",   coin:"USDT", amount:"9.99 USDT",    usd:9.99,   processor:"BitPay",            date:"Jun 13, 2026", status:"confirmed", hash:"TQn9...KLSE" },
  { id:"CTXN-007", user:"Unknown user",   type:"Premium Plan",     coin:"ETH",  amount:"0.060610 ETH", usd:199.00, processor:"Coinbase Commerce", date:"Jun 12, 2026", status:"pending",   hash:"0x9ff...821a" },
];

const COIN_COLORS: Record<string,string> = { BTC:"#F7931A", ETH:"#627EEA", USDC:"#2775CA", USDT:"#26A17B", SOL:"#9945FF", BNB:"#F3BA2F", XRP:"#00A3E0" };
const COIN_LOGOS: Record<string,string>  = { BTC:"₿", ETH:"Ξ", USDC:"$", USDT:"₮", SOL:"◎", BNB:"B", XRP:"✕" };

/* ── Processor card ──────────────────────────────────────────────── */
function ProcessorCard({ proc, onUpdate }: { proc: Processor; onUpdate: (id: string, changes: Partial<Processor>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState({ ...proc.config });
  const statusColor = { connected:"#48BB78", available:"#8A9AB8", pending:"#F6AD55" }[proc.status];
  const statusBg    = { connected:"rgba(72,187,120,0.1)", available:"rgba(107,114,128,0.1)", pending:"rgba(246,173,85,0.1)" }[proc.status];

  function connect() {
    const hasRequired = Object.values(localConfig).every(v => v.trim() !== "");
    if (!hasRequired && proc.status !== "connected") {
      toast.error("Please fill in all credential fields before connecting");
      return;
    }
    onUpdate(proc.id, { status: proc.status === "connected" ? "available" : "connected", config: localConfig });
    toast.success(proc.status === "connected" ? `${proc.name} disconnected` : `${proc.name} connected successfully`);
  }

  return (
    <div className="rounded-2xl overflow-hidden glow-surface" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-2xl text-2xl"
              style={{ width:52, height:52, background:`${proc.color}12`, border:`1px solid ${proc.color}30` }}>
              {proc.logo}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#0D1428" }}>{proc.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:statusBg, color:statusColor, ...MONO }}>
                  {proc.status.toUpperCase()}
                </span>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>
                {proc.fees} · Settles to: {proc.settlementOptions[0]}
              </div>
              <a href="#" style={{ color:proc.color, fontSize:11, display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
                {proc.website} <ExternalLink size={10}/>
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7" }}>
              {expanded ? "Hide" : "Configure"}
            </button>
            <button onClick={connect}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background:proc.status==="connected"?"rgba(252,129,129,0.1)":"rgba(72,187,120,0.1)", color:proc.status==="connected"?"#FC8181":"#48BB78" }}>
              {proc.status === "connected" ? "Disconnect" : "Connect"}
            </button>
          </div>
        </div>

        <p style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7, marginTop:10 }}>{proc.description}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {proc.features.map(f => (
            <span key={f} className="px-2 py-0.5 rounded-full text-xs"
              style={{ background:`${proc.color}08`, border:`1px solid ${proc.color}20`, color:"#5A6A88" }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"rgba(108,92,231,0.08)" }}>
          <div className="pt-4">
            <div style={{ color:"#5A6A88", fontSize:10, ...MONO, marginBottom:10 }}>API CREDENTIALS</div>
            <div className="space-y-3">
              {Object.entries(localConfig).map(([key, val]) => (
                <div key={key}>
                  <label style={{ color:"#8A9AB8", fontSize:10, ...MONO, display:"block", marginBottom:4 }}>
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
            <div style={{ color:"#5A6A88", fontSize:10, ...MONO, marginBottom:6 }}>SETTLEMENT OPTIONS</div>
            <div className="flex flex-wrap gap-2">
              {proc.settlementOptions.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background:`${proc.color}10`, border:`1px solid ${proc.color}25`, color:"#0D1428" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { onUpdate(proc.id, { config: localConfig }); toast.success("Settings saved"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#F0F4FA" }}>
              Save Credentials
            </button>
            <button onClick={() => { copyToClipboard(`https://api.finalpassdown.com/webhooks/${proc.id}`); toast.success("Webhook URL copied"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7" }}>
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
  const totalCryptoRevenue = MOCK_TXS.filter(t=>t.status==="confirmed").reduce((s,t)=>s+t.usd, 0);
  const pendingTxs = MOCK_TXS.filter(t=>t.status==="pending").length;

  const TABS: { id: Tab; label: string }[] = [
    { id:"processors",   label:"💳 Payment Processors" },
    { id:"transactions", label:"📋 Transactions" },
    { id:"wallets",      label:"🔐 Merchant Wallets" },
    { id:"settings",     label:"⚙️ Settings" },
  ];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize:18 }}>₿</span>
          <span style={{ color:"#F7931A", fontSize:11, ...MONO, letterSpacing:"0.1em" }}>ADMIN · CRYPTO MERCHANT CENTER</span>
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#0D1428" }}>Crypto Payment Merchant</h1>
        <p style={{ color:"#5A6A88", fontSize:13, marginTop:4 }}>
          Configure crypto payment processors, manage merchant accounts, track all crypto transactions, and set up settlement preferences.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Connected Processors", value:connected.length,                            color:"#48BB78" },
          { label:"Crypto Revenue (Jun)",  value:`$${totalCryptoRevenue.toLocaleString()}`,  color:"#F7931A" },
          { label:"Total Crypto TXNs",     value:MOCK_TXS.filter(t=>t.status==="confirmed").length, color:"#6C5CE7" },
          { label:"Pending Confirmations", value:pendingTxs,                                 color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl glow-surface" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:24, color:s.color }}>{s.value}</div>
            <div style={{ color:"#5A6A88", fontSize:12, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Accepted coins strip */}
      <div className="flex items-center gap-3 p-4 rounded-2xl glow-surface" style={{ background:"rgba(247,147,26,0.05)", border:"1px solid rgba(247,147,26,0.2)" }}>
        <span style={{ color:"#F7931A", fontSize:12, fontWeight:600 }}>Accepting:</span>
        <div className="flex flex-wrap gap-2 flex-1">
          {["BTC","ETH","USDC","USDT","SOL","BNB","XRP","LTC"].map(coin => (
            <span key={coin} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background:`${COIN_COLORS[coin] ?? "#5A6A88"}15`, color:COIN_COLORS[coin] ?? "#5A6A88", border:`1px solid ${COIN_COLORS[coin] ?? "#5A6A88"}30` }}>
              {COIN_LOGOS[coin] ?? "●"} {coin}
            </span>
          ))}
        </div>
        <span style={{ color:"#8A9AB8", fontSize:11 }}>via connected processors</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(108,92,231,0.1)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background:tab===t.id?"#6C5CE7":"transparent", color:tab===t.id?"#fff":"#5A6A88" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Processors tab ── */}
      {tab === "processors" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl glow-surface"
            style={{ background:"rgba(108,92,231,0.04)", border:"1px solid rgba(108,92,231,0.15)" }}>
            <Shield size={14} color="#6C5CE7" style={{ marginTop:1, flexShrink:0 }}/>
            <div>
              <p style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7 }}>
                <strong style={{ color:"#0D1428" }}>Become a crypto merchant:</strong> Connect one or more processors below. Each processor handles payment routing, fraud screening, and automatic USD settlement so you never hold volatile crypto. We recommend Coinbase Commerce + BitPay for maximum coin coverage.
              </p>
            </div>
          </div>
          {processors.map(p => <ProcessorCard key={p.id} proc={p} onUpdate={updateProcessor}/>)}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          {/* Volume by coin */}
          <div className="p-5 rounded-2xl glow-surface" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428", marginBottom:14 }}>Volume by Cryptocurrency</div>
            <div className="space-y-2.5">
              {(["BTC","ETH","USDC","USDT","SOL"] as const).map(coin => {
                const vol = MOCK_TXS.filter(t=>t.coin===coin&&t.status==="confirmed").reduce((s,t)=>s+t.usd,0);
                const max = Math.max(...(["BTC","ETH","USDC","USDT","SOL"] as const).map(c=>MOCK_TXS.filter(t=>t.coin===c&&t.status==="confirmed").reduce((s,t)=>s+t.usd,0)), 1);
                if (!vol) return null;
                return (
                  <div key={coin}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color:COIN_COLORS[coin], fontWeight:700 }}>{COIN_LOGOS[coin]}</span>
                        <span style={{ color:"#0D1428", fontSize:13 }}>{coin}</span>
                      </div>
                      <span style={{ color:COIN_COLORS[coin], fontSize:12, fontWeight:700, ...MONO }}>${vol.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background:"#EAF0FC" }}>
                      <div className="h-2 rounded-full" style={{ width:`${(vol/max)*100}%`, background:COIN_COLORS[coin] }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction table */}
          <div className="rounded-2xl overflow-auto" style={{ border:"1px solid rgba(108,92,231,0.1)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background:"#EAF0FC", borderBottom:"1px solid rgba(108,92,231,0.1)" }}>
                  {["TXN ID","User","Type","Coin","Amount (Crypto)","USD Value","Processor","Date","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ color:"#5A6A88", fontSize:10, ...MONO }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_TXS.map((tx, i) => (
                  <tr key={tx.id} style={{ background:i%2===0?"#fff":"#F8FAFF", borderBottom:"1px solid rgba(108,92,231,0.06)" }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#6C5CE7", fontSize:10, ...MONO }}>{tx.id}</td>
                    <td className="px-4 py-3" style={{ color:"#0D1428", fontSize:12, fontWeight:500, whiteSpace:"nowrap" }}>{tx.user}</td>
                    <td className="px-4 py-3" style={{ color:"#5A6A88", fontSize:11, whiteSpace:"nowrap" }}>{tx.type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color:COIN_COLORS[tx.coin] ?? "#5A6A88", fontWeight:700 }}>{COIN_LOGOS[tx.coin] ?? "●"}</span>
                        <span style={{ color:COIN_COLORS[tx.coin] ?? "#5A6A88", fontSize:11, fontWeight:700, ...MONO }}>{tx.coin}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#0D1428", fontSize:11, ...MONO }}>{tx.amount}</td>
                    <td className="px-4 py-3" style={{ color:"#48BB78", fontSize:12, fontWeight:700, ...MONO }}>${tx.usd.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#5A6A88", fontSize:11 }}>{tx.processor}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color:"#5A6A88", fontSize:11 }}>{tx.date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background:tx.status==="confirmed"?"rgba(72,187,120,0.1)":"rgba(246,173,85,0.1)", color:tx.status==="confirmed"?"#48BB78":"#F6AD55", ...MONO }}>
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
          <div className="flex items-start gap-3 p-4 rounded-2xl glow-surface"
            style={{ background:"rgba(247,147,26,0.05)", border:"1px solid rgba(247,147,26,0.2)" }}>
            <span style={{ fontSize:16 }}>🔐</span>
            <p style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7 }}>
              <strong style={{ color:"#0D1428" }}>Merchant wallets</strong> are managed by your connected payment processors — you never need to manage private keys directly. If you choose to hold crypto instead of auto-converting to USD, processor custodial wallets are used. For self-custody, configure your own wallet addresses below.
            </p>
          </div>

          {[
            { coin:"BTC", emoji:"₿", color:"#F7931A", address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", balance:"0.0412 BTC", usd:"$2,777", custody:"Coinbase Commerce" },
            { coin:"ETH", emoji:"Ξ", color:"#627EEA", address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F", balance:"0.8241 ETH", usd:"$2,707", custody:"Coinbase Commerce" },
            { coin:"USDC",emoji:"$", color:"#2775CA", address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F", balance:"1,284.00 USDC", usd:"$1,284", custody:"BitPay" },
          ].map(w => (
            <div key={w.coin} className="p-5 rounded-2xl glow-surface" style={CARD}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-full font-bold"
                    style={{ width:44, height:44, background:`${w.color}15`, color:w.color, fontSize:20 }}>
                    {w.emoji}
                  </div>
                  <div>
                    <div style={{ color:"#0D1428", fontSize:15, fontWeight:600 }}>{w.coin} Merchant Wallet</div>
                    <div style={{ color:"#8A9AB8", fontSize:11, marginTop:2 }}>Custodied by {w.custody}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ color:w.color, fontSize:18, fontWeight:700, fontFamily:"var(--font-display)" }}>{w.balance}</div>
                  <div style={{ color:"#8A9AB8", fontSize:12 }}>{w.usd} USD</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl"
                style={{ background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.1)" }}>
                <span style={{ color:"#8A9AB8", fontSize:10, ...MONO, flexShrink:0 }}>ADDRESS:</span>
                <code style={{ color:"#5A6A88", fontSize:11, flex:1 }} className="truncate">{w.address}</code>
                <button onClick={() => { copyToClipboard(w.address); toast.success(`${w.coin} address copied`); }}
                  style={{ color:"#6C5CE7", flexShrink:0 }}><Copy size={13}/></button>
              </div>
            </div>
          ))}

          <button onClick={() => toast.success("Manual wallet setup — contact integrations@finalpassdown.com")}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
            style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7", border:"1px solid rgba(108,92,231,0.2)" }}>
            <Plus size={14}/> Add Self-Custody Wallet Address
          </button>
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <div className="space-y-5 max-w-lg">
          <div className="p-5 rounded-2xl space-y-4 glow-surface" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428", marginBottom:4 }}>Payment Preferences</div>

            {[
              { label:"Default processor for new payments", value:"Coinbase Commerce", type:"select", options:["Coinbase Commerce","BitPay","NOWPayments"] },
              { label:"Settlement currency", value:"USD", type:"select", options:["USD","USDC","BTC","Keep as received"] },
              { label:"Settlement frequency", value:"Daily", type:"select", options:["Daily","Weekly","Monthly","Manual"] },
              { label:"Payment window (minutes)", value:"30", type:"input" },
              { label:"Minimum crypto payment (USD)", value:"4.99", type:"input" },
              { label:"Maximum crypto payment (USD)", value:"9999.00", type:"input" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>
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
                <div style={{ color:"#0D1428", fontSize:13, fontWeight:500 }}>Show crypto payment option to all users</div>
                <div style={{ color:"#8A9AB8", fontSize:11 }}>When off, crypto is only shown for $199 continuation fee</div>
              </div>
              <ToggleRight size={28} color="#6C5CE7"/>
            </div>

            <button onClick={() => toast.success("Crypto payment settings saved")}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#F0F4FA" }}>
              Save Settings
            </button>
          </div>

          {/* Merchant verification */}
          <div className="p-5 rounded-2xl glow-surface" style={{ ...CARD, border:"1px solid rgba(247,147,26,0.3)", background:"rgba(247,147,26,0.03)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize:20 }}>₿</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428" }}>Merchant Business Verification</span>
            </div>
            <p style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7, marginBottom:12 }}>
              To unlock higher transaction limits and lower fees, complete business verification with each processor. Required for: transactions over $10,000/day, international payments, and institutional settlement.
            </p>
            {[
              { name:"Coinbase Commerce",  status:"Verified ✓",      color:"#48BB78" },
              { name:"BitPay",             status:"Verified ✓",      color:"#48BB78" },
              { name:"NOWPayments",        status:"Not started",     color:"#8A9AB8" },
            ].map(v => (
              <div key={v.name} className="flex items-center justify-between py-2 border-b" style={{ borderColor:"rgba(108,92,231,0.06)" }}>
                <span style={{ color:"#0D1428", fontSize:13 }}>{v.name}</span>
                <span style={{ color:v.color, fontSize:12, fontWeight:600 }}>{v.status}</span>
              </div>
            ))}
            <button onClick={() => toast.success("Business verification — complete at nowpayments.io/merchant")}
              className="flex items-center gap-1.5 mt-3 text-sm px-4 py-2 rounded-xl font-semibold"
              style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7" }}>
              <ExternalLink size={12}/> Complete NOWPayments Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
