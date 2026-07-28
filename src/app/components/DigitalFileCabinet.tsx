import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Folder, FolderOpen, FileText, Image, Film, Archive,
  Upload, Plus, ChevronRight, ChevronDown, Search, Grid, List,
  Download, Eye, Trash2, X, ArrowLeft, Lock, Star,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";
import { ScanButton } from "./DocumentScanner";
import { subscribeToSyncedDocs, removeSyncedDoc, type SyncedDoc } from "../services/docSyncStore";
import heroCabinetPhoto from "../../imports/filecabinet_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar & AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const NEG     = "#D06B6B";

/* Icon-chip tone → colour, same gradient language as the redesigned
   dashboard/calendar "At a Glance" stat cards. */
const KPI_TONES: Record<string, { bg: string; fg: string }> = {
  sky:      { bg: "linear-gradient(150deg, rgba(91,167,214,0.34), rgba(91,167,214,0.08))",   fg: "#9FD3EE" },
  mint:     { bg: "linear-gradient(150deg, rgba(111,174,139,0.34), rgba(111,174,139,0.08))",  fg: "#A9DABC" },
  good:     { bg: "linear-gradient(150deg, rgba(95,190,145,0.30), rgba(95,190,145,0.09))",    fg: "#A9E6C4" },
  critical: { bg: "linear-gradient(150deg, rgba(208,107,107,0.32), rgba(208,107,107,0.08))",  fg: "#F0A9A9" },
  violet:   { bg: "linear-gradient(150deg, rgba(126,107,216,0.34), rgba(126,107,216,0.08))",  fg: "#C9BFF0" },
};

interface FolderFile {
  id: string; name: string;
  type: "pdf" | "image" | "video" | "doc" | "other" | "folder";
  size?: string; modified?: string; count?: number;
  locked?: boolean; starred?: boolean; thumbnail?: string;
}

interface Cabinet {
  id: string; label: string; color: string; emoji: string;
  description: string; acceptedTypes: string; files: FolderFile[];
  subFolders?: string[];
}

