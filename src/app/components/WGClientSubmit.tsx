/**
 * WGClientSubmit — White Glove Client Document Submission
 *
 * A simple, phone-friendly upload page accessed via a unique secure link
 * sent by the specialist. No login required. The client (or a family member)
 * can upload photos/scans of physical documents and label them. The specialist
 * then sees them in their Document Inbox inside the Concierge Portal.
 *
 * URL pattern: /wg-submit?token=TOKEN_XXXXX
 */
import React, { useState, useRef } from "react";
import {
  Upload, Camera, CheckCircle, X, FileText, Image,
  AlertCircle, ChevronDown, Star, Phone, Lock, Send
} from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import fpdSquareLogo from "../../imports/FPD_mark_square.png";

const GLASS: React.CSSProperties = { background:"linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%)", border:"1px solid rgba(91,167,214,0.35)", boxShadow:"0 0 0 1px rgba(91,167,214,0.1), 0 8px 24px rgba(0,0,0,0.35)" };

/* ── Types ─────────────────────────────────────────────────────── */
export interface SubmittedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeMB: number;
  category: string;
  notes: string;
  submittedAt: string;
  status: "pending" | "received" | "uploaded_to_vault" | "needs_resubmit";
  previewUrl?: string;
}

/* ── Reactive submission store — pub/sub so inbox auto-updates ── */
type StoreListener = () => void;
const _storeListeners = new Set<StoreListener>();

export function notifyListeners() {
  _storeListeners.forEach(fn => fn());
}

/** Subscribe to any store change. Returns unsubscribe function. */
export function subscribeToSubmissions(fn: StoreListener): () => void {
  _storeListeners.add(fn);
  return () => _storeListeners.delete(fn);
}

export const submissionStore: Record<string, SubmittedDocument[]> = {
  // token → list of submitted documents
  "TOKEN_MARCUS_001": [
    {
      id:"SUB-001", fileName:"Will_and_Testament_Scan.jpg", fileType:"image",
      fileSizeMB:1.4, category:"Legal Documents", notes:"My original will from 2019",
      submittedAt:"Jun 25, 2026 · 2:14 PM", status:"received",
    },
    {
      id:"SUB-002", fileName:"MetLife_Insurance_Policy.jpg", fileType:"image",
      fileSizeMB:2.1, category:"Insurance Policies", notes:"Life insurance card and policy number",
      submittedAt:"Jun 25, 2026 · 2:18 PM", status:"uploaded_to_vault",
    },
  ],
  "TOKEN_PATRICIA_002": [],
  "TOKEN_JAMES_003": [],
};

const DOCUMENT_CATEGORIES = [
  // Legal & vault
  { id:"legal",        label:"Will, Trust, or Legal Papers",         emoji:"⚖️" },
  { id:"insurance",    label:"Insurance Policy or Card",             emoji:"🛡️" },
  // Financial
  { id:"financial",    label:"Bank or Investment Statement",         emoji:"💰" },
  { id:"tax",          label:"Tax Return, W-2, or 1099",            emoji:"📋" },
  { id:"retirement",   label:"401k, IRA, or Pension",               emoji:"🏦" },
  { id:"business",     label:"Business Document or Contract",       emoji:"📊" },
  // Medical
  { id:"medical",      label:"Medical Record or Test Result",       emoji:"🏥" },
  { id:"prescription", label:"Prescription or Medication Label",    emoji:"💊" },
  { id:"medical_card", label:"Insurance or Medicare Card",          emoji:"🪪" },
  // Property & assets
  { id:"property",     label:"Property Deed or Mortgage",           emoji:"🏠" },
  { id:"vehicle",      label:"Vehicle Title or Registration",       emoji:"🚗" },
  { id:"utility",      label:"Utility Bill or Account Info",        emoji:"⚡" },
  // Digital & crypto
  { id:"crypto",       label:"Crypto Wallet or Account Info",       emoji:"₿" },
  { id:"digital",      label:"Domain, Software, or Online Account", emoji:"💻" },
  // Memories & media
  { id:"photo",        label:"Family Photo or Memory",              emoji:"📷" },
  { id:"video",        label:"Video Recording or Message",          emoji:"🎬" },
  // Personal
  { id:"personal",     label:"Personal Letter or Handwritten Note", emoji:"💌" },
  { id:"id_doc",       label:"Government ID or Passport",          emoji:"🪪" },
  { id:"military",     label:"Military Record or DD-214",           emoji:"🎖️" },
  { id:"education",    label:"Diploma, Degree, or Certificate",     emoji:"🎓" },
  // Pets
  { id:"pet",          label:"Pet Record or Vaccination",           emoji:"🐾" },
  // Other
  { id:"profile_photo",label:"My Profile Photo / Headshot",        emoji:"🤳" },
  { id:"other",        label:"Something Else",                      emoji:"📄" },
];

