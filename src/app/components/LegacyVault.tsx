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
  Lock, Unlock, Shield, ArrowRight, CheckCircle, Eye, Download,
  FileText, Heart, Stethoscope, Wallet, Car, Camera,
  BookOpen, Key, Users, PawPrint, AlertTriangle, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { toast } from "sonner";
import { VaultClone } from "./VaultClone";
import { createZip, downloadBlob, type ZipEntry } from "../utils/zip";
import heroVaultPhoto from "../../imports/legacyvault_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant & file cabinet) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

/* ── What gets included in the legacy package ───────────────────── */
const PACKAGE_SECTIONS = [
  {
    icon: <FileText size={18}/>,
    label: "Digital File Cabinet",
    desc: "All 18+ folders — Legal, Financial, Medical, Property, Insurance, Vehicles, Utilities, Digital Assets, Pet Records, Warranties, Weapons Locker, and more",
    itemCount: "18+ folders",
  },
  {
    icon: <Heart size={18}/>,
    label: "Final Wishes & Legacy Planning",
    desc: "Specific bequests, funeral preferences, estate instructions",
    itemCount: "2 tabs",
  },
  {
    icon: <FileText size={18}/>,
    label: "Wills and Living Trusts",
    desc: "All executed legal documents with attorney details, dates, and locations",
    itemCount: "3 documents",
  },
  {
    icon: <Stethoscope size={18}/>,
    label: "Medical Records",
    desc: "Emergency info, allergies, medications, directives, health insurance, physician contacts",
    itemCount: "Full record",
  },
  {
    icon: <Wallet size={18}/>,
    label: "Financial Records",
    desc: "Insurance policies, real estate, investments, retirement accounts, tax returns, business records",
    itemCount: "6 categories",
  },
  {
    icon: <Car size={18}/>,
    label: "Personal Assets",
    desc: "Vehicles, real estate, utilities, digital assets, firearms, weapons locker, collectibles",
    itemCount: "7 categories",
  },
  {
    icon: <Camera size={18}/>,
    label: "Memories & Media",
    desc: "Family photos, video messages to loved ones, keepsakes, goals, awards, and pet records",
    itemCount: "7 tabs",
  },
  {
    icon: <BookOpen size={18}/>,
    label: "Digital Diary",
    desc: "All written, audio, and video diary entries — including private messages marked for legacy contacts",
    itemCount: "All entries",
  },
  {
    icon: <Key size={18}/>,
    label: "Password Manager",
    desc: "All saved credentials and account information — encrypted until delivered",
    itemCount: "All credentials",
  },
  {
    icon: <Users size={18}/>,
    label: "Contacts & Instructions",
    desc: "All designated contacts, their permissions, chain of authority, and access instructions",
    itemCount: "Full record",
  },
  {
    icon: <FileText size={18}/>,
    label: "ID Keeper",
    desc: "All stored identification documents — government IDs, insurance cards, professional licenses",
    itemCount: "All IDs",
  },
  {
    icon: <Shield size={18}/>,
    label: "Warranties",
    desc: "All product warranties, coverage details, and claim instructions",
    itemCount: "All warranties",
  },
  {
    icon: <PawPrint size={18}/>,
    label: "Pet Records",
    desc: "Full pet records including caretakers, vet info, feeding instructions, health history",
    itemCount: "All pets",
  },
];

/* Refined per-section accent — the same nine-hue harmonised family used across
   the Calendar, File Cabinet and AI Assistant, cycled by index so this reads
   as one product with the rest of the redesigned portal. */
const RAMP = ["#5BA7D6","#5BA7D6","#7E6BD8","#6F9E94","#6FAE8B","#97A2C6","#7E6BD8","#5BA7D6","#5B6EE1"];
const THEMED_SECTIONS = PACKAGE_SECTIONS.map((s, i) => ({ ...s, color: RAMP[i % RAMP.length] }));

/* ── Archive builders ────────────────────────────────────────────────
   The download is a real ZIP, not a stub. In demo mode the entries are
   generated manifests describing what each section contains; when the API
   lands, swap buildEntries() to stream the actual stored files in — the
   zip/download plumbing below does not change. */

const stamp = () => new Date().toISOString().slice(0, 10);