const cabinets: Cabinet[] = [
  {
    id:"legal", label:"Legal Documents", color:"#6E90C9", emoji:"⚖️",
    description:"Wills, trusts, power of attorney, contracts & deeds",
    acceptedTypes:"application/pdf,.pdf,.doc,.docx",
    subFolders:["Wills & Trusts","Power of Attorney","Property Deeds","Contracts","Court Documents"],
    files:[
      { id:"l1", name:"Last Will & Testament", type:"pdf", size:"2.4 MB", modified:"Jun 8, 2026", starred:true },
      { id:"l2", name:"Living Trust Agreement", type:"pdf", size:"1.8 MB", modified:"May 20, 2026" },
      { id:"l3", name:"Durable Power of Attorney", type:"pdf", size:"0.9 MB", modified:"May 20, 2026" },
      { id:"l4", name:"Healthcare Directive", type:"pdf", size:"0.7 MB", modified:"Apr 15, 2026" },
      { id:"l5", name:"Property Deed – Oak Ridge", type:"pdf", size:"3.1 MB", modified:"Jan 2025" },
    ],
  },
  {
    id:"financial", label:"Financial Records", color:"#D99A6B", emoji:"💰",
    description:"Tax returns, bank statements, investment reports",
    acceptedTypes:"application/pdf,.pdf,.xlsx,.csv",
    subFolders:["Tax Returns","Bank Statements","Investment Reports","Insurance Policies","Loan Documents"],
    files:[
      { id:"f1", name:"2025 Tax Return (1040)", type:"pdf", size:"2.4 MB", modified:"Apr 12, 2026", starred:true },
      { id:"f2", name:"2024 Tax Return (1040)", type:"pdf", size:"2.1 MB", modified:"Apr 8, 2025" },
      { id:"f3", name:"Life Insurance – MetLife", type:"pdf", size:"1.1 MB", modified:"May 22, 2026" },
      { id:"f4", name:"Fidelity Brokerage Statement", type:"pdf", size:"1.6 MB", modified:"Jun 1, 2026" },
      { id:"f5", name:"Wells Fargo Mortgage Statement", type:"pdf", size:"0.4 MB", modified:"May 2026" },
    ],
  },
  {
    id:"medical", label:"Medical Records", color:"#FC8181", emoji:"🏥",
    description:"Health records, test results, prescriptions, insurance cards",
    acceptedTypes:"application/pdf,.pdf,image/*,.jpg,.jpeg,.png",
    subFolders:["Test Results","Prescriptions","Surgery Records","Vaccination Records","Insurance Cards"],
    files:[
      { id:"m1", name:"Annual Physical – Jun 2026", type:"pdf", size:"0.8 MB", modified:"Jun 10, 2026" },
      { id:"m2", name:"Blood Test Results – May 2026", type:"pdf", size:"0.5 MB", modified:"May 28, 2026" },
      { id:"m3", name:"Insurance Card – BCBS", type:"image", size:"0.3 MB", modified:"Jan 2026" },
      { id:"m4", name:"Colonoscopy Report 2025", type:"pdf", size:"1.2 MB", modified:"Sep 2025" },
    ],
  },
  {
    id:"taxes", label:"Tax Records", color:"#F6AD55", emoji:"📋",
    description:"Filed returns, W-2s, 1099s, receipts and deductions",
    acceptedTypes:"application/pdf,.pdf,.xlsx,.csv",
    subFolders:["Filed Returns","W-2 & 1099s","Business Expenses","Deductions","Correspondence with IRS"],
    files:[
      { id:"t1", name:"2025 W-2 – TechCorp Inc.", type:"pdf", size:"0.3 MB", modified:"Jan 31, 2026" },
      { id:"t2", name:"2025 1099-DIV – Fidelity", type:"pdf", size:"0.2 MB", modified:"Jan 28, 2026" },
      { id:"t3", name:"2025 Charitable Donation Receipts", type:"pdf", size:"0.8 MB", modified:"Dec 31, 2025" },
      { id:"t4", name:"2024 State Tax Return – CA", type:"pdf", size:"1.1 MB", modified:"Apr 8, 2025" },
    ],
  },
  {
    id:"property", label:"Property & Real Estate", color:"#ED8936", emoji:"🏠",
    description:"Deeds, mortgage docs, HOA, home inspection, rental leases",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Primary Residence","Rental Properties","HOA Documents","Home Improvements","Appraisals"],
    files:[
      { id:"pr1", name:"Home Deed – Oak Ridge Dr", type:"pdf", size:"3.1 MB", modified:"Mar 2019" },
      { id:"pr2", name:"Mortgage Agreement – Wells Fargo", type:"pdf", size:"4.2 MB", modified:"Mar 2019" },
      { id:"pr3", name:"HOA Rules & CC&Rs", type:"pdf", size:"1.8 MB", modified:"Jan 2026" },
      { id:"pr4", name:"Home Inspection Report 2019", type:"pdf", size:"4.0 MB", modified:"Mar 2019" },
      { id:"pr5", name:"Elm Street Rental Lease", type:"pdf", size:"0.9 MB", modified:"Aug 2024" },
    ],
  },
  {
    id:"vehicles", label:"Vehicles", color:"#6FAE8B", emoji:"🚗",
    description:"Titles, registration, insurance, loan documents",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Titles & Registration","Insurance","Loan Documents","Service Records"],
    files:[
      { id:"v1", name:"2021 Camry – Title", type:"pdf", size:"0.8 MB", modified:"Jan 2022" },
      { id:"v2", name:"1967 Mustang – Title", type:"pdf", size:"0.7 MB", modified:"Sep 2020" },
      { id:"v3", name:"Camry – GEICO Insurance Card", type:"image", size:"0.3 MB", modified:"Jan 2026" },
      { id:"v4", name:"Mustang – Hagerty Insurance", type:"pdf", size:"0.5 MB", modified:"Mar 2026" },
    ],
  },
  {
    id:"utilities", label:"Utilities & Services", color:"#D68FA8", emoji:"⚡",
    description:"Electric, gas, water, internet, phone, HOA monthly bills",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Electric","Natural Gas","Water & Sewer","Internet","HOA","Phone & Cable"],
    files:[
      { id:"ut1", name:"SMUD – June 2026 Statement", type:"pdf", size:"0.2 MB", modified:"Jun 1, 2026" },
      { id:"ut2", name:"PG&E – June 2026 Statement", type:"pdf", size:"0.2 MB", modified:"Jun 1, 2026" },
      { id:"ut3", name:"AT&T Fiber – Account Summary", type:"pdf", size:"0.3 MB", modified:"May 2026" },
      { id:"ut4", name:"Oak Ridge HOA – Q2 2026", type:"pdf", size:"0.4 MB", modified:"Apr 1, 2026" },
    ],
  },
  {
    id:"insurance", label:"Insurance Policies", color:"#6FAE8B", emoji:"🛡️",
    description:"Life, health, home, auto, umbrella — all policies",
    acceptedTypes:"application/pdf,.pdf",
    subFolders:["Life Insurance","Health Insurance","Home Insurance","Auto Insurance","Umbrella"],
    files:[
      { id:"ins1", name:"MetLife – Life Policy #88291", type:"pdf", size:"1.1 MB", modified:"May 2026", starred:true },
      { id:"ins2", name:"BCBS – Health Card & EOB", type:"pdf", size:"0.8 MB", modified:"Jan 2026" },
      { id:"ins3", name:"State Farm – Homeowner's", type:"pdf", size:"0.9 MB", modified:"Mar 2026" },
      { id:"ins4", name:"GEICO – Auto Policy", type:"pdf", size:"0.7 MB", modified:"Jan 2026" },
      { id:"ins5", name:"State Farm – Umbrella Policy", type:"pdf", size:"0.5 MB", modified:"Mar 2026" },
    ],
  },
  {
    id:"pets", label:"Pet Records", color:"#F6AD55", emoji:"🐾",
    description:"Vet records, vaccination history, microchip, pet insurance",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Vaccination Records","Vet Visits","Medications","Microchip Info","Pet Insurance"],
    files:[
      { id:"p1", name:"Biscuit – Vaccination Record 2026", type:"pdf", size:"0.4 MB", modified:"Mar 15, 2026", starred:true },
      { id:"p2", name:"Biscuit – Annual Checkup Jun 2026", type:"pdf", size:"0.3 MB", modified:"Jun 5, 2026" },
      { id:"p3", name:"Biscuit – Microchip Certificate", type:"pdf", size:"0.2 MB", modified:"Jul 2019" },
      { id:"p4", name:"Biscuit – Thyroid Medication Rx", type:"pdf", size:"0.2 MB", modified:"May 2026" },
      { id:"p5", name:"Biscuit – Photo ID", type:"image", size:"1.2 MB", modified:"Jan 2026", thumbnail:"https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&h=120&fit=crop&auto=format" },
    ],
  },
  {
    id:"personal", label:"Personal Letters & Messages", color:"#E53E3E", emoji:"💌",
    description:"Personal letters, final messages, life advice for loved ones",
    acceptedTypes:"application/pdf,.pdf,.doc,.docx",
    subFolders:["Letters to Family","Life Story","Final Messages","Personal Writings"],
    files:[
      { id:"pl1", name:"Letter to Sarah – Final Words", type:"pdf", size:"0.2 MB", modified:"Apr 10, 2026", starred:true },
      { id:"pl2", name:"Letter to Michael – Son", type:"pdf", size:"0.3 MB", modified:"Apr 10, 2026", starred:true },
      { id:"pl3", name:"Letter to Emily – Daughter", type:"pdf", size:"0.2 MB", modified:"Apr 10, 2026", starred:true },
      { id:"pl4", name:"Life Lessons & Advice", type:"pdf", size:"0.6 MB", modified:"Mar 2026" },
    ],
  },
  {
    id:"photos", label:"Photo Albums", color:"#F6AD55", emoji:"📷",
    description:"Family photos, scanned albums, important photographs",
    acceptedTypes:"image/*,.jpg,.jpeg,.png,.heic,.tiff",
    subFolders:["Family Events","Holidays","Milestones","Historical","Kids & Grandkids"],
    files:[
      { id:"ph1", name:"Family Christmas 2024", type:"image", size:"84 MB", modified:"Dec 2024", thumbnail:"https://images.unsplash.com/photo-1662987619545-1844207dedac?w=120&h=120&fit=crop&auto=format" },
      { id:"ph2", name:"Michael's Wedding 2022", type:"folder", count:148, modified:"Jun 2022", thumbnail:"https://images.unsplash.com/photo-1585813597616-63e881759e9d?w=120&h=120&fit=crop&auto=format" },
      { id:"ph3", name:"Scanned Family Albums 1960–1990", type:"folder", count:847, modified:"Jan 2026", thumbnail:"https://images.unsplash.com/photo-1648221350871-e3ae3c8d0f58?w=120&h=120&fit=crop&auto=format" },
      { id:"ph4", name:"Big Sur Camping 2023", type:"image", size:"120 MB", modified:"Aug 2023", thumbnail:"https://images.unsplash.com/photo-1507272854533-a279b57229bb?w=120&h=120&fit=crop&auto=format" },
    ],
  },
  {
    id:"videos", label:"Video Messages", color:"#6FAE8B", emoji:"🎥",
    description:"Video messages for loved ones — delivered after passing",
    acceptedTypes:"video/*,.mp4,.mov,.avi",
    subFolders:["Family Messages","Life Story Videos","Funeral Instructions"],
    files:[
      { id:"vid1", name:"Message to Sarah – Personal", type:"video", size:"284 MB", modified:"Apr 10, 2026", starred:true },
      { id:"vid2", name:"Message to Michael", type:"video", size:"198 MB", modified:"Apr 10, 2026", starred:true },
      { id:"vid3", name:"Message to Emily", type:"video", size:"221 MB", modified:"Apr 10, 2026", starred:true },
      { id:"vid4", name:"Life Story – Part 1 & 2", type:"video", size:"1.0 GB", modified:"Feb 2026" },
    ],
  },
  {
    id:"keepsakes", label:"Keepsakes & Collectibles", color:"#6FAE8B", emoji:"🏺",
    description:"Photos and records of heirlooms, collectibles, and sentimental items",
    acceptedTypes:"image/*,.jpg,.jpeg,.png,application/pdf",
    subFolders:["Jewelry","Coins & Currency","Art","Military Memorabilia","Family Heirlooms"],
    files:[
      { id:"k1", name:"Grandfather's Pocket Watch – Photo", type:"image", size:"2.1 MB", modified:"Mar 2026", starred:true },
      { id:"k2", name:"Military Medal Collection – Photo", type:"image", size:"3.4 MB", modified:"Mar 2026" },
      { id:"k3", name:"Wedding Ring Appraisal", type:"pdf", size:"0.4 MB", modified:"Feb 2024" },
      { id:"k4", name:"Collectible Coins – Inventory", type:"pdf", size:"0.6 MB", modified:"Jan 2026" },
    ],
  },
  {
    id:"digital", label:"Digital Assets", color:"#D68FA8", emoji:"₿",
    description:"Cryptocurrency, online accounts, passwords, domains",
    acceptedTypes:"application/pdf,.txt,.pdf",
    subFolders:["Cryptocurrency","Online Accounts","Domains","Social Media","Passwords"],
    files:[
      { id:"d1", name:"Crypto Wallet Recovery Instructions", type:"other", size:"0.1 MB", modified:"Jun 2026", locked:true, starred:true },
      { id:"d2", name:"Password Manager Backup", type:"other", size:"0.3 MB", modified:"May 2026", locked:true },
      { id:"d3", name:"Domain Names – GoDaddy", type:"doc", size:"0.2 MB", modified:"Mar 2026" },
      { id:"d4", name:"Social Media Account List", type:"doc", size:"0.1 MB", modified:"Jan 2026" },
    ],
  },
  {
    id:"awards", label:"Awards & Achievements", color:"#F6AD55", emoji:"🏆",
    description:"Military medals, professional certificates, degrees, recognition",
    acceptedTypes:"image/*,.pdf,.jpg,.jpeg,.png",
    subFolders:["Military Service","Professional","Academic","Community","Sports"],
    files:[
      { id:"aw1", name:"U.S. Army Good Conduct Medal", type:"image", size:"1.2 MB", modified:"Mar 2026" },
      { id:"aw2", name:"Wildlife Photographer Award 2019", type:"image", size:"2.1 MB", modified:"Mar 2026", starred:true },
      { id:"aw3", name:"Sacramento Business of the Year 2021", type:"pdf", size:"0.8 MB", modified:"Dec 2021" },
      { id:"aw4", name:"College Degree – California State", type:"image", size:"1.8 MB", modified:"May 1988" },
    ],
  },
  {
    id:"goals", label:"Goals & Life Plans", color:"#D99A6B", emoji:"🎯",
    description:"Personal goals, bucket list, life plans, vision documents",
    acceptedTypes:"application/pdf,.pdf,.doc,.docx",
    subFolders:["Personal Goals","Financial Goals","Family Goals","Completed Goals"],
    files:[
      { id:"g1", name:"Life Goals – Written 2020", type:"doc", size:"0.3 MB", modified:"Jan 2020", starred:true },
      { id:"g2", name:"Bucket List – Updated 2026", type:"doc", size:"0.2 MB", modified:"Jan 2026" },
      { id:"g3", name:"Retirement Plan – 2026", type:"pdf", size:"0.8 MB", modified:"Feb 2026" },
    ],
  },
  {
    id:"weapons_locker", label:"Weapons Locker", color:"#F6AD55", emoji:"⚔️",
    description:"Non-firearm bladed weapons, edged tools, antique swords, and knives",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Knives","Swords & Blades","Antiques","Other"],
    files:[
      { id:"wl1", name:"Buck 110 Folding Hunter — Provenance", type:"pdf", size:"0.2 MB", modified:"Jun 2024" },
      { id:"wl2", name:"Edo Period Katana — Appraisal Certificate 2021", type:"pdf", size:"0.9 MB", modified:"Mar 2021" },
      { id:"wl3", name:"Katana — Authentication Photos", type:"image", size:"4.1 MB", modified:"Mar 2021" },
    ],
  },
  {
    id:"firearms", label:"Firearms Registry", color:"#FC8181", emoji:"🔒",
    description:"Serial numbers, registration docs, safe information (encrypted)",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Registrations","Purchase Records","Safe Information"],
    files:[
      { id:"fw1", name:"Glock 19 – CA DOJ Registration", type:"pdf", size:"0.4 MB", modified:"Nov 2019", locked:true },
      { id:"fw2", name:"Ruger 10/22 – Registration", type:"pdf", size:"0.4 MB", modified:"May 2021", locked:true },
      { id:"fw3", name:"Safe Combination – Encrypted", type:"other", size:"0.1 MB", modified:"Jan 2026", locked:true, starred:true },
    ],
  },
  {
    id:"warranties", label:"Warranties", color:"#6FAE8B", emoji:"🛡️",
    description:"Product warranties, extended protection plans, and proof of purchase",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Electronics","Appliances","Vehicles","Home & HVAC","Other"],
    files:[
      { id:"wa1", name:"LG TV – Geek Squad Protection Plan", type:"pdf", size:"0.6 MB", modified:"Nov 2023" },
      { id:"wa2", name:"Carrier AC – 10-Year Manufacturer Warranty", type:"pdf", size:"0.9 MB", modified:"May 2022" },
      { id:"wa3", name:"Samsung Refrigerator – Warranty Card", type:"pdf", size:"0.4 MB", modified:"Jan 2023" },
      { id:"wa4", name:"Toyota Camry – Warranty Booklet", type:"pdf", size:"1.2 MB", modified:"Feb 2021" },
      { id:"wa5", name:"American Home Shield – Annual Contract 2026", type:"pdf", size:"0.8 MB", modified:"Jan 2026" },
    ],
  },
  {
    id:"ids", label:"IDs & Licensing", color:"#6FAE8B", emoji:"🪪",
    description:"Government IDs, driver's license, passport & professional licenses",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Government IDs","Driver's License & Passport","Professional Licenses","Certifications"],
    files:[
      { id:"id1", name:"Driver's License – California", type:"image", size:"0.4 MB", modified:"Mar 2021", starred:true },
      { id:"id2", name:"U.S. Passport", type:"image", size:"0.6 MB", modified:"Jun 2019" },
      { id:"id3", name:"Social Security Card", type:"image", size:"0.3 MB", modified:"Jan 2026", locked:true },
      { id:"id4", name:"Real Estate Broker License – DRE", type:"pdf", size:"0.5 MB", modified:"Feb 2026" },
      { id:"id5", name:"Contractor License – CSLB", type:"pdf", size:"0.5 MB", modified:"Jan 2025" },
    ],
  },
  {
    id:"daycare", label:"Daycare & Childcare", color:"#F6AD55", emoji:"🧸",
    description:"Enrollment, immunization records, authorizations & provider info",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Enrollment","Immunization Records","Emergency Authorization","Provider Contracts"],
    files:[
      { id:"dc1", name:"Little Sprouts – Enrollment Agreement", type:"pdf", size:"0.6 MB", modified:"Aug 2025" },
      { id:"dc2", name:"Immunization Record – Lucas", type:"pdf", size:"0.3 MB", modified:"Sep 2025", starred:true },
      { id:"dc3", name:"Pickup Authorization Form", type:"pdf", size:"0.2 MB", modified:"Aug 2025" },
      { id:"dc4", name:"Emergency Medical Consent", type:"pdf", size:"0.2 MB", modified:"Aug 2025" },
    ],
  },
  {
    id:"places", label:"Favorite Places", color:"#D99A6B", emoji:"📍",
    description:"Meaningful restaurants, parks, travel spots & family places",
    acceptedTypes:"application/pdf,.pdf,image/*",
    subFolders:["Restaurants","Parks & Nature","Travel","Family Spots"],
    files:[
      { id:"fp1", name:"Grange Restaurant – Anniversary Spot", type:"pdf", size:"0.2 MB", modified:"May 2026", starred:true },
      { id:"fp2", name:"Effie Yeaw Nature Center – Notes", type:"pdf", size:"0.1 MB", modified:"Apr 2026" },
      { id:"fp3", name:"Big Sur Camping – Favorite Sites", type:"pdf", size:"0.3 MB", modified:"Aug 2025" },
    ],
  },
  {
    id:"secret", label:"Secret Vault", color:"#E53E3E", emoji:"🔐",
    description:"Ultra-sensitive items — AES-256 encrypted · PIN required",
    acceptedTypes:"*/*",
    files:[
      { id:"s1", name:"Safe Combination", type:"other", size:"0.1 MB", modified:"Jan 2026", locked:true },
      { id:"s2", name:"Crypto Seed Phrases", type:"other", size:"0.1 MB", modified:"Jun 2026", locked:true },
      { id:"s3", name:"Firearm Safe Code", type:"other", size:"0.1 MB", modified:"Jan 2026", locked:true },
    ],
  },
];

