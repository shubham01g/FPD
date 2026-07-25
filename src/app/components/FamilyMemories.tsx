import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { Camera, Video, Star, Trophy, Target, Heart, PawPrint, Plus, Edit2, Play, X, Upload, ImageIcon, Mic, Volume2, Square, Pause, Circle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

type Tab = "memories" | "messages" | "audio" | "kids" | "keepsakes" | "goals" | "awards" | "pets";

/* Photo Memories — photos you upload from a device or scan in from prints.
   Each entry is one moment, holding one or many photos.                     */
interface PhotoMemory {
  id: number; title: string; date: string; description: string;
  tags: string[]; photos: string[]; count: number;
}

const photoMemories: PhotoMemory[] = [
  { id: 1, title: "Family Christmas 2024", date: "Dec 25, 2024", description: "Last Christmas at the Sacramento house. All four kids were home.", tags: ["family", "christmas", "2024"], photos: [], count: 42 },
  { id: 2, title: "Michael's Wedding Day", date: "Jun 12, 2022", description: "Michael married Amanda Torres in Napa Valley. One of the best days of my life.", tags: ["michael", "wedding", "family"], photos: [], count: 168 },
  { id: 3, title: "Scanned Prints — Summers 1978–1984", date: "Scanned Mar 3, 2026", description: "Shoebox of prints from the Oakland years, scanned in and labeled.", tags: ["scanned", "childhood", "archive"], photos: [], count: 96 },
  { id: 4, title: "Dad's 60th Birthday Celebration", date: "Nov 14, 2021", description: "Surprise party at Mario's. Family flew in from three states.", tags: ["birthday", "family", "milestone"], photos: [], count: 31 },
];

/* Video Memories — old home videos you already have, uploaded or digitized.
   Recording a new message for someone lives in Messages to Loved Ones.       */
interface VideoMemory {
  id: number; title: string; filmed: string; duration: string; added: string;
  description: string; source: string; url?: string;
}

const videoMemories: VideoMemory[] = [
  { id: 1, title: "Big Sur Camping Trip", filmed: "Aug 8, 2023", duration: "14:22", added: "Apr 10, 2026", description: "Three-day camping trip with the grandkids. Tyler caught his first fish.", source: "Uploaded from phone" },
  { id: 2, title: "Michael & Amanda's Wedding — Full Ceremony", filmed: "Jun 12, 2022", duration: "1:04:38", added: "Apr 10, 2026", description: "The full ceremony and reception in Napa Valley, from the videographer's copy.", source: "Uploaded from camcorder" },
  { id: 3, title: "Christmas Morning 1994", filmed: "Dec 25, 1994", duration: "22:10", added: "Apr 11, 2026", description: "The kids opening presents at the old house. Grandma Rose is on this one.", source: "Digitized VHS tape" },
  { id: 4, title: "Dad's 60th Birthday Party", filmed: "Nov 14, 2021", duration: "31:47", added: "Apr 11, 2026", description: "Surprise party at Mario's — the toasts and the whole dinner.", source: "Uploaded from phone" },
];

/* Audio Memories — recorded here, in your own voice. */
const audioMemories: { id:number; title:string; recipient:string; duration:string; recorded:string; description:string; url?:string }[] = [
  { id: 1, title: "Bedtime Story for Emma", recipient: "Emma Doe (Granddaughter)", duration: "7:14", recorded: "Apr 12, 2026", description: "Grandfather reading 'The Velveteen Rabbit' — for her to hear when she's older." },
  { id: 2, title: "Life Advice — 10 Things I Wish I Knew", recipient: "All Children & Grandchildren", duration: "18:32", recorded: "Apr 11, 2026", description: "Ten pieces of wisdom from a lifetime of lessons — work, love, money, health, and happiness." },
  { id: 3, title: "Wedding Anniversary Message for Sarah", recipient: "Sarah Johnson (Spouse)", duration: "4:55", recorded: "Apr 10, 2026", description: "A private anniversary message — to be played on our anniversary each year." },
  { id: 4, title: "The Day Michael Was Born", recipient: "Michael Doe (Son)", duration: "11:08", recorded: "Apr 10, 2026", description: "The story of the day Michael was born — told in full detail for the first time." },
];

const kidsActivities = [
  { id: 1, child: "Tyler Doe (Grandson, age 8)", activities: ["Little League Baseball — Roseville Tigers", "Swimming Lessons — YMCA"], school: "Woodcreek Elementary, Roseville CA", notes: "Loves dinosaurs. Allergic to peanuts." },
  { id: 2, child: "Lily Doe (Granddaughter, age 6)", activities: ["Ballet — Sacramento Ballet Academy", "Soccer — Roseville Youth Soccer"], school: "Woodcreek Elementary, Roseville CA", notes: "Loves painting. Very shy at first." },
];

const keepsakes = [
  { id: 1, item: "Grandfather's Pocket Watch (1892)", location: "Safe deposit box — Wells Fargo downtown", value: "Sentimental / ~$800", intendedFor: "Emily Doe (Daughter)", story: "Brought from Italy by great-great-grandfather Giovanni. Never been repaired — still runs." },
  { id: 2, item: "Wedding Ring (mine)", location: "Jewelry box — master bedroom dresser", value: "Sentimental / ~$2,400", intendedFor: "Emily Doe (Daughter)", story: "My father's wedding ring, given to me when he passed. May it continue through generations." },
  { id: 3, item: "Photo Albums (1960s–1990s)", location: "Hall closet, top shelf in labeled boxes", value: "Sentimental", intendedFor: "All children — split equally", story: "Hard copies of family history before digital. Please digitize and share with everyone." },
  { id: 4, item: "Military Service Medal Collection", location: "Display case — home office", value: "Sentimental / $200–$500", intendedFor: "Michael Doe (Son)", story: "U.S. Army service 1984–1988. Stories behind each medal are recorded in video message." },
];

const goals = [
  { id: 1, goal: "Ensure family home is paid off before death", status: "in_progress", progress: 58, notes: "Mortgage balance $201,400. Consider life insurance payout." },
  { id: 2, goal: "Digitize all family photo albums", status: "in_progress", progress: 35, notes: "Tyler is helping scan albums over summer." },
  { id: 3, goal: "Complete Legacy Vault with all documents", status: "in_progress", progress: 78, notes: "Missing: tax returns pre-2023, retirement account beneficiary updates." },
  { id: 4, goal: "Teach Michael photography business operations", status: "completed", progress: 100, notes: "Completed summer 2025. All business docs transferred." },
  { id: 5, goal: "Reach $500k in retirement savings", status: "in_progress", progress: 82, notes: "$407k current. On track for 2028." },
];

const awards = [
  { id: 1, award: "U.S. Army Good Conduct Medal", year: "1988", organization: "United States Army", category: "Military", description: "Awarded for exemplary behavior during service." },
  { id: 2, award: "Wildlife Photographer of the Year — Regional Finalist", year: "2019", organization: "California Photography Guild", category: "Professional", description: "Shortlisted for Big Sur Wildlife Series." },
  { id: 3, award: "Sacramento Business of the Year — Small Business", year: "2021", organization: "Sacramento Chamber of Commerce", category: "Business", description: "Awarded to Doe Photography LLC." },
];

interface PetVaccination { type: string; date: string; }
interface PetCaretaker { name: string; phone: string; }
interface PetProvider { name: string; phone: string; }
interface PetInstruction { name: string; phone: string; description: string; }
interface PetFeeding { foodType: string; timeType: string; quantity: string; locationOfFood: string; }
interface PetRecord {
  id: number;
  photos: string[];
  // Emergency Pet Caretakers
  caretakers: PetCaretaker[];
  // Long Term Pet Provider
  providers: PetProvider[];
  // Special Care Instructions
  instructions: PetInstruction[];
  // About Your Beloved Pet
  name: string;
  dateOfBirth: string;
  gender: string;
  breed: string;
  colour: string;
  documents: string[];
  // Health Info
  medicalHistory: string;
  vaccinations: PetVaccination[];
  // Vet Info
  vetName: string;
  vetPhone: string;
  vetEmail: string;
  // Feeding
  feedings: PetFeeding[];
}

const pets: PetRecord[] = [
  {
    id: 1,
    photos: [],
    caretakers: [
      { name: "Emily Doe (Daughter)", phone: "(916) 555-0392" },
    ],
    providers: [
      { name: "Sacramento Animal Boarding — Oak Park", phone: "(916) 555-0841" },
    ],
    instructions: [
      { name: "Dr. Patricia Moore", phone: "(916) 555-0721", description: "Biscuit requires 0.8mg Methimazole thyroid medication daily — mixed into wet food. Give in the morning with breakfast. Keep away from chocolate, grapes, onions." },
      { name: "Emily Doe", phone: "(916) 555-0392", description: "Biscuit is scared of thunderstorms. Keep him in the laundry room during storms. He loves tennis balls — bring 2 when boarding." },
    ],
    name: "Biscuit",
    dateOfBirth: "Mar 15, 2017",
    gender: "Male",
    breed: "Golden Retriever",
    colour: "Golden / Cream",
    documents: ["Adoption Certificate 2017", "Microchip Registration"],
    medicalHistory: "Healthy adult male Golden Retriever. Diagnosed with hypothyroidism in 2022 — managed with daily Methimazole. Annual wellness exams at Sacramento Animal Hospital. No known allergies. Microchip ID: 985121084982110.",
    vaccinations: [
      { type: "Rabies", date: "Mar 10, 2026" },
      { type: "DHPP (Distemper/Parvo)", date: "Mar 10, 2026" },
      { type: "Bordetella", date: "Mar 10, 2026" },
      { type: "Leptospirosis", date: "Mar 10, 2026" },
    ],
    vetName: "Dr. Patricia Moore",
    vetPhone: "(916) 555-0721",
    vetEmail: "pmoore@sacanimalhospital.com",
    feedings: [
      { foodType: "Royal Canin Medium Adult (dry)", timeType: "Morning", quantity: "2 cups", locationOfFood: "Kitchen — cabinet under sink" },
      { foodType: "Royal Canin Medium Adult (dry)", timeType: "Evening", quantity: "2 cups", locationOfFood: "Kitchen — cabinet under sink" },
    ],
  },
];

const statusStyles = {
  completed: { color: "#48BB78", bg: "rgba(72,187,120,0.12)", label: "COMPLETED" },
  in_progress: { color: "#5B6EE1", bg: "rgba(91,110,225,0.12)", label: "IN PROGRESS" },
  not_started: { color: "var(--muted-foreground)", bg: "var(--secondary)", label: "NOT STARTED" },
};

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar,
   AI assistant, file cabinet, legacy vault, folders, final wishes & wills) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-fam so nothing else in the app is affected. */