function sectionManifest(section: typeof THEMED_SECTIONS[number], owner: string): string {
  return [
    `FINAL PASS DOWN — LEGACY PACKAGE`,
    `Section: ${section.label}`,
    `Account holder: ${owner}`,
    `Generated: ${new Date().toLocaleString("en-US")}`,
    ``,
    `CONTENTS`,
    `${section.itemCount}`,
    ``,
    `DESCRIPTION`,
    section.desc,
    ``,
    `--`,
    `NOTE: This is a DEMONSTRATION export. It contains an index of what this`,
    `section holds, not the stored files themselves — this build has no server`,
    `and no file storage behind it. Do not treat this archive as a backup or as`,
    `delivery of the account holder's records.`,
  ].join("\n");
}

function buildEntries(owner: string, sections: typeof THEMED_SECTIONS): ZipEntry[] {
  const entries: ZipEntry[] = sections.map(s => ({
    name: `${s.label.replace(/[\\/:*?"<>|]/g, "-")}/MANIFEST.txt`,
    content: sectionManifest(s, owner),
  }));

  entries.unshift({
    name: "README.txt",
    content: [
      `FINAL PASS DOWN — LEGACY VAULT CLONE`,
      `Account holder: ${owner}`,
      `Exported: ${new Date().toLocaleString("en-US")}`,
      `Sections included: ${sections.length}`,
      ``,
      `*** DEMONSTRATION EXPORT — NOT A BACKUP ***`,
      ``,
      `This build of Final Pass Down has no server and no file storage. This`,
      `archive contains an INDEX of what each section would hold, not the`,
      `account holder's actual documents, photos, recordings or credentials.`,
      ``,
      `Each folder corresponds to one section of the account. Open MANIFEST.txt`,
      `inside any folder to see what that section is meant to contain.`,
      ``,
      `If you received this as a legacy contact and expected real records,`,
      `contact Final Pass Down support with the account holder's name.`,
    ].join("\n"),
  });

  entries.push({
    name: "INDEX.csv",
    content: ["Section,Contents,Description",
      ...sections.map(s => `"${s.label}","${s.itemCount}","${s.desc.replace(/"/g, "'")}"`),
    ].join("\n"),
  });

  return entries;
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-vault so nothing else in the app is affected. */
const VAULT_CSS = `
.fpd-vault{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-vault *{box-sizing:border-box;}
.fpd-vault-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-vault .wrap{max-width:1180px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-vault .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-vault .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-vault .hbanner:hover .art{transform:scale(1.08);}
.fpd-vault .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-vault .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-vault .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-vault .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-vault .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-vault .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-vault .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-vault .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-vault .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-vault .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-vault .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-vault .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-vault .hbanner{min-height:auto;} .fpd-vault .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-vault .hbanner h1{font-size:29px;}}

.fpd-vault .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-vault .card.pad{padding:28px;}
.fpd-vault .sec-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap;}
.fpd-vault .sec-title{font-size:19px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;}
.fpd-vault .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-vault .sec-sub{color:${MUTED};font-size:15.5px;margin-top:4px;max-width:520px;line-height:1.6;}
.fpd-vault .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-vault .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 6px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-vault .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.7;}

/* two-condition gate */
.fpd-vault .cond{display:flex;align-items:flex-start;gap:14px;padding:15px 16px;border-radius:16px;}
.fpd-vault .cond.met{background:rgba(95,190,145,0.06);border:1px solid rgba(95,190,145,0.24);}
.fpd-vault .cond.unmet{background:rgba(217,165,94,0.05);border:1px solid rgba(217,165,94,0.2);}
.fpd-vault .cond-badge{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:15px;font-weight:700;}
.fpd-vault .cond-badge.met{background:rgba(95,190,145,0.16);color:#D99A6B;}
.fpd-vault .cond-badge.unmet{background:rgba(217,165,94,0.14);color:${WARN};}
.fpd-vault .cond-title{color:${TEXT};font-size:17px;font-weight:600;margin-bottom:3px;font-family:var(--font-display);}
.fpd-vault .cond-desc{color:${MUTED};font-size:15px;line-height:1.6;}
.fpd-vault .btn-ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:16px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.28);color:${WARN};font-size:16px;font-weight:600;cursor:pointer;font-family:var(--font-body);width:100%;transition:background .18s;}
.fpd-vault .btn-ghost:hover{background:rgba(217,165,94,0.14);}
.fpd-vault .status-row{display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:16px;}
.fpd-vault .status-row.ok{background:rgba(95,190,145,0.06);border:1px solid rgba(95,190,145,0.22);}
.fpd-vault .status-row.no{background:rgba(208,107,107,0.05);border:1px solid rgba(208,107,107,0.2);}
.fpd-vault .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 20px;border-radius:16px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:17px;font-weight:700;box-shadow:0 8px 22px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);width:100%;}
.fpd-vault .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}

/* section rows */
.fpd-vault .btn-link{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;flex-shrink:0;}
.fpd-vault .btn-link:hover{background:rgba(91,110,225,0.18);}
.fpd-vault .psgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
.fpd-vault .psec{display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:18px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.08);transition:border-color .16s,background .16s;}
.fpd-vault .psec:hover{border-color:rgba(91,110,225,0.24);background:rgba(91,110,225,0.03);}
.fpd-vault .psec-ico{width:40px;height:40px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-vault .psec-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:3px;}
.fpd-vault .psec-lbl{color:${TEXT};font-size:16px;font-weight:600;}
.fpd-vault .psec-cnt{font-family:var(--font-mono);font-size:12px;padding:2px 8px;border-radius:6px;flex-shrink:0;}
.fpd-vault .psec-desc{color:${MUTED};font-size:14.5px;line-height:1.55;}
.fpd-vault .psec-acts{display:flex;gap:2px;flex-shrink:0;}
.fpd-vault .psec-acts button{background:none;border:none;padding:5px;cursor:pointer;display:flex;color:${MUTED};transition:color .16s;}
.fpd-vault .psec-acts button:hover{color:#6FAE8B;}
.fpd-vault .showmore{width:100%;margin-top:12px;padding:13px;border-radius:18px;border:1.5px dashed rgba(255,255,255,0.14);background:rgba(255,255,255,0.008);color:${MUTED};font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:var(--font-body);transition:border-color .18s,color .18s;}
.fpd-vault .showmore:hover{border-color:rgba(91,110,225,0.35);color:#6FAE8B;}

/* clone CTA */
.fpd-vault .cta{text-align:center;padding:36px 30px;}
.fpd-vault .cta-ico{width:64px;height:64px;border-radius:18px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;}
.fpd-vault .cta-title{font-family:var(--font-display);font-size:24px;font-weight:600;color:${TEXT};margin-bottom:10px;letter-spacing:-0.01em;}
.fpd-vault .cta-desc{color:${MUTED};font-size:16px;line-height:1.7;max-width:480px;margin:0 auto 22px;}
.fpd-vault .cta-btns{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;}
.fpd-vault .cta-primary{display:inline-flex;align-items:center;gap:9px;padding:14px 26px;border-radius:16px;font-size:17px;font-weight:700;border:none;font-family:var(--font-body);cursor:pointer;transition:filter .18s,transform .18s;}
.fpd-vault .cta-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-vault .cta-secondary{display:inline-flex;align-items:center;gap:9px;padding:14px 22px;border-radius:16px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.3);color:#6FAE8B;font-size:17px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:background .18s;}
.fpd-vault .cta-secondary:hover{background:rgba(91,110,225,0.18);}

/* footnote */
.fpd-vault .foot{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-vault .foot .ft{color:${MUTED};font-size:15.5px;line-height:1.7;}
.fpd-vault .foot .ft b{color:${SOFT};font-weight:600;}

@media (max-width:900px){.fpd-vault .psgrid{grid-template-columns:1fr;}}
`;

/* ── Two-condition checklist row ─────────────────────────────────── */
function ConditionRow({ num, met, title, desc }: { num:string; met:boolean; title:string; desc:string }) {
  return (
    <div className={`cond ${met ? "met" : "unmet"}`}>
      <div className={`cond-badge ${met ? "met" : "unmet"}`}>
        {met ? <CheckCircle size={15}/> : num}
      </div>
      <div>
        <div className="cond-title">{title}</div>
        <div className="cond-desc">{desc}</div>
      </div>
    </div>
  );
}

export function LegacyVault() {
  const { continuationFeePaid, user, deathVerified, deathVerifiedDoc, submitDeathRecord } = useDemo();
  const [showVaultClone, setShowVaultClone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const recordRef = React.useRef<HTMLInputElement>(null);
  const sectionsRef = React.useRef<HTMLDivElement>(null);

  const fullyUnlocked = continuationFeePaid && deathVerified;

  const owner = user?.name ?? "Account Holder";

  /* Single section → a one-folder archive. */
  const downloadSection = (section: typeof THEMED_SECTIONS[number]) => {
    const blob = createZip(buildEntries(owner, [section]));
    const safe = section.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadBlob(blob, `fpd-${safe}-${stamp()}.zip`);
    toast.success(`Downloaded: ${section.label}`);
  };

  /* Everything → the full Legacy Vault Export archive. */
  const downloadFullPackage = () => {
    const blob = createZip(buildEntries(owner, THEMED_SECTIONS));
    const kb = Math.max(1, Math.round(blob.size / 1024));
    downloadBlob(blob, `fpd-legacy-vault-export-${stamp()}.zip`);
    toast.success(`Legacy Vault Export downloaded — ${THEMED_SECTIONS.length} sections, ${kb} KB`);
  };

  if (showVaultClone) return <VaultClone onBack={() => setShowVaultClone(false)} />;

  return (
    <div className="fpd-vault">
      <style dangerouslySetInnerHTML={{ __html: VAULT_CSS }} />
      <div className="fpd-vault-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroVaultPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Sealed Until It's Needed</span>
            <h1>Everything you'd want them <span className="accent">to find, kept safe.</span></h1>
            <p>A complete, encrypted preview of what your verified legacy contacts receive — locked behind two conditions until the day it's needed.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => sectionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Eye size={15}/> See What's Included
              </button>
              <button className="hbtn ghost" onClick={() => fullyUnlocked ? downloadFullPackage() : toast.error("Both conditions must be met to access the Legacy Vault Export.")}>
                <Download size={15}/> Download Vault Export
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Lock size={12}/> AES-256 Encrypted · Zero-Knowledge</div>
          <h1 className="pg-h1">Your Legacy Package</h1>
          <div className="pg-sub">
            This is a preview of everything your verified legacy contacts will receive. All content is stored across
            your platform sections — organized, encrypted, and ready to be delivered. Use the sections in the sidebar
            to add or update any information.
          </div>
        </div>

        {/* ── Two-condition gate ── */}
        <div className="card pad">
          <h3 className="sec-title" style={{ marginBottom: 14 }}><span className="tick"/>Two Conditions Required to Unlock Downloads</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
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
              desc={deathVerified
                ? `Accepted record on file: ${deathVerifiedDoc}. Verified by FPD admin review.`
                : "Accepted documents: death certificate, obituary, hospital notice, coroner report, funeral home letter, probate filing, or any credible official record. Submitted by a legacy contact after your passing."}
            />
            {!deathVerified && (
              <>
                <input
                  ref={recordRef}
                  type="file"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) submitDeathRecord(f.name); }}
                />
                <button className="btn-ghost" onClick={() => recordRef.current?.click()}>
                  <FileText size={15}/> Submit Record of Passing (Legacy Contact)
                </button>
              </>
            )}
            <div className={`status-row ${fullyUnlocked ? "ok" : "no"}`}>
              {fullyUnlocked
                ? <><CheckCircle size={15} color="#FFFFFF"/><span style={{ color:"#D99A6B", fontSize:16, fontWeight:600 }}>Both conditions met — Legacy Vault Export is fully unlocked.</span></>
                : <><AlertTriangle size={15} color={NEG}/><span style={{ color:NEG, fontSize:16 }}>Downloads are locked until <strong>both</strong> conditions are met.</span></>
              }
            </div>
            {!continuationFeePaid && (
              <button className="btn-primary" onClick={() => toast.info("Go to Security → Activate Legacy Access in the sidebar to pay.")}>
                Go to Activate Legacy Access <ArrowRight size={15}/>
              </button>
            )}
          </div>
        </div>

        {/* ── What your legacy contacts receive ── */}
        <div className="card pad" ref={sectionsRef}>
          <div className="sec-head">
            <div>
              <h3 className="sec-title"><span className="tick"/>What Your Legacy Contacts Receive</h3>
              <div className="sec-sub">
                Everything below is included in the Legacy Vault Export — a complete encrypted download of your entire account.
              </div>
            </div>
            <button className="btn-link" onClick={() => setExpanded(e => !e)}>
              {expanded ? <><ChevronUp size={14}/> Collapse</> : <><ChevronDown size={14}/> See All {THEMED_SECTIONS.length} Sections</>}
            </button>
          </div>

          <div className="psgrid">
            {(expanded ? THEMED_SECTIONS : THEMED_SECTIONS.slice(0, 6)).map(section => (
              <div key={section.label} className="psec">
                <div className="psec-ico" style={{ background:`linear-gradient(150deg, ${section.color}52, ${section.color}17)`, color:section.color, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  {section.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="psec-top">
                    <span className="psec-lbl">{section.label}</span>
                    <span className="psec-cnt" style={{ background:`${section.color}18`, color:section.color }}>{section.itemCount}</span>
                  </div>
                  <div className="psec-desc">{section.desc}</div>
                </div>
                <div className="psec-acts">
                  <button
                    onClick={() => continuationFeePaid
                      ? toast.success(`Viewing: ${section.label}`)
                      : toast.error("Pay the $199 fee to preview content")}
                    title={continuationFeePaid ? "Preview" : "Locked"}>
                    <Eye size={14}/>
                  </button>
                  <button
                    onClick={() => continuationFeePaid
                      ? downloadSection(section)
                      : toast.error("Pay the $199 fee to download")}
                    title={continuationFeePaid ? "Download" : "Locked"}>
                    <Download size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!expanded && (
            <button className="showmore" onClick={() => setExpanded(true)}>
              <ChevronDown size={14}/> Show {THEMED_SECTIONS.length - 6} more sections
            </button>
          )}
        </div>

        {/* ── Legacy Vault Export CTA ── */}
        <div className="card cta">
          <div className="cta-ico" style={{ background: fullyUnlocked ? "rgba(95,190,145,0.12)" : "rgba(91,110,225,0.10)", border:`1px solid ${fullyUnlocked?"rgba(95,190,145,0.32)":"rgba(91,110,225,0.26)"}` }}>
            {fullyUnlocked ? <Unlock size={26} color="#FFFFFF"/> : <Lock size={26} color="#FFFFFF"/>}
          </div>
          <div className="cta-title">
            {fullyUnlocked ? "Legacy Vault Export — Ready to Download" : "Legacy Vault Export — Locked"}
          </div>
          <div className="cta-desc">
            {fullyUnlocked
              ? "Both conditions are met. Your legacy contacts can now download a complete encrypted copy of your entire account — all sections, all files, all records."
              : "When both the $199 fee is paid and your passing is verified, legacy contacts can download everything — all sections, all files, all records — in one complete encrypted package."}
          </div>
          <div className="cta-btns">
            <button
              className="cta-primary"
              onClick={() => fullyUnlocked ? downloadFullPackage() : toast.error("Both conditions must be met to access the Legacy Vault Export.")}
              style={{
                background: fullyUnlocked ? "linear-gradient(180deg,#6BCB9C,#4CAE7C)" : "rgba(255,255,255,0.05)",
                color: fullyUnlocked ? "#0A1712" : MUTED,
                boxShadow: fullyUnlocked ? "0 8px 22px -8px rgba(95,190,145,0.55)" : "none",
                cursor: fullyUnlocked ? "pointer" : "not-allowed",
              }}>
              {fullyUnlocked ? <><Download size={16}/> Download Legacy Vault Export (.zip)</> : <><Lock size={14}/> Locked — Conditions Not Met</>}
            </button>
            {fullyUnlocked && (
              <button className="cta-secondary" onClick={() => setShowVaultClone(true)}>
                <Eye size={15}/> Browse Contents
              </button>
            )}
          </div>
        </div>

        {/* ── Tip ── */}
        <div className="foot">
          <Info size={16} color="#FFFFFF" style={{ flexShrink:0, marginTop:1 }}/>
          <div className="ft">
            <b>Want to add or update your information?</b> Use the sections in the left sidebar — File Cabinet, Final
            Wishes, Medical Info, Financial Records, and all other sections. Everything you add there automatically
            becomes part of your legacy package here.
          </div>
        </div>
      </div>
    </div>
  );
}
