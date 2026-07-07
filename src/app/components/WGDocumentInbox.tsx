/**
 * WGDocumentInbox — White Glove Specialist Document Inbox
 *
 * Shown inside the Concierge Portal as a new tab.
 * Specialists see all documents submitted by their assigned clients,
 * can preview them, and upload them directly to the correct vault folder.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Inbox, Eye, Upload, CheckCircle, AlertCircle, X,
  FileText, Image, FolderOpen, ArrowRight, RefreshCw,
  Copy, Link, Send, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../utils/clipboard";
import { submissionStore, subscribeToSubmissions, notifyListeners, type SubmittedDocument } from "./WGClientSubmit";
import { type ConciergeEmployee } from "../services/conciergeStaff";

const GLASS: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(108,92,231,0.1)", boxShadow:"0 2px 12px rgba(108,92,231,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

/* ── Every platform destination a document can go ───────────────── */
const PLATFORM_SECTIONS = [
  {
    section:"file_cabinet", label:"Digital File Cabinet", emoji:"📁", color:"#6C5CE7",
    desc:"Document stored in one of 18 encrypted vault folders",
    subOptions:[
      { id:"legal",     label:"Legal Documents",        emoji:"⚖️" },
      { id:"financial", label:"Financial Records",      emoji:"💰" },
      { id:"medical",   label:"Medical Records",        emoji:"🏥" },
      { id:"taxes",     label:"Tax Records",            emoji:"📋" },
      { id:"property",  label:"Property & Real Estate", emoji:"🏠" },
      { id:"vehicles",  label:"Vehicles",               emoji:"🚗" },
      { id:"utilities", label:"Utilities & Services",   emoji:"⚡" },
      { id:"insurance", label:"Insurance Policies",     emoji:"🛡️" },
      { id:"pets",      label:"Pet Records",            emoji:"🐾" },
      { id:"personal",  label:"Personal Letters",       emoji:"💌" },
      { id:"photos",    label:"Photo Albums",           emoji:"📷" },
      { id:"videos",    label:"Videos & Recordings",   emoji:"🎬" },
      { id:"digital",   label:"Digital Assets",        emoji:"💻" },
      { id:"business",  label:"Business Records",      emoji:"📊" },
      { id:"crypto",    label:"Crypto & NFTs",         emoji:"₿"  },
      { id:"education", label:"Education & Awards",    emoji:"🎓" },
      { id:"military",  label:"Military Records",      emoji:"🎖️"},
      { id:"other",     label:"Other Documents",       emoji:"📄" },
    ],
  },
  {
    section:"medical", label:"Medical Information", emoji:"🏥", color:"#FC8181",
    desc:"Allergy record, medication, test result, or insurance card",
    subOptions:[
      { id:"allergy",    label:"Allergy Record",         emoji:"🚨" },
      { id:"medication", label:"Medication / Prescription", emoji:"💊" },
      { id:"test",       label:"Test Result / Lab Report",emoji:"🧪" },
      { id:"insurance",  label:"Insurance / Medicare Card",emoji:"🪪" },
      { id:"directive",  label:"Healthcare Directive",   emoji:"📋" },
    ],
  },
  {
    section:"financial", label:"Financial Records", emoji:"💰", color:"#F6AD55",
    desc:"Insurance policy, bank statement, investment, retirement, tax, or business",
    subOptions:[
      { id:"insurance",   label:"Insurance Policy",       emoji:"🛡️" },
      { id:"realestate",  label:"Real Estate / Property", emoji:"🏠" },
      { id:"investment",  label:"Investment / Brokerage", emoji:"📈" },
      { id:"retirement",  label:"Retirement (401k/IRA)",  emoji:"🏦" },
      { id:"tax",         label:"Tax Return / W-2",       emoji:"📋" },
      { id:"business",    label:"Business Document",      emoji:"📊" },
    ],
  },
  {
    section:"assets", label:"Personal Assets", emoji:"🚗", color:"#ED8936",
    desc:"Vehicle title, utility bill, digital asset info, or firearm record",
    subOptions:[
      { id:"vehicle",  label:"Vehicle Title / Registration", emoji:"🚗" },
      { id:"utility",  label:"Utility Account Info",         emoji:"⚡" },
      { id:"digital",  label:"Digital Asset / Crypto Info",  emoji:"₿"  },
      { id:"firearm",  label:"Firearm Registration",         emoji:"🔫" },
    ],
  },
  {
    section:"memories", label:"Memories & Media", emoji:"📷", color:"#8B7CF6",
    desc:"Photo, video, or written memory to add to the family memories section",
    subOptions:[
      { id:"photo",  label:"Family Photo",          emoji:"📷" },
      { id:"video",  label:"Video Memory",          emoji:"🎬" },
      { id:"note",   label:"Written Memory / Story",emoji:"✍️" },
    ],
  },
  {
    section:"diary", label:"Digital Diary Entry", emoji:"📖", color:"#9F7AEA",
    desc:"Photo, audio, or video to attach to a new diary entry",
    subOptions:[
      { id:"photo", label:"Photo Entry",         emoji:"📷" },
      { id:"audio", label:"Audio Recording",     emoji:"🎙️" },
      { id:"video", label:"Video Message",       emoji:"🎥" },
    ],
  },
  {
    section:"final_wishes", label:"Final Wishes & Wills", emoji:"❤️", color:"#E53E3E",
    desc:"Signed will, codicil, or supporting estate document",
    subOptions:[
      { id:"will",      label:"Will / Testament",      emoji:"⚖️" },
      { id:"trust",     label:"Trust Document",        emoji:"📜" },
      { id:"directive", label:"Advance Directive",     emoji:"📋" },
      { id:"other",     label:"Other Estate Document", emoji:"📄" },
    ],
  },
  {
    section:"contacts", label:"Contact ID Verification", emoji:"🪪", color:"#48BB78",
    desc:"Government-issued photo ID for a legacy or guardian contact",
    subOptions:[
      { id:"drivers_license", label:"Driver's License",    emoji:"🪪" },
      { id:"passport",        label:"Passport",            emoji:"🛂" },
      { id:"state_id",        label:"State ID",            emoji:"🪪" },
      { id:"other_id",        label:"Other Government ID", emoji:"📄" },
    ],
  },
  {
    section:"profile_photo", label:"Profile Photo", emoji:"🤳", color:"#9F7AEA",
    desc:"Set as the client's profile picture in their account",
    subOptions:[{ id:"headshot", label:"Profile / Headshot Photo", emoji:"🤳" }],
  },
  {
    section:"pets", label:"Pet Records", emoji:"🐾", color:"#F6AD55",
    desc:"Vet record, vaccination certificate, or pet photo",
    subOptions:[
      { id:"vet",    label:"Vet Record",            emoji:"🐾" },
      { id:"vaccine",label:"Vaccination Record",    emoji:"💉" },
      { id:"photo",  label:"Pet Photo",             emoji:"📷" },
    ],
  },
];