/* Refined per-folder accent — one harmonised family (the same nine hues used
   in the Calendar's SRC map) instead of the original web-safe rainbow, so the
   File Cabinet reads as one product with the rest of the redesigned portal.
   The Secret Vault keeps a dedicated "locked" red since it is the one folder
   gated behind a PIN. Underlying folder data (files, sub-folders, emoji) is
   untouched — only the display accent is recoloured here. */
const RAMP = ["#5BA7D6","#5BA7D6","#7E6BD8","#6F9E94","#6FAE8B","#97A2C6","#7E6BD8","#5BA7D6","#5B6EE1"];
const themedCabinets: Cabinet[] = cabinets.map((c, i) => ({
  ...c, color: c.id === "secret" ? NEG : RAMP[i % RAMP.length],
}));

/* Five meaning-grouped "drawers" replacing the old flat 23-folder grid —
   grouped by what they're for, with one accent per drawer (rather than the
   RAMP's per-folder cycling) so folders that belong together read together. */
const SECTIONS: { id: string; label: string; ids: string[] }[] = [
  { id: "legal",    label: "Legal & Financial",     ids: ["legal", "financial", "taxes", "insurance", "goals"] },
  { id: "property", label: "Property & Belongings", ids: ["property", "vehicles", "utilities", "warranties", "keepsakes", "weapons_locker"] },
  { id: "health",   label: "Health & Family",       ids: ["medical", "pets", "daycare", "ids"] },
  { id: "memories", label: "Memories & Messages",   ids: ["personal", "photos", "videos", "awards", "places"] },
  { id: "security", label: "Security & Access",     ids: ["digital", "firearms", "secret"] },
];

