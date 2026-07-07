import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Folder, FolderOpen, FileText, Image, Film, Archive,
  Upload, Plus, ChevronRight, Search, Grid, List,
  Download, Eye, Trash2, X, ArrowLeft, Lock, Star,
  Heart, Stethoscope, Wallet, Car, Zap, PawPrint,
  Gift, Trophy, Target, Shield, FileCheck, Home, Camera
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";
import { ScanButton } from "./DocumentScanner";
import { subscribeToSyncedDocs, removeSyncedDoc, type SyncedDoc } from "../services/docSyncStore";

const CARD: React.CSSProperties = {
  background: "#16161F",
  border: "1px solid rgba(108,92,231,0.1)",
  boxShadow: "0 2px 12px rgba(108,92,231,0.06)",
  borderRadius: 16,
};
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

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
    id:"legal", label:"Legal Documents", color:"#6C5CE7", emoji:"⚖️",
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
    id:"financial", label:"Financial Records", color:"#48BB78", emoji:"💰",
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
    id:"vehicles", label:"Vehicles", color:"#4A90D9", emoji:"🚗",
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
    id:"utilities", label:"Utilities & Services", color:"#38B2AC", emoji:"⚡",
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
    id:"insurance", label:"Insurance Policies", color:"#9F7AEA", emoji:"🛡️",
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
    id:"videos", label:"Video Messages", color:"#4A90D9", emoji:"🎥",
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
    id:"keepsakes", label:"Keepsakes & Collectibles", color:"#9F7AEA", emoji:"🏺",
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
    id:"digital", label:"Digital Assets", color:"#38B2AC", emoji:"₿",
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
    id:"goals", label:"Goals & Life Plans", color:"#48BB78", emoji:"🎯",
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
    id:"warranties", label:"Warranties", color:"#9F7AEA", emoji:"🛡️",
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

