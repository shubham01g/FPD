import React, { useState } from "react";
import {
  Star, Phone, CheckCircle, Clock,
  Shield, Heart, Users, FileText,
  ChevronDown, ChevronUp, X
} from "lucide-react";
import { toast } from "sonner";
import heroWhiteGlovePhoto from "../../imports/whiteglove_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";

const STEPS = [
  { icon:<Phone size={20}/>,    title:"Intake Call",          desc:"A specialist calls you personally to understand what you need and what documents you have." },
  { icon:<FileText size={20}/>, title:"Specialist Uploads",   desc:"Your specialist uploads every document to your encrypted vault on your behalf — you never need to touch technology." },
  { icon:<Users size={20}/>,    title:"Contacts & Wishes",    desc:"We designate your legacy contacts and final wishes for you, walking you through each decision on the phone." },
  { icon:<CheckCircle size={20}/>, title:"Review & Complete", desc:"We walk through everything together and ensure you're 100% satisfied with your complete legacy vault." },
];

const PRICING = {
  setupFee: 99,
  sessionRate: 25,
  sessionLength: 30, // minutes
};

const INCLUDES = [
  "Dedicated personal legacy specialist assigned to you",
  "One-time $99 setup fee — no surprises",
  "$25 per 30-minute session — only pay for the time you use",
  "Specialist uploads all your documents for you",
  "Complete vault setup from start to finish",
  "Legacy contact designation and ID verification guidance",
  "Final wishes recorded exactly as you describe them",
  "Follow-up call 30 days after completion",
  "Priority email and phone support — always a real person",
];

const FAQS = [
  { q:"How much does White Glove service cost?", a:"There is a one-time $99 setup fee to get started. After that, sessions are billed at $25 per 30 minutes. Most clients complete their full vault setup in 2–4 sessions, so the total cost is typically $99 + $50–$100 in session time." },
  { q:"How am I billed for sessions?", a:"Sessions are billed at $25 per 30-minute block. If a session runs 45 minutes, that's $37.50 (1.5 × $25). You will receive a summary after each session with the time used and the amount due. You can pay by card or cryptocurrency." },
  { q:"Do I need a computer or smartphone?", a:"No. All you need is a phone to talk with your specialist. They handle all the technology on your behalf. You can participate entirely by phone call." },
  { q:"How long does the full setup take?", a:"Most clients are fully set up in 2–3 sessions over 1–2 weeks. Each session is typically 30–60 minutes at your pace — we never rush." },
  { q:"What documents do I need to prepare?", a:"Your specialist will give you a simple checklist on your first call. Common items include: your will (if you have one), insurance policies, bank account info, and a list of family contacts. If you don't have some of these, we'll help you figure out what to do." },
  { q:"Can my family member set this up for me?", a:"Absolutely. We can coordinate with a family member or trusted person who calls on your behalf. They can be present on all sessions if you prefer." },
  { q:"Is my information private and secure?", a:"Yes. Everything is encrypted with military-grade AES-256 encryption. Your specialist only assists with uploading — they cannot access your vault after sessions end. All activity is logged." },
  { q:"What if I need help after setup is complete?", a:"White Glove clients have priority support access. Call or email us anytime and a real person will answer within 2 business hours." },
];

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button onClick={() => setOpen(!open)} className="faq-q" style={{ background: open ? "rgba(91,110,225,0.06)" : "transparent" }}>
        <span>{faq.q}</span>
        {open ? <ChevronUp size={16} color="#FFFFFF"/> : <ChevronDown size={16} color={MUTED}/>}
      </button>
      {open && (
        <div className="faq-a">
          <p>{faq.a}</p>
        </div>
      )}
    </div>
  );
}

