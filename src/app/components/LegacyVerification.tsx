import React, { useState } from "react";
import { UserCheck, Upload, Clock, CheckCircle, AlertCircle, Mail, Phone, Shield, Plus, X, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.2)", borderRadius:10, padding:"10px 14px", color:"var(--foreground)", fontSize:14, outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

type VerifStatus = "verified" | "pending" | "id_submitted" | "rejected";

interface VerifContact {
  id: number;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  idType: string;
  addedDate: string;
  accessTrigger: string;
  status: VerifStatus;
  avatar: string;
  notes: string;
}

const initContacts: VerifContact[] = [
  { id:1, name:"Sarah Johnson",  relationship:"Spouse",          email:"sarah.j@email.com",   phone:"+1 (555) 234-5678", idType:"Driver's License", addedDate:"Mar 15, 2026", accessTrigger:"Upon verified passing — confirmed by estate executor", status:"verified",     avatar:"SJ", notes:"Primary legacy contact. Has full access to all vault categories." },
  { id:2, name:"Michael Doe",    relationship:"Son",             email:"m.doe@email.com",      phone:"+1 (555) 345-6789", idType:"Passport",         addedDate:"Mar 15, 2026", accessTrigger:"Upon verified passing — confirmed by estate executor", status:"verified",     avatar:"MD", notes:"Contingent #2. Verified June 2026 with U.S. Passport." },
  { id:3, name:"Linda Torres",   relationship:"Estate Attorney", email:"ltorres@lawfirm.com",  phone:"+1 (555) 456-7890", idType:"State ID",         addedDate:"Jun 1, 2026",  accessTrigger:"Upon verified passing — or incapacity per POA",       status:"id_submitted", avatar:"LT", notes:"Law firm: Torres & Associates. ID submitted — pending compliance review." },
  { id:4, name:"Margaret Doe",   relationship:"Sister",          email:"m.doefamily@email.com",phone:"+1 (555) 567-8901", idType:"—",                addedDate:"Jun 20, 2026", accessTrigger:"Upon verified passing",                               status:"pending",      avatar:"MG", notes:"Invite sent Jun 20. Waiting for ID submission." },
];

const statusConfig: Record<VerifStatus, { label:string; color:string; bg:string; icon:React.ReactNode }> = {
  verified:     { label:"VERIFIED",      color:"#48BB78", bg:"rgba(72,187,120,0.12)",  icon:<CheckCircle size={13}/> },
  id_submitted: { label:"ID SUBMITTED",  color:"#5BA7D6", bg:"rgba(91,167,214,0.12)", icon:<Upload size={13}/> },
  pending:      { label:"INVITE SENT",   color:"#F6AD55", bg:"rgba(246,173,85,0.12)", icon:<Clock size={13}/> },
  rejected:     { label:"REJECTED",      color:"#FC8181", bg:"rgba(252,129,129,0.12)",icon:<AlertCircle size={13}/> },
};

const ID_TYPES = ["Driver's License","Passport","State ID","Military ID","Green Card","Other"];