function getIcon(type: string, color = "#6C5CE7", size = 28) {
  if (type === "folder") return <Folder size={size} color={color} fill={`${color}22`}/>;
  if (type === "image")  return <Image size={size} color="#F6AD55"/>;
  if (type === "video")  return <Film  size={size} color="#4A90D9"/>;
  if (type === "pdf" || type === "doc") return <FileText size={size} color="#6C5CE7"/>;
  if (type === "other") return <Lock size={size} color="#E53E3E"/>;
  return <Archive size={size} color="rgba(255,255,255,0.6)"/>;
}

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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeToSyncedDocs(setSyncedDocs), []);

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

  const filteredRoot = cabinets.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));
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

  const totalFiles = cabinets.reduce((s,c) => s + c.files.length + (extras[c.id]?.length??0), 0) + syncedDocs.length;

  return (
    <div style={{ background:"#0A0A0F", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1280, margin:"0 auto" }} className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {current && (
              <button onClick={() => { setCurrent(null); setSearch(""); setSelected(null); }}
                className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ width:36, height:36, ...CARD }}>
                <ArrowLeft size={16} color="#6C5CE7"/>
              </button>
            )}
            <div>
              {current && (
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color:"rgba(255,255,255,0.65)", fontSize:12 }}>File Cabinet</span>
                  <ChevronRight size={12} color="rgba(255,255,255,0.65)"/>
                  <span style={{ color:"#6C5CE7", fontSize:12, fontWeight:600 }}>{current.emoji} {current.label}</span>
                </div>
              )}
              <h1 style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#FFFFFF" }}>
                {current ? current.label : "Digital File Cabinet"}
              </h1>
              <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:4 }}>
                {current ? current.description : `${cabinets.length} folders · ${totalFiles}+ files · AES-256 encrypted`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 rounded-xl glow-surface" style={CARD}>
              <button onClick={() => setView("grid")} className="p-2 rounded-lg" style={{ background:view==="grid"?"#6C5CE7":"transparent", color:view==="grid"?"#fff":"rgba(255,255,255,0.7)" }}><Grid size={13}/></button>
              <button onClick={() => setView("list")} className="p-2 rounded-lg" style={{ background:view==="list"?"#6C5CE7":"transparent", color:view==="list"?"#fff":"rgba(255,255,255,0.7)" }}><List size={13}/></button>
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
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#fff", boxShadow:"0 4px 12px rgba(108,92,231,0.3)" }}>
                  <Upload size={14}/> {uploading ? "Uploading..." : "Upload Files"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ ...CARD, maxWidth:420 }}>
          <Search size={13} color="rgba(255,255,255,0.65)"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={current ? `Search in ${current.label}...` : "Search all folders..."}
            style={{ background:"transparent", border:"none", outline:"none", color:"#FFFFFF", fontSize:13, width:"100%" }}/>
          {search && <button onClick={() => setSearch("")} style={{ color:"rgba(255,255,255,0.65)" }}><X size={13}/></button>}
        </div>

        {/* Drop zone when inside a folder */}
        {current && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); doUpload(current.id, e.dataTransfer.files); }}
            className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer"
            style={{ borderColor:dragging?"#6C5CE7":"rgba(108,92,231,0.2)", background:dragging?"rgba(108,92,231,0.04)":"transparent" }}
            onClick={() => fileRef.current?.click()}>
            <Upload size={16} color={dragging?"#6C5CE7":"rgba(255,255,255,0.65)"}/>
            <span style={{ color:dragging?"#6C5CE7":"rgba(255,255,255,0.65)", fontSize:13 }}>
              {uploading ? "Encrypting and uploading..." : dragging ? "Drop files here" : `Drag & drop ${current.acceptedTypes.includes("image") ? "documents, images or videos" : "files"} here, or click to browse`}
            </span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ background:"rgba(108,92,231,0.1)", color:"#6C5CE7", ...MONO }}>
              {current.acceptedTypes.includes("image/*") && current.acceptedTypes.includes("video/*") ? "PDF · IMG · VIDEO" :
               current.acceptedTypes.includes("image/*") ? "PDF · IMG" :
               current.acceptedTypes.includes("video/*") ? "VIDEO" : "PDF · DOC"}
            </span>
          </div>
        )}

        {/* Sub-folders strip (when inside folder) */}
        {current?.subFolders && (
          <div className="flex flex-wrap gap-2">
            {current.subFolders.map(sf => (
              <button key={sf} onClick={() => toast.info(`Opening sub-folder: ${sf}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{ background:"#16161F", border:"1px solid rgba(108,92,231,0.12)", color:"rgba(255,255,255,0.8)" }}>
                <Folder size={13} color={current.color} fill={`${current.color}22`}/> {sf}
              </button>
            ))}
            <button onClick={() => toast.info("Create new sub-folder")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
              style={{ border:"1px dashed rgba(108,92,231,0.2)", color:"rgba(255,255,255,0.65)" }}>
              <Plus size={13}/> New Sub-folder
            </button>
          </div>
        )}

        {/* ROOT FOLDER GRID */}
        {!current && (
          <div className={view==="grid"
            ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
            : "space-y-2"}>
            {filteredRoot.map(folder => {
              const count = folder.files.length + (extras[folder.id]?.length??0) + syncedDocs.filter(d=>d.targetFolderId===folder.id).length;
              const isLocked = (folder as any).locked || folder.id === "secret";
              return view==="grid" ? (
                <button key={folder.id} onClick={() => openFolder(folder)}
                  className="text-left rounded-2xl overflow-hidden transition-all hover:shadow-md group w-full"
                  style={CARD}>
                  <div style={{ height:5, background:`linear-gradient(90deg,${folder.color},${folder.color}88)` }}/>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-3xl">{folder.emoji}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`${folder.color}14`, color:folder.color, ...MONO }}>
                        {isLocked ? "🔒 PIN" : `${count} files`}
                      </span>
                    </div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"#FFFFFF", fontWeight:600, marginBottom:6 }}>{folder.label}</div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, lineHeight:1.5 }}>{folder.description}</div>
                  </div>
                </button>
              ) : (
                <button key={folder.id} onClick={() => openFolder(folder)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left"
                  style={CARD}>
                  <div className="text-2xl flex-shrink-0">{folder.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color:"#FFFFFF", fontSize:14, fontWeight:600 }}>{folder.label}</div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{folder.description}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background:`${folder.color}14`, color:folder.color, ...MONO }}>{isLocked?"🔒":count+" files"}</span>
                  <ChevronRight size={14} color="rgba(255,255,255,0.65)"/>
                </button>
              );
            })}
            {/* New folder */}
            <button onClick={() => toast.info("Enter a folder name to create a custom folder")}
              className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 p-6 transition-all"
              style={{ borderColor:"rgba(108,92,231,0.2)", minHeight:140, color:"rgba(255,255,255,0.65)" }}>
              <Plus size={22} style={{ opacity:0.5 }}/>
              <span style={{ fontSize:13 }}>New Custom Folder</span>
            </button>
          </div>
        )}

        {/* FOLDER CONTENTS */}
        {current && (
          <div className={view==="grid"
            ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"}>
            {filteredFiles.map(file => (
              view==="grid" ? (
                <div key={file.id}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
                  style={{ ...CARD, borderColor:selected?.id===file.id?current.color:"rgba(108,92,231,0.1)", borderWidth:selected?.id===file.id?2:1 }}
                  onClick={() => setSelected(selected?.id===file.id ? null : file)}>
                  <div className="flex items-center justify-center relative" style={{ height:100, background:`${current.color}08` }}>
                    {file.thumbnail
                      ? <img src={file.thumbnail} alt={file.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : getIcon(file.type, current.color, 32)}
                    {file.locked && <div className="absolute top-2 right-2 p-1 rounded-lg" style={{ background:"rgba(229,62,62,0.12)" }}><Lock size={12} color="#E53E3E"/></div>}
                    {file.starred && !file.locked && <Star size={13} fill="#F6AD55" color="#F6AD55" style={{ position:"absolute", top:8, right:8 }}/>}
                  </div>
                  <div className="p-3">
                    <div style={{ color:"#FFFFFF", fontSize:12, fontWeight:500, marginBottom:2 }} className="truncate">{file.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO }}>{file.count?`${file.count} files`:file.size} · {file.modified}</div>
                  </div>
                </div>
              ) : (
                <div key={file.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all"
                  style={{ ...CARD, borderColor:selected?.id===file.id?current.color:"rgba(108,92,231,0.08)" }}
                  onClick={() => setSelected(selected?.id===file.id ? null : file)}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background:`${current.color}10` }}>
                    {file.thumbnail
                      ? <img src={file.thumbnail} alt="" style={{ width:36, height:36, objectFit:"cover", borderRadius:8 }}/>
                      : <span style={{ transform:"scale(0.65)" }}>{getIcon(file.type, current.color, 28)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:500 }} className="truncate">{file.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO }}>{file.count?`${file.count} files`:file.size}</span>
                      {(file as any)._synced && (
                        <span className="px-1.5 py-0.5 rounded text-xs inline-flex items-center gap-1"
                          style={{ background:"rgba(108,92,231,0.07)", color:"#6C5CE7" }}>
                          🔗 {(file as any)._sourceSection}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, flexShrink:0 }}>{file.modified}</div>
                  {file.starred && <Star size={13} fill="#F6AD55" color="#F6AD55"/>}
                  {file.locked && <Lock size={13} color="#E53E3E"/>}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={e=>{e.stopPropagation(); continuationFeePaid ? toast.success(`Downloading: ${file.name}`) : toast.error("❌ Pay the $199 Legacy Continuation Fee to download files");}} style={{color:"rgba(255,255,255,0.65)",padding:4}}><Download size={12}/></button>
                    <button onClick={e=>{e.stopPropagation(); continuationFeePaid ? toast.info(`Previewing: ${file.name}`) : toast.error("❌ Pay the $199 Legacy Continuation Fee to preview files");}} style={{color:"rgba(255,255,255,0.65)",padding:4}}><Eye size={12}/></button>
                    <button onClick={e=>{e.stopPropagation(); if((file as any)._synced){ removeSyncedDoc((file as any)._syncId); toast.success("Removed from File Cabinet"); } else { toast.success(`Deleted: ${file.name}`); }}} style={{color:"#FC8181",padding:4}}><Trash2 size={12}/></button>
                  </div>
                </div>
              )
            ))}
            {/* Upload tile */}
            <div
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);doUpload(current.id,e.dataTransfer.files);}}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
              style={{ borderColor:dragging?"#6C5CE7":"rgba(108,92,231,0.2)", background:dragging?"rgba(108,92,231,0.04)":"transparent", minHeight:view==="grid"?140:56 }}>
              <Upload size={20} color="#6C5CE7" style={{ opacity:0.6 }}/>
              <span style={{ color:"rgba(255,255,255,0.65)", fontSize:12 }}>Upload or drop files</span>
            </div>
          </div>
        )}
      </div>

      {/* File detail panel */}
      {selected && (
        <div className="fixed bottom-20 right-6 w-72 rounded-2xl p-5 z-40" style={{ ...CARD, boxShadow:"0 8px 40px rgba(108,92,231,0.15)" }}>
          <div className="flex items-center justify-between mb-4">
            <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:600 }} className="truncate">{selected.name}</div>
            <button onClick={() => setSelected(null)} style={{ color:"rgba(255,255,255,0.65)" }}><X size={14}/></button>
          </div>
          {selected.thumbnail && <img src={selected.thumbnail} alt="" style={{ width:"100%", height:110, objectFit:"cover", borderRadius:10, marginBottom:12 }}/>}
          <div className="space-y-2 mb-4">
            {[
              ["Type", selected.type.toUpperCase()],
              ["Size", selected.size ?? `${selected.count} files`],
              ["Modified", selected.modified ?? "—"],
              ["Encrypted", "AES-256"],
            ].map(([l,v]) => (
              <div key={l as string} className="flex justify-between">
                <span style={{ color:"rgba(255,255,255,0.65)", fontSize:12 }}>{l}</span>
                <span style={{ color:"#FFFFFF", fontSize:12, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => continuationFeePaid ? toast.success(`Downloading: ${selected.name}`) : toast.error("❌ Pay the $199 Legacy Continuation Fee to download")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm" style={{ background:"#1C1C28", color:"#6C5CE7" }}>
              <Download size={13}/> Download
            </button>
            <button onClick={() => continuationFeePaid ? toast.info(`Previewing: ${selected.name}`) : toast.error("❌ Pay the $199 Legacy Continuation Fee to preview")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm" style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#fff" }}>
              <Eye size={13}/> Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