/* ── Intake request form ─────────────────────────────────────────── */
function IntakeForm({ onClose }: { onClose?: () => void }) {
  const [form, setForm] = useState({ name:"", phone:"", email:"", preferredTime:"morning", notes:"", contactedBy:"self" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  function submit() {
    if (!form.name.trim() || !form.phone.trim()) { toast.error("Name and phone number are required"); return; }
    setSending(true);
    setTimeout(() => { setSending(false); setSubmitted(true); }, 1000);
  }

  if (submitted) {
    return (
      <div className="submitted">
        <div className="submitted-ico"><CheckCircle size={40} color="#FFFFFF"/></div>
        <h3>We'll Call You Soon!</h3>
        <p>Thank you, <strong>{form.name}</strong>. A Final Pass Down specialist will call you at <strong>{form.phone}</strong> within 1 business day to get you started.</p>
        <div className="ref-box">
          <div className="ref-lbl">YOUR REFERENCE NUMBER</div>
          <div className="ref-val">WG-{Math.random().toString(36).slice(2,7).toUpperCase()}</div>
        </div>
        {onClose && <button onClick={onClose} className="btn-ghost">Close</button>}
      </div>
    );
  }

  return (
    <div className="intake-form">
      <div className="grid grid-cols-2 gap-4">
        <div className="field col-span-2">
          <label>YOUR FULL NAME *</label>
          <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="As it appears on your ID"/>
        </div>
        <div className="field">
          <label>PHONE NUMBER *</label>
          <input type="tel" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="+1 (555) 000-0000"/>
        </div>
        <div className="field">
          <label>EMAIL (optional)</label>
          <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"/>
        </div>
      </div>

      <div className="field">
        <label>BEST TIME TO CALL</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[["morning","Morning (9am–12pm)"],["afternoon","Afternoon (12–5pm)"],["evening","Evening (5–7pm)"]].map(([id,label]) => (
            <button key={id} onClick={() => setForm(p=>({...p,preferredTime:id}))} className="pick-btn"
              style={{ background:form.preferredTime===id?"rgba(91,110,225,0.14)":"rgba(255,255,255,0.03)", borderColor:form.preferredTime===id?ACCENT:"rgba(255,255,255,0.08)", color:form.preferredTime===id?"#6FAE8B":MUTED }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>WHO IS CONTACTING US?</label>
        <div className="grid grid-cols-2 gap-2">
          {[["self","The account holder"],["family","A family member"]].map(([id,label]) => (
            <button key={id} onClick={() => setForm(p=>({...p,contactedBy:id}))} className="pick-btn"
              style={{ background:form.contactedBy===id?"rgba(91,110,225,0.14)":"rgba(255,255,255,0.03)", borderColor:form.contactedBy===id?ACCENT:"rgba(255,255,255,0.08)", color:form.contactedBy===id?"#6FAE8B":MUTED }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>ANYTHING ELSE WE SHOULD KNOW? (optional)</label>
        <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} rows={2}
          placeholder="e.g. I have a will and some insurance documents ready. My daughter may join the call."/>
      </div>

      <button onClick={submit} disabled={sending} className="btn-primary-lg" style={{ opacity: sending ? 0.7 : 1 }}>
        <Phone size={16}/>{sending ? "Sending Request…" : "Request My White Glove Call"}
      </button>
      <p className="reassure-line">No tech skills required. A real person will call you. No automated systems.</p>
    </div>
  );
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-wg so nothing else in the app is affected. */
const WG_CSS = `
.fpd-wg{position:relative;min-height:100%;background:#070A12;}
.fpd-wg *{box-sizing:border-box;}
.fpd-wg .grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}

/* hero — full-bleed photo, tinted toward the brand palette and scrimmed for text legibility */
.fpd-wg .hero{position:relative;overflow:hidden;padding:76px 24px 90px;background:linear-gradient(135deg,#060B16,#0A1020);}
.fpd-wg .hero-art{position:absolute;inset:-6%;z-index:0;background-image:url(${heroWhiteGlovePhoto});background-size:cover;background-position:center 25%;pointer-events:none;}
.fpd-wg .hero-scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(6,11,22,0.32) 0%,rgba(8,13,26,0.5) 45%,rgba(7,10,18,0.78) 100%),linear-gradient(160deg,rgba(9,14,28,0.15),rgba(91,110,225,0.22));pointer-events:none;}
.fpd-wg .hero-grid{position:absolute;inset:0;z-index:2;background-image:linear-gradient(rgba(91,110,225,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.04) 1px,transparent 1px);background-size:50px 50px;}
.fpd-wg .hero-glow-a{position:absolute;top:20%;left:10%;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(91,110,225,0.14) 0%,transparent 70%);pointer-events:none;z-index:2;}
.fpd-wg .hero-glow-b{position:absolute;bottom:0;right:5%;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(91,110,225,0.1) 0%,transparent 70%);pointer-events:none;z-index:2;}
.fpd-wg .hero-inner{position:relative;z-index:3;max-width:720px;margin:0 auto;text-align:center;}
.fpd-wg .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:99px;margin-bottom:22px;background:rgba(91,110,225,0.16);border:1px solid rgba(91,110,225,0.32);}
.fpd-wg .hero-badge span{color:#6FAE8B;font-size:15px;font-family:var(--font-mono);letter-spacing:0.1em;}
.fpd-wg .hero h1{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.4rem);color:${TEXT};line-height:1.15;margin-bottom:18px;}
.fpd-wg .hero h1 em{color:${SOFT};font-style:normal;}
.fpd-wg .hero p{color:${MUTED};font-size:20px;line-height:1.85;max-width:520px;margin:0 auto 36px;}
.fpd-wg .hero-cta-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px;}
.fpd-wg .btn-hero{display:flex;align-items:center;gap:8px;padding:16px 32px;border-radius:16px;font-weight:700;font-size:19px;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);box-shadow:0 0 40px rgba(91,110,225,0.5);font-family:var(--font-body);}
.fpd-wg .hero-note{display:flex;align-items:center;gap:8px;color:${MUTED};font-size:16px;}

/* body */
.fpd-wg .body{position:relative;max-width:900px;margin:0 auto;padding:64px 24px;display:flex;flex-direction:column;gap:60px;z-index:1;}
.fpd-wg .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.08);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 14px 40px -20px rgba(0,0,0,0.7);}

/* pricing */
.fpd-wg .pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
@media (max-width:760px){.fpd-wg .pricing-grid{grid-template-columns:1fr;}}
.fpd-wg .price-card{padding:32px;text-align:center;}
.fpd-wg .price-card.featured{border:2px solid rgba(91,110,225,0.4);box-shadow:0 0 48px rgba(91,110,225,0.15),inset 0 1px 0 rgba(255,255,255,0.035);}
.fpd-wg .price-eyebrow{color:${SOFT};font-size:14px;font-family:var(--font-mono);letter-spacing:0.14em;margin-bottom:12px;}
.fpd-wg .price-big{font-family:var(--font-display);font-size:80px;color:${TEXT};line-height:1;margin-bottom:8px;}
.fpd-wg .price-sub{color:${MUTED};font-size:17.5px;margin-bottom:20px;}
.fpd-wg .price-feat{display:flex;align-items:center;gap:8px;text-align:left;}
.fpd-wg .price-feat+.price-feat{margin-top:8px;}
.fpd-wg .price-feat span{color:${SOFT};font-size:16px;}
.fpd-wg .total-box{margin-top:20px;padding:14px 16px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);}
.fpd-wg .total-box .tb-lbl{color:#6FAE8B;font-size:16px;font-weight:700;}
.fpd-wg .total-box .tb-val{color:${TEXT};font-size:25px;font-family:var(--font-display);font-weight:700;margin-top:2px;}
.fpd-wg .total-box .tb-sub{color:${MUTED};font-size:14px;}

/* section heading */
.fpd-wg .sec-head{text-align:center;margin-bottom:36px;}
.fpd-wg .sec-eyebrow{color:#6FAE8B;font-size:14px;font-family:var(--font-mono);letter-spacing:0.14em;margin-bottom:8px;}
.fpd-wg .sec-h2{font-family:var(--font-display);font-size:clamp(1.5rem,3vw,2.2rem);color:${TEXT};line-height:1.2;}

/* steps */
.fpd-wg .step-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
@media (max-width:700px){.fpd-wg .step-grid{grid-template-columns:1fr;}}
.fpd-wg .step-card{display:flex;align-items:flex-start;gap:16px;padding:20px;}
.fpd-wg .step-ico{width:48px;height:48px;border-radius:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);color:#FFFFFF;}
.fpd-wg .step-num{color:#6FAE8B;font-size:12.5px;font-weight:700;font-family:var(--font-mono);}
.fpd-wg .step-title{font-family:var(--font-display);font-size:20px;color:${TEXT};margin:2px 0 4px;}
.fpd-wg .step-desc{color:${MUTED};font-size:16px;line-height:1.7;}

/* includes */
.fpd-wg .includes-card{padding:32px;background:rgba(91,110,225,0.04);}
.fpd-wg .includes-title{font-family:var(--font-display);font-size:27.5px;color:${TEXT};margin-bottom:20px;text-align:center;}
.fpd-wg .includes-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media (max-width:640px){.fpd-wg .includes-grid{grid-template-columns:1fr;}}
.fpd-wg .includes-row{display:flex;align-items:flex-start;gap:10px;}
.fpd-wg .includes-row span{color:${SOFT};font-size:16px;line-height:1.6;}
.fpd-wg .includes-cta{text-align:center;margin-top:28px;}
.fpd-wg .btn-cta{display:inline-flex;align-items:center;gap:8px;padding:15px 30px;border-radius:16px;font-weight:700;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);box-shadow:0 0 30px rgba(91,110,225,0.35);font-family:var(--font-body);}

/* intake card */
.fpd-wg .intake-card{padding:32px;}
.fpd-wg .intake-hd{text-align:center;margin-bottom:28px;}
.fpd-wg .intake-hd h2{font-family:var(--font-display);font-size:27.5px;color:${TEXT};margin:12px 0 8px;}
.fpd-wg .intake-hd p{color:${MUTED};font-size:17.5px;max-width:400px;margin:0 auto;}
.fpd-wg .intake-form{display:flex;flex-direction:column;gap:16px;}
.fpd-wg .field label{display:block;margin-bottom:5px;font-family:var(--font-mono);font-size:14px;letter-spacing:0.04em;color:${MUTED};}
.fpd-wg .field input,.fpd-wg .field textarea{width:100%;padding:10px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:17.5px;outline:none;font-family:var(--font-body);}
.fpd-wg .field textarea{resize:none;}
.fpd-wg .field input::placeholder,.fpd-wg .field textarea::placeholder{color:${FAINT};}
.fpd-wg .pick-btn{padding:10px 12px;border-radius:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:1px solid;}
.fpd-wg .btn-primary-lg{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;border-radius:16px;font-weight:700;font-size:19px;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);box-shadow:0 0 32px rgba(91,110,225,0.4);font-family:var(--font-body);}
.fpd-wg .reassure-line{color:${MUTED};font-size:14px;text-align:center;}
.fpd-wg .submitted{text-align:center;padding:32px 16px;}
.fpd-wg .submitted-ico{display:flex;align-items:center;justify-content:center;margin-bottom:20px;}
.fpd-wg .submitted-ico > *{background:rgba(91,110,225,0.14);border:2px solid rgba(91,110,225,0.32);border-radius:99px;padding:18px;}
.fpd-wg .submitted h3{font-family:var(--font-display);font-size:27.5px;color:${TEXT};margin-bottom:10px;}
.fpd-wg .submitted p{color:${MUTED};font-size:17.5px;line-height:1.8;max-width:360px;margin:0 auto 22px;}
.fpd-wg .ref-box{padding:16px 20px;border-radius:16px;margin-bottom:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.22);}
.fpd-wg .ref-lbl{color:#6FAE8B;font-size:14px;font-family:var(--font-mono);margin-bottom:4px;}
.fpd-wg .ref-val{color:${TEXT};font-size:22.5px;font-family:var(--font-display);font-weight:700;}
.fpd-wg .btn-ghost{padding:12px 24px;border-radius:16px;font-weight:700;font-size:16px;background:rgba(91,110,225,0.10);color:#6FAE8B;border:none;cursor:pointer;font-family:var(--font-body);}

/* faq */
.fpd-wg .faq-list{display:flex;flex-direction:column;gap:12px;}
.fpd-wg .faq-item{border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);}
.fpd-wg .faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;text-align:left;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-wg .faq-q span{color:${TEXT};font-size:17.5px;font-weight:500;}
.fpd-wg .faq-a{padding:0 20px 18px;background:rgba(91,110,225,0.02);}
.fpd-wg .faq-a p{color:${MUTED};font-size:16px;line-height:1.8;}

/* reassurance strip */
.fpd-wg .reassure-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
@media (max-width:700px){.fpd-wg .reassure-grid{grid-template-columns:1fr;}}
.fpd-wg .reassure-card{padding:20px;text-align:center;}
.fpd-wg .reassure-card .ri{color:#6E90C9;margin:0 auto 10px;display:flex;justify-content:center;}
.fpd-wg .reassure-card .rt{font-family:var(--font-display);font-size:17.5px;color:${TEXT};margin-bottom:4px;}
.fpd-wg .reassure-card .rd{color:${MUTED};font-size:15px;line-height:1.6;}

/* modal */
.fpd-wg .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,12,0.75);backdrop-filter:blur(8px);}
.fpd-wg .modal{width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}
.fpd-wg .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-wg .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};}
.fpd-wg .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-wg .modal-body{padding:28px;}
`;

/* ── Main page ───────────────────────────────────────────────────── */
export function WhiteGloveService() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="fpd-wg fpd-fade-in-up">
      <style dangerouslySetInnerHTML={{ __html: WG_CSS }} />

      {/* Hero */}
      <div className="hero">
        <div className="hero-art"/>
        <div className="hero-scrim"/>
        <div className="hero-grid"/>
        <div className="hero-glow-a"/>
        <div className="hero-glow-b"/>
        <div className="hero-inner">
          <div className="hero-badge">
            <Star size={13} color="#FFFFFF" fill={ACCENT}/>
            <span>WHITE GLOVE SERVICE</span>
          </div>
          <h1>We Set Everything Up<br/><em>For You.</em></h1>
          <p>Not comfortable with technology? No problem. A dedicated Final Pass Down specialist will call you, walk you through everything, and upload all your important documents on your behalf.</p>
          <div className="hero-cta-row">
            <button onClick={() => setShowModal(true)} className="btn-hero">
              <Phone size={18}/> Request a Call
            </button>
            <div className="hero-note">
              <Clock size={14}/> We call within 1 business day
            </div>
          </div>
        </div>
      </div>

      <div className="body">
        <div className="grain"/>

        {/* Pricing */}
        <div className="pricing-grid">
          <div className="card price-card featured">
            <div className="price-eyebrow">ONE-TIME SETUP FEE</div>
            <div className="price-big">${PRICING.setupFee}</div>
            <div className="price-sub">Paid once · Gets you started</div>
            <div>
              {["Specialist assigned to your account","Intake call to understand your needs","Secure document upload link sent to you","Complete onboarding plan created"].map(f => (
                <div key={f} className="price-feat"><CheckCircle size={13} color="#FFFFFF"/><span>{f}</span></div>
              ))}
            </div>
          </div>

          <div className="card price-card">
            <div className="price-eyebrow" style={{ color: "#6FAE8B" }}>SESSION RATE</div>
            <div className="price-big">${PRICING.sessionRate}</div>
            <div className="price-sub">per {PRICING.sessionLength} minutes · Only pay for what you use</div>
            <div>
              {["Phone or video call with your specialist","Specialist uploads documents during the session","Session notes and progress tracking","Typical setup: 2–4 sessions total"].map(f => (
                <div key={f} className="price-feat"><CheckCircle size={13} color="#FFFFFF"/><span>{f}</span></div>
              ))}
            </div>
            <div className="total-box">
              <div className="tb-lbl">Typical Total Cost</div>
              <div className="tb-val">${PRICING.setupFee + PRICING.sessionRate * 4}–${PRICING.setupFee + PRICING.sessionRate * 6}</div>
              <div className="tb-sub">$99 setup + 2–3 hours of sessions</div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div>
          <div className="sec-head">
            <div className="sec-eyebrow">HOW IT WORKS</div>
            <h2 className="sec-h2">Four Simple Steps.<br/>All Done By Phone.</h2>
          </div>
          <div className="step-grid">
            {STEPS.map((s, i) => (
              <div key={i} className="card step-card">
                <div className="step-ico">{s.icon}</div>
                <div>
                  <div className="step-num">STEP {i+1}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What's included */}
        <div className="card includes-card">
          <div className="includes-title">Everything Is Included</div>
          <div className="includes-grid">
            {INCLUDES.map(f => (
              <div key={f} className="includes-row"><CheckCircle size={14} color="#FFFFFF" style={{ marginTop:2, flexShrink:0 }}/><span>{f}</span></div>
            ))}
          </div>
          <div className="includes-cta">
            <button onClick={() => setShowModal(true)} className="btn-cta">
              <Phone size={16}/> Request Your White Glove Call
            </button>
          </div>
        </div>

        {/* Inline form */}
        <div className="card intake-card">
          <div className="intake-hd">
            <Star size={28} color="#FFFFFF" fill="rgba(91,110,225,0.3)"/>
            <h2>Ready to Get Started?</h2>
            <p>Leave your name and phone number. A real person will call you — no apps, no computers, no hassle.</p>
          </div>
          <IntakeForm/>
        </div>

        {/* FAQ */}
        <div>
          <div className="sec-head" style={{ marginBottom: 20 }}>
            <h2 className="sec-h2">Common Questions</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, i) => <FaqItem key={i} faq={faq}/>)}
          </div>
        </div>

        {/* Reassurance strip */}
        <div className="reassure-grid">
          {[
            { icon:<Shield size={20}/>,  title:"Your Data Is Safe",   desc:"AES-256 encryption. Specialists cannot access your vault after sessions end." },
            { icon:<Heart size={20}/>,   title:"Real People, Always", desc:"No bots, no automated systems. A real FPD specialist handles your account." },
            { icon:<Clock size={20}/>,   title:"Your Pace, Always",   desc:"Sessions happen when you're ready. We never rush. Most complete in 1–2 weeks." },
          ].map(r => (
            <div key={r.title} className="card reassure-card">
              <div className="ri">{r.icon}</div>
              <div className="rt">{r.title}</div>
              <div className="rd">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Request modal */}
      {showModal && (
        <div className="backdrop">
          <div className="card modal">
            <div className="modal-head">
              <div className="flex items-center gap-2">
                <Star size={16} color="#FFFFFF" fill="rgba(91,110,225,0.3)"/>
                <h3>White Glove Request</h3>
              </div>
              <button onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <IntakeForm onClose={() => setShowModal(false)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