const FAM_CSS = `
.fpd-fam{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-fam *{box-sizing:border-box;}
.fpd-fam-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-fam .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-fam .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-fam .card.pad{padding:22px;}
.fpd-fam .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-fam .sec-title{font-size:14.5px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:14px;}
.fpd-fam .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});flex-shrink:0;}

/* header */
.fpd-fam .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-fam .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-fam .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-fam .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-fam .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-fam .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-fam .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-fam .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-fam .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:9px;background:rgba(95,190,145,0.12);color:${POS};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-fam .btn-pos:hover{background:rgba(95,190,145,0.2);}
.fpd-fam .btn-mini{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-fam .btn-mini:hover{filter:brightness(1.08);}

/* segmented tabs */
.fpd-fam .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);width:fit-content;flex-wrap:wrap;}
.fpd-fam .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;font-size:12.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-fam .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* toolbar */
.fpd-fam .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-fam .toolbar p{color:${MUTED};font-size:13px;line-height:1.6;max-width:620px;margin:0;}
.fpd-fam .toolbar .actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

/* KPI ledger */
.fpd-fam .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-fam .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-fam .kcell:first-child{border-left:none;}
.fpd-fam .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-fam .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-fam .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-fam .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-fam .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-fam .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-fam .kstrip{grid-template-columns:1fr 1fr;}.fpd-fam .kcell:nth-child(3){border-left:none;}.fpd-fam .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* generic record-card parts, reused across every tab */
.fpd-fam .r-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
.fpd-fam .r-icon{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:${ACCENT2};}
.fpd-fam .r-title{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-fam .r-sub{color:${MUTED};font-size:12.5px;}
.fpd-fam .r-sub.accent{color:${ACCENT2};}
.fpd-fam .r-desc{color:${MUTED};font-size:13px;line-height:1.6;}
.fpd-fam .r-grid{display:grid;grid-template-columns:repeat(2,1fr);border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);overflow:hidden;margin:14px 0;}
.fpd-fam .r-grid.c3{grid-template-columns:repeat(3,1fr);}
.fpd-fam .r-grid.c4{grid-template-columns:repeat(4,1fr);}
.fpd-fam .r-grid:not(.c3):not(.c4) .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-grid:not(.c3):not(.c4) .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-grid.c3 .tile:nth-child(3n+2),.fpd-fam .r-grid.c3 .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-grid.c3 .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-grid.c4 .tile:nth-child(4n+2),.fpd-fam .r-grid.c4 .tile:nth-child(4n+3),.fpd-fam .r-grid.c4 .tile:nth-child(4n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-grid.c4 .tile:nth-child(n+5){border-top:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px;}
.fpd-fam .r-meta .mono{font-family:var(--font-mono);font-size:12px;color:${MUTED};}
.fpd-fam .r-meta .txt{font-size:12px;color:${MUTED};}
@media (max-width:760px){
.fpd-fam .r-grid,.fpd-fam .r-grid.c3,.fpd-fam .r-grid.c4{grid-template-columns:1fr 1fr;}
.fpd-fam .r-grid.c3 .tile:nth-child(3n+2),.fpd-fam .r-grid.c3 .tile:nth-child(3n){border-left:none;}
.fpd-fam .r-grid.c4 .tile:nth-child(4n+2),.fpd-fam .r-grid.c4 .tile:nth-child(4n+3),.fpd-fam .r-grid.c4 .tile:nth-child(4n){border-left:none;}
.fpd-fam .r-grid.c3 .tile:nth-child(2n),.fpd-fam .r-grid.c4 .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-fam .r-grid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}
}

.fpd-fam .pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-fam .chiprow{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-fam .tag{display:inline-block;padding:4px 10px;border-radius:7px;font-size:11.5px;font-weight:500;background:rgba(91,110,225,0.12);color:${ACCENT2};}

.fpd-fam .tile{padding:12px 14px;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-fam .tile .tk{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-fam .tile .tv{color:${TEXT};font-size:13px;line-height:1.5;}
.fpd-fam .tile.warn{background:rgba(217,165,94,0.06);border-color:rgba(217,165,94,0.2);}
.fpd-fam .tile.neg{background:rgba(208,107,107,0.06);border-color:rgba(208,107,107,0.2);}
.fpd-fam .tile.info{background:rgba(91,110,225,0.06);border-color:rgba(91,110,225,0.2);}
.fpd-fam .tile.pos{background:rgba(95,190,145,0.07);border-color:rgba(95,190,145,0.2);}

/* photo thumbnails */
.fpd-fam .thumbs{display:flex;gap:6px;flex-wrap:wrap;}
.fpd-fam .thumb{width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.22);}
.fpd-fam .thumb-more{width:56px;height:56px;border-radius:8px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;color:${MUTED};font-size:12px;}

/* video card */
.fpd-fam .vplay{width:52px;height:52px;border-radius:12px;background:rgba(91,110,225,0.1);border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;}

/* grids of cards */
.fpd-fam .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media (max-width:820px){.fpd-fam .mgrid{grid-template-columns:1fr;}}
.fpd-fam .stack{display:flex;flex-direction:column;gap:14px;}

/* progress bar (goals) */
.fpd-fam .pbar{height:8px;border-radius:99px;background:rgba(255,255,255,0.06);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);}
.fpd-fam .pbar i{display:block;height:100%;border-radius:99px;transition:width .4s cubic-bezier(.4,0,.2,1);}

/* recorder panel — wraps the real getUserMedia/MediaRecorder UI; JS untouched */
.fpd-fam .recorder{background:linear-gradient(180deg,rgba(91,110,225,0.08) 0%,rgba(91,110,225,0.02) 100%);border:1px solid rgba(91,110,225,0.22);border-radius:16px;padding:24px;}
.fpd-fam .recorder .rec-eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT2};display:flex;align-items:center;gap:7px;margin-bottom:18px;}
.fpd-fam .rec-error{padding:12px 16px;border-radius:11px;background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.24);color:${NEG};font-size:13px;margin-bottom:16px;}
.fpd-fam .rec-idle{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0;}
.fpd-fam .rec-orb{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.12);border:2px solid rgba(91,110,225,0.28);}
.fpd-fam .rec-hint{color:${MUTED};font-size:13px;text-align:center;line-height:1.6;}
.fpd-fam .rec-startbtn{display:inline-flex;align-items:center;gap:9px;padding:13px 30px;border-radius:14px;font-weight:700;font-size:14px;border:none;cursor:pointer;color:#fff;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);box-shadow:0 10px 28px -10px rgba(91,110,225,0.7);font-family:var(--font-body);}
.fpd-fam .rec-live{display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0;}
.fpd-fam .rec-live .dot{width:11px;height:11px;border-radius:50%;background:${NEG};}
.fpd-fam .rec-time{font-family:var(--font-mono);font-size:32px;color:${TEXT};font-weight:700;letter-spacing:0.04em;font-variant-numeric:tabular-nums;}
.fpd-fam .rec-status{font-family:var(--font-mono);font-size:11px;font-weight:700;}
.fpd-fam .rec-wave{display:flex;align-items:center;gap:2px;height:32px;}
.fpd-fam .rec-wave i{width:3px;border-radius:2px;background:${ACCENT};opacity:.75;}
.fpd-fam .rec-controls{display:flex;align-items:center;gap:10px;}
.fpd-fam .rec-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:11px;font-weight:600;font-size:13px;border:1px solid;cursor:pointer;font-family:var(--font-body);}
.fpd-fam .rec-btn.pause{background:rgba(217,165,94,0.14);color:${WARN};border-color:rgba(217,165,94,0.3);}
.fpd-fam .rec-btn.resume{background:rgba(91,110,225,0.14);color:${ACCENT2};border-color:rgba(91,110,225,0.3);}
.fpd-fam .rec-btn.stop{background:rgba(208,107,107,0.14);color:${NEG};border-color:rgba(208,107,107,0.3);}
.fpd-fam .rec-done{display:flex;flex-direction:column;gap:16px;}
.fpd-fam .rec-donebadge{display:flex;align-items:center;gap:9px;padding:12px 16px;border-radius:12px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.24);color:${POS};font-size:13px;font-weight:600;}
.fpd-fam .recorder audio{width:100%;border-radius:10px;}
.fpd-fam .rec-savebar{display:flex;gap:10px;}
.fpd-fam .rec-save{flex:1;padding:13px;border-radius:12px;font-weight:700;font-size:14px;border:none;cursor:pointer;color:#fff;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);display:flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-body);}
.fpd-fam .rec-discard{padding:13px 18px;border-radius:12px;font-size:13px;font-weight:600;border:none;cursor:pointer;background:rgba(255,255,255,0.04);color:${MUTED};font-family:var(--font-body);}

/* pets */
.fpd-fam .petphotos{display:flex;gap:8px;padding:12px;overflow-x:auto;background:rgba(91,110,225,0.03);}
.fpd-fam .petphoto{width:100px;height:80px;object-fit:cover;border-radius:10px;flex-shrink:0;}
.fpd-fam .pethead{display:flex;align-items:center;gap:16px;}
.fpd-fam .petname{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-fam .petmeta{color:${MUTED};font-size:13px;margin-top:2px;}
.fpd-fam .petrow{display:flex;gap:16px;align-items:center;padding:12px 16px;border-radius:12px;margin-bottom:8px;}
.fpd-fam .petrow .nm{color:${TEXT};font-size:13px;}
.fpd-fam .petrow .ph{color:${MUTED};font-size:13px;}
.fpd-fam .instruction{padding:14px 16px;border-radius:12px;margin-bottom:8px;}
.fpd-fam .instruction .top{display:flex;gap:16px;margin-bottom:6px;}
.fpd-fam .instruction .nm{color:${TEXT};font-size:13px;font-weight:600;}
.fpd-fam .instruction .ph{color:${MUTED};font-size:13px;}
.fpd-fam .instruction .desc{color:${SOFT};font-size:13px;line-height:1.6;}
.fpd-fam .petdocs{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-fam .petdoc{padding:8px 13px;border-radius:11px;font-size:12.5px;cursor:pointer;background:rgba(91,110,225,0.08);color:${ACCENT2};border:1px solid rgba(91,110,225,0.18);font-family:var(--font-body);}

/* modal (shared pattern) */
.fpd-fam .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-fam .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-fam .modal.wide{max-width:580px;}
.fpd-fam .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);position:sticky;top:0;background:#0D1421;z-index:2;}
.fpd-fam .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-fam .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-fam .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-fam .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-fam .field input,.fpd-fam .field select,.fpd-fam .field textarea,.fpd-fam .fin{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-fam .field input::placeholder,.fpd-fam .field textarea::placeholder,.fpd-fam .fin::placeholder{color:${FAINT};}
.fpd-fam .field input:focus,.fpd-fam .field select:focus,.fpd-fam .field textarea:focus,.fpd-fam .fin:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-fam .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);position:sticky;bottom:0;background:#0D1421;}
.fpd-fam .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-fam .modal-foot .save:hover{filter:brightness(1.08);}

/* pet form sections */
.fpd-fam .pfsection .st{font-weight:700;font-size:15px;color:${TEXT};margin-bottom:12px;font-family:var(--font-display);}
.fpd-fam .pfrow{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
.fpd-fam .pfaddwrap{display:flex;justify-content:flex-end;}
.fpd-fam .dropzone{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:26px;border-radius:14px;border:2px dashed rgba(91,110,225,0.3);background:rgba(91,110,225,0.03);cursor:pointer;color:inherit;}
.fpd-fam .dropzone .dt{color:${TEXT};font-weight:600;font-size:14px;}
.fpd-fam .dropzone .ds{color:${MUTED};font-size:12px;}
.fpd-fam .dropzone.sm{padding:18px;}
.fpd-fam .pfthumbs{display:flex;gap:8px;margin-top:12px;overflow-x:auto;padding-bottom:2px;}
.fpd-fam .pfthumb{position:relative;flex-shrink:0;}
.fpd-fam .pfthumb img{width:72px;height:60px;object-fit:cover;border-radius:8px;}
.fpd-fam .pfremove{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:${NEG};color:#fff;border:none;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;line-height:1;}
.fpd-fam .pfdocs{display:flex;flex-wrap:wrap;gap:7px;}
.fpd-fam .pfdoc{padding:5px 10px;border-radius:7px;font-size:11.5px;background:rgba(91,110,225,0.08);color:${ACCENT2};}

/* universal add modal — staged photo/video preview */
.fpd-fam .stagethumbs{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-fam .stagethumb{position:relative;}
.fpd-fam .stagethumb img{width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.22);}
.fpd-fam .stageremove{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#0D1421;border:1px solid rgba(255,255,255,0.22);color:${MUTED};display:flex;align-items:center;justify-content:center;cursor:pointer;}
.fpd-fam .stagedrop{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:11px;background:rgba(91,110,225,0.06);border:1px dashed rgba(91,110,225,0.35);color:${ACCENT2};font-size:13px;cursor:pointer;font-family:var(--font-body);}
.fpd-fam .stagevideo{width:100%;border-radius:12px;background:#000;}
.fpd-fam .stagevideorow{display:flex;align-items:center;gap:10px;}
.fpd-fam .stagevideorow .nm{color:${MUTED};font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`;