// Map clients to their submission tokens
const CLIENT_TOKENS: Record<string, string> = {
  "WG-001": "TOKEN_MARCUS_001",
  "WG-002": "TOKEN_PATRICIA_002",
  "WG-003": "TOKEN_JAMES_003",
};

interface InboxProps {
  employee: ConciergeEmployee;
  assignedClientIds: string[];
}

/* ── Upload to Account modal — covers ALL platform features ─────── */
function UploadToAccountModal({
  doc, clientName, onUpload, onClose,
}: {
  doc: SubmittedDocument;
  clientName: string;
  onUpload: (destination: string) => void;
  onClose: () => void;
}) {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Auto-suggest based on document category
  React.useEffect(() => {
    const cat = doc.category.toLowerCase();
    let section = "file_cabinet"; let sub = "other";
    if (cat.includes("will") || cat.includes("legal") || cat.includes("trust")) { section="file_cabinet"; sub="legal"; }
    else if (cat.includes("insurance") && !cat.includes("medical")) { section="financial"; sub="insurance"; }
    else if (cat.includes("medical") || cat.includes("prescription") || cat.includes("medicare")) { section="medical"; sub="medication"; }
    else if (cat.includes("bank") || cat.includes("invest") || cat.includes("financial")) { section="financial"; sub="investment"; }
    else if (cat.includes("tax") || cat.includes("w-2") || cat.includes("1099")) { section="financial"; sub="tax"; }
    else if (cat.includes("property") || cat.includes("deed") || cat.includes("mortgage")) { section="financial"; sub="realestate"; }
    else if (cat.includes("vehicle") || cat.includes("title") || cat.includes("registration")) { section="assets"; sub="vehicle"; }
    else if (cat.includes("utility") || cat.includes("bill")) { section="assets"; sub="utility"; }
    else if (cat.includes("crypto") || cat.includes("wallet") || cat.includes("bitcoin")) { section="assets"; sub="digital"; }
    else if (cat.includes("photo") || cat.includes("memory") || cat.includes("family photo")) { section="memories"; sub="photo"; }
    else if (cat.includes("video") || cat.includes("recording")) { section="diary"; sub="video"; }
    else if (cat.includes("passport") || cat.includes("government id") || cat.includes("driver")) { section="contacts"; sub="drivers_license"; }
    else if (cat.includes("profile photo") || cat.includes("headshot")) { section="profile_photo"; sub="headshot"; }
    else if (cat.includes("pet") || cat.includes("vaccination")) { section="pets"; sub="vet"; }
    else if (cat.includes("military")) { section="file_cabinet"; sub="military"; }
    else if (cat.includes("education") || cat.includes("diploma")) { section="file_cabinet"; sub="education"; }
    setSelectedSection(section);
    setSelectedSub(sub);
  }, [doc.category]);

  const activeSection = PLATFORM_SECTIONS.find(s => s.section === selectedSection);
  const destination = selectedSection && selectedSub
    ? `${activeSection?.label} → ${activeSection?.subOptions.find(s=>s.id===selectedSub)?.label}`
    : "";

  function doUpload() {
    if (!selectedSection || !selectedSub) { toast.error("Please select where to save this document"); return; }
    setUploading(true);
    setTimeout(() => { setUploading(false); onUpload(destination); }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ ...GLASS, maxHeight:"90vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"
          style={{ borderColor:"rgba(108,92,231,0.08)" }}>
          <div className="flex items-center gap-2">
            <Upload size={16} color="#6C5CE7"/>
            <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#0D1428" }}>
              Add to {clientName}'s Account
            </span>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight:"calc(90vh - 70px)" }}>
          {/* Document summary */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background:"rgba(108,92,231,0.04)", border:"1px solid rgba(108,92,231,0.1)" }}>
            {doc.fileType === "image" ? <Image size={18} color="#9F7AEA"/> : <FileText size={18} color="#6C5CE7"/>}
            <div className="flex-1">
              <div style={{ color:"#0D1428", fontSize:13, fontWeight:500 }}>{doc.category}</div>
              <div style={{ color:"#8A9AB8", fontSize:11 }}>{doc.fileName} · {doc.fileSizeMB} MB</div>
            </div>
          </div>

          {doc.notes && (
            <div className="px-3 py-2 rounded-xl" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
              <div style={{ color:"#F6AD55", fontSize:10, ...MONO, marginBottom:2 }}>CLIENT NOTE</div>
              <div style={{ color:"#5A6A88", fontSize:12 }}>"{doc.notes}"</div>
            </div>
          )}

          {/* Step 1: Choose platform section */}
          <div>
            <div style={{ color:"#5A6A88", fontSize:11, ...MONO, marginBottom:10 }}>
              STEP 1 — WHERE DOES THIS GO IN THE ACCOUNT?
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PLATFORM_SECTIONS.map(s => (
                <button key={s.section} onClick={() => { setSelectedSection(s.section); setSelectedSub(s.subOptions[0]?.id ?? ""); }}
                  className="flex flex-col items-start gap-1 px-3 py-3 rounded-xl text-left transition-all"
                  style={{ background:selectedSection===s.section?`${s.color}12`:"rgba(108,92,231,0.03)",
                    border:`1.5px solid ${selectedSection===s.section?s.color:"rgba(108,92,231,0.1)"}` }}>
                  <div style={{ fontSize:20 }}>{s.emoji}</div>
                  <div style={{ color:selectedSection===s.section?s.color:"#0D1428", fontSize:11, fontWeight:600, lineHeight:1.3 }}>{s.label}</div>
                  <div style={{ color:"#8A9AB8", fontSize:9, lineHeight:1.3 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Sub-section */}
          {activeSection && activeSection.subOptions.length > 1 && (
            <div>
              <div style={{ color:"#5A6A88", fontSize:11, ...MONO, marginBottom:8 }}>
                STEP 2 — WHICH PART OF {activeSection.label.toUpperCase()}?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeSection.subOptions.map(sub => (
                  <button key={sub.id} onClick={() => setSelectedSub(sub.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{ background:selectedSub===sub.id?`${activeSection.color}12`:"rgba(108,92,231,0.03)",
                      border:`1.5px solid ${selectedSub===sub.id?activeSection.color:"rgba(108,92,231,0.1)"}` }}>
                    <span style={{ fontSize:16 }}>{sub.emoji}</span>
                    <span style={{ color:selectedSub===sub.id?activeSection.color:"#5A6A88", fontSize:11, fontWeight:selectedSub===sub.id?700:400 }}>
                      {sub.label}
                    </span>
                    {selectedSub===sub.id && <CheckCircle size={11} color={activeSection.color} style={{ marginLeft:"auto" }}/>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Destination summary */}
          {destination && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
              <CheckCircle size={14} color="#48BB78"/>
              <div>
                <span style={{ color:"#5A6A88", fontSize:12 }}>Will be saved to: </span>
                <strong style={{ color:"#0D1428", fontSize:12 }}>{destination}</strong>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={doUpload} disabled={uploading || !destination}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#F0F4FA",
                boxShadow:"0 0 20px rgba(108,92,231,0.3)", opacity:uploading||!destination?0.5:1 }}>
              {uploading
                ? <><RefreshCw size={14} style={{ animation:"spin 0.8s linear infinite" }}/> Saving to Account…</>
                : <><Upload size={14}/> Save to {clientName.split(" ")[0]}'s Account</>
              }
            </button>
            <button onClick={onClose} className="px-4 py-3 rounded-xl text-sm"
              style={{ background:"rgba(108,92,231,0.06)", color:"#5A6A88" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Send link modal ────────────────────────────────────────────── */
function SendLinkModal({
  clientId, clientName, clientEmail, onClose,
}: {
  clientId: string; clientName: string; clientEmail: string; onClose: () => void;
}) {
  const token = CLIENT_TOKENS[clientId] ?? `TOKEN_${clientId.replace("-","_")}`;
  const link = `https://finalpassdown.com/wg-submit?token=${token}`;
  const [sent, setSent] = useState(false);

  function sendViaEmail() {
    setSent(true);
    setTimeout(() => {
      toast.success(`Upload link sent to ${clientEmail}`);
      onClose();
    }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={GLASS}>
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor:"rgba(108,92,231,0.08)" }}>
          <div className="flex items-center gap-2">
            <Link size={16} color="#9F7AEA"/>
            <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#0D1428" }}>
              Send Upload Link to {clientName.split(" ")[0]}
            </span>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4">
          <p style={{ color:"#5A6A88", fontSize:13, lineHeight:1.7 }}>
            Share this link with {clientName} so they can easily upload documents from their phone. No login required — they just open the link, take a photo or upload a file, and it goes straight to your inbox.
          </p>

          {/* The link */}
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl"
            style={{ background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.15)" }}>
            <ExternalLink size={12} color="#8A9AB8" style={{ flexShrink:0 }}/>
            <span style={{ color:"#6C5CE7", fontSize:11, ...MONO, flex:1 }} className="truncate">{link}</span>
            <button onClick={() => { copyToClipboard(link); toast.success("Link copied!"); }}
              style={{ color:"#6C5CE7", flexShrink:0 }}>
              <Copy size={14}/>
            </button>
          </div>

          <div className="space-y-2">
            <div style={{ color:"#5A6A88", fontSize:11, ...MONO, marginBottom:4 }}>SEND TO CLIENT VIA</div>
            <button onClick={sendViaEmail} disabled={sent}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#F0F4FA" }}>
              <Send size={14}/>
              {sent ? "Sending…" : `Email to ${clientEmail}`}
            </button>
            <button onClick={() => { window.open(`sms:?body=Here is your secure document upload link: ${link}`); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.25)" }}>
              💬 Send via SMS Text Message
            </button>
          </div>

          <div className="px-3 py-2 rounded-xl"
            style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
            <p style={{ color:"#F6AD55", fontSize:11, lineHeight:1.6 }}>
              <strong>Tip for non-tech clients:</strong> Tell them to just tap the link in their email or text, then take a photo of each document like they're texting a picture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Inbox component ──────────────────────────────────────── */
export function WGDocumentInbox({ employee, assignedClientIds }: InboxProps) {

  /** Read from the shared store — called on mount and whenever a client submits */
  const readFromStore = useCallback((): Record<string, SubmittedDocument[]> => {
    const result: Record<string, SubmittedDocument[]> = {};
    assignedClientIds.forEach(id => {
      const token = CLIENT_TOKENS[id];
      if (token) result[id] = [...(submissionStore[token] ?? [])];
    });
    return result;
  }, [assignedClientIds]);

  const [docs, setDocs] = useState<Record<string, SubmittedDocument[]>>(readFromStore);
  const [uploadModal, setUploadModal] = useState<{ doc: SubmittedDocument; clientId: string } | null>(null);
  const [linkModal, setLinkModal] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "received" | "uploaded">("all");

  /** Subscribe to store changes — re-read whenever WGClientSubmit adds a document */
  useEffect(() => {
    const unsub = subscribeToSubmissions(() => setDocs(readFromStore()));
    return unsub;
  }, [readFromStore]);

  const CLIENT_NAMES: Record<string, string> = {
    "WG-001":"Dorothy Henderson",
    "WG-002":"Walter & Edna Briggs",
    "WG-003":"Margaret Thompson",
  };
  const CLIENT_EMAILS: Record<string, string> = {
    "WG-001":"d.henderson@email.com",
    "WG-002":"w.briggs@email.com",
    "WG-003":"m.thompson@email.com",
  };

  // Flatten all docs with clientId
  const allDocs = assignedClientIds.flatMap(cid =>
    (docs[cid] ?? []).map(d => ({ ...d, clientId: cid }))
  );

  const filtered = allDocs.filter(d =>
    filter === "all" ? true :
    filter === "pending" ? d.status === "pending" :
    filter === "received" ? d.status === "received" :
    d.status === "uploaded_to_vault"
  );

  const pendingCount = allDocs.filter(d => d.status === "pending" || d.status === "received").length;

  function markUploaded(clientId: string, docId: string, folder: string) {
    const token = CLIENT_TOKENS[clientId];
    if (token && submissionStore[token]) {
      submissionStore[token] = submissionStore[token].map(d =>
        d.id === docId ? { ...d, status:"uploaded_to_vault" } : d
      );
    }
    setDocs(prev => ({
      ...prev,
      [clientId]: (prev[clientId] ?? []).map(d =>
        d.id === docId ? { ...d, status:"uploaded_to_vault" } : d
      ),
    }));
    notifyListeners(); // sync back to WGClientSubmit status tab
    setUploadModal(null);
    toast.success(`✅ Saved to ${CLIENT_NAMES[clientId]?.split(" ")[0]}'s account — ${folder}`);
  }

  function requestResubmit(clientId: string, docId: string) {
    const token = CLIENT_TOKENS[clientId];
    if (token && submissionStore[token]) {
      submissionStore[token] = submissionStore[token].map(d =>
        d.id === docId ? { ...d, status:"needs_resubmit" } : d
      );
    }
    setDocs(prev => ({
      ...prev,
      [clientId]: (prev[clientId] ?? []).map(d =>
        d.id === docId ? { ...d, status:"needs_resubmit" } : d
      ),
    }));
    notifyListeners(); // sync back to WGClientSubmit status tab
    toast.success("Client notified to resubmit this document");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div style={{ color:"#9F7AEA", fontSize:11, ...MONO, letterSpacing:"0.1em", marginBottom:4 }}>
            DOCUMENT INBOX
          </div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#0D1428" }}>
            Client Document Inbox
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-sm font-bold"
                style={{ background:"rgba(246,173,85,0.15)", color:"#F6AD55", fontFamily:"var(--font-mono)" }}>
                {pendingCount} awaiting action
              </span>
            )}
          </h2>
          <p style={{ color:"#5A6A88", fontSize:12, marginTop:4 }}>
            Documents submitted by your clients. Review, then upload to their vault.
          </p>
        </div>
      </div>

      {/* Send link buttons per client */}
      <div className="p-4 rounded-2xl space-y-3" style={{ background:"rgba(159,122,234,0.04)", border:"1px solid rgba(159,122,234,0.15)" }}>
        <div style={{ color:"#9F7AEA", fontSize:11, fontWeight:700, ...MONO }}>SEND UPLOAD LINK TO CLIENT</div>
        <p style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7 }}>
          Send each client a simple link they can open on their phone to photograph and upload their documents. No app or login required.
        </p>
        <div className="flex flex-wrap gap-2">
          {assignedClientIds.map(id => (
            <button key={id} onClick={() => setLinkModal(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F" }}>
              <Link size={13}/> Send Link to {CLIENT_NAMES[id]?.split(" ")[0] ?? id}
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(108,92,231,0.1)" }}>
        {[
          { id:"all",      label:`All (${allDocs.length})` },
          { id:"pending",  label:`Pending (${allDocs.filter(d=>d.status==="pending").length})` },
          { id:"received", label:`Received (${allDocs.filter(d=>d.status==="received").length})` },
          { id:"uploaded", label:`In Account (${allDocs.filter(d=>d.status==="uploaded_to_vault").length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as any)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background:filter===f.id?"#6C5CE7":"transparent", color:filter===f.id?"#fff":"#5A6A88" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center rounded-2xl" style={GLASS}>
          <Inbox size={36} color="rgba(108,92,231,0.2)" style={{ margin:"0 auto 12px" }}/>
          <div style={{ color:"#8A9AB8", fontSize:14 }}>
            {filter === "all" ? "No documents submitted yet." : `No ${filter} documents.`}
          </div>
          <div style={{ color:"#B0C0DC", fontSize:12, marginTop:4 }}>
            Send the upload link to your clients so they can start submitting.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const clientName = CLIENT_NAMES[doc.clientId] ?? doc.clientId;
            const statusColors = {
              pending:            { color:"#F6AD55", bg:"rgba(246,173,85,0.1)",   label:"Pending" },
              received:           { color:"#6C5CE7", bg:"rgba(108,92,231,0.1)",    label:"Received" },
              uploaded_to_vault:  { color:"#48BB78", bg:"rgba(72,187,120,0.1)",   label:"Saved to Account ✓" },
              needs_resubmit:     { color:"#FC8181", bg:"rgba(252,129,129,0.1)",  label:"Needs Resubmit" },
            }[doc.status];

            return (
              <div key={doc.id} className="p-5 rounded-2xl" style={GLASS}>
                <div className="flex items-start gap-4">
                  {/* Thumbnail or icon */}
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ width:56, height:56, background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.1)", overflow:"hidden" }}>
                    {doc.previewUrl && doc.fileType === "image"
                      ? <img src={doc.previewUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <FileText size={24} color="#6C5CE7"/>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div style={{ color:"#0D1428", fontSize:14, fontWeight:600 }}>{doc.category}</div>
                        <div style={{ color:"#8A9AB8", fontSize:11, marginTop:2 }}>
                          From: <strong style={{ color:"#5A6A88" }}>{clientName}</strong> · {doc.submittedAt}
                        </div>
                        <div style={{ color:"#8A9AB8", fontSize:11, marginTop:1 }}>
                          {doc.fileName} · {doc.fileSizeMB} MB
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-bold flex-shrink-0"
                        style={{ background:statusColors.bg, color:statusColors.color, ...MONO }}>
                        {statusColors.label}
                      </span>
                    </div>

                    {doc.notes && (
                      <div className="mt-2 px-3 py-2 rounded-xl"
                        style={{ background:"rgba(246,173,85,0.05)", border:"1px solid rgba(246,173,85,0.15)" }}>
                        <span style={{ color:"#F6AD55", fontSize:10, ...MONO }}>CLIENT NOTE: </span>
                        <span style={{ color:"#5A6A88", fontSize:12 }}>"{doc.notes}"</span>
                      </div>
                    )}

                    {doc.status !== "uploaded_to_vault" && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <button onClick={() => setUploadModal({ doc, clientId: doc.clientId })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                          style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#F0F4FA" }}>
                          <Upload size={11}/> Save to Account
                        </button>
                        {doc.fileType === "image" && doc.previewUrl && (
                          <button onClick={() => window.open(doc.previewUrl!)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                            style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7" }}>
                            <Eye size={11}/> Preview
                          </button>
                        )}
                        <button onClick={() => requestResubmit(doc.clientId, doc.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181" }}>
                          <AlertCircle size={11}/> Request Resend
                        </button>
                      </div>
                    )}

                    {doc.status === "uploaded_to_vault" && (
                      <div className="flex items-center gap-2 mt-2">
                        <CheckCircle size={13} color="#48BB78"/>
                        <span style={{ color:"#48BB78", fontSize:12 }}>
                          Saved to account
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {uploadModal && (
        <UploadToAccountModal
          doc={uploadModal.doc}
          clientName={CLIENT_NAMES[uploadModal.clientId] ?? "Client"}
          onUpload={folder => markUploaded(uploadModal.clientId, uploadModal.doc.id, folder)}
          onClose={() => setUploadModal(null)}
        />
      )}
      {linkModal && (
        <SendLinkModal
          clientId={linkModal}
          clientName={CLIENT_NAMES[linkModal] ?? "Client"}
          clientEmail={CLIENT_EMAILS[linkModal] ?? "client@email.com"}
          onClose={() => setLinkModal(null)}
        />
      )}
    </div>
  );
}