/* ── Status badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: SubmittedDocument["status"] }) {
  const cfg = {
    pending:            { color:"#F6AD55", bg:"rgba(246,173,85,0.12)",   label:"Waiting to be received" },
    received:           { color:"#6E90C9", bg:"rgba(91,110,225,0.1)",     label:"Received by specialist" },
    uploaded_to_vault:  { color:"#D99A6B", bg:"rgba(72,187,120,0.12)",   label:"Uploaded to your vault ✓" },
    needs_resubmit:     { color:"#FC8181", bg:"rgba(252,129,129,0.12)",  label:"Please resubmit — unclear scan" },
  }[status];
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background:cfg.bg, color:cfg.color, fontFamily:"var(--font-mono)" }}>
      {cfg.label}
    </span>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export function WGClientSubmit({ token = "TOKEN_JAMES_003" }: { token?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [submissions, setSubmissions] = useState<SubmittedDocument[]>(
    submissionStore[token] ?? []
  );
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<"submit" | "status">("submit");

  // Derive specialist name from token (in production, fetched from DB)
  const specialistName = token.includes("MARCUS") ? "Marcus Williams"
    : token.includes("PATRICIA") ? "Patricia Chen"
    : "James Rivera";

  const clientName = token.includes("MARCUS") ? "Dorothy Henderson"
    : token.includes("PATRICIA") ? "Walter & Edna Briggs"
    : "Margaret Thompson";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20_000_000) { toast.error("File must be under 20 MB"); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleScanUpload(doc: { file: File; previewUrl: string; name: string }) {
    setSelectedFile(doc.file);
    setPreviewUrl(doc.previewUrl);
    if (!category) setShowCategoryPicker(true);
  }

  function removeSelected() {
    setSelectedFile(null);
    setPreviewUrl(null);
  }

  async function submitDocument() {
    if (!selectedFile) { toast.error("Please select or scan a document first"); return; }
    if (!category) { toast.error("Please choose what type of document this is"); return; }
    setUploading(true);
    await new Promise(r => setTimeout(r, 1400));

    const newSub: SubmittedDocument = {
      id: `SUB-${Date.now().toString(36).toUpperCase()}`,
      fileName: selectedFile.name || "Scanned_Document.jpg",
      fileType: selectedFile.type.includes("image") ? "image" : "document",
      fileSizeMB: Math.round(selectedFile.size / 1024 / 1024 * 10) / 10,
      category: DOCUMENT_CATEGORIES.find(c => c.id === category)?.label ?? category,
      notes: notes.trim(),
      submittedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
      status: "pending",
      previewUrl: previewUrl ?? undefined,
    };

    // Update shared store
    if (!submissionStore[token]) submissionStore[token] = [];
    submissionStore[token] = [...submissionStore[token], newSub];
    notifyListeners(); // ← wake up all inbox listeners
    setSubmissions(prev => [...prev, newSub]);
    setUploading(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCategory("");
    setNotes("");
    toast.success(`"${newSub.category}" sent to ${specialistName} successfully!`);
    setView("status");
  }

  const pendingCount = submissions.filter(s => s.status === "pending" || s.status === "received").length;
  const uploadedCount = submissions.filter(s => s.status === "uploaded_to_vault").length;

  return (
    <div className="min-h-screen" style={{ background:"#070A12", fontFamily:"var(--font-body)" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b"
        style={{ background:"#0A0F1A", borderColor:"rgba(91,167,214,0.2)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={fpdSquareLogo} alt="FPD" style={{ width:36, height:36, borderRadius:8, objectFit:"contain" }}/>
          <div>
            <div style={{ fontFamily:"var(--font-display)", color:"#6FAE8B", fontSize:11, fontWeight:700, letterSpacing:"0.06em" }}>
              FINAL PASS DOWN
            </div>
            <div style={{ color:"#8A9AB8", fontSize:10, fontFamily:"var(--font-mono)" }}>
              WHITE GLOVE DOCUMENT SUBMISSION
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-5">

        {/* Welcome card */}
        <div className="p-5 rounded-2xl glow-surface"
          style={{ background:"linear-gradient(135deg,#060B16,#0A1020)", border:"1px solid rgba(91,167,214,0.3)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} color="#FFFFFF" fill="rgba(111,158,148,0.3)"/>
            <span style={{ color:"#D68FA8", fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)" }}>
              WHITE GLOVE CONCIERGE
            </span>
          </div>
          <div style={{ color:"#E8EDF5", fontSize:16, fontFamily:"var(--font-display)", marginBottom:6 }}>
            Hello, {clientName.split(" ")[0]}! 👋
          </div>
          <p style={{ color:"#8AA3C8", fontSize:13, lineHeight:1.7 }}>
            Your specialist <strong style={{ color:"#D68FA8" }}>{specialistName}</strong> is ready to build your vault. Use this page to send your documents — take a photo with your phone or upload a file. It's just like sending a photo in a text message.
          </p>
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background:"rgba(72,187,120,0.1)", border:"1px solid rgba(72,187,120,0.2)" }}>
            <Lock size={12} color="#FFFFFF"/>
            <span style={{ color:"#D99A6B", fontSize:11 }}>
              Secure · Encrypted · Only your specialist can see these
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0A0F1A", border:"1px solid rgba(91,167,214,0.3)" }}>
          <button onClick={() => setView("submit")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background:view==="submit"?"#5BA7D6":"transparent", color:view==="submit"?"#fff":"#8A9AB8" }}>
            📤 Send a Document
          </button>
          <button onClick={() => setView("status")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background:view==="status"?"#5BA7D6":"transparent", color:view==="status"?"#fff":"#8A9AB8" }}>
            📋 My Submissions {submissions.length > 0 && `(${submissions.length})`}
          </button>
        </div>

        {/* ── Submit view ── */}
        {view === "submit" && (
          <div className="space-y-4">

            {/* Step 1: Get the document */}
            <div className="p-5 rounded-2xl glow-surface" style={GLASS}>
              <div style={{ color:"#6FAE8B", fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)", marginBottom:12 }}>
                STEP 1 — GET YOUR DOCUMENT READY
              </div>

              {!selectedFile ? (
                <div className="space-y-3">
                  {/* Camera scan — primary for phone users */}
                  <ScanButton
                    folder="legal"
                    onUpload={handleScanUpload}
                    size="lg"
                    label="📷  Take a Photo of Your Document"
                  />
                  <div style={{ textAlign:"center", color:"#8A9AB8", fontSize:12 }}>— or —</div>
                  {/* File upload fallback */}
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm"
                    style={{ background:"rgba(91,167,214,0.06)", color:"#6FAE8B", border:"2px dashed rgba(91,167,214,0.3)" }}>
                    <Upload size={16}/> Upload from Phone or Computer
                  </button>
                  <input ref={fileRef} type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    className="hidden" onChange={handleFileSelect}/>
                  <p style={{ color:"#8A9AB8", fontSize:11, textAlign:"center", lineHeight:1.6 }}>
                    Works with photos, PDFs, and document files up to 20 MB
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="relative rounded-xl overflow-hidden"
                    style={{ border:"2px solid rgba(72,187,120,0.3)" }}>
                    {previewUrl && selectedFile.type.includes("image") ? (
                      <img src={previewUrl} alt="Document preview"
                        style={{ width:"100%", maxHeight:200, objectFit:"cover" }}/>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-5"
                        style={{ background:"rgba(91,110,225,0.04)" }}>
                        <FileText size={28} color="#FFFFFF"/>
                        <div>
                          <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:500 }}>{selectedFile.name}</div>
                          <div style={{ color:"#8A9AB8", fontSize:11 }}>{selectedFile.type} · {Math.round(selectedFile.size/1024)}KB</div>
                        </div>
                      </div>
                    )}
                    <button onClick={removeSelected}
                      className="absolute top-2 right-2 flex items-center justify-center rounded-full"
                      style={{ width:24, height:24, background:"rgba(0,0,0,0.6)", color:"#fff" }}>
                      <X size={12}/>
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background:"rgba(72,187,120,0.9)" }}>
                      <CheckCircle size={10} color="#fff"/>
                      <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>Ready to send</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Label it */}
            <div className="p-5 rounded-2xl glow-surface" style={GLASS}>
              <div style={{ color:"#6FAE8B", fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)", marginBottom:12 }}>
                STEP 2 — WHAT KIND OF DOCUMENT IS THIS?
              </div>
              <button onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl"
                style={{ background:category?"rgba(91,167,214,0.08)":"rgba(91,110,225,0.04)",
                  border:`1.5px solid ${category?"rgba(91,167,214,0.4)":"rgba(91,110,225,0.15)"}`,
                  color:category?"#6FAE8B":"#8A9AB8" }}>
                <span style={{ fontSize:14 }}>
                  {category
                    ? DOCUMENT_CATEGORIES.find(c=>c.id===category)?.emoji + " " + DOCUMENT_CATEGORIES.find(c=>c.id===category)?.label
                    : "Tap to choose the document type..."}
                </span>
                <ChevronDown size={16}/>
              </button>

              {showCategoryPicker && (
                <div className="mt-2 rounded-xl overflow-hidden" style={{ border:"1px solid rgba(91,167,214,0.2)" }}>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setCategory(cat.id); setShowCategoryPicker(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b"
                      style={{ background:category===cat.id?"rgba(91,167,214,0.08)":"#0A0F1A",
                        borderColor:"rgba(91,167,214,0.15)", color:"#E8EDF5" }}>
                      <span style={{ fontSize:20 }}>{cat.emoji}</span>
                      <span style={{ fontSize:14 }}>{cat.label}</span>
                      {category===cat.id && <CheckCircle size={14} color="#FFFFFF" style={{ marginLeft:"auto" }}/>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Notes */}
            <div className="p-5 rounded-2xl glow-surface" style={GLASS}>
              <div style={{ color:"#6FAE8B", fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)", marginBottom:12 }}>
                STEP 3 — ADD A NOTE (OPTIONAL)
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder={`e.g. "This is from 2019" or "The policy number is on page 2" — anything that helps ${specialistName} understand the document`}
                className="w-full resize-none px-4 py-3 rounded-xl"
                style={{ background:"#141B2E", border:"1px solid rgba(91,167,214,0.3)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>

            {/* Send button */}
            <button onClick={submitDocument} disabled={uploading || !selectedFile || !category}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-base"
              style={{ background:uploading || !selectedFile || !category
                  ? "rgba(91,167,214,0.3)"
                  : "linear-gradient(135deg,#5BA7D6,#6F9E94)",
                color: uploading || !selectedFile || !category ? "#8A9AB8" : "#04080F",
                boxShadow: uploading || !selectedFile || !category ? "none" : "0 0 32px rgba(91,167,214,0.4)",
                fontSize:16 }}>
              {uploading
                ? <><div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"spin 0.8s linear infinite" }}/> Sending securely…</>
                : <><Send size={18}/> Send to {specialistName}</>
              }
            </button>

            <div className="flex items-center justify-center gap-2">
              <Lock size={11} color="#8A9AB8"/>
              <span style={{ color:"#8A9AB8", fontSize:11 }}>
                256-bit encrypted · Only {specialistName} can see your documents
              </span>
            </div>
          </div>
        )}

        {/* ── Status view ── */}
        {view === "status" && (
          <div className="space-y-4">

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:"Sent",     value:submissions.length,  color:"#6FAE8B" },
                { label:"Received", value:submissions.filter(s=>s.status==="received").length, color:"#6E90C9" },
                { label:"In Vault", value:uploadedCount, color:"#D99A6B" },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center glow-surface"
                  style={GLASS}>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:26, color:s.color }}>{s.value}</div>
                  <div style={{ color:"#8A9AB8", fontSize:11 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {submissions.length === 0 ? (
              <div className="py-12 text-center rounded-2xl"
                style={GLASS}>
                <Star size={36} color="rgba(91,167,214,0.2)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>No documents sent yet.</div>
                <div style={{ color:"#B0C0DC", fontSize:12, marginTop:4 }}>
                  Tap "Send a Document" to get started.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-4 rounded-2xl glow-surface"
                    style={GLASS}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                        style={{ width:40, height:40, background:"rgba(91,167,214,0.08)", fontSize:20 }}>
                        {DOCUMENT_CATEGORIES.find(c=>sub.category.toLowerCase().includes(c.id))?.emoji ?? "📄"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:600, marginBottom:3 }}>{sub.category}</div>
                        <div style={{ color:"#8A9AB8", fontSize:11, marginBottom:6 }}>
                          {sub.fileName} · {sub.fileSizeMB} MB · {sub.submittedAt}
                        </div>
                        {sub.notes && <div style={{ color:"#8A9AB8", fontSize:12, fontStyle:"italic", marginBottom:6 }}>"{sub.notes}"</div>}
                        <StatusBadge status={sub.status}/>
                      </div>
                    </div>
                    {sub.status === "needs_resubmit" && (
                      <button onClick={() => setView("submit")}
                        className="mt-3 w-full py-2 rounded-xl text-xs font-semibold"
                        style={{ background:"rgba(252,129,129,0.1)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.25)" }}>
                        📷 Resend This Document
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Help contact */}
            <div className="p-4 rounded-2xl flex items-center gap-3 glow-surface"
              style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.15)" }}>
              <Phone size={18} color="#FFFFFF" style={{ flexShrink:0 }}/>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:500 }}>Need help sending documents?</div>
                <div style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>
                  Call your specialist {specialistName} directly — they can walk you through it over the phone.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