export function LegacyVerification() {
  const [contacts, setContacts] = useState<VerifContact[]>(initContacts);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", phone:"", relationship:"", trigger:"Upon verified passing", idType:"Driver's License", notes:"" });
  const [verifying, setVerifying] = useState<number|null>(null);

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function addContact() {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    const contact: VerifContact = {
      id: Date.now(), name:form.name, email:form.email, phone:form.phone,
      relationship:form.relationship, idType:form.idType, notes:form.notes,
      addedDate: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      accessTrigger: form.trigger, status:"pending",
      avatar: form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
    };
    setContacts(p => [...p, contact]);
    toast.success(`Verification invite sent to ${form.email}`);
    setForm({ name:"", email:"", phone:"", relationship:"", trigger:"Upon verified passing", idType:"Driver's License", notes:"" });
    setShowAdd(false);
  }

  async function simulateVerify(id:number) {
    setVerifying(id);
    const tid = toast.loading("Simulating compliance team verification…");
    await new Promise(r => setTimeout(r, 1800));
    setContacts(p => p.map(c => c.id===id ? {...c, status:"verified"} : c));
    setVerifying(null);
    toast.success("✅ Contact verified — vault access granted on trigger condition", { id:tid });
  }

  function removeContact(id:number) {
    setContacts(p => p.filter(c=>c.id!==id));
    toast.success("Contact removed");
  }

  const verified = contacts.filter(c=>c.status==="verified").length;

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:900 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Contact Verification</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>
            Every legacy contact must verify their identity with a government-issued ID before vault access is granted. Our compliance team reviews each submission within 1–2 business days.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
          style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#070D1A", fontWeight:600, fontSize:14 }}>
          <Plus size={16}/> Add Contact
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Total Contacts", value:contacts.length, color:"var(--primary)" },
          { label:"Verified",        value:verified,        color:"#48BB78" },
          { label:"Pending / In Review", value:contacts.filter(c=>c.status==="pending"||c.status==="id_submitted").length, color:"#F6AD55" },
          { label:"Rejected",        value:contacts.filter(c=>c.status==="rejected").length, color:"#FC8181" },
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-2xl text-center glow-surface" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex gap-3 px-5 py-4 rounded-xl border" style={{ background:"rgba(91,167,214,0.06)", borderColor:"rgba(91,167,214,0.25)" }}>
        <Shield size={16} color="#5BA7D6" style={{ flexShrink:0, marginTop:2 }}/>
        <div style={{ color:"var(--muted-foreground)", fontSize:13, lineHeight:1.7 }}>
          Legacy contacts must submit a government-issued photo ID (driver's license, passport, or state ID). Until verified, contacts cannot access your vault under any circumstances. Click <strong style={{ color:"var(--foreground)" }}>Simulate Verify</strong> on any pending contact to see the full demo flow.
        </div>
      </div>

      {/* Contact cards */}
      <div className="space-y-4">
        {contacts.map(contact => {
          const sc = statusConfig[contact.status];
          return (
            <div key={contact.id} className="p-6 rounded-2xl glow-surface" style={CARD}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
                    style={{ width:48, height:48, background:"rgba(91,110,225,0.1)", color:"var(--primary)", fontSize:16, fontFamily:"var(--font-display)" }}>
                    {contact.avatar}
                  </div>
                  <div>
                    <div style={{ color:"var(--foreground)", fontSize:16, fontWeight:500 }}>{contact.name}</div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:13 }}>{contact.relationship}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background:sc.bg, color:sc.color }}>
                    {sc.icon}<span style={{ fontSize:11, ...MONO, fontWeight:600 }}>{sc.label}</span>
                  </div>
                  <button onClick={() => removeContact(contact.id)} className="p-1.5 rounded-lg" style={{ color:"#FC8181" }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2"><Mail size={13} color="var(--muted-foreground)"/><span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{contact.email}</span></div>
                <div className="flex items-center gap-2"><Phone size={13} color="var(--muted-foreground)"/><span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{contact.phone}</span></div>
                <div className="flex items-center gap-2"><UserCheck size={13} color="var(--muted-foreground)"/><span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{contact.idType}</span></div>
              </div>

              <div className="mt-3 px-4 py-3 rounded-xl" style={{ background:"#EAF0FC" }}>
                <div style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO, marginBottom:2 }}>ACCESS TRIGGER</div>
                <div style={{ color:"var(--foreground)", fontSize:13 }}>{contact.accessTrigger}</div>
              </div>

              {contact.notes && (
                <div style={{ color:"var(--muted-foreground)", fontSize:12, marginTop:8, fontStyle:"italic" }}>{contact.notes}</div>
              )}

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {contact.status === "pending" && (
                  <>
                    <div className="flex items-center gap-2 text-xs" style={{ color:"#F6AD55" }}>
                      <Clock size={12}/> Awaiting ID submission — invite sent to {contact.email}
                    </div>
                    <button onClick={() => toast.success(`Invite resent to ${contact.email}`)}
                      className="text-xs px-3 py-1.5 rounded-xl ml-auto"
                      style={{ color:"var(--primary)", background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.15)" }}>
                      Resend Invite
                    </button>
                  </>
                )}
                {contact.status === "id_submitted" && (
                  <>
                    <div className="flex items-center gap-2 text-xs" style={{ color:"#5BA7D6" }}>
                      <Upload size={12}/> ID submitted — pending compliance review (1–2 business days)
                    </div>
                    <button onClick={() => simulateVerify(contact.id)} disabled={verifying===contact.id}
                      className="text-xs px-3 py-1.5 rounded-xl ml-auto flex items-center gap-1.5"
                      style={{ color:"#48BB78", background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
                      {verifying===contact.id ? <><RefreshCw size={10} className="animate-spin"/> Verifying…</> : "Simulate Verify ✓"}
                    </button>
                  </>
                )}
                {contact.status === "pending" && (
                  <button onClick={() => { setContacts(p=>p.map(c=>c.id===contact.id?{...c,status:"id_submitted"}:c)); toast.success("ID submission simulated"); }}
                    className="text-xs px-3 py-1.5 rounded-xl"
                    style={{ color:"#5BA7D6", background:"rgba(91,167,214,0.08)", border:"1px solid rgba(91,167,214,0.2)" }}>
                    Simulate ID Submit
                  </button>
                )}
                {contact.status === "verified" && (
                  <div className="flex items-center gap-2 text-xs" style={{ color:"#48BB78" }}>
                    <CheckCircle size={12}/> Fully verified — vault access will activate on trigger condition
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Process steps */}
      <div className="p-6 rounded-2xl glow-surface" style={CARD}>
        <h3 style={{ fontFamily:"var(--font-display)", fontSize:16, color:"var(--foreground)", marginBottom:16 }}>Verification Process</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step:"1", label:"Add Contact",    desc:"Enter their details and set access conditions" },
            { step:"2", label:"Send Invite",     desc:"They receive an email with a secure verification link" },
            { step:"3", label:"ID Submission",   desc:"They upload a government-issued photo ID" },
            { step:"4", label:"Admin Review",    desc:"Our compliance team verifies within 1–2 business days" },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-3 flex items-center justify-center rounded-full"
                style={{ width:36, height:36, background:"rgba(91,110,225,0.12)", color:"var(--primary)", fontFamily:"var(--font-display)", fontWeight:700 }}>
                {s.step}
              </div>
              <div style={{ color:"var(--foreground)", fontSize:14, fontWeight:500, marginBottom:4 }}>{s.label}</div>
              <div style={{ color:"var(--muted-foreground)", fontSize:12 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-7 overflow-y-auto" style={{ ...CARD, maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--foreground)" }}>Add Legacy Contact</h3>
              <button onClick={() => setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              {[
                { key:"name",         label:"Full Legal Name",  placeholder:"As it appears on their ID" },
                { key:"email",        label:"Email Address",    placeholder:"contact@email.com" },
                { key:"phone",        label:"Phone Number",     placeholder:"+1 (555) 000-0000" },
                { key:"relationship", label:"Relationship",     placeholder:"e.g. Spouse, Son, Attorney" },
                { key:"trigger",      label:"Access Trigger",   placeholder:"e.g. Upon verified passing" },
                { key:"notes",        label:"Notes (optional)", placeholder:"Any additional context" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color:"var(--muted-foreground)", fontSize:12, display:"block", marginBottom:6 }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={F(f.key)} placeholder={f.placeholder} style={INPUT}/>
                </div>
              ))}
              <div>
                <label style={{ color:"var(--muted-foreground)", fontSize:12, display:"block", marginBottom:6 }}>ID TYPE THEY WILL SUBMIT</label>
                <select value={form.idType} onChange={F("idType")} style={INPUT}>
                  {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="border-2 border-dashed rounded-xl p-5 text-center" style={{ borderColor:"rgba(91,110,225,0.3)" }}>
                <Upload size={22} color="var(--primary)" style={{ margin:"0 auto 8px" }}/>
                <div style={{ color:"var(--foreground)", fontSize:13, marginBottom:4 }}>Upload or Scan Their ID Now (optional)</div>
                <div style={{ color:"var(--muted-foreground)", fontSize:12, marginBottom:12 }}>Driver's License, Passport, or State ID</div>
                <div className="flex justify-center">
                  <ScanButton folder="legal" onUpload={doc => toast.success(`"${doc.name}" scanned and attached`)} size="sm" label="Scan ID with Camera"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={addContact}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#070D1A", fontSize:14 }}>
                  Send Verification Invite
                </button>
                <button onClick={() => setShowAdd(false)} className="px-6 py-3 rounded-xl"
                  style={{ background:"var(--secondary)", color:"var(--foreground)", fontSize:14 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