function getIcon(type: string, color = ACCENT2, size = 28) {
  if (type === "folder") return <Folder size={size} color={color} fill={`${color}22`}/>;
  if (type === "image")  return <Image size={size} color="#D9A55E"/>;
  if (type === "video")  return <Film  size={size} color="#FFFFFF"/>;
  if (type === "pdf" || type === "doc") return <FileText size={size} color={color}/>;
  if (type === "other") return <Lock size={size} color={NEG}/>;
  return <Archive size={size} color={MUTED}/>;
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-cab so nothing else in the app is affected. */
const CAB_CSS = `
.fpd-cab{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-cab *{box-sizing:border-box;}
.fpd-cab-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-cab .wrap{max-width:1320px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-cab .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-cab .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-cab .hbanner:hover .art{transform:scale(1.08);}
.fpd-cab .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-cab .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-cab .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-cab .hbanner h1{font-family:var(--font-display);font-size:29px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-cab .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-cab .hbanner p{color:${SOFT};font-size:13.5px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-cab .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-cab .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-cab .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-cab .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-cab .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-cab .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-cab .hbanner{min-height:auto;} .fpd-cab .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-cab .hbanner h1{font-size:23px;}}

.fpd-cab .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-cab .card.pad{padding:28px;}
.fpd-cab .sec-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.fpd-cab .sec-title{font-size:14px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;}
.fpd-cab .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-cab .eyebrow{font-size:10px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-cab .crumb-btn{background:none;border:none;cursor:pointer;color:${MUTED};font-size:10px;font-weight:600;padding:0;}
.fpd-cab .crumb-btn:hover{color:#6FAE8B;}
.fpd-cab .crumb-cur{color:#6FAE8B;}

/* header */
.fpd-cab .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-cab .pg-h1row{display:flex;align-items:flex-start;gap:12px;}
.fpd-cab .backbtn{width:34px;height:34px;border-radius:18px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${SOFT};cursor:pointer;transition:border-color .18s,color .18s;margin-top:2px;}
.fpd-cab .backbtn:hover{border-color:rgba(91,110,225,0.4);color:#6FAE8B;}
.fpd-cab .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-cab .pg-sub{color:${MUTED};font-size:13px;max-width:620px;line-height:1.6;}
.fpd-cab .head-r{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-cab .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-cab .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-cab .btn-primary:disabled{opacity:.6;cursor:default;transform:none;}

/* segmented view toggle */
.fpd-cab .seg{display:flex;gap:3px;padding:3px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.fpd-cab .seg button{display:inline-flex;align-items:center;justify-content:center;width:30px;height:28px;border-radius:7px;color:${MUTED};background:none;border:none;cursor:pointer;transition:color .18s,background .18s;}
.fpd-cab .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* search */
.fpd-cab .search{display:flex;align-items:center;gap:10px;padding:11px 16px;max-width:420px;}
.fpd-cab .search input{flex:1;background:transparent;border:none;outline:none;color:${TEXT};font-size:13px;font-family:var(--font-body);}
.fpd-cab .search input::placeholder{color:${FAINT};}
.fpd-cab .search .x{color:${MUTED};cursor:pointer;display:flex;background:none;border:none;}

/* KPI cards — same "At a Glance" language as the redesigned dashboard/calendar:
   separate flat cards with a gradient icon chip, not a single divided strip. */
.fpd-cab .kpi-stack{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-cab .kpi-mini{display:flex;align-items:center;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-cab .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-cab .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-cab .kpi-mini-txt{flex:1;min-width:0;}
.fpd-cab .kpi-mini-val{font-family:var(--font-display);font-size:22px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-cab .kpi-mini-lbl{font-size:11.5px;color:${MUTED};margin-top:4px;}
.fpd-cab .kpi-mini-sub{font-size:11px;color:${SOFT};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-cab .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:520px){.fpd-cab .kpi-stack{grid-template-columns:1fr;}}

/* drop zone */
.fpd-cab .drop{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:16px;border:1.5px dashed rgba(255,255,255,0.14);background:rgba(255,255,255,0.012);cursor:pointer;transition:border-color .18s,background .18s;}
.fpd-cab .drop.on{border-color:rgba(91,110,225,0.5);background:rgba(91,110,225,0.06);}
.fpd-cab .drop .dtxt{font-size:13px;color:${MUTED};}
.fpd-cab .drop.on .dtxt{color:#6FAE8B;}
.fpd-cab .drop .dtag{margin-left:auto;font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;color:#6FAE8B;padding:4px 9px;border-radius:7px;background:rgba(91,110,225,0.12);flex-shrink:0;}

/* chips (sub-folders) */
.fpd-cab .chiprow{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-cab .chip{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:99px;font-size:12.5px;font-weight:500;color:${SOFT};background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);cursor:pointer;font-family:var(--font-body);transition:border-color .16s,background .16s;}
.fpd-cab .chip:hover{border-color:rgba(91,110,225,0.32);background:rgba(91,110,225,0.06);}
.fpd-cab .chip.dash{border-style:dashed;color:${MUTED};}

/* ── Drawer cabinet (replaces the old flat folder grid) ── */
.fpd-cab .cab-drawers{display:flex;flex-direction:column;gap:12px;}
.fpd-cab details.cab-drawer{border-radius:22px;overflow:hidden;background:#101728;border:1px solid rgba(255,255,255,0.06);transition:border-color .18s ease;}
.fpd-cab details.cab-drawer:hover,.fpd-cab details.cab-drawer[open]{border-color:rgba(255,255,255,0.14);}
.fpd-cab details.cab-drawer summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px 20px;background:none;border-bottom:1px solid rgba(255,255,255,0.06);}
.fpd-cab details.cab-drawer summary::-webkit-details-marker{display:none;}
.fpd-cab .cab-pull{width:34px;height:34px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,167,214,0.10);border:1px solid rgba(91,167,214,0.24);}
.fpd-cab .cab-pull i{display:block;width:14px;height:2px;border-radius:2px;background:${ACCENT2};}
.fpd-cab details.cab-drawer[open] .cab-pull{background:rgba(91,167,214,0.16);}
.fpd-cab .cab-dtitle{font-family:var(--font-display);font-size:15px;font-weight:600;letter-spacing:-0.005em;color:${TEXT};}
.fpd-cab .cab-dsub{font-family:var(--font-mono);font-size:10px;color:${FAINT};margin-top:2px;letter-spacing:0.02em;}
.fpd-cab .cab-chev{margin-left:auto;color:${FAINT};transition:transform .2s ease;flex-shrink:0;}
.fpd-cab details.cab-drawer[open] .cab-chev{transform:rotate(180deg);}

.fpd-cab .cab-drawer-body{background:#070A12;box-shadow:inset 0 8px 14px -12px rgba(0,0,0,0.8);}
.fpd-cab .cab-drawer-body-in{padding:20px 18px;}
.fpd-cab .cab-tabrow{display:flex;flex-wrap:wrap;gap:16px;}

.fpd-cab .cab-tab{position:relative;margin-top:15px;width:196px;flex:0 0 auto;}
.fpd-cab .cab-tabflag{position:absolute;top:-15px;left:15px;height:22px;padding:0 9px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:5px;font-size:12px;border-bottom:none;z-index:1;}
.fpd-cab .cab-tabbody{position:relative;text-align:left;width:100%;padding:16px 14px 13px;border-radius:16px;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;font-family:var(--font-body);}
.fpd-cab .cab-tabbody:hover{transform:translateY(-2px);box-shadow:0 14px 24px -18px rgba(0,0,0,.7);}
.fpd-cab .cab-lockbadge{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;}
.fpd-cab .cab-tabbody .ftitle{font-family:var(--font-display);font-size:12.5px;font-weight:600;line-height:1.3;color:${TEXT};}
.fpd-cab .cab-tabbody .fdesc{font-size:10.5px;color:${MUTED};line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.fpd-cab .cab-tabbody .ffoot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;padding-top:9px;border-top:1px solid rgba(255,255,255,0.1);font-family:var(--font-mono);font-size:9px;color:${FAINT};}
.fpd-cab .cab-tabbody .fcount{padding:3px 7px;border-radius:6px;font-weight:600;}
.fpd-cab .frow{display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:16px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.08);cursor:pointer;text-align:left;width:100%;transition:border-color .16s,background .16s;font-family:var(--font-body);}
.fpd-cab .frow:hover{border-color:rgba(91,110,225,0.28);background:rgba(91,110,225,0.05);}
.fpd-cab .frow .femoji2{font-size:20px;flex-shrink:0;}
.fpd-cab .frow .rtitle{color:${TEXT};font-size:13.5px;font-weight:600;}
.fpd-cab .frow .rdesc{color:${MUTED};font-size:11.5px;margin-top:1px;}
.fpd-cab .frow .rcount{font-family:var(--font-mono);font-size:10.5px;padding:4px 9px;border-radius:7px;flex-shrink:0;}

.fpd-cab .newtile{border-radius:22px;border:1.5px dashed rgba(255,255,255,0.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:150px;color:${MUTED};cursor:pointer;transition:border-color .18s,color .18s;background:rgba(255,255,255,0.008);font-family:var(--font-body);}
.fpd-cab .newtile:hover{border-color:rgba(91,110,225,0.4);color:#6FAE8B;}

/* files */
.fpd-cab .filegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(156px,1fr));gap:12px;}
.fpd-cab .filecard{border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:border-color .16s;}
.fpd-cab .filecard.sel{border-color:${ACCENT2};box-shadow:0 0 0 1px rgba(91,167,214,0.4);}
.fpd-cab .filecard .thumb{height:92px;display:flex;align-items:center;justify-content:center;position:relative;background:#0F1624;}
.fpd-cab .filecard .thumb img{width:100%;height:100%;object-fit:cover;}
.fpd-cab .filecard .badge{position:absolute;top:7px;right:7px;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;}
.fpd-cab .filecard .fbody{padding:11px 12px;}
.fpd-cab .filecard .fname{color:${TEXT};font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;}
.fpd-cab .filecard .fmeta{color:${MUTED};font-family:var(--font-mono);font-size:9.5px;}

.fpd-cab .filerow{display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:16px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:border-color .16s;}
.fpd-cab .filerow.sel{border-color:${ACCENT2};}
.fpd-cab .filerow .ftico{width:34px;height:34px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-cab .filerow .ftico img{width:34px;height:34px;object-fit:cover;}
.fpd-cab .filerow .fname{color:${TEXT};font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fpd-cab .filerow .fmeta{color:${MUTED};font-family:var(--font-mono);font-size:11px;}
.fpd-cab .filerow .synced{padding:2px 7px;border-radius:6px;font-size:10px;background:rgba(91,110,225,0.10);color:#6FAE8B;display:inline-flex;align-items:center;gap:4px;}
.fpd-cab .filerow .fdate{color:${MUTED};font-size:11px;flex-shrink:0;}
.fpd-cab .filerow .facts{display:flex;gap:2px;flex-shrink:0;}
.fpd-cab .filerow .facts button{color:${MUTED};padding:5px;background:none;border:none;cursor:pointer;transition:color .16s;display:flex;}
.fpd-cab .filerow .facts button:hover{color:#6FAE8B;}
.fpd-cab .filerow .facts button.del:hover{color:${NEG};}

.fpd-cab .uploadtile{border-radius:18px;border:1.5px dashed rgba(255,255,255,0.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;cursor:pointer;color:${MUTED};background:rgba(255,255,255,0.008);transition:border-color .18s,color .18s;}
.fpd-cab .uploadtile.on{border-color:rgba(91,110,225,0.5);background:rgba(91,110,225,0.06);color:#6FAE8B;}
.fpd-cab .uploadtile:hover{border-color:rgba(91,110,225,0.4);color:#6FAE8B;}

/* detail panel */
.fpd-cab .detail{position:fixed;bottom:24px;right:24px;width:290px;z-index:40;padding:18px;}
.fpd-cab .detail img{width:100%;height:110px;object-fit:cover;border-radius:18px;margin-bottom:12px;}
.fpd-cab .detail .dhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;}
.fpd-cab .detail .dname{color:${TEXT};font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fpd-cab .detail .dclose{color:${MUTED};background:none;border:none;cursor:pointer;flex-shrink:0;display:flex;}
.fpd-cab .detail .drow{display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;}
.fpd-cab .detail .drow:first-of-type{border-top:none;}
.fpd-cab .detail .dk{color:${MUTED};}
.fpd-cab .detail .dv{color:${TEXT};font-weight:500;}
.fpd-cab .detail .dbtns{display:flex;gap:8px;margin-top:14px;}
.fpd-cab .detail .dbtn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:var(--font-body);}
.fpd-cab .detail .dbtn.ghost{background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:#6FAE8B;}
.fpd-cab .detail .dbtn.solid{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;}

/* empty */
.fpd-cab .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:34px 12px;}
.fpd-cab .empty .ei{width:46px;height:46px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:12px;}
.fpd-cab .empty .et{color:${SOFT};font-size:13px;font-weight:600;font-family:var(--font-display);}

@media (max-width:640px){.fpd-cab .filegrid{grid-template-columns:repeat(2,1fr);}}
`;

export function DigitalFileCabinet() {
  const { continuationFeePaid } = useDemo();
  const [current, setCurrent] = useState<Cabinet | null>(null);
  const [view, setView]       = useState<"grid"|"list">("grid");
  const [search, setSearch]   = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extras, setExtras]   = useState<Record<string, FolderFile[]>>({});
  const [selected, setSelected] = useState<FolderFile | null>(null);
  const [syncedDocs, setSyncedDocs] = useState<SyncedDoc[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["legal", "property"]));
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawersRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToSyncedDocs(setSyncedDocs), []);

  const matchesSearch = useCallback((c: Cabinet) =>
    c.label.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()),
  [search]);

  // Typing a query auto-opens any drawer that has a match, without closing ones already open by hand.
  useEffect(() => {
    if (!search) return;
    setOpenSections(s => {
      const n = new Set(s);
      SECTIONS.forEach(sec => { if (themedCabinets.some(c => sec.ids.includes(c.id) && matchesSearch(c))) n.add(sec.id); });
      return n;
    });
  }, [search, matchesSearch]);

  const doUpload = useCallback((folderId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const tid = toast.loading(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`);
    setTimeout(() => {
      const newFiles: FolderFile[] = Array.from(files).map(f => ({
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name, size: `${(f.size/1024/1024).toFixed(1)} MB`,
        modified: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        type: f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : f.type.includes("pdf") ? "pdf" : "other",
        thumbnail: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined,
      }));
      setExtras(e => ({ ...e, [folderId]: [...(e[folderId]??[]), ...newFiles] }));
      setUploading(false);
      toast.success(`${files.length} file${files.length>1?"s":""} uploaded & encrypted`, { id: tid });
    }, 1000 + Math.random()*500);
  }, []);

  const openFolder = (c: Cabinet) => {
    if ((c as any).locked === true) { toast.info("🔒 Enter your PIN to access the Secret Vault"); return; }
    setCurrent(c); setSearch(""); setSelected(null);
  };

  const folderCount = (folder: Cabinet) =>
    folder.files.length + (extras[folder.id]?.length ?? 0) + syncedDocs.filter(d => d.targetFolderId === folder.id).length;

  // Convert synced docs into FolderFile shape so the cabinet can render them
  const syncedForCurrent: (FolderFile & { _synced: true; _sourceSection: string; _syncId: string })[] = current
    ? syncedDocs
        .filter(d => d.targetFolderId === current.id)
        .map(d => ({
          id: `synced-${d.id}`, name: d.name, size: d.size, modified: d.syncedAt,
          type: (d.type === "Image" ? "image" : "pdf") as FolderFile["type"],
          _synced: true as const, _sourceSection: d.sourceSection, _syncId: d.id,
        }))
    : [];

  const currentFiles = current ? [...current.files, ...(extras[current.id]??[]), ...syncedForCurrent] : [];
  const filteredFiles = currentFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const totalFiles = themedCabinets.reduce((s,c) => s + c.files.length + (extras[c.id]?.length??0), 0) + syncedDocs.length;
  const protectedCount = themedCabinets.filter(c=>c.files.some(f=>f.locked)).length;

  const kpis = [
    { label: "Folders", value: String(themedCabinets.length), sub: "Categorized & organized", icon: <FolderOpen size={16}/>, dot: ACCENT2, tone: "sky" },
    { label: "Total Files", value: `${totalFiles}+`, sub: "Across every folder", icon: <FileText size={16}/>, dot: ACCENT, tone: "violet" },
    { label: "Protected Vaults", value: String(protectedCount), sub: "Locked or PIN-gated", icon: <Lock size={16}/>, dot: NEG, tone: "critical" },
    { label: "Encryption", value: "AES-256", icon: <Shield size={16}/>, sub: "Client-side, zero-knowledge", dot: POS, tone: "good" },
  ];

  return (
    <div className="fpd-cab">
      <style dangerouslySetInnerHTML={{ __html: CAB_CSS }} />
      <div className="fpd-cab-grain" />

      <div className="wrap">
        {/* ── Hero banner (root view only) ── */}
        {!current && (
          <div className="hbanner">
            <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroCabinetPhoto})` }} />
            <div className="scrim" />
            <div className="hcontent">
              <span className="heyebrow">Everything, Filed & Protected</span>
              <h1>Your records, <span className="accent">organized and encrypted.</span></h1>
              <p>Legal, financial, medical and personal documents — sorted into folders and secured with AES-256 encryption before they ever leave your device.</p>
              <div className="hactions">
                <button className="hbtn primary" onClick={() => drawersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  <FolderOpen size={15}/> Browse Folders
                </button>
                <button className="hbtn ghost" onClick={() => searchRef.current?.focus()}>
                  <Search size={15}/> Search Documents
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="pg-head">
          <div className="pg-h1row">
            {current && (
              <button className="backbtn" onClick={() => { setCurrent(null); setSearch(""); setSelected(null); }} title="Back to File Cabinet">
                <ArrowLeft size={15}/>
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">
                {current ? (
                  <>
                    <button className="crumb-btn" onClick={() => { setCurrent(null); setSearch(""); setSelected(null); }}>File Cabinet</button>
                    <ChevronRight size={11}/>
                    <span className="crumb-cur">{current.emoji} {current.label}</span>
                  </>
                ) : (
                  <><Archive size={12}/> Digital File Cabinet · AES-256 Encrypted</>
                )}
              </div>
              <h1 className="pg-h1">{current ? current.label : "Digital File Cabinet"}</h1>
              <div className="pg-sub">
                {current ? current.description : `${themedCabinets.length} folders · ${totalFiles}+ files, all encrypted client-side before they leave your device.`}
              </div>
            </div>
          </div>
          <div className="head-r">
            <div className="seg">
              <button className={view==="grid" ? "on" : ""} onClick={() => setView("grid")} title="Grid view"><Grid size={13}/></button>
              <button className={view==="list" ? "on" : ""} onClick={() => setView("list")} title="List view"><List size={13}/></button>
            </div>
            {current && (
              <>
                <input ref={fileRef} type="file" className="hidden" multiple accept={current.acceptedTypes} onChange={e => doUpload(current.id, e.target.files)}/>
                <ScanButton
                  folder={current.id}
                  onUpload={doc => { toast.success(`"${doc.name}" scanned and added to ${current.label}`); doUpload(current.id, null); }}
                  size="md"
                  label="Scan"
                />
                <button className="btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload size={14}/> {uploading ? "Uploading..." : "Upload Files"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Search ── */}
        <div className="card search">
          <Search size={13} color={MUTED}/>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder={current ? `Search in ${current.label}...` : "Search all folders..."}/>
          {search && <button className="x" onClick={() => setSearch("")}><X size={13}/></button>}
        </div>

        {/* ── Drop zone (inside a folder) ── */}
        {current && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); doUpload(current.id, e.dataTransfer.files); }}
            className={`drop ${dragging ? "on" : ""}`}
            onClick={() => fileRef.current?.click()}>
            <Upload size={16} color={dragging ? ACCENT2 : MUTED}/>
            <span className="dtxt">
              {uploading ? "Encrypting and uploading..." : dragging ? "Drop files here" : `Drag & drop ${current.acceptedTypes.includes("image") ? "documents, images or videos" : "files"} here, or click to browse`}
            </span>
            <span className="dtag">
              {current.acceptedTypes.includes("image/*") && current.acceptedTypes.includes("video/*") ? "PDF · IMG · VIDEO" :
               current.acceptedTypes.includes("image/*") ? "PDF · IMG" :
               current.acceptedTypes.includes("video/*") ? "VIDEO" : "PDF · DOC"}
            </span>
          </div>
        )}

        {/* ── Sub-folders strip (inside a folder) ── */}
        {current?.subFolders && (
          <div className="chiprow">
            {current.subFolders.map(sf => (
              <button key={sf} className="chip" onClick={() => toast.info(`Opening sub-folder: ${sf}`)}>
                <Folder size={13} color={current.color} fill={`${current.color}22`}/> {sf}
              </button>
            ))}
            <button className="chip dash" onClick={() => toast.info("Create new sub-folder")}>
              <Plus size={13}/> New Sub-folder
            </button>
          </div>
        )}

        {/* ── KPI cards (root only) ── */}
        {!current && (
          <div className="kpi-stack">
            {kpis.map(k => {
              const tone = KPI_TONES[k.tone] ?? KPI_TONES.sky;
              return (
                <div key={k.label} className="kpi-mini">
                  <span className="kpi-mini-ico" style={{ background: tone.bg, color: tone.fg }}>{k.icon}</span>
                  <div className="kpi-mini-txt">
                    <div className="kpi-mini-val">{k.value}</div>
                    <div className="kpi-mini-lbl">{k.label}</div>
                    <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DRAWER CABINET (root only) ── */}
        {!current && (
          <div className="cab-drawers" ref={drawersRef}>
            {SECTIONS.map(sec => {
                const folders = themedCabinets.filter(c => sec.ids.includes(c.id));
                const visible = folders.filter(matchesSearch);
                if (search && visible.length === 0) return null;
                const fileTotal = folders.reduce((s, f) => s + folderCount(f), 0);
                return (
                  <details key={sec.id} className="cab-drawer" open={openSections.has(sec.id)}
                    onToggle={e => {
                      const nowOpen = (e.currentTarget as HTMLDetailsElement).open;
                      setOpenSections(s => { const n = new Set(s); nowOpen ? n.add(sec.id) : n.delete(sec.id); return n; });
                    }}>
                    <summary>
                      <span className="cab-pull"><i/></span>
                      <span>
                        <span className="cab-dtitle">{sec.label}</span>
                        <div className="cab-dsub">{folders.length} folders · {fileTotal} files</div>
                      </span>
                      <ChevronDown size={13} className="cab-chev"/>
                    </summary>
                    <div className="cab-drawer-body"><div className="cab-drawer-body-in">
                      {view === "grid" ? (
                        <div className="cab-tabrow">
                          {visible.map(folder => {
                            const count = folderCount(folder);
                            const isLocked = folder.id === "secret";
                            const restricted = folder.files.some(f => f.locked);
                            return (
                              <div key={folder.id} className="cab-tab">
                                <span className="cab-tabflag" style={{ background:`${folder.color}2E`, border:`1px solid ${folder.color}66` }}>{folder.emoji}</span>
                                <button onClick={() => openFolder(folder)} className="cab-tabbody">
                                  {restricted && (
                                    <span className="cab-lockbadge" style={{ background:`${folder.color}22`, border:`1px solid ${folder.color}66`, color: folder.color }}>
                                      <Lock size={10}/>
                                    </span>
                                  )}
                                  <div className="ftitle">{folder.label}</div>
                                  <div className="fdesc">{folder.description}</div>
                                  <div className="ffoot">
                                    <span className="fcount" style={{ background:`${folder.color}29`, color: folder.color }}>
                                      {isLocked ? "🔒 PIN" : `${count} files`}
                                    </span>
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {visible.map(folder => {
                            const count = folderCount(folder);
                            const isLocked = folder.id === "secret";
                            return (
                              <button key={folder.id} onClick={() => openFolder(folder)} className="frow">
                                <div className="femoji2">{folder.emoji}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div className="rtitle">{folder.label}</div>
                                  <div className="rdesc">{folder.description}</div>
                                </div>
                                <span className="rcount" style={{ background:`${folder.color}29`, color: folder.color }}>{isLocked ? "🔒" : `${count} files`}</span>
                                <ChevronRight size={14} color={MUTED}/>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div></div>
                  </details>
                );
              })}

            <button className="newtile" style={{ minHeight:56, flexDirection:"row" }} onClick={() => toast.info("Enter a folder name to create a custom folder")}>
              <Plus size={16}/> <span style={{ fontSize:13 }}>New Custom Folder</span>
            </button>
          </div>
        )}

        {/* ── FOLDER CONTENTS ── */}
        {current && (
          view === "grid" ? (
            <div className="filegrid">
              {filteredFiles.map(file => (
                <div key={file.id} className={`filecard ${selected?.id===file.id ? "sel" : ""}`}
                  onClick={() => setSelected(selected?.id===file.id ? null : file)}>
                  <div className="thumb">
                    {file.thumbnail
                      ? <img src={file.thumbnail} alt={file.name}/>
                      : getIcon(file.type, current.color, 30)}
                    {file.locked && <div className="badge" style={{ background:"rgba(208,107,107,0.16)" }}><Lock size={11} color={NEG}/></div>}
                    {file.starred && !file.locked && <Star size={13} fill="#D9A55E" color="#D9A55E" style={{ position:"absolute", top:8, right:8 }}/>}
                  </div>
                  <div className="fbody">
                    <div className="fname">{file.name}</div>
                    <div className="fmeta">{file.count?`${file.count} files`:file.size} · {file.modified}</div>
                  </div>
                </div>
              ))}
              <div
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);doUpload(current.id,e.dataTransfer.files);}}
                onClick={() => fileRef.current?.click()}
                className={`uploadtile ${dragging ? "on" : ""}`} style={{ minHeight:140 }}>
                <Upload size={20}/>
                <span style={{ fontSize:12 }}>Upload or drop files</span>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredFiles.map(file => (
                <div key={file.id} className={`filerow ${selected?.id===file.id ? "sel" : ""}`}
                  onClick={() => setSelected(selected?.id===file.id ? null : file)}>
                  <div className="ftico">
                    {file.thumbnail
                      ? <img src={file.thumbnail} alt=""/>
                      : <span style={{ transform:"scale(0.7)" }}>{getIcon(file.type, current.color, 26)}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="fname">{file.name}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span className="fmeta">{file.count?`${file.count} files`:file.size}</span>
                      {(file as any)._synced && <span className="synced">🔗 {(file as any)._sourceSection}</span>}
                    </div>
                  </div>
                  <div className="fdate">{file.modified}</div>
                  {file.starred && <Star size={13} fill="#D9A55E" color="#D9A55E"/>}
                  {file.locked && <Lock size={13} color={NEG}/>}
                  <div className="facts">
                    <button onClick={e=>{e.stopPropagation(); continuationFeePaid ? toast.success(`Downloading: ${file.name}`) : toast.error("Pay the $199 Legacy Continuation Fee to download files");}}><Download size={13}/></button>
                    <button onClick={e=>{e.stopPropagation(); continuationFeePaid ? toast.info(`Previewing: ${file.name}`) : toast.error("Pay the $199 Legacy Continuation Fee to preview files");}}><Eye size={13}/></button>
                    <button className="del" onClick={e=>{e.stopPropagation(); if((file as any)._synced){ removeSyncedDoc((file as any)._syncId); toast.success("Removed from File Cabinet"); } else { toast.success(`Deleted: ${file.name}`); }}}><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
              <div
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);doUpload(current.id,e.dataTransfer.files);}}
                onClick={() => fileRef.current?.click()}
                className={`uploadtile ${dragging ? "on" : ""}`} style={{ minHeight:56, flexDirection:"row" }}>
                <Upload size={16}/>
                <span style={{ fontSize:12 }}>Upload or drop files</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* File detail panel */}
      {selected && (
        <div className="card detail">
          <div className="dhead">
            <div className="dname">{selected.name}</div>
            <button className="dclose" onClick={() => setSelected(null)}><X size={14}/></button>
          </div>
          {selected.thumbnail && <img src={selected.thumbnail} alt=""/>}
          <div>
            {[
              ["Type", selected.type.toUpperCase()],
              ["Size", selected.size ?? `${selected.count} files`],
              ["Modified", selected.modified ?? "—"],
              ["Encrypted", "AES-256"],
            ].map(([l,v]) => (
              <div key={l as string} className="drow">
                <span className="dk">{l}</span>
                <span className="dv">{v}</span>
              </div>
            ))}
          </div>
          <div className="dbtns">
            <button className="dbtn ghost" onClick={() => continuationFeePaid ? toast.success(`Downloading: ${selected.name}`) : toast.error("Pay the $199 Legacy Continuation Fee to download")}>
              <Download size={13}/> Download
            </button>
            <button className="dbtn solid" onClick={() => continuationFeePaid ? toast.info(`Previewing: ${selected.name}`) : toast.error("Pay the $199 Legacy Continuation Fee to preview")}>
              <Eye size={13}/> Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
