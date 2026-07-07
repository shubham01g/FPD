/**
 * CryptoPayment
 * ─────────────
 * Reusable crypto checkout modal.
 * Shows coin picker → wallet address + QR → countdown → confirmation.
 * Fully demo-mode: simulates a payment arriving after 8 seconds.
 *
 * Usage:
 *   <CryptoPayment
 *     open={show}
 *     amountUSD={199}
 *     label="$199 Legacy Continuation Fee"
 *     onSuccess={() => handleSuccess()}
 *     onClose={() => setShow(false)}
 *   />
 */
import React, { useState, useEffect, useRef } from "react";
import {
  X, Copy, CheckCircle, Clock, AlertCircle, RefreshCw,
  ArrowLeft, Shield, ExternalLink, Zap
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../utils/clipboard";

/* ── Supported coins ────────────────────────────────────────────── */
interface Coin {
  id: string; name: string; symbol: string; emoji: string;
  color: string; network: string; confirmations: number;
  demoRate: number; // USD per 1 coin (demo, not live)
  address: string;  // demo wallet address
  logoChar: string;
}

const COINS: Coin[] = [
  { id:"btc",  name:"Bitcoin",         symbol:"BTC",  emoji:"₿",  color:"#F7931A", network:"Bitcoin",            confirmations:2, demoRate:67_420, address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", logoChar:"₿" },
  { id:"eth",  name:"Ethereum",        symbol:"ETH",  emoji:"Ξ",  color:"#627EEA", network:"Ethereum (ERC-20)",   confirmations:12, demoRate:3_284, address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F", logoChar:"Ξ" },
  { id:"usdc", name:"USD Coin",        symbol:"USDC", emoji:"$",  color:"#2775CA", network:"Ethereum (ERC-20)",   confirmations:12, demoRate:1.00,  address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F", logoChar:"$" },
  { id:"usdt", name:"Tether",          symbol:"USDT", emoji:"₮",  color:"#26A17B", network:"TRC-20 (Tron)",       confirmations:20, demoRate:1.00,  address:"TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", logoChar:"₮" },
  { id:"sol",  name:"Solana",          symbol:"SOL",  emoji:"◎",  color:"#9945FF", network:"Solana",              confirmations:1,  demoRate:178.42, address:"7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV", logoChar:"◎" },
  { id:"bnb",  name:"BNB",             symbol:"BNB",  emoji:"B",  color:"#F3BA2F", network:"BNB Smart Chain",     confirmations:15, demoRate:584.20, address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F", logoChar:"B" },
  { id:"xrp",  name:"XRP",             symbol:"XRP",  emoji:"✕",  color:"#00A3E0", network:"XRP Ledger",          confirmations:4,  demoRate:0.522, address:"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh", logoChar:"✕" },
  { id:"ltc",  name:"Litecoin",        symbol:"LTC",  emoji:"Ł",  color:"#BFBBBB", network:"Litecoin",            confirmations:6,  demoRate:84.50,  address:"LTdsVS8VDw6syvfQADdhf2PHAm3rMGJvPX", logoChar:"Ł" },
];

const PROCESSORS = [
  { id:"coinbase", name:"Coinbase Commerce", logo:"🔵", status:"connected", settleTo:"USD (daily)" },
  { id:"bitpay",   name:"BitPay",            logo:"🟢", status:"connected", settleTo:"USD (next day)" },
  { id:"nowpay",   name:"NOWPayments",       logo:"🟡", status:"available", settleTo:"USD or Crypto" },
];

/* ── QR code simulation (pure CSS grid of cells) ────────────────── */
function QRCode({ value, color, size = 120 }: { value: string; color: string; size?: number }) {
  // Deterministically generate a QR-like grid from the address string
  const cells = 17;
  const cellSize = size / cells;
  const grid: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    grid.push([]);
    for (let c = 0; c < cells; c++) {
      // Corner squares
      const isCorner = (r < 3 && c < 3) || (r < 3 && c >= cells-3) || (r >= cells-3 && c < 3);
      const borderCorner = (r === 0 || r === 2 || r === cells-3 || r === cells-1) &&
        ((c < 3 && (r < 3 || r >= cells-3)) || (c >= cells-3 && r < 3));
      if (isCorner && !borderCorner) { grid[r].push(true); continue; }
      // Data cells from address hash
      const charCode = value.charCodeAt((r * cells + c) % value.length);
      grid[r].push((charCode + r * 3 + c * 7) % 3 !== 0);
    }
  }

  return (
    <div style={{ display:"inline-grid", gridTemplateColumns:`repeat(${cells}, ${cellSize}px)`, gap:0, padding:6, background:"#fff", borderRadius:8 }}>
      {grid.flat().map((filled, i) => (
        <div key={i} style={{ width:cellSize, height:cellSize, background:filled ? color : "transparent" }}/>
      ))}
    </div>
  );
}

/* ── Countdown timer ─────────────────────────────────────────────── */
function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const pct = (remaining / seconds) * 100;
  const color = remaining < 120 ? "#FC8181" : remaining < 300 ? "#F6AD55" : "#48BB78";
  return (
    <div className="text-center">
      <div style={{ color, fontSize:28, fontFamily:"var(--font-mono)", fontWeight:700, lineHeight:1 }}>
        {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </div>
      <div style={{ color:"#8A9AB8", fontSize:10, marginTop:2 }}>Payment window remaining</div>
      <div className="h-1.5 rounded-full mt-2" style={{ background:"rgba(255,255,255,0.1)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width:`${pct}%`, background:color }}/>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
interface CryptoPaymentProps {
  open: boolean;
  amountUSD: number;
  label: string;
  onSuccess: () => void;
  onClose: () => void;
  processor?: string; // optional: "coinbase" | "bitpay" | "nowpay"
}

type PayStep = "select" | "awaiting" | "confirming" | "success" | "expired";

export function CryptoPayment({ open, amountUSD, label, onSuccess, onClose, processor }: CryptoPaymentProps) {
  const [step, setStep] = useState<PayStep>("select");
  const [selectedCoin, setSelectedCoin] = useState<Coin>(COINS[0]);
  const [copied, setCopied] = useState(false);
  const [txHash] = useState(`0x${Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join("")}`);
  const [invoiceId] = useState(`FPD-${Date.now().toString(36).toUpperCase()}`);
  const simRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cryptoAmount = (amountUSD / selectedCoin.demoRate).toFixed(
    selectedCoin.demoRate < 10 ? 2 : selectedCoin.demoRate < 100 ? 4 : selectedCoin.demoRate < 10000 ? 5 : 6
  );

  useEffect(() => {
    if (!open) {
      setStep("select");
      if (simRef.current) clearTimeout(simRef.current);
    }
  }, [open]);

  function startPayment(coin: Coin) {
    setSelectedCoin(coin);
    setStep("awaiting");
    // Simulate payment arriving after 8 seconds in demo mode
    simRef.current = setTimeout(() => setStep("confirming"), 8000);
  }

  useEffect(() => {
    if (step === "confirming") {
      simRef.current = setTimeout(() => { setStep("success"); }, 4000);
    }
    if (step === "success") {
      setTimeout(() => { onSuccess(); }, 2500);
    }
    return () => { if (simRef.current) clearTimeout(simRef.current); };
  }, [step, onSuccess]);

  function doCopy(text: string) {
    copyToClipboard(text);
    setCopied(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopied(false), 3000);
  }

  if (!open) return null;

  const DARK: React.CSSProperties = { background:"#060D1A" };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)" }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
        style={{ ...DARK, border:"1px solid rgba(255,255,255,0.08)", maxHeight:"96vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor:"rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">₿</div>
            <div>
              <div style={{ color:"#E8EDF5", fontSize:14, fontWeight:600 }}>Pay with Crypto</div>
              <div style={{ color:"#4A5A7A", fontSize:11, fontFamily:"var(--font-mono)" }}>{label} · ${amountUSD.toFixed(2)} USD</div>
            </div>
          </div>
          {step !== "success" && step !== "confirming" && (
            <button onClick={() => { if(simRef.current) clearTimeout(simRef.current); onClose(); }}
              style={{ color:"#4A5A7A" }}><X size={18}/></button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-5">

          {/* ── Step: Select coin ── */}
          {step === "select" && (
            <div className="space-y-4">
              <div style={{ color:"#6B7FA8", fontSize:12, textAlign:"center" }}>
                Choose your cryptocurrency to pay <strong style={{ color:"#E8EDF5" }}>${amountUSD.toFixed(2)} USD</strong>
              </div>

              <div className="space-y-2">
                {COINS.map(coin => {
                  const amt = (amountUSD / coin.demoRate).toFixed(
                    coin.demoRate < 10 ? 2 : coin.demoRate < 100 ? 4 : coin.demoRate < 10000 ? 5 : 6
                  );
                  return (
                    <button key={coin.id} onClick={() => startPayment(coin)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                        style={{ width:40, height:40, background:`${coin.color}20`, color:coin.color, fontSize:18 }}>
                        {coin.logoChar}
                      </div>
                      <div className="flex-1 text-left">
                        <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:600 }}>{coin.name}</div>
                        <div style={{ color:"#4A5A7A", fontSize:11 }}>{coin.network}</div>
                      </div>
                      <div className="text-right">
                        <div style={{ color:coin.color, fontSize:13, fontWeight:700, fontFamily:"var(--font-mono)" }}>
                          {amt} {coin.symbol}
                        </div>
                        <div style={{ color:"#4A5A7A", fontSize:10 }}>${coin.demoRate.toLocaleString()}/{coin.symbol}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Processor strip */}
              <div className="pt-2 border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
                <div style={{ color:"#4A5A7A", fontSize:10, fontFamily:"var(--font-mono)", marginBottom:8, textAlign:"center" }}>POWERED BY</div>
                <div className="flex justify-center gap-4">
                  {PROCESSORS.filter(p=>p.status==="connected").map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize:14 }}>{p.logo}</span>
                      <span style={{ color:"#6B7FA8", fontSize:11 }}>{p.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ color:"#4A5A7A", fontSize:10, textAlign:"center", marginTop:8 }}>
                  All crypto payments settle to USD automatically
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Awaiting payment ── */}
          {step === "awaiting" && (
            <div className="space-y-5 text-center">
              <div className="flex items-center justify-between">
                <button onClick={() => { if(simRef.current) clearTimeout(simRef.current); setStep("select"); }}
                  className="flex items-center gap-1 text-sm" style={{ color:"#6B7FA8" }}>
                  <ArrowLeft size={13}/> Back
                </button>
                <Countdown seconds={1800} onExpire={() => setStep("expired")}/>
              </div>

              {/* Coin header */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center justify-center rounded-full font-bold"
                  style={{ width:48, height:48, background:`${selectedCoin.color}20`, color:selectedCoin.color, fontSize:22 }}>
                  {selectedCoin.logoChar}
                </div>
                <div className="text-left">
                  <div style={{ color:"#E8EDF5", fontSize:22, fontWeight:700, fontFamily:"var(--font-mono)" }}>
                    {cryptoAmount} {selectedCoin.symbol}
                  </div>
                  <div style={{ color:"#6B7FA8", fontSize:12 }}>${amountUSD.toFixed(2)} USD · {selectedCoin.network}</div>
                </div>
              </div>

              {/* QR code */}
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl" style={{ background:"#FFFFFF" }}>
                  <QRCode value={selectedCoin.address} color={selectedCoin.color} size={140}/>
                </div>
              </div>

              {/* Wallet address */}
              <div>
                <div style={{ color:"#6B7FA8", fontSize:10, fontFamily:"var(--font-mono)", marginBottom:6 }}>
                  SEND EXACTLY {cryptoAmount} {selectedCoin.symbol} TO:
                </div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <code style={{ color:"#E8EDF5", fontSize:11, flex:1, textAlign:"left", wordBreak:"break-all", fontFamily:"var(--font-mono)" }}>
                    {selectedCoin.address}
                  </code>
                  <button onClick={() => doCopy(selectedCoin.address)} className="flex-shrink-0 p-1.5 rounded-lg"
                    style={{ background: copied ? "rgba(72,187,120,0.15)" : "rgba(255,255,255,0.06)", color: copied ? "#48BB78" : "#6B7FA8" }}>
                    {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
                  </button>
                </div>
              </div>

              {/* Invoice ID */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color:"#6B7FA8", fontSize:11, fontFamily:"var(--font-mono)" }}>INVOICE ID</span>
                <span style={{ color:"#E8EDF5", fontSize:11, fontFamily:"var(--font-mono)" }}>{invoiceId}</span>
              </div>

              {/* Warnings */}
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background:"rgba(246,173,85,0.08)", border:"1px solid rgba(246,173,85,0.2)" }}>
                  <AlertCircle size={12} color="#F6AD55" style={{ marginTop:1, flexShrink:0 }}/>
                  <p style={{ color:"#F6AD55", fontSize:11, lineHeight:1.6 }}>
                    Send <strong>exactly</strong> {cryptoAmount} {selectedCoin.symbol}. Incorrect amounts cannot be auto-matched.
                    Required confirmations: {selectedCoin.confirmations}.
                  </p>
                </div>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background:"rgba(108,92,231,0.08)", border:"1px solid rgba(108,92,231,0.15)" }}>
                  <Shield size={12} color="#A29BFE" style={{ marginTop:1, flexShrink:0 }}/>
                  <p style={{ color:"#A29BFE", fontSize:11, lineHeight:1.6 }}>
                    Only send {selectedCoin.symbol} on the {selectedCoin.network} network. Sending on wrong network will result in permanent loss.
                  </p>
                </div>
              </div>

              {/* Demo note */}
              <div className="px-3 py-2 rounded-xl"
                style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.15)" }}>
                <span style={{ color:"#48BB78", fontSize:10, fontFamily:"var(--font-mono)" }}>
                  DEMO MODE · Payment auto-simulates in ~8 seconds
                </span>
              </div>
            </div>
          )}

          {/* ── Step: Confirming ── */}
          {step === "confirming" && (
            <div className="text-center py-8 space-y-6">
              <div style={{ animation:"spin 1.5s linear infinite", display:"inline-block" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", border:`3px solid ${selectedCoin.color}`, borderTopColor:"transparent" }}/>
              </div>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:18, fontWeight:600, marginBottom:6 }}>Payment Detected</div>
                <div style={{ color:"#6B7FA8", fontSize:13, lineHeight:1.8 }}>
                  We received your {selectedCoin.symbol} payment.<br/>
                  Waiting for {selectedCoin.confirmations} blockchain confirmation{selectedCoin.confirmations > 1 ? "s" : ""}…
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background:"rgba(255,255,255,0.04)" }}>
                  <span style={{ color:"#6B7FA8", fontSize:12 }}>Amount</span>
                  <span style={{ color:selectedCoin.color, fontSize:13, fontFamily:"var(--font-mono)", fontWeight:700 }}>
                    {cryptoAmount} {selectedCoin.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background:"rgba(255,255,255,0.04)" }}>
                  <span style={{ color:"#6B7FA8", fontSize:12 }}>Network</span>
                  <span style={{ color:"#E8EDF5", fontSize:12 }}>{selectedCoin.network}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background:"rgba(255,255,255,0.04)" }}>
                  <span style={{ color:"#6B7FA8", fontSize:12 }}>TX Hash</span>
                  <span style={{ color:"#E8EDF5", fontSize:10, fontFamily:"var(--font-mono)" }}>
                    {txHash.slice(0,12)}…{txHash.slice(-6)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Success ── */}
          {step === "success" && (
            <div className="text-center py-8 space-y-5">
              <div className="flex items-center justify-center">
                <div className="rounded-full p-5" style={{ background:"rgba(72,187,120,0.12)", border:"2px solid rgba(72,187,120,0.3)" }}>
                  <CheckCircle size={52} color="#48BB78"/>
                </div>
              </div>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:22, fontWeight:700, marginBottom:6 }}>Payment Confirmed!</div>
                <div style={{ color:"#6B7FA8", fontSize:13, lineHeight:1.8 }}>
                  {cryptoAmount} {selectedCoin.symbol} received and confirmed.<br/>
                  Your payment has been applied to your account.
                </div>
              </div>
              <div className="space-y-2 text-left">
                {[
                  ["Amount",     `${cryptoAmount} ${selectedCoin.symbol}`],
                  ["USD Value",  `$${amountUSD.toFixed(2)}`],
                  ["Processor",  "Coinbase Commerce"],
                  ["Invoice",    invoiceId],
                  ["Status",     "✓ Confirmed"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 rounded-xl"
                    style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.12)" }}>
                    <span style={{ color:"#6B7FA8", fontSize:12 }}>{k}</span>
                    <span style={{ color: k==="Status" ? "#48BB78" : "#E8EDF5", fontSize:12, fontFamily:k==="Invoice"?"var(--font-mono)":"inherit" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Expired ── */}
          {step === "expired" && (
            <div className="text-center py-8 space-y-5">
              <Clock size={52} color="#FC8181" style={{ margin:"0 auto" }}/>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:20, fontWeight:600, marginBottom:6 }}>Payment Window Expired</div>
                <div style={{ color:"#6B7FA8", fontSize:13, lineHeight:1.8 }}>
                  The 30-minute payment window has closed. If you already sent payment, contact support@finalpassdown.com with your transaction hash.
                </div>
              </div>
              <button onClick={() => setStep("select")}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm"
                style={{ background:"rgba(255,255,255,0.06)", color:"#E8EDF5", border:"1px solid rgba(255,255,255,0.08)" }}>
                <RefreshCw size={14}/> Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Pay with Crypto button — drop-in anywhere ───────────────────── */
export function CryptoPayButton({
  amountUSD, label, onSuccess, size = "md",
}: {
  amountUSD: number; label: string; onSuccess: () => void; size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const styles: Record<string, React.CSSProperties> = {
    sm: { padding:"6px 12px", fontSize:11, borderRadius:10 },
    md: { padding:"10px 18px", fontSize:13, borderRadius:12 },
    lg: { padding:"14px 28px", fontSize:15, borderRadius:14 },
  };
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 font-semibold transition-all"
        style={{ ...styles[size], background:"linear-gradient(135deg,#F7931A,#E8780C)", color:"#fff", boxShadow:"0 0 20px rgba(247,147,26,0.3)" }}>
        <span style={{ fontSize: size === "sm" ? 13 : size === "lg" ? 20 : 16 }}>₿</span>
        Pay with Crypto
      </button>
      <CryptoPayment
        open={open}
        amountUSD={amountUSD}
        label={label}
        onSuccess={() => { setOpen(false); onSuccess(); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
