import React, { useState } from "react";
import {
  Star, Phone, Video, CheckCircle, ArrowRight, Clock,
  Shield, Heart, Users, FileText, MessageSquare, Calendar,
  ChevronDown, ChevronUp, X
} from "lucide-react";
import { toast } from "sonner";

const GLASS: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(159,122,234,0.15)", boxShadow:"0 4px 24px rgba(159,122,234,0.08)", borderRadius:20 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"rgba(159,122,234,0.05)", border:"1px solid rgba(159,122,234,0.2)", color:"#0D1428", fontSize:14, outline:"none", borderRadius:12, padding:"10px 14px", width:"100%" };

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
    <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(159,122,234,0.15)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background:open?"rgba(159,122,234,0.04)":"#fff" }}>
        <span style={{ color:"#0D1428", fontSize:14, fontWeight:500 }}>{faq.q}</span>
        {open ? <ChevronUp size={16} color="#9F7AEA"/> : <ChevronDown size={16} color="#8A9AB8"/>}
      </button>
      {open && (
        <div className="px-5 pb-4" style={{ background:"rgba(159,122,234,0.02)" }}>
          <p style={{ color:"#5A6A88", fontSize:13, lineHeight:1.8 }}>{faq.a}</p>
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
      <div className="text-center py-8 px-4">
        <div className="flex items-center justify-center mb-6">
          <div className="rounded-full p-5" style={{ background:"rgba(159,122,234,0.12)", border:"2px solid rgba(159,122,234,0.3)" }}>
            <CheckCircle size={40} color="#9F7AEA"/>
          </div>
        </div>
        <h3 style={{ fontFamily:"var(--font-display)", fontSize:22, color:"#0D1428", marginBottom:8 }}>We'll Call You Soon!</h3>
        <p style={{ color:"#5A6A88", fontSize:14, lineHeight:1.8, maxWidth:360, margin:"0 auto 24px" }}>
          Thank you, <strong>{form.name}</strong>. A Final Pass Down specialist will call you at <strong>{form.phone}</strong> within 1 business day to get you started.
        </p>
        <div className="px-5 py-4 rounded-2xl mb-4" style={{ background:"rgba(159,122,234,0.08)", border:"1px solid rgba(159,122,234,0.2)" }}>
          <div style={{ color:"#9F7AEA", fontSize:11, ...MONO, marginBottom:4 }}>YOUR REFERENCE NUMBER</div>
          <div style={{ color:"#0D1428", fontSize:18, fontFamily:"var(--font-display)", fontWeight:700 }}>
            WG-{Math.random().toString(36).slice(2,7).toUpperCase()}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-sm"
            style={{ background:"rgba(159,122,234,0.1)", color:"#9F7AEA" }}>
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>YOUR FULL NAME *</label>
          <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="As it appears on your ID" style={INPUT}/>
        </div>
        <div>
          <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>PHONE NUMBER *</label>
          <input type="tel" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="+1 (555) 000-0000" style={INPUT}/>
        </div>
        <div>
          <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>EMAIL (optional)</label>
          <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com" style={INPUT}/>
        </div>
      </div>

      <div>
        <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:8 }}>BEST TIME TO CALL</label>
        <div className="grid grid-cols-3 gap-2">
          {[["morning","Morning (9am–12pm)"],["afternoon","Afternoon (12–5pm)"],["evening","Evening (5–7pm)"]].map(([id,label]) => (
            <button key={id} onClick={() => setForm(p=>({...p,preferredTime:id}))}
              className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background:form.preferredTime===id?"rgba(159,122,234,0.12)":"rgba(32,64,192,0.04)",
                border:`1px solid ${form.preferredTime===id?"#9F7AEA":"rgba(32,64,192,0.12)"}`,
                color:form.preferredTime===id?"#9F7AEA":"#5A6A88" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:8 }}>WHO IS CONTACTING US?</label>
        <div className="grid grid-cols-2 gap-2">
          {[["self","The account holder"],["family","A family member"]].map(([id,label]) => (
            <button key={id} onClick={() => setForm(p=>({...p,contactedBy:id}))}
              className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background:form.contactedBy===id?"rgba(159,122,234,0.12)":"rgba(32,64,192,0.04)",
                border:`1px solid ${form.contactedBy===id?"#9F7AEA":"rgba(32,64,192,0.12)"}`,
                color:form.contactedBy===id?"#9F7AEA":"#5A6A88" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>ANYTHING ELSE WE SHOULD KNOW? (optional)</label>
        <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} rows={2}
          placeholder="e.g. I have a will and some insurance documents ready. My daughter may join the call."
          className="w-full resize-none" style={INPUT}/>
      </div>

      <button onClick={submit} disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base"
        style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F",
          boxShadow:"0 0 32px rgba(159,122,234,0.4)", opacity:sending?0.7:1 }}>
        <Phone size={16}/>{sending ? "Sending Request…" : "Request My White Glove Call"}
      </button>
      <p style={{ color:"#8A9AB8", fontSize:11, textAlign:"center" }}>
        No tech skills required. A real person will call you. No automated systems.
      </p>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export function WhiteGloveService() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ fontFamily:"var(--font-body)", background:"#F8F4FF", minHeight:"100vh" }}>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background:"linear-gradient(135deg,#0A0520,#1A0840)", padding:"80px 24px 100px" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(159,122,234,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(159,122,234,0.04) 1px,transparent 1px)", backgroundSize:"50px 50px" }}/>
        <div style={{ position:"absolute", top:"20%", left:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(159,122,234,0.12) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"0%", right:"5%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(32,64,192,0.1) 0%,transparent 70%)", pointerEvents:"none" }}/>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background:"rgba(159,122,234,0.15)", border:"1px solid rgba(159,122,234,0.3)" }}>
            <Star size={13} color="#9F7AEA" fill="#9F7AEA"/>
            <span style={{ color:"#C4B5FD", fontSize:12, ...MONO, letterSpacing:"0.1em" }}>WHITE GLOVE SERVICE</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(2rem,5vw,3.5rem)", color:"#E8EDF5", lineHeight:1.15, marginBottom:20 }}>
            We Set Everything Up<br/><span style={{ color:"#C4B5FD" }}>For You.</span>
          </h1>
          <p style={{ color:"#A0B0D0", fontSize:17, lineHeight:1.9, maxWidth:520, margin:"0 auto 40px" }}>
            Not comfortable with technology? No problem. A dedicated Final Pass Down specialist will call you, walk you through everything, and upload all your important documents on your behalf.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
              style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F", boxShadow:"0 0 40px rgba(159,122,234,0.5)" }}>
              <Phone size={18}/> Request a Call
            </button>
            <div className="flex items-center gap-2" style={{ color:"#8A9AB8", fontSize:13 }}>
              <Clock size={14}/> We call within 1 business day
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">

        {/* Pricing — shown prominently at top */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Setup fee card */}
          <div className="rounded-3xl p-8 text-center"
            style={{ background:"linear-gradient(135deg,#1A0840,#0A0520)", border:"2px solid rgba(159,122,234,0.4)", boxShadow:"0 0 48px rgba(159,122,234,0.15)" }}>
            <div style={{ color:"#C4B5FD", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:"0.14em", marginBottom:12 }}>ONE-TIME SETUP FEE</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:72, color:"#E8EDF5", lineHeight:1, marginBottom:8 }}>
              ${PRICING.setupFee}
            </div>
            <div style={{ color:"#8A9AB8", fontSize:14, marginBottom:20 }}>Paid once · Gets you started</div>
            <div className="space-y-2 text-left">
              {["Specialist assigned to your account","Intake call to understand your needs","Secure document upload link sent to you","Complete onboarding plan created"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={13} color="#9F7AEA"/>
                  <span style={{ color:"#B8C8E0", fontSize:13 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-session card */}
          <div className="rounded-3xl p-8 text-center"
            style={{ background:"rgba(159,122,234,0.06)", border:"2px solid rgba(159,122,234,0.25)" }}>
            <div style={{ color:"#9F7AEA", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:"0.14em", marginBottom:12 }}>SESSION RATE</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:72, color:"#0D1428", lineHeight:1, marginBottom:4 }}>
              ${PRICING.sessionRate}
            </div>
            <div style={{ color:"#5A6A88", fontSize:14, marginBottom:20 }}>per {PRICING.sessionLength} minutes · Only pay for what you use</div>
            <div className="space-y-2 text-left">
              {["Phone or video call with your specialist","Specialist uploads documents during the session","Session notes and progress tracking","Typical setup: 2–4 sessions total"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={13} color="#9F7AEA"/>
                  <span style={{ color:"#374669", fontSize:13 }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 px-4 py-3 rounded-2xl"
              style={{ background:"rgba(159,122,234,0.08)", border:"1px solid rgba(159,122,234,0.2)" }}>
              <div style={{ color:"#9F7AEA", fontSize:13, fontWeight:700 }}>Typical Total Cost</div>
              <div style={{ color:"#0D1428", fontSize:20, fontFamily:"var(--font-display)", fontWeight:700, marginTop:2 }}>
                ${PRICING.setupFee + PRICING.sessionRate * 4}–${PRICING.setupFee + PRICING.sessionRate * 6}
              </div>
              <div style={{ color:"#8A9AB8", fontSize:11 }}>$99 setup + 2–3 hours of sessions</div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div>
          <div className="text-center mb-10">
            <div style={{ color:"#9F7AEA", fontSize:11, ...MONO, letterSpacing:"0.14em", marginBottom:8 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(1.6rem,3vw,2.4rem)", color:"#0D1428", lineHeight:1.2 }}>
              Four Simple Steps.<br/>All Done By Phone.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl" style={GLASS}>
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:48, height:48, background:"rgba(159,122,234,0.1)", color:"#9F7AEA" }}>
                  {s.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color:"#9F7AEA", fontSize:10, fontWeight:700, ...MONO }}>STEP {i+1}</span>
                  </div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#0D1428", marginBottom:4 }}>{s.title}</div>
                  <div style={{ color:"#5A6A88", fontSize:13, lineHeight:1.7 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What's included */}
        <div className="p-8 rounded-3xl" style={{ ...GLASS, background:"rgba(159,122,234,0.04)" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:"#0D1428", marginBottom:20, textAlign:"center" }}>
            Everything Is Included
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {INCLUDES.map(f => (
              <div key={f} className="flex items-start gap-3">
                <CheckCircle size={14} color="#9F7AEA" style={{ marginTop:2, flexShrink:0 }}/>
                <span style={{ color:"#374669", fontSize:13, lineHeight:1.6 }}>{f}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold"
              style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F", boxShadow:"0 0 30px rgba(159,122,234,0.35)" }}>
              <Phone size={16}/> Request Your White Glove Call
            </button>
          </div>
        </div>

        {/* Inline form */}
        <div className="p-8 rounded-3xl" style={GLASS}>
          <div className="text-center mb-8">
            <Star size={28} color="#9F7AEA" fill="rgba(159,122,234,0.3)" style={{ margin:"0 auto 12px" }}/>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, color:"#0D1428", marginBottom:8 }}>Ready to Get Started?</h2>
            <p style={{ color:"#5A6A88", fontSize:14, maxWidth:400, margin:"0 auto" }}>
              Leave your name and phone number. A real person will call you — no apps, no computers, no hassle.
            </p>
          </div>
          <IntakeForm/>
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, color:"#0D1428", marginBottom:16, textAlign:"center" }}>
            Common Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => <FaqItem key={i} faq={faq}/>)}
          </div>
        </div>

        {/* Reassurance strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon:<Shield size={20}/>,  title:"Your Data Is Safe",   desc:"AES-256 encryption. Specialists cannot access your vault after sessions end." },
            { icon:<Heart size={20}/>,   title:"Real People, Always", desc:"No bots, no automated systems. A real FPD specialist handles your account." },
            { icon:<Clock size={20}/>,   title:"Your Pace, Always",   desc:"Sessions happen when you're ready. We never rush. Most complete in 1–2 weeks." },
          ].map(r => (
            <div key={r.title} className="p-5 rounded-2xl text-center" style={GLASS}>
              <div style={{ color:"#9F7AEA", margin:"0 auto 10px" }}>{r.icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"#0D1428", marginBottom:4 }}>{r.title}</div>
              <div style={{ color:"#5A6A88", fontSize:12, lineHeight:1.6 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Request modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ ...GLASS, maxHeight:"90vh", overflowY:"auto" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor:"rgba(159,122,234,0.12)" }}>
              <div className="flex items-center gap-2">
                <Star size={16} color="#9F7AEA" fill="rgba(159,122,234,0.3)"/>
                <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#0D1428" }}>White Glove Request</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ color:"#8A9AB8" }}><X size={16}/></button>
            </div>
            <div className="p-6">
              <IntakeForm onClose={() => setShowModal(false)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
