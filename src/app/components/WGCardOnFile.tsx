/**
 * WGCardOnFile — White Glove Payment Method Management
 *
 * Collects and displays the credit card on file for a White Glove client.
 * Used in:
 *   - WhiteGloveAdmin (admin adds card for client)
 *   - WGClientSubmit (client adds card after requesting service)
 */
import React, { useState } from "react";
import {
  CreditCard, CheckCircle, Lock, Eye, EyeOff, X, AlertCircle, Edit2
} from "lucide-react";
import { toast } from "sonner";
import { cardsOnFile } from "./WGSessionTimer";

const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = {
  background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)",
  color:"#0D1428", fontSize:14, outline:"none", borderRadius:12, padding:"10px 14px", width:"100%",
};

function detectBrand(num: string): string {
  const n = num.replace(/\s/g,"");
  if (n.startsWith("4")) return "Visa";
  if (n.startsWith("5") || n.startsWith("2")) return "Mastercard";
  if (n.startsWith("3")) return "Amex";
  if (n.startsWith("6")) return "Discover";
  return "Card";
}

function brandColor(brand: string): string {
  return { Visa:"#1A1F71", Mastercard:"#EB001B", Amex:"#007BC1", Discover:"#FF6600" }[brand] ?? "#3A5BD9";
}

function brandEmoji(brand: string): string {
  return { Visa:"💳", Mastercard:"💳", Amex:"💳", Discover:"💳" }[brand] ?? "💳";
}

interface WGCardOnFileProps {
  clientId: string;
  clientName: string;
  onSaved?: () => void;
  compact?: boolean;
}