export function FamilyMemories() {
  const [tab, setTab] = useState<Tab>("memories");
  const [memoriesList, setMemoriesList] = useState(photoMemories);
  const [videoList, setVideoList] = useState(videoMemories);
  const [audioList, setAudioList] = useState(audioMemories);

  // ── Photo upload / scan staging ─────────────────────────────────────
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function stagePhotos(files: FileList | null) {
    const images = Array.from(files || []).filter(f => f.type.startsWith("image/"));
    if (!images.length) { toast.error("Please choose image files"); return; }
    setPendingPhotos(p => [...p, ...images.map(f => URL.createObjectURL(f))]);
    setShowAdd("memories");
    toast.success(`${images.length} photo${images.length > 1 ? "s" : ""} ready — give this memory a title`);
  }

  function clearPendingPhotos() {
    pendingPhotos.forEach(URL.revokeObjectURL);
    setPendingPhotos([]);
  }

  // ── Video upload staging ────────────────────────────────────────────
  const [pendingVideo, setPendingVideo] = useState<{ url:string; name:string } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function stageVideo(files: FileList | null) {
    const file = Array.from(files || []).find(f => f.type.startsWith("video/"));
    if (!file) { toast.error("Please choose a video file"); return; }
    if (pendingVideo) URL.revokeObjectURL(pendingVideo.url);
    const url = URL.createObjectURL(file);
    setPendingVideo({ url, name: file.name });
    setForm(p => ({ ...p, title: p.title || file.name.replace(/\.[^.]+$/, "") }));
    setShowAdd("messages");
    toast.success(`"${file.name}" ready — add the details to save it`);
  }

  /* Read the real running time off the file once it is in the list. */
  function probeDuration(url: string, id: number) {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const s = Math.round(el.duration || 0);
      if (!s || !isFinite(s)) return;
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      const dur = h
        ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
        : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
      setVideoList(p => p.map(v => v.id === id ? { ...v, duration: dur } : v));
    };
    el.src = url;
  }

  // ── Audio Recorder state ────────────────────────────────────────────
  const [recState, setRecState] = useState<"idle"|"recording"|"paused"|"done">("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const [recTitle, setRecTitle] = useState("");
  const [recRecipient, setRecRecipient] = useState("");
  const [recDesc, setRecDesc] = useState("");
  const [recBlob, setRecBlob] = useState<Blob|null>(null);
  const [recUrl, setRecUrl] = useState<string|null>(null);
  const [micError, setMicError] = useState<string|null>(null);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const streamRef = useRef<MediaStream|null>(null);

  function startTimer() {
    timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  }

  async function startRecording() {
    setMicError(null);
    setRecBlob(null); setRecUrl(null); setRecSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type:"audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecBlob(blob); setRecUrl(url);
        setRecState("done");
      };
      mr.start();
      setRecState("recording");
      startTimer();
    } catch {
      setMicError("Microphone access denied. Please allow microphone permission in your browser.");
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      setRecState("paused");
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      setRecState("recording");
    }
  }

  function stopRecording() {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
  }

  function saveAudioMemory() {
    if (!recTitle.trim()) { toast.error("Please enter a title for the recording"); return; }
    const duration = formatTime(recSeconds);
    setAudioList(p => [...p, {
      id: Date.now(),
      title: recTitle,
      recipient: recRecipient || "Family",
      duration,
      recorded: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      description: recDesc || `Audio memory — ${duration}`,
      url: recUrl || undefined,   // kept so it plays back from the list
    }]);
    toast.success(`"${recTitle}" saved to Audio Memories`);
    // cleanup — the blob URL stays alive for playback in the list
    setRecState("idle"); setRecTitle(""); setRecRecipient(""); setRecDesc("");
    setRecBlob(null); setRecUrl(null); setRecSeconds(0);
  }

  function discardRecording() {
    if (recUrl) URL.revokeObjectURL(recUrl);
    setRecState("idle"); setRecBlob(null); setRecUrl(null); setRecSeconds(0);
  }
  const [kidsList, setKidsList] = useState(kidsActivities);
  const [keepsakesList, setKeepsakesList] = useState(keepsakes);
  const [goalsList, setGoalsList] = useState(goals);
  const [awardsList, setAwardsList] = useState(awards);
  const [petsList, setPetsList] = useState<PetRecord[]>(pets);
  const [showAdd, setShowAdd] = useState<Tab|null>(null);
  const [showPetForm, setShowPetForm] = useState(false);
  const [expandedPet, setExpandedPet] = useState<number|null>(1);

  /* Closing without saving drops any staged media so blob URLs don't leak. */
  function closeAddModal() {
    clearPendingPhotos();
    if (pendingVideo) { URL.revokeObjectURL(pendingVideo.url); setPendingVideo(null); }
    setShowAdd(null); setForm({});
  }

  useEscapeKey(showAdd !== null || showPetForm, () => { closeAddModal(); setShowPetForm(false); });

  // Pet form state matching screenshot fields exactly
  const [petPhotos, setPetPhotos] = useState<string[]>([]);
  const [petCaretakers, setPetCaretakers] = useState<PetCaretaker[]>([{name:"",phone:""}]);
  const [petProviders, setPetProviders] = useState<PetProvider[]>([{name:"",phone:""}]);
  const [petInstructions, setPetInstructions] = useState<PetInstruction[]>([{name:"",phone:"",description:""}]);
  const [petAbout, setPetAbout] = useState({name:"",dateOfBirth:"",gender:"",breed:"",colour:""});
  const [petDocs, setPetDocs] = useState<string[]>([]);
  const [petMedHistory, setPetMedHistory] = useState("");
  const [petVaccinations, setPetVaccinations] = useState<PetVaccination[]>([{type:"",date:""}]);
  const [petVet, setPetVet] = useState({vetName:"",vetPhone:"",vetEmail:""});
  const [petFeedings, setPetFeedings] = useState<PetFeeding[]>([{foodType:"",timeType:"Morning",quantity:"",locationOfFood:""}]);
  const petPhotoRef = useRef<HTMLInputElement>(null);

  function resetPetForm() {
    setPetPhotos([]); setPetCaretakers([{name:"",phone:""}]); setPetProviders([{name:"",phone:""}]);
    setPetInstructions([{name:"",phone:"",description:""}]); setPetAbout({name:"",dateOfBirth:"",gender:"",breed:"",colour:""});
    setPetDocs([]); setPetMedHistory(""); setPetVaccinations([{type:"",date:""}]);
    setPetVet({vetName:"",vetPhone:"",vetEmail:""}); setPetFeedings([{foodType:"",timeType:"Morning",quantity:"",locationOfFood:""}]);
  }

  function savePetRecord() {
    if (!petAbout.name) { toast.error("Pet name required"); return; }
    const rec: PetRecord = {
      id: Date.now(), photos: petPhotos,
      caretakers: petCaretakers.filter(c=>c.name.trim()),
      providers: petProviders.filter(p=>p.name.trim()),
      instructions: petInstructions.filter(i=>i.description.trim()||i.name.trim()),
      ...petAbout, documents: petDocs,
      medicalHistory: petMedHistory,
      vaccinations: petVaccinations.filter(v=>v.type.trim()),
      ...petVet,
      feedings: petFeedings.filter(f=>f.foodType.trim()),
    };
    setPetsList(p=>[...p, rec]);
    toast.success(`${petAbout.name} added to Pet Records`);
    resetPetForm(); setShowPetForm(false);
  }
  const [form, setForm] = useState<Record<string,string>>({});
  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function quickAdd() {
    switch(showAdd) {
      case "memories": {
        if (!form.title) { toast.error("Title required"); return; }
        setMemoriesList(p=>[...p,{id:Date.now(),title:form.title,date:form.date||new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),description:form.desc||"",tags:(form.tags||"").split(",").map(t=>t.trim()).filter(Boolean),photos:pendingPhotos,count:pendingPhotos.length}]);
        toast.success(pendingPhotos.length
          ? `"${form.title}" saved — ${pendingPhotos.length} photo${pendingPhotos.length>1?"s":""}`
          : `"${form.title}" added to Photo Memories`);
        setPendingPhotos([]);   // ownership passes to the saved memory
        break;
      }
      case "messages": {
        if (!form.title) { toast.error("Title required"); return; }
        const id = Date.now();
        setVideoList(p=>[...p,{id,title:form.title,filmed:form.filmed||"Unknown",duration:pendingVideo?"…":"—",added:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),description:form.desc||"",source:form.source||(pendingVideo?"Uploaded file":"Added manually"),url:pendingVideo?.url}]);
        if (pendingVideo) probeDuration(pendingVideo.url, id);
        toast.success(`"${form.title}" added to Video Memories`);
        setPendingVideo(null);  // ownership passes to the saved memory
        break;
      }
      case "audio":
        if (!form.title) { toast.error("Title required"); return; }
        setAudioList(p=>[...p,{id:Date.now(),title:form.title,recipient:form.recipient||"Family",duration:"0:00",recorded:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),description:form.desc||""}]);
        toast.success(`"${form.title}" added to Audio Memories`); break;
      case "kids":
        if (!form.name) { toast.error("Name required"); return; }
        setKidsList(p=>[...p,{id:Date.now(),child:form.name,activities:(form.activities||"").split(",").map(t=>t.trim()).filter(Boolean),school:form.school||"",notes:form.notes||""}]);
        toast.success(`${form.name} added`); break;
      case "keepsakes":
        if (!form.item) { toast.error("Item name required"); return; }
        setKeepsakesList(p=>[...p,{id:Date.now(),item:form.item,location:form.location||"—",value:form.value||"Sentimental",intendedFor:form.intendedFor||"",story:form.story||""}]);
        toast.success(`"${form.item}" added to Keepsakes`); break;
      case "goals":
        if (!form.goal) { toast.error("Goal description required"); return; }
        setGoalsList(p=>[...p,{id:Date.now(),goal:form.goal,status:"in_progress",progress:Number(form.progress)||0,notes:form.notes||""}]);
        toast.success("Goal added"); break;
      case "awards":
        if (!form.award) { toast.error("Award name required"); return; }
        setAwardsList(p=>[...p,{id:Date.now(),award:form.award,year:form.year||String(new Date().getFullYear()),organization:form.org||"",category:form.category||"Other",description:form.desc||""}]);
        toast.success(`"${form.award}" added`); break;
      case "pets":
        // Handled by dedicated PetForm modal below
        break;
    }
    setForm({});
    setShowAdd(null);
  }

  const addFields: Record<Tab, {key:string;label:string;ph:string;type?:string}[]> = {
    memories:  [{key:"title",label:"Title *",ph:"e.g. Christmas 2025"},{key:"date",label:"Date Taken",ph:"e.g. Dec 25, 2025"},{key:"desc",label:"Description",ph:"What happened?"},{key:"tags",label:"Tags (comma-separated)",ph:"family, holiday"}],
    messages:  [{key:"title",label:"Video Title *",ph:"e.g. Christmas Morning 1994"},{key:"filmed",label:"When It Was Filmed",ph:"e.g. Dec 25, 1994"},{key:"source",label:"Source",ph:"e.g. Digitized VHS tape"},{key:"desc",label:"Description",ph:"What's on this video"}],
    audio:     [{key:"title",label:"Audio Memory Title *",ph:"e.g. Life Advice for Michael"},{key:"recipient",label:"For",ph:"e.g. Michael Doe (Son)"},{key:"desc",label:"Description",ph:"What this recording covers"}],
    kids:      [{key:"name",label:"Child's Name & Relation *",ph:"e.g. Tyler Doe (Grandson, age 8)"},{key:"school",label:"School",ph:""},{key:"activities",label:"Activities (comma-separated)",ph:"Baseball, Swimming"},{key:"notes",label:"Notes",ph:""}],
    keepsakes: [{key:"item",label:"Item Name *",ph:"e.g. Grandfather's Watch"},{key:"location",label:"Where It Is",ph:""},{key:"value",label:"Value",ph:"e.g. Sentimental / ~$500"},{key:"intendedFor",label:"Intended For",ph:""},{key:"story",label:"Story / Significance",ph:"Why this item matters"}],
    goals:     [{key:"goal",label:"Goal *",ph:"e.g. Pay off mortgage"},{key:"progress",label:"Current Progress (%)",ph:"0"},{key:"notes",label:"Notes",ph:""}],
    awards:    [{key:"award",label:"Award Name *",ph:""},{key:"year",label:"Year",ph:String(new Date().getFullYear())},{key:"org",label:"Organization",ph:""},{key:"category",label:"Category",ph:"e.g. Military, Professional"},{key:"desc",label:"Description",ph:""}],
    pets: [], // pets use dedicated PetForm modal
  };

  const tabs = [
    { id: "memories" as Tab, label: "Photo Memories", icon: <Camera size={14} /> },
    { id: "messages" as Tab, label: "Video Memories", icon: <Video size={14} /> },
    { id: "audio" as Tab,    label: "Audio Memories", icon: <Mic size={14} /> },
    { id: "kids" as Tab, label: "Kids & Family", icon: <Heart size={14} /> },
    { id: "keepsakes" as Tab, label: "Keepsakes", icon: <Star size={14} /> },
    { id: "goals" as Tab, label: "Goals", icon: <Target size={14} /> },
    { id: "awards" as Tab, label: "Awards", icon: <Trophy size={14} /> },
    { id: "pets" as Tab, label: "Pets", icon: <PawPrint size={14} /> },
  ];

  const familyRecordsCount = kidsList.length + keepsakesList.length + goalsList.length + awardsList.length + petsList.length;
  const kpis = [
    { label: "Photo Memories", value: String(memoriesList.length), sub: "Moments preserved", icon: <Camera size={14} />, dot: ACCENT2 },
    { label: "Video Memories", value: String(videoList.length), sub: "Home movies & clips", icon: <Video size={14} />, dot: ACCENT2 },
    { label: "Audio Recordings", value: String(audioList.length), sub: "In your own voice", icon: <Mic size={14} />, dot: ACCENT2 },
    { label: "Family Records", value: String(familyRecordsCount), sub: "Kids, keepsakes, goals, awards & pets", icon: <Heart size={14} />, dot: POS },
  ];

  return (
    <div className="fpd-fam">
      <style dangerouslySetInnerHTML={{ __html: FAM_CSS }} />
      <div className="fpd-fam-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Heart size={12} /> Family &amp; Legacy</div>
          <h1 className="pg-h1">Family &amp; Memories</h1>
          <div className="pg-sub">Preserve your stories, messages, keepsakes, and the things that matter most.</div>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Segmented tabs ── */}
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Photo Memories ── */}
        {tab === "memories" && (
          <div className="stack">
            <div className="toolbar">
              <p>Upload photos from your phone or computer, or scan in old prints with your camera.</p>
              <div className="actions">
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { stagePhotos(e.target.files); e.target.value = ""; }}/>
                <button className="btn-primary" onClick={()=>photoInputRef.current?.click()}>
                  <Upload size={14} /> Upload Photos
                </button>
                <ScanButton folder="memories" label="Scan Photo"
                  onUpload={doc => {
                    setPendingPhotos(p => [...p, doc.previewUrl]);
                    setForm(p => ({ ...p, title: p.title || doc.name.replace(/\.[^.]+$/, "") }));
                    setShowAdd("memories");
                    toast.success("Scan added — give this memory a title");
                  }}/>
                <button className="btn-sec" onClick={()=>setShowAdd("memories")}><Plus size={14} /> Add Memory</button>
              </div>
            </div>
            <div className="mgrid">
              {memoriesList.map(m => {
                const total = m.photos.length || m.count;
                return (
                <div key={m.id} className="card pad glow-surface">
                  <div className="r-top" style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Camera size={16} color={ACCENT2} />
                      <span className="r-sub">{m.date}</span>
                    </div>
                    <span className="pill" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{total} photo{total === 1 ? "" : "s"}</span>
                  </div>
                  {m.photos.length > 0 && (
                    <div className="thumbs" style={{ marginBottom: 12 }}>
                      {m.photos.slice(0,4).map((src,i) => (
                        <img key={i} className="thumb" src={src} alt=""/>
                      ))}
                      {m.photos.length > 4 && (
                        <div className="thumb-more">+{m.photos.length - 4}</div>
                      )}
                    </div>
                  )}
                  <div className="r-title">{m.title}</div>
                  <div className="r-desc">{m.description}</div>
                  <div className="chiprow" style={{ marginTop: 12 }}>
                    {m.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* ── Video Memories ── */}
        {tab === "messages" && (
          <div className="stack">
            <div className="toolbar">
              <p>
                Upload the videos you already have — home movies, phone clips, digitized VHS and camcorder tapes.
                To record a new message for someone, use <span style={{ color: ACCENT2 }}>Messages to Loved Ones</span>.
              </p>
              <div className="actions">
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                  onChange={e => { stageVideo(e.target.files); e.target.value = ""; }}/>
                <button className="btn-primary" onClick={()=>videoInputRef.current?.click()}><Upload size={14} /> Upload Video</button>
                <button className="btn-sec" onClick={()=>setShowAdd("messages")}><Plus size={14} /> Add Details Only</button>
              </div>
            </div>
            <div className="stack">
              {videoList.map(vid => (
                <div key={vid.id} className="card pad glow-surface">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {vid.url ? (
                      <video src={vid.url} controls preload="metadata"
                        style={{ width: 168, borderRadius: 12, background: "#000", flexShrink: 0 }}/>
                    ) : (
                      <button className="vplay" onClick={() => toast.success(`▶ Playing: ${vid.title}`)}>
                        <Play size={22} color={ACCENT2} />
                      </button>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="r-title">{vid.title}</div>
                      <div className="r-sub accent" style={{ marginBottom: 4 }}>Filmed: {vid.filmed}</div>
                      <div className="r-desc">{vid.description}</div>
                      <div className="r-meta">
                        <span className="mono">{vid.duration}</span>
                        <span className="txt">{vid.source}</span>
                        <span className="txt">Added {vid.added}</span>
                        <span className="pill" style={{ background: "rgba(95,190,145,0.14)", color: POS, marginLeft: "auto" }}>SECURED</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Audio Memories ── */}
        {tab === "audio" && (
          <div className="stack">
            <p className="pg-sub">Record memories in your own voice — stories, life advice, family history, songs. Kept private in your vault and passed down to the people you choose.</p>

            {/* ── Recorder ─────────────────────────────────────────────── */}
            <div className="recorder glow-surface">
              <div className="rec-eyebrow"><Mic size={13} /> Audio Memory Recorder</div>

              {/* Mic error */}
              {micError && (
                <div className="rec-error">{micError}</div>
              )}

              {/* Idle — prompt to record */}
              {recState === "idle" && !recBlob && (
                <div className="rec-idle">
                  <div className="rec-orb">
                    <Mic size={36} color={ACCENT2}/>
                  </div>
                  <div className="rec-hint">
                    Press Record to start capturing your audio memory.<br/>Your microphone will be activated.
                  </div>
                  <button onClick={startRecording} className="rec-startbtn">
                    <Circle size={14} color={NEG} fill={NEG}/> Record
                  </button>
                </div>
              )}

              {/* Recording / Paused */}
              {(recState === "recording" || recState === "paused") && (
                <div className="rec-live">
                  {/* Animated indicator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="dot" style={{ animation:recState==="recording"?"pulse 1s ease-in-out infinite":"none", opacity:recState==="recording"?1:0.4 }}/>
                    <span className="rec-time">
                      {formatTime(recSeconds)}
                    </span>
                    <span className="rec-status" style={{ color:recState==="recording"?NEG:WARN }}>
                      {recState==="recording" ? "● REC" : "⏸ PAUSED"}
                    </span>
                  </div>

                  {/* Waveform animation (CSS) */}
                  {recState === "recording" && (
                    <div className="rec-wave">
                      {Array.from({length:20}).map((_,i)=>(
                        <i key={i} style={{ animation:`pulse ${0.4+Math.random()*0.6}s ease-in-out ${i*0.05}s infinite alternate`, height:`${20+Math.floor(Math.random()*60)}%` }}/>
                      ))}
                    </div>
                  )}

                  {/* Controls */}
                  <div className="rec-controls">
                    {recState === "recording" ? (
                      <button onClick={pauseRecording} className="rec-btn pause">
                        <Pause size={14}/> Pause
                      </button>
                    ) : (
                      <button onClick={resumeRecording} className="rec-btn resume">
                        <Mic size={14}/> Resume
                      </button>
                    )}
                    <button onClick={stopRecording} className="rec-btn stop">
                      <Square size={14}/> Stop &amp; Save
                    </button>
                  </div>
                </div>
              )}

              {/* Done — preview and save */}
              {recState === "done" && recUrl && (
                <div className="rec-done">
                  <div className="rec-donebadge">
                    <Volume2 size={16}/>
                    <span>Recording complete — {formatTime(recSeconds)}</span>
                  </div>

                  {/* Native audio player */}
                  <audio src={recUrl} controls/>

                  {/* Title + recipient + desc */}
                  {[
                    { label:"Memory Title *", val:recTitle, setter:setRecTitle, ph:"e.g. Life Advice for Michael" },
                    { label:"For", val:recRecipient, setter:setRecRecipient, ph:"e.g. Michael Doe (Son)" },
                    { label:"Description", val:recDesc, setter:setRecDesc, ph:"What this recording is about" },
                  ].map(f => (
                    <div className="field" key={f.label}>
                      <label>{f.label.toUpperCase()}</label>
                      <input value={f.val} onChange={e=>f.setter(e.target.value)} placeholder={f.ph}/>
                    </div>
                  ))}

                  <div className="rec-savebar">
                    <button onClick={saveAudioMemory} className="rec-save">
                      <Volume2 size={14}/> Save Audio Memory
                    </button>
                    <button onClick={discardRecording} className="rec-discard">
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Saved audio messages ──────────────────────────────────── */}
            {audioList.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>SAVED AUDIO MEMORIES ({audioList.length})</div>
                <div className="stack">
                  {audioList.map(msg => (
                    <div key={msg.id} className="card pad glow-surface">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        <div className="r-icon"><Volume2 size={22}/></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="r-title">{msg.title}</div>
                          <div className="r-sub accent" style={{ marginBottom: 4 }}>For: {msg.recipient}</div>
                          <div className="r-desc">{msg.description}</div>
                          {msg.url && <audio src={msg.url} controls style={{ marginTop:10 }}/>}
                          <div className="r-meta">
                            <span className="mono">{msg.duration}</span>
                            <span className="txt">Recorded {msg.recorded}</span>
                            {!msg.url && (
                              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}
                                onClick={() => toast.success(`▶ Playing: ${msg.title}`)}>
                                <Play size={11}/> Play
                              </button>
                            )}
                            <span className="pill" style={{ background: "rgba(95,190,145,0.14)", color: POS, marginLeft: "auto" }}>SECURED</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Kids & Family ── */}
        {tab === "kids" && (
          <div className="stack">
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={()=>setShowAdd("kids")}><Plus size={14} /> Add Child</button>
            </div>
            {kidsList.map(kid => (
              <div key={kid.id} className="card pad glow-surface">
                <div className="r-title" style={{ fontSize: 17 }}>{kid.child}</div>
                <div className="r-sub" style={{ marginBottom: 12 }}>School: {kid.school}</div>
                <div style={{ marginBottom: 12 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Activities</div>
                  <div className="chiprow">
                    {kid.activities.map(a => <span key={a} className="tag" style={{ padding: "7px 12px", fontSize: 13 }}>{a}</span>)}
                  </div>
                </div>
                {kid.notes && <div className="tile"><span className="tv">Notes: {kid.notes}</span></div>}
              </div>
            ))}
          </div>
        )}

        {/* ── Keepsakes ── */}
        {tab === "keepsakes" && (
          <div className="stack">
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={()=>setShowAdd("keepsakes")}><Plus size={14} /> Add Keepsake</button>
            </div>
            {keepsakesList.map(k => (
              <div key={k.id} className="card pad glow-surface">
                <div className="r-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="r-title">{k.item}</div>
                    <div className="r-sub accent" style={{ marginBottom: 8 }}>→ {k.intendedFor}</div>
                    <div className="r-grid">
                      {[{ label: "Location", value: k.location }, { label: "Estimated Value", value: k.value }].map(f => (
                        <div key={f.label} className="tile">
                          <div className="tk">{f.label}</div>
                          <div className="tv">{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ color: SOFT, fontSize: 13, fontStyle: "italic", lineHeight: 1.6 }}>"{k.story}"</div>
                  </div>
                  <button style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Goals ── */}
        {tab === "goals" && (
          <div className="stack">
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={()=>setShowAdd("goals")}><Plus size={14} /> Add Goal</button>
            </div>
            {goalsList.map(g => {
              const s = statusStyles[g.status as keyof typeof statusStyles];
              return (
                <div key={g.id} className="card pad glow-surface">
                  <div className="r-top" style={{ marginBottom: 12 }}>
                    <div style={{ color: TEXT, fontSize: 15, fontWeight: 500 }}>{g.goal}</div>
                    <span className="pill" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span className="r-sub">Progress</span>
                      <span className="mono" style={{ color: s.color, fontSize: 12 }}>{g.progress}%</span>
                    </div>
                    <div className="pbar"><i style={{ width: `${g.progress}%`, background: s.color }} /></div>
                  </div>
                  {g.notes && <div className="r-sub" style={{ marginTop: 6 }}>{g.notes}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Awards ── */}
        {tab === "awards" && (
          <div className="stack">
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={()=>setShowAdd("awards")}><Plus size={14} /> Add Award</button>
            </div>
            {awardsList.map(a => (
              <div key={a.id} className="card pad glow-surface">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div className="r-icon"><Trophy size={20} /></div>
                  <div>
                    <div className="r-title">{a.award}</div>
                    <div className="r-sub">{a.organization} · {a.year}</div>
                    <div style={{ marginTop: 8 }}>
                      <span className="tag" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{a.category}</span>
                    </div>
                    {a.description && <div className="r-desc" style={{ marginTop: 6 }}>{a.description}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pets ── */}
        {tab === "pets" && (
          <div className="stack">
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={()=>setShowPetForm(true)}>
                <Plus size={14}/> Add Pet Record
              </button>
            </div>

            {petsList.map(pet => (
              <div key={pet.id} className="card glow-surface" style={{ overflow: "hidden" }}>
                {/* Photos */}
                {pet.photos.length > 0 && (
                  <div className="petphotos">
                    {pet.photos.map((url,i) => (
                      <img key={i} className="petphoto" src={url} alt=""/>
                    ))}
                  </div>
                )}

                <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Header */}
                  <div className="pethead">
                    <div className="r-icon" style={{ width: 52, height: 52, borderRadius: 16 }}><PawPrint size={24}/></div>
                    <div>
                      <div className="petname">{pet.name}</div>
                      <div className="petmeta">{pet.breed} · {pet.gender} · {pet.colour} · Born {pet.dateOfBirth}</div>
                    </div>
                  </div>

                  {/* Emergency Pet Caretakers */}
                  {pet.caretakers.length > 0 && (
                    <div>
                      <h3 className="sec-title"><span className="tick"/>Emergency Pet Caretaker</h3>
                      {pet.caretakers.map((c,i) => (
                        <div key={i} className="petrow tile neg">
                          <span className="nm">{c.name}</span>
                          <span className="ph">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Long Term Pet Provider */}
                  {pet.providers.length > 0 && (
                    <div>
                      <h3 className="sec-title"><span className="tick"/>Long Term Pet Provider</h3>
                      {pet.providers.map((p,i) => (
                        <div key={i} className="petrow tile info">
                          <span className="nm">{p.name}</span>
                          <span className="ph">{p.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special Care Instructions */}
                  {pet.instructions.length > 0 && (
                    <div>
                      <h3 className="sec-title"><span className="tick"/>Special Care Instructions</h3>
                      {pet.instructions.map((ins,i) => (
                        <div key={i} className="instruction tile warn">
                          <div className="top"><span className="nm">{ins.name}</span><span className="ph">{ins.phone}</span></div>
                          {ins.description && <div className="desc">{ins.description}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Health Info */}
                  <div>
                    <h3 className="sec-title"><span className="tick"/>Health Info</h3>
                    {pet.medicalHistory && (
                      <div className="tile" style={{ marginBottom: 12 }}>
                        <div className="tk">Medical History / Back Story</div>
                        <div className="tv">{pet.medicalHistory}</div>
                      </div>
                    )}
                    {pet.vaccinations.length > 0 && (
                      <div className="r-grid" style={{ margin: 0 }}>
                        {pet.vaccinations.map((v,i) => (
                          <div key={i} className="tile pos">
                            <div className="tk" style={{ color: POS }}>Vaccination</div>
                            <div className="tv">{v.type} · {v.date}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vet Info */}
                  <div>
                    <h3 className="sec-title"><span className="tick"/>Vet Info</h3>
                    <div className="r-grid c3" style={{ margin: 0 }}>
                      {[["Name",pet.vetName],["Phone",pet.vetPhone],["Email",pet.vetEmail]].map(([label,value])=>(
                        <div key={label} className="tile">
                          <div className="tk">{label}</div>
                          <div className="tv">{value||"—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feeding */}
                  {pet.feedings.length > 0 && (
                    <div>
                      <h3 className="sec-title"><span className="tick"/>Feeding</h3>
                      {pet.feedings.map((f,i) => (
                        <div key={i} className="r-grid c4" style={{ marginTop: 0, marginBottom: 8 }}>
                          {[["Food Type",f.foodType],["Time",f.timeType],["Quantity",f.quantity],["Location of Food",f.locationOfFood]].map(([label,value])=>(
                            <div key={label} className="tile">
                              <div className="tk">{label}</div>
                              <div className="tv">{value||"—"}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Documents */}
                  {pet.documents.length > 0 && (
                    <div className="petdocs">
                      {pet.documents.map(d=>(
                        <button key={d} className="petdoc" onClick={()=>toast.success(`Opening: ${d}`)}>📄 {d}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PET RECORDS FORM ──────────────────────────────────────── */}
        {showPetForm && (
          <div className="backdrop">
            <div className="card modal wide glow-surface">
              <div className="modal-head">
                <h3>Upload Pet Records</h3>
                <button onClick={()=>{ setShowPetForm(false); resetPetForm(); }}><X size={18}/></button>
              </div>
              <div className="modal-body">

                {/* Upload Images or Videos */}
                <div>
                  <button className="dropzone" onClick={()=>petPhotoRef.current?.click()}>
                    <ImageIcon size={32} color={ACCENT2}/>
                    <div className="dt">Upload Images or Videos</div>
                    <div className="ds">Minimum 1 Maximum 10 images or videos</div>
                  </button>
                  <input ref={petPhotoRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => {
                    const files = Array.from(e.target.files||[]).slice(0, 10 - petPhotos.length);
                    const urls = files.map(f => URL.createObjectURL(f));
                    setPetPhotos(p => [...p, ...urls].slice(0,10));
                    e.target.value = "";
                  }}/>
                  {petPhotos.length > 0 && (
                    <div className="pfthumbs">
                      {petPhotos.map((url,i)=>(
                        <div key={i} className="pfthumb">
                          <img src={url} alt=""/>
                          <button className="pfremove" onClick={()=>setPetPhotos(p=>p.filter((_,idx)=>idx!==i))}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Emergency Pet Caretaker */}
                <div className="pfsection">
                  <div className="st">Emergency Pet Caretaker</div>
                  {petCaretakers.map((c,i)=>(
                    <div key={i} className="pfrow">
                      <input className="fin" value={c.name} onChange={e=>setPetCaretakers(p=>p.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="Name"/>
                      <input className="fin" value={c.phone} onChange={e=>setPetCaretakers(p=>p.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x))} placeholder="🇺🇸 +1  Phone"/>
                    </div>
                  ))}
                  <div className="pfaddwrap"><button className="btn-mini" onClick={()=>setPetCaretakers(p=>[...p,{name:"",phone:""}])}><Plus size={12}/> Caretaker</button></div>
                </div>

                {/* Long Term Pet Provider */}
                <div className="pfsection">
                  <div className="st">Long Term Pet Provider</div>
                  {petProviders.map((p,i)=>(
                    <div key={i} className="pfrow">
                      <input className="fin" value={p.name} onChange={e=>setPetProviders(pr=>pr.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="Name"/>
                      <input className="fin" value={p.phone} onChange={e=>setPetProviders(pr=>pr.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x))} placeholder="🇺🇸 +1  Phone"/>
                    </div>
                  ))}
                  <div className="pfaddwrap"><button className="btn-mini" onClick={()=>setPetProviders(p=>[...p,{name:"",phone:""}])}><Plus size={12}/> Provider</button></div>
                </div>

                {/* Special Care Instruction */}
                <div className="pfsection">
                  <div className="st">Special Care Instruction</div>
                  {petInstructions.map((ins,i)=>(
                    <div key={i} className="pfrow">
                      <input className="fin" value={ins.name} onChange={e=>setPetInstructions(p=>p.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="Name"/>
                      <input className="fin" value={ins.phone} onChange={e=>setPetInstructions(p=>p.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x))} placeholder="🇺🇸 +1  Phone"/>
                      <textarea className="fin" value={ins.description} onChange={e=>setPetInstructions(p=>p.map((x,idx)=>idx===i?{...x,description:e.target.value}:x))} placeholder="Description" rows={3} style={{ resize: "none" }}/>
                    </div>
                  ))}
                  <div className="pfaddwrap"><button className="btn-mini" onClick={()=>setPetInstructions(p=>[...p,{name:"",phone:"",description:""}])}><Plus size={12}/> Instruction</button></div>
                </div>

                {/* About Your Beloved Pet */}
                <div className="pfsection">
                  <div className="st">About Your Beloved Pet</div>
                  <div className="pfrow">
                    <input className="fin" value={petAbout.name} onChange={e=>setPetAbout(p=>({...p,name:e.target.value}))} placeholder="Name"/>
                    <input className="fin" value={petAbout.dateOfBirth} onChange={e=>setPetAbout(p=>({...p,dateOfBirth:e.target.value}))} placeholder="Date of Birth"/>
                    <select className="fin" value={petAbout.gender} onChange={e=>setPetAbout(p=>({...p,gender:e.target.value}))}>
                      <option value="">Gender</option>
                      <option>Male</option><option>Female</option><option>Unknown</option>
                    </select>
                    <input className="fin" value={petAbout.breed} onChange={e=>setPetAbout(p=>({...p,breed:e.target.value}))} placeholder="Breed"/>
                    <input className="fin" value={petAbout.colour} onChange={e=>setPetAbout(p=>({...p,colour:e.target.value}))} placeholder="Colour"/>
                    {/* Upload Documents */}
                    <div className="dropzone sm">
                      <span style={{ fontSize: 28 }}>📄</span>
                      <div className="dt" style={{ fontSize: 13 }}>Upload Documents</div>
                      <div className="ds">Minimum 1 Maximum 10 documents</div>
                      <ScanButton folder="pets" onUpload={doc=>{ setPetDocs(p=>[...p,doc.name]); toast.success(`"${doc.name}" attached`); }} size="sm" label="Scan or Upload"/>
                    </div>
                    {petDocs.length > 0 && <div className="pfdocs">{petDocs.map(d=><span key={d} className="pfdoc">📄 {d}</span>)}</div>}
                  </div>
                </div>

                {/* Health Info */}
                <div className="pfsection">
                  <div className="st">Health Info</div>
                  <textarea className="fin" value={petMedHistory} onChange={e=>setPetMedHistory(e.target.value)} placeholder="Medical History Or Back Story On Your Pet" rows={4} style={{ resize: "none", marginBottom: 12 }}/>
                  {petVaccinations.map((v,i)=>(
                    <div key={i} className="r-grid" style={{ marginTop: 0, marginBottom: 8 }}>
                      <input className="fin" value={v.type} onChange={e=>setPetVaccinations(p=>p.map((x,idx)=>idx===i?{...x,type:e.target.value}:x))} placeholder="Vaccination Type"/>
                      <input className="fin" value={v.date} onChange={e=>setPetVaccinations(p=>p.map((x,idx)=>idx===i?{...x,date:e.target.value}:x))} placeholder="Vaccination Date"/>
                    </div>
                  ))}
                  <div className="pfaddwrap"><button className="btn-mini" onClick={()=>setPetVaccinations(p=>[...p,{type:"",date:""}])}><Plus size={12}/> Vaccination</button></div>
                </div>

                {/* Vet Info */}
                <div className="pfsection">
                  <div className="st">Vet Info</div>
                  <div className="pfrow">
                    <input className="fin" value={petVet.vetName} onChange={e=>setPetVet(p=>({...p,vetName:e.target.value}))} placeholder="Name"/>
                    <input className="fin" value={petVet.vetPhone} onChange={e=>setPetVet(p=>({...p,vetPhone:e.target.value}))} placeholder="🇺🇸 +1  Phone"/>
                    <input className="fin" value={petVet.vetEmail} onChange={e=>setPetVet(p=>({...p,vetEmail:e.target.value}))} placeholder="Email Address" type="email"/>
                  </div>
                </div>

                {/* Feeding */}
                <div className="pfsection">
                  <div className="st">Feeding</div>
                  {petFeedings.map((f,i)=>(
                    <div key={i} className="pfrow">
                      <input className="fin" value={f.foodType} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,foodType:e.target.value}:x))} placeholder="Food Type"/>
                      <select className="fin" value={f.timeType} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,timeType:e.target.value}:x))}>
                        {["Morning","Afternoon","Evening","Night","As Needed"].map(t=><option key={t}>{t}</option>)}
                      </select>
                      <input className="fin" value={f.quantity} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,quantity:e.target.value}:x))} placeholder="Quantity"/>
                      <input className="fin" value={f.locationOfFood} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,locationOfFood:e.target.value}:x))} placeholder="Location of Food"/>
                    </div>
                  ))}
                  <div className="pfaddwrap"><button className="btn-mini" onClick={()=>setPetFeedings(p=>[...p,{foodType:"",timeType:"Morning",quantity:"",locationOfFood:""}])}><Plus size={12}/> Food</button></div>
                </div>
              </div>

              {/* Upload / Save button */}
              <div className="modal-foot">
                <button className="save" onClick={savePetRecord}>Upload</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Universal Add Modal ── */}
        {showAdd && showAdd !== "pets" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>
                  Add {showAdd === "memories" ? "Photo Memory" : showAdd === "messages" ? "Video Memory" : showAdd === "audio" ? "Audio Memory" : showAdd === "kids" ? "Child / Family Member" : showAdd === "keepsakes" ? "Keepsake" : showAdd === "goals" ? "Goal" : showAdd === "awards" ? "Award" : "Pet"}
                </h3>
                <button onClick={closeAddModal}><X size={16}/></button>
              </div>
              <div className="modal-body">

                {/* Staged photos */}
                {showAdd === "memories" && (
                  <div>
                    {pendingPhotos.length > 0 && (
                      <div className="stagethumbs" style={{ marginBottom: 10 }}>
                        {pendingPhotos.map((src,i)=>(
                          <div key={i} className="stagethumb">
                            <img src={src} alt=""/>
                            <button className="stageremove" onClick={()=>{ URL.revokeObjectURL(src); setPendingPhotos(p=>p.filter((_,j)=>j!==i)); }}>
                              <X size={10}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="stagedrop" onClick={()=>photoInputRef.current?.click()}>
                      <ImageIcon size={14}/> {pendingPhotos.length ? "Add more photos" : "Attach photos"}
                    </button>
                  </div>
                )}

                {/* Staged video */}
                {showAdd === "messages" && (
                  pendingVideo ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <video src={pendingVideo.url} controls preload="metadata" className="stagevideo"/>
                      <div className="stagevideorow">
                        <span className="nm">{pendingVideo.name}</span>
                        <button className="btn-sec" onClick={()=>{ URL.revokeObjectURL(pendingVideo.url); setPendingVideo(null); }}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button className="stagedrop" onClick={()=>videoInputRef.current?.click()}>
                      <Upload size={14}/> Attach a video file
                    </button>
                  )
                )}

                {(addFields[showAdd]||[]).map(f=>(
                  <div key={f.key} className="field">
                    <label>{f.label.toUpperCase()}</label>
                    <input value={form[f.key]||""} onChange={F(f.key)} placeholder={f.ph}/>
                  </div>
                ))}
              </div>
              <div className="modal-foot">
                <button className="save" onClick={quickAdd}>Add</button>
                <button className="btn-sec" onClick={closeAddModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
