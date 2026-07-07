/**
 * LegacyVault — "Your Legacy Package" preview.
 *
 * No longer an upload destination. Instead this is a consolidated
 * read-only view of everything stored across the entire platform —
 * exactly what legacy contacts receive when the vault is activated.
 * Downloads are locked until both conditions are met:
 *   1. $199 Legacy Continuation Fee paid
 *   2. Confirmation of passing verified by FPD admin
 */
import React, { useState } from "react";
import {
  Lock, Shield, ArrowRight, CheckCircle, Eye, Download,
  FileText, Heart, Stethoscope, Wallet, Car, Camera,
  BookOpen, Key, Users, PawPrint, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { toast } from "sonner";
import { VaultClone } from "./VaultClone";

const GLASS: React.CSSProperties = { background:"rgba(22,22,31,0.95)", border:"1px solid rgba(108,92,231,0.14)", backdropFilter:"blur(12px)" };
const GRID:  React.CSSProperties = { backgroundImage:"linear-gradient(rgba(108,92,231,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(108,92,231,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" };
const MONO:  React.CSSProperties = { fontFamily:"var(--font-mono)" };

/* ── What gets included in the legacy package ───────────────────── */
const PACKAGE_SECTIONS = [
  {
    icon: <FileText size={18}/>,
    color: "#6C5CE7",
    label: "Digital File Cabinet",
    desc: "All 18+ folders — Legal, Financial, Medical, Property, Insurance, Vehicles, Utilities, Digital Assets, Pet Records, Warranties, Weapons Locker, and more",
    itemCount: "18+ folders",
    status: "ready",
  },
  {
    icon: <Heart size={18}/>,
    color: "#FC8181",
    label: "Final Wishes & Legacy Planning",
    desc: "Specific bequests, funeral preferences, estate instructions, questionnaire answers",
    itemCount: "3 tabs",
    status: "ready",
  },
  {
    icon: <FileText size={18}/>,
    color: "#6C5CE7",
    label: "Wills and Living Trusts",
    desc: "All executed legal documents with attorney details, dates, and locations",
    itemCount: "3 documents",
    status: "ready",
  },
  {
    icon: <Stethoscope size={18}/>,
    color: "#48BB78",
    label: "Medical Records",
    desc: "Emergency info, allergies, medications, directives, health insurance, physician contacts",
    itemCount: "Full record",
    status: "ready",
  },
  {
    icon: <Wallet size={18}/>,
    color: "#F6AD55",
    label: "Financial Records",
    desc: "Insurance policies, real estate, investments, retirement accounts, tax returns, business records",
    itemCount: "6 categories",
    status: "ready",
  },
  {
    icon: <Car size={18}/>,
    color: "#9F7AEA",
    label: "Personal Assets",
    desc: "Vehicles, real estate, utilities, digital assets, firearms, weapons locker, collectibles",
    itemCount: "7 categories",
    status: "ready",
  },
  {
    icon: <Camera size={18}/>,
    color: "#8B7CF6",
    label: "Memories & Media",
    desc: "Family photos, video messages to loved ones, keepsakes, goals, awards, and pet records",
    itemCount: "7 tabs",
    status: "ready",
  },
  {
    icon: <BookOpen size={18}/>,
    color: "#ED8936",
    label: "Digital Diary",
    desc: "All written, audio, and video diary entries — including private messages marked for legacy contacts",
    itemCount: "All entries",
    status: "ready",
  },
  {
    icon: <Key size={18}/>,
    color: "#38B2AC",
    label: "Password Manager",
    desc: "All saved credentials and account information — encrypted until delivered",
    itemCount: "All credentials",
    status: "ready",
  },
  {
    icon: <Users size={18}/>,
    color: "#68D391",
    label: "Contacts & Instructions",
    desc: "All designated contacts, their permissions, chain of authority, and access instructions",
    itemCount: "Full record",
    status: "ready",
  },
  {
    icon: <FileText size={18}/>,
    color: "rgba(255,255,255,0.65)",
    label: "ID Keeper",
    desc: "All stored identification documents — government IDs, insurance cards, professional licenses",
    itemCount: "All IDs",
    status: "ready",
  },
  {
    icon: <Shield size={18}/>,
    color: "#9F7AEA",
    label: "Warranties",
    desc: "All product warranties, coverage details, and claim instructions",
    itemCount: "All warranties",
    status: "ready",
  },
  {
    icon: <PawPrint size={18}/>,
    color: "#F6AD55",
    label: "Pet Records",
    desc: "Full pet records including caretakers, vet info, feeding instructions, health history",
    itemCount: "All pets",
    status: "ready",
  },
];

/* ── Two-condition checklist ─────────────────────────────────────── */
function ConditionRow({ num, met, title, desc }: { num:string; met:boolean; title:string; desc:string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl"
      style={{ background:met?"rgba(72,187,120,0.06)":"rgba(246,173,85,0.04)", border:`1px solid ${met?"rgba(72,187,120,0.25)":"rgba(246,173,85,0.2)"}` }}>
      <div className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
        style={{ width:32, height:32, background:met?"rgba(72,187,120,0.15)":"rgba(246,173,85,0.1)", color:met?"#48BB78":"#F6AD55", fontSize:13 }}>
        {met ? <CheckCircle size={16}/> : num}
      </div>
      <div>
        <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:600, marginBottom:3 }}>
          {met ? `✓ ${title}` : title}
        </div>
        <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

export function LegacyVault() {
  const { continuationFeePaid, user } = useDemo();
  const [showVaultClone, setShowVaultClone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // In demo, treat fee paid as both conditions met for simplicity
  const deathVerified = false; // admin-controlled — always false in user demo
  const fullyUnlocked = continuationFeePaid && deathVerified;

  if (showVaultClone) return <VaultClone onBack={() => setShowVaultClone(false)}/>;

  return (
    <div className="p-6 space-y-6 relative" style={{ maxWidth:1100, ...GRID }}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Lock size={13} color="#6C5CE7"/>
          <span style={{ color:"#6C5CE7", fontSize:10, ...MONO, letterSpacing:"0.12em" }}>AES-256 ENCRYPTED · ZERO-KNOWLEDGE</span>
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:6 }}>Your Legacy Package</h1>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.7 }}>
          This is a preview of everything your verified legacy contacts will receive. All content is stored across your platform sections — organized, encrypted, and ready to be delivered. Use the sections in the sidebar to add or update any information.
        </p>
      </div>

      {/* Two-condition gate */}
      <div className="p-5 rounded-2xl space-y-3 glow-surface" style={{ background:"rgba(108,92,231,0.03)", border:"1px solid rgba(108,92,231,0.12)" }}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#FFFFFF", marginBottom:8 }}>
          🔐 Two Conditions Required to Unlock Downloads
        </div>
        <ConditionRow
          num="1"
          met={continuationFeePaid}
          title="$199 Legacy Continuation Fee"
          desc="One-time fee paid by you or a legacy contact. Go to Security → Activate Legacy Access in the sidebar."
        />
        <ConditionRow
          num="2"
          met={deathVerified}
          title="Confirmation of Passing — Verified by FPD Admin"
          desc="Accepted documents: death certificate, obituary, hospital notice, coroner report, funeral home letter, probate filing, or any credible official record. Submitted by a legacy contact after your passing."
        />
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mt-1"
          style={{ background:fullyUnlocked?"rgba(72,187,120,0.06)":"rgba(229,62,62,0.04)", border:`1px solid ${fullyUnlocked?"rgba(72,187,120,0.2)":"rgba(229,62,62,0.2)"}` }}>
          {fullyUnlocked
            ? <><CheckCircle size={14} color="#48BB78"/><span style={{ color:"#48BB78", fontSize:13, fontWeight:600 }}>Both conditions met — Legacy Vault Clone is fully unlocked.</span></>
            : <><AlertTriangle size={14} color="#FC8181"/><span style={{ color:"#FC8181", fontSize:13 }}>Downloads are locked until <strong>both</strong> conditions are met.</span></>
          }
        </div>
        {!continuationFeePaid && (
          <button
            onClick={() => toast.info("Go to Security → Activate Legacy Access in the sidebar to pay.")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm w-full justify-center"
            style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", boxShadow:"0 4px 16px rgba(108,92,231,0.3)" }}>
            Go to Activate Legacy Access <ArrowRight size={15}/>
          </button>
        )}
      </div>

      {/* What your legacy contacts receive */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>What Your Legacy Contacts Receive</div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:2 }}>
              Everything below is included in the Legacy Vault Clone — a complete encrypted download of your entire account.
            </div>
          </div>
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
            style={{ background:"rgba(108,92,231,0.07)", color:"#6C5CE7" }}>
            {expanded ? <><ChevronUp size={14}/> Collapse</> : <><ChevronDown size={14}/> See All {PACKAGE_SECTIONS.length} Sections</>}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {(expanded ? PACKAGE_SECTIONS : PACKAGE_SECTIONS.slice(0, 6)).map(section => (
            <div key={section.label} className="flex items-start gap-4 p-4 rounded-2xl glow-surface" style={GLASS}>
              <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ width:42, height:42, background:`${section.color}14`, color:section.color }}>
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color:"#FFFFFF", fontSize:13, fontWeight:600 }}>{section.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                    style={{ background:`${section.color}12`, color:section.color, ...MONO }}>
                    {section.itemCount}
                  </span>
                </div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, lineHeight:1.5 }}>{section.desc}</div>
              </div>
              <div className="flex-shrink-0 flex gap-1">
                <button
                  onClick={() => continuationFeePaid
                    ? toast.success(`Viewing: ${section.label}`)
                    : toast.error("Pay the $199 fee to preview content")}
                  style={{ color: continuationFeePaid ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.75)", padding:4 }}
                  title={continuationFeePaid ? "Preview" : "Locked"}>
                  <Eye size={13}/>
                </button>
                <button
                  onClick={() => continuationFeePaid
                    ? toast.success(`Downloading: ${section.label}`)
                    : toast.error("Pay the $199 fee to download")}
                  style={{ color: continuationFeePaid ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.75)", padding:4 }}
                  title={continuationFeePaid ? "Download" : "Locked"}>
                  <Download size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        {!expanded && (
          <button onClick={() => setExpanded(true)}
            className="w-full mt-3 py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
            style={{ border:"1px dashed rgba(108,92,231,0.25)", color:"rgba(255,255,255,0.7)", background:"rgba(108,92,231,0.02)" }}>
            <ChevronDown size={14}/> Show {PACKAGE_SECTIONS.length - 6} more sections
          </button>
        )}
      </div>

      {/* Legacy Vault Clone CTA */}
      <div className="p-6 rounded-2xl text-center space-y-4"
        style={{ background: fullyUnlocked ? "rgba(72,187,120,0.06)" : "rgba(108,92,231,0.03)", border:`2px solid ${fullyUnlocked?"rgba(72,187,120,0.3)":"rgba(108,92,231,0.15)"}` }}>
        <div style={{ fontSize:40 }}>{fullyUnlocked ? "🔓" : "🔒"}</div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#FFFFFF" }}>
          {fullyUnlocked ? "Legacy Vault Clone — Ready to Download" : "Legacy Vault Clone — Locked"}
        </div>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7, maxWidth:500, margin:"0 auto" }}>
          {fullyUnlocked
            ? "Both conditions are met. Your legacy contacts can now download a complete encrypted copy of your entire account — all sections, all files, all records."
            : "When both the $199 fee is paid and your passing is verified, legacy contacts can download everything — all sections, all files, all records — in one complete encrypted package."}
        </p>
        <button
          onClick={() => fullyUnlocked ? setShowVaultClone(true) : toast.error("Both conditions must be met to access the Legacy Vault Clone.")}
          className="px-8 py-3.5 rounded-2xl font-bold text-sm inline-flex items-center gap-2"
          style={{ background: fullyUnlocked ? "linear-gradient(135deg,#48BB78,#38A169)" : "rgba(108,92,231,0.08)", color: fullyUnlocked ? "#fff" : "rgba(255,255,255,0.65)", boxShadow: fullyUnlocked ? "0 4px 20px rgba(72,187,120,0.35)" : "none", cursor: fullyUnlocked ? "pointer" : "not-allowed" }}>
          {fullyUnlocked ? <><Download size={16}/> Download Legacy Vault Clone</> : <><Lock size={14}/> Locked — Conditions Not Met</>}
        </button>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
        style={{ background:"rgba(108,92,231,0.03)", border:"1px solid rgba(108,92,231,0.1)" }}>
        <div style={{ fontSize:18, flexShrink:0 }}>💡</div>
        <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7 }}>
          <strong style={{ color:"#FFFFFF" }}>Want to add or update your information?</strong> Use the sections in the left sidebar — File Cabinet, Final Wishes, Medical Info, Financial Records, and all other sections. Everything you add there automatically becomes part of your legacy package here.
        </div>
      </div>
    </div>
  );
}