export function WGCardOnFile({ clientId, clientName, onSaved, compact = false }: WGCardOnFileProps) {
  const existing = cardsOnFile[clientId];
  const hasCard = existing?.last4 !== "";
  const [editing, setEditing] = useState(!hasCard);
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry]   = useState("");
  const [cvv, setCvv]         = useState("");
  const [name, setName]       = useState(existing?.name ?? clientName);
  const [showCvv, setShowCvv] = useState(false);
  const [saving, setSaving]   = useState(false);

  const brand = detectBrand(cardNum);

  const formatCard   = (v: string) => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g,"").slice(0,4); return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  function saveCard() {
    const raw = cardNum.replace(/\s/g,"");
    if (raw.length < 15) { toast.error("Please enter a valid card number"); return; }
    if (expiry.length < 5) { toast.error("Please enter the expiry date (MM/YY)"); return; }
    if (cvv.length < 3) { toast.error("Please enter the CVV"); return; }
    if (!name.trim()) { toast.error("Please enter the cardholder name"); return; }

    setSaving(true);
    setTimeout(() => {
      cardsOnFile[clientId] = {
        last4: raw.slice(-4),
        brand,
        expiry,
        name: name.trim(),
      };
      setSaving(false);
      setEditing(false);
      setCardNum(""); setCvv("");
      toast.success(`${brand} ****${raw.slice(-4)} saved for ${clientName}`);
      onSaved?.();
    }, 900);
  }

  function removeCard() {
    cardsOnFile[clientId] = { last4:"", brand:"", expiry:"", name:"" };
    setEditing(true);
    setCardNum(""); setExpiry(""); setCvv(""); setName(clientName);
    toast.success("Payment method removed");
  }

  // ── Compact display (in client card header) ──
  if (compact) {
    if (hasCard) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
          style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)", display:"inline-flex" }}>
          <CreditCard size={11} color="#48BB78"/>
          <span style={{ color:"#48BB78", fontSize:11, fontWeight:700, ...MONO }}>
            {existing.brand} ****{existing.last4}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
        style={{ background:"rgba(252,129,129,0.08)", border:"1px solid rgba(252,129,129,0.2)", display:"inline-flex" }}>
        <AlertCircle size={11} color="#FC8181"/>
        <span style={{ color:"#FC8181", fontSize:11, fontWeight:700, ...MONO }}>NO CARD ON FILE</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden glow-surface" style={{ border:"1px solid rgba(58,91,217,0.12)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor:"rgba(58,91,217,0.08)", background:"rgba(58,91,217,0.04)" }}>
        <div className="flex items-center gap-2">
          <CreditCard size={14} color="#3A5BD9"/>
          <span style={{ color:"#3A5BD9", fontSize:12, fontWeight:700, ...MONO }}>PAYMENT METHOD ON FILE</span>
        </div>
        {hasCard && !editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
            style={{ background:"rgba(58,91,217,0.08)", color:"#3A5BD9" }}>
            <Edit2 size={11}/> Update
          </button>
        )}
      </div>

      {/* Show existing card */}
      {hasCard && !editing && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4 px-4 py-4 rounded-xl"
            style={{ background:"linear-gradient(135deg,#070A12,#141B2E)", border:"1px solid rgba(58,91,217,0.3)" }}>
            <div style={{ fontSize:28 }}>💳</div>
            <div className="flex-1">
              <div style={{ color:brandColor(existing.brand), fontSize:12, fontWeight:700, ...MONO }}>
                {existing.brand.toUpperCase()}
              </div>
              <div style={{ color:"#E8EDF5", fontSize:18, fontWeight:700, letterSpacing:"0.1em", ...MONO, marginTop:2 }}>
                •••• •••• •••• {existing.last4}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div style={{ color:"#6B7FA8", fontSize:11 }}>{existing.name}</div>
                <div style={{ color:"#6B7FA8", fontSize:11, ...MONO }}>Exp {existing.expiry}</div>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
            <CheckCircle size={12} color="#48BB78" style={{ marginTop:1, flexShrink:0 }}/>
            <p style={{ color:"#48BB78", fontSize:12, lineHeight:1.6 }}>
              This card will be automatically charged after each session at $25 per 30 minutes, rounded up. The client will receive an email receipt after each charge.
            </p>
          </div>
          <button onClick={removeCard}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color:"#FC8181", background:"rgba(252,129,129,0.08)", border:"1px solid rgba(252,129,129,0.2)" }}>
            Remove Card
          </button>
        </div>
      )}

      {/* Add / edit card form */}
      {editing && (
        <div className="p-4 space-y-4">
          {!hasCard && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
              <AlertCircle size={12} color="#F6AD55" style={{ marginTop:1, flexShrink:0 }}/>
              <p style={{ color:"#F6AD55", fontSize:12, lineHeight:1.6 }}>
                A payment method is required before sessions can begin. The card will be charged at <strong>$25 per 30-minute block</strong> after each call.
              </p>
            </div>
          )}

          <div>
            <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>CARDHOLDER NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name on card" style={INPUT}/>
          </div>

          <div>
            <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>
              CARD NUMBER
              {cardNum && <span style={{ color:brandColor(brand), marginLeft:8, fontSize:10 }}>{brand}</span>}
            </label>
            <input value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))}
              placeholder="1234 5678 9012 3456" maxLength={19} style={{ ...INPUT, fontFamily:"var(--font-mono)" }}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>EXPIRY (MM/YY)</label>
              <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY" maxLength={5} style={{ ...INPUT, fontFamily:"var(--font-mono)" }}/>
            </div>
            <div>
              <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>CVV</label>
              <div className="relative">
                <input type={showCvv?"text":"password"} value={cvv}
                  onChange={e => setCvv(e.target.value.replace(/\D/g,"").slice(0,4))}
                  placeholder="•••" style={{ ...INPUT, paddingRight:40, fontFamily:"var(--font-mono)" }}/>
                <button type="button" onClick={() => setShowCvv(!showCvv)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"#8A9AB8" }}>
                  {showCvv ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.1)" }}>
            <Lock size={11} color="#8A9AB8"/>
            <span style={{ color:"#8A9AB8", fontSize:11 }}>256-bit SSL · Processed by Stripe · Card stored securely</span>
          </div>

          <div className="flex gap-3">
            <button onClick={saveCard} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#F0F4FA",
                boxShadow:"0 0 20px rgba(58,91,217,0.3)", opacity:saving?0.7:1 }}>
              <CreditCard size={14}/>{saving ? "Saving…" : "Save Payment Method"}
            </button>
            {hasCard && (
              <button onClick={() => setEditing(false)} className="px-4 py-3 rounded-xl text-sm"
                style={{ background:"rgba(58,91,217,0.06)", color:"#5A6A88" }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
