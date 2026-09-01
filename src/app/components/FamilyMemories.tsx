import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { Camera, Video, Star, Trophy, Target, Heart, Plus, Edit2, Trash2, Play, X, Upload, ImageIcon, Mic, Volume2, Square, Pause, Circle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { AttachDocumentField } from "./AttachDocumentField";
import { useDemo, type Memory } from "../context/DemoContext";
import heroFamilyPhoto from "../../imports/familymemories_hero_photo.png";

type Tab = "memories" | "messages" | "audio" | "kids" | "keepsakes" | "goals" | "awards";

/* Each of the 7 tabs is a filtered view over the single `memories` table
   (see DemoContext), keyed by Memory.type. Fields with no dedicated column
   are folded into `description` or `tags` per-type, as used below:
     photos    -> type "photo"    (tags = freeform hashtags, mediaUrl = the photo)
     messages  -> type "video"    (tags[0] = source, mediaUrl = the video)
     audio     -> type "audio"    (recipient = "for", mediaUrl = the recording)
     kids      -> type "note"     (childName = child, recipient = school, tags = activities)
     keepsakes -> type "keepsake" (recipient = intended-for, tags = [location, value], mediaUrl = photo)
     goals     -> type "goal"     (achieved = done y/n — no numeric progress column in the DB)
     awards    -> type "award"    (issuer = organization, tags[0] = category, childName = optional recipient) */

const statusStyles = {
  completed: { color: "#D99A6B", bg: "rgba(72,187,120,0.12)", label: "COMPLETED" },
  in_progress: { color: "#6E90C9", bg: "rgba(91,110,225,0.12)", label: "IN PROGRESS" },
};

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar,
   AI assistant, file cabinet, legacy vault, folders, final wishes & wills) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
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

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-fam .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-fam .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-fam .hbanner:hover .art{transform:scale(1.08);}
.fpd-fam .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-fam .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-fam .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-fam .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-fam .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-fam .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-fam .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-fam .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-fam .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-fam .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-fam .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-fam .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-fam .hbanner{min-height:auto;} .fpd-fam .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-fam .hbanner h1{font-size:29px;}}

.fpd-fam .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-fam .card.pad{padding:28px;}
.fpd-fam .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-fam .sec-title{font-size:18px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:14px;}
.fpd-fam .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});flex-shrink:0;}

/* header */
.fpd-fam .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-fam .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-fam .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-fam .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-fam .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-fam .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-fam .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-fam .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-fam .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:99px;background:rgba(95,190,145,0.12);color:#D99A6B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-fam .btn-pos:hover{background:rgba(95,190,145,0.2);}
.fpd-fam .btn-mini{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-fam .btn-mini:hover{filter:brightness(1.08);}

/* segmented tabs */
.fpd-fam .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-fam .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-fam .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* toolbar */
.fpd-fam .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-fam .toolbar p{color:${MUTED};font-size:16px;line-height:1.6;max-width:620px;margin:0;}
.fpd-fam .toolbar .actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

/* KPI ledger */
.fpd-fam .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-fam .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-fam .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-fam .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-fam .kpi-mini-txt{flex:1;min-width:0;}
.fpd-fam .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-fam .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-fam .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-fam .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-fam .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-fam .kpi-stack{grid-template-columns:1fr;}}

/* generic record-card parts, reused across every tab */
.fpd-fam .r-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
.fpd-fam .r-icon{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-fam .r-title{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-fam .r-sub{color:${MUTED};font-size:15.5px;}
.fpd-fam .r-sub.accent{color:#6FAE8B;}
.fpd-fam .r-desc{color:${MUTED};font-size:16px;line-height:1.6;}
.fpd-fam .r-grid{display:grid;grid-template-columns:repeat(2,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin:14px 0;}
.fpd-fam .r-grid.c3{grid-template-columns:repeat(3,1fr);}
.fpd-fam .r-grid.c4{grid-template-columns:repeat(4,1fr);}
.fpd-fam .r-grid:not(.c3):not(.c4) .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-grid:not(.c3):not(.c4) .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-grid.c3 .tile:nth-child(3n+2),.fpd-fam .r-grid.c3 .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-grid.c3 .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-grid.c4 .tile:nth-child(4n+2),.fpd-fam .r-grid.c4 .tile:nth-child(4n+3),.fpd-fam .r-grid.c4 .tile:nth-child(4n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-grid.c4 .tile:nth-child(n+5){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px;}
.fpd-fam .r-meta .mono{font-family:var(--font-mono);font-size:15px;color:${MUTED};}
.fpd-fam .r-meta .txt{font-size:15px;color:${MUTED};}
@media (max-width:900px){
.fpd-fam .r-grid,.fpd-fam .r-grid.c3,.fpd-fam .r-grid.c4{grid-template-columns:1fr 1fr;}
.fpd-fam .r-grid.c3 .tile:nth-child(3n+2),.fpd-fam .r-grid.c3 .tile:nth-child(3n){border-left:none;}
.fpd-fam .r-grid.c4 .tile:nth-child(4n+2),.fpd-fam .r-grid.c4 .tile:nth-child(4n+3),.fpd-fam .r-grid.c4 .tile:nth-child(4n){border-left:none;}
.fpd-fam .r-grid.c3 .tile:nth-child(2n),.fpd-fam .r-grid.c4 .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-fam .r-grid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
}

.fpd-fam .pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-fam .chiprow{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-fam .tag{display:inline-block;padding:4px 10px;border-radius:7px;font-size:14.5px;font-weight:500;background:rgba(91,110,225,0.12);color:#6FAE8B;}

.fpd-fam .tile{padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-fam .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-fam .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
.fpd-fam .tile.warn{background:rgba(217,165,94,0.06);border-color:rgba(217,165,94,0.2);}
.fpd-fam .tile.neg{background:rgba(208,107,107,0.06);border-color:rgba(208,107,107,0.2);}
.fpd-fam .tile.info{background:rgba(91,110,225,0.06);border-color:rgba(91,110,225,0.2);}
.fpd-fam .tile.pos{background:rgba(95,190,145,0.07);border-color:rgba(95,190,145,0.2);}

/* photo thumbnails */
.fpd-fam .thumbs{display:flex;gap:6px;flex-wrap:wrap;}
.fpd-fam .thumb{width:56px;height:56px;object-fit:cover;border-radius:16px;border:1px solid rgba(255,255,255,0.08);}
.fpd-fam .thumb-more{width:56px;height:56px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:${MUTED};font-size:15px;}

/* photo frame (keepsakes / awards) */
.fpd-fam .photo-frame{position:relative;background:#0F1624;border-bottom:1px solid rgba(255,255,255,0.08);overflow:hidden;}
.fpd-fam .photo-frame img{width:100%;height:100%;object-fit:cover;display:block;}

/* video card */
.fpd-fam .vplay{width:52px;height:52px;border-radius:16px;background:rgba(91,110,225,0.1);border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;}

/* grids of cards */
.fpd-fam .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media (max-width:900px){.fpd-fam .mgrid{grid-template-columns:1fr;}}
.fpd-fam .stack{display:flex;flex-direction:column;gap:14px;}

/* progress bar (goals) */
.fpd-fam .pbar{height:8px;border-radius:99px;background:rgba(255,255,255,0.06);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);}
.fpd-fam .pbar i{display:block;height:100%;border-radius:99px;transition:width .4s cubic-bezier(.4,0,.2,1);}

/* recorder panel — wraps the real getUserMedia/MediaRecorder UI; JS untouched */
.fpd-fam .recorder{background:linear-gradient(180deg,rgba(91,110,225,0.08) 0%,rgba(91,110,225,0.02) 100%);border:1px solid rgba(91,110,225,0.22);border-radius:16px;padding:24px;}
.fpd-fam .recorder .rec-eyebrow{font-size:13.5px;font-weight:600;color:#6FAE8B;display:flex;align-items:center;gap:7px;margin-bottom:18px;}
.fpd-fam .rec-error{padding:12px 16px;border-radius:16px;background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.24);color:${NEG};font-size:16px;margin-bottom:16px;}
.fpd-fam .rec-idle{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0;}
.fpd-fam .rec-orb{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.12);border:2px solid rgba(91,110,225,0.28);}
.fpd-fam .rec-hint{color:${MUTED};font-size:16px;text-align:center;line-height:1.6;}
.fpd-fam .rec-startbtn{display:inline-flex;align-items:center;gap:9px;padding:13px 30px;border-radius:18px;font-weight:700;font-size:17.5px;border:none;cursor:pointer;color:#fff;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);box-shadow:0 10px 28px -10px rgba(91,110,225,0.7);font-family:var(--font-body);}
.fpd-fam .rec-live{display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0;}
.fpd-fam .rec-live .dot{width:11px;height:11px;border-radius:50%;background:${NEG};}
.fpd-fam .rec-time{font-family:var(--font-mono);font-size:40.5px;color:${TEXT};font-weight:700;letter-spacing:0.04em;font-variant-numeric:tabular-nums;}
.fpd-fam .rec-status{font-family:var(--font-mono);font-size:14px;font-weight:700;}
.fpd-fam .rec-wave{display:flex;align-items:center;gap:2px;height:32px;}
.fpd-fam .rec-wave i{width:3px;border-radius:2px;background:${ACCENT};opacity:.75;}
.fpd-fam .rec-controls{display:flex;align-items:center;gap:10px;}
.fpd-fam .rec-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:16px;font-weight:600;font-size:16px;border:1px solid;cursor:pointer;font-family:var(--font-body);}
.fpd-fam .rec-btn.pause{background:rgba(217,165,94,0.14);color:${WARN};border-color:rgba(217,165,94,0.3);}
.fpd-fam .rec-btn.resume{background:rgba(91,110,225,0.14);color:#6FAE8B;border-color:rgba(91,110,225,0.3);}
.fpd-fam .rec-btn.stop{background:rgba(208,107,107,0.14);color:${NEG};border-color:rgba(208,107,107,0.3);}
.fpd-fam .rec-done{display:flex;flex-direction:column;gap:16px;}
.fpd-fam .rec-donebadge{display:flex;align-items:center;gap:9px;padding:12px 16px;border-radius:16px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.24);color:#D99A6B;font-size:16px;font-weight:600;}
.fpd-fam .recorder audio{width:100%;border-radius:18px;}
.fpd-fam .rec-savebar{display:flex;gap:10px;}
.fpd-fam .rec-save{flex:1;padding:13px;border-radius:16px;font-weight:700;font-size:17.5px;border:none;cursor:pointer;color:#fff;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);display:flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-body);}
.fpd-fam .rec-discard{padding:13px 18px;border-radius:16px;font-size:16px;font-weight:600;border:none;cursor:pointer;background:rgba(255,255,255,0.04);color:${MUTED};font-family:var(--font-body);}

/* modal (shared pattern) */
.fpd-fam .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-fam .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-fam .modal.wide{max-width:580px;}
.fpd-fam .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);position:sticky;top:0;background:#0D1421;z-index:2;}
.fpd-fam .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-fam .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-fam .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-fam .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-fam .field input,.fpd-fam .field select,.fpd-fam .field textarea,.fpd-fam .fin{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-fam .field input::placeholder,.fpd-fam .field textarea::placeholder,.fpd-fam .fin::placeholder{color:${FAINT};}
.fpd-fam .field input:focus,.fpd-fam .field select:focus,.fpd-fam .field textarea:focus,.fpd-fam .fin:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-fam .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);position:sticky;bottom:0;background:#0D1421;}
.fpd-fam .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-fam .modal-foot .save:hover{filter:brightness(1.08);}

/* universal add modal — staged photo/video preview */
.fpd-fam .stagethumbs{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-fam .stagethumb{position:relative;}
.fpd-fam .stagethumb img{width:60px;height:60px;object-fit:cover;border-radius:16px;border:1px solid rgba(255,255,255,0.08);}
.fpd-fam .stageremove{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#0D1421;border:1px solid rgba(255,255,255,0.08);color:${MUTED};display:flex;align-items:center;justify-content:center;cursor:pointer;}
.fpd-fam .stagedrop{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:16px;background:rgba(91,110,225,0.06);border:1px dashed rgba(91,110,225,0.35);color:#6FAE8B;font-size:16px;cursor:pointer;font-family:var(--font-body);}
.fpd-fam .stagevideo{width:100%;border-radius:16px;background:#000;}
.fpd-fam .stagevideorow{display:flex;align-items:center;gap:10px;}
.fpd-fam .stagevideorow .nm{color:${MUTED};font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`;

export function FamilyMemories() {
  const { memories, addMemory, updateMemory, removeMemory } = useDemo();
  const [tab, setTab] = useState<Tab>("memories");
  // Every tab below is a filtered slice of the one real `memories` list (see the
  // type-mapping comment at the top of this file) instead of its own mock array.
  const memoriesList  = memories.filter(m => m.type === "photo");
  const videoList     = memories.filter(m => m.type === "video");
  const audioList     = memories.filter(m => m.type === "audio");
  const kidsList      = memories.filter(m => m.type === "note");
  const keepsakesList = memories.filter(m => m.type === "keepsake");
  const goalsList     = memories.filter(m => m.type === "goal");
  const awardsList    = memories.filter(m => m.type === "award");
  const tabContentRef = React.useRef<HTMLDivElement>(null);

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

  // ── Audio upload staging ────────────────────────────────────────────
  const [pendingAudio, setPendingAudio] = useState<{ url:string; name:string } | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  function stageAudio(files: FileList | null) {
    const file = Array.from(files || []).find(f => f.type.startsWith("audio/"));
    if (!file) { toast.error("Please choose an audio file"); return; }
    if (pendingAudio) URL.revokeObjectURL(pendingAudio.url);
    const url = URL.createObjectURL(file);
    setPendingAudio({ url, name: file.name });
    setForm(p => ({ ...p, title: p.title || file.name.replace(/\.[^.]+$/, "") }));
    setShowAdd("audio");
    toast.success(`"${file.name}" ready — add the details to save it`);
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

  async function saveAudioMemory() {
    if (!recTitle.trim()) { toast.error("Please enter a title for the recording"); return; }
    const duration = formatTime(recSeconds);
    await addMemory({
      title: recTitle, type: "audio",
      date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      recipient: recRecipient || "Family",
      description: recDesc || `Audio memory — ${duration}`,
      tags: [],
      mediaUrl: recUrl || undefined,   // kept so it plays back from the list
    });
    // cleanup — the blob URL stays alive for playback in the list
    setRecState("idle"); setRecTitle(""); setRecRecipient(""); setRecDesc("");
    setRecBlob(null); setRecUrl(null); setRecSeconds(0);
  }

  function discardRecording() {
    if (recUrl) URL.revokeObjectURL(recUrl);
    setRecState("idle"); setRecBlob(null); setRecUrl(null); setRecSeconds(0);
  }
  const [showAdd, setShowAdd] = useState<Tab|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);

  /* Closing without saving drops any staged media so blob URLs don't leak. */
  function closeAddModal() {
    clearPendingPhotos();
    if (pendingVideo) { URL.revokeObjectURL(pendingVideo.url); setPendingVideo(null); }
    if (pendingAudio) { URL.revokeObjectURL(pendingAudio.url); setPendingAudio(null); }
    resetItemMedia();
    setShowAdd(null); setForm({}); setEditingId(null);
  }

  useEscapeKey(showAdd !== null, closeAddModal);

  const [form, setForm] = useState<Record<string,string>>({});
  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  // ── Keepsake / Award photo + document attach (shared by both, one modal open at a time) ──
  const [itemPhoto, setItemPhoto] = useState("");
  const [itemDoc, setItemDoc] = useState<string|null>(null);
  function resetItemMedia() { setItemPhoto(""); setItemDoc(null); }

  function confirmRemoveMemory(id: string, label: string) {
    if (window.confirm(`Remove "${label}"?`)) removeMemory(id);
  }

  // ── Edit handlers — pre-fill the shared Add modal with a record's current values ──
  // (tags[] is reused positionally per-type — see the mapping comment at the top of this file)
  function editMemory(m: Memory) {
    setForm({ title: m.title, date: m.date, desc: m.description, tags: m.tags.join(", ") });
    setEditingId(m.id);
    setShowAdd("memories");
  }
  function editVideoMemory(v: Memory) {
    setForm({ title: v.title, filmed: v.date, source: v.tags[0] || "", desc: v.description });
    setEditingId(v.id);
    setShowAdd("messages");
  }
  function editAudioMemory(a: Memory) {
    setForm({ title: a.title, recipient: a.recipient || "", desc: a.description });
    setEditingId(a.id);
    setShowAdd("audio");
  }
  function editKid(k: Memory) {
    setForm({ name: k.title, school: k.recipient || "", activities: k.tags.join(", "), notes: k.description });
    setEditingId(k.id);
    setShowAdd("kids");
  }
  function editKeepsake(k: Memory) {
    setForm({ item: k.title, location: k.tags[0] || "", value: k.tags[1] || "", intendedFor: k.recipient || "", story: k.description });
    setItemPhoto(k.mediaUrl || "");
    setEditingId(k.id);
    setShowAdd("keepsakes");
  }
  function editGoal(g: Memory) {
    setForm({ goal: g.title, notes: g.description, achieved: g.achieved ? "yes" : "" });
    setEditingId(g.id);
    setShowAdd("goals");
  }
  function editAward(a: Memory) {
    setForm({ award: a.title, year: a.date, org: a.issuer || "", category: a.tags[0] || "", desc: a.description, forChild: a.childName || "" });
    setItemPhoto(a.mediaUrl || "");
    setEditingId(a.id);
    setShowAdd("awards");
  }

  async function quickAdd() {
    const isEdit = editingId !== null;
    const today = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    switch(showAdd) {
      case "memories": {
        if (!form.title) { toast.error("Title required"); return; }
        const tags = (form.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
        const mediaUrl = pendingPhotos[0]; // only one photo per memory is persisted (media_url is a single column)
        if (isEdit) await updateMemory(editingId!, { title: form.title, date: form.date, description: form.desc || "", tags, mediaUrl });
        else await addMemory({ title: form.title, date: form.date || today, type: "photo", description: form.desc || "", tags, mediaUrl });
        setPendingPhotos([]);   // ownership passes to the saved memory
        break;
      }
      case "messages": {
        if (!form.title) { toast.error("Title required"); return; }
        const tags = [form.source || (pendingVideo ? "Uploaded file" : "Added manually")];
        if (isEdit) await updateMemory(editingId!, { title: form.title, date: form.filmed, description: form.desc || "", tags, mediaUrl: pendingVideo?.url });
        else await addMemory({ title: form.title, date: form.filmed || "Unknown", type: "video", description: form.desc || "", tags, mediaUrl: pendingVideo?.url });
        setPendingVideo(null);  // ownership passes to the saved memory
        break;
      }
      case "audio": {
        if (!form.title) { toast.error("Title required"); return; }
        if (isEdit) await updateMemory(editingId!, { title: form.title, recipient: form.recipient, description: form.desc || "", mediaUrl: pendingAudio?.url });
        else await addMemory({ title: form.title, date: today, type: "audio", description: form.desc || "", tags: [], recipient: form.recipient || "Family", mediaUrl: pendingAudio?.url });
        setPendingAudio(null);  // ownership passes to the saved memory
        break;
      }
      case "kids": {
        if (!form.name) { toast.error("Name required"); return; }
        const activities = (form.activities||"").split(",").map(t=>t.trim()).filter(Boolean);
        if (isEdit) await updateMemory(editingId!, { title: form.name, childName: form.name, recipient: form.school, tags: activities, description: form.notes || "" });
        else await addMemory({ title: form.name, date: "", type: "note", description: form.notes || "", tags: activities, recipient: form.school, childName: form.name });
        break;
      }
      case "keepsakes": {
        if (!form.item) { toast.error("Item name required"); return; }
        const tags = [form.location || "—", form.value || "Sentimental"];
        if (isEdit) await updateMemory(editingId!, { title: form.item, recipient: form.intendedFor, tags, description: form.story || "", mediaUrl: itemPhoto });
        else await addMemory({ title: form.item, date: "", type: "keepsake", description: form.story || "", tags, recipient: form.intendedFor, mediaUrl: itemPhoto });
        resetItemMedia();
        break;
      }
      case "goals": {
        if (!form.goal) { toast.error("Goal description required"); return; }
        const achieved = form.achieved === "yes";
        if (isEdit) await updateMemory(editingId!, { title: form.goal, description: form.notes || "", achieved });
        else await addMemory({ title: form.goal, date: "", type: "goal", description: form.notes || "", tags: [], achieved });
        break;
      }
      case "awards": {
        if (!form.award) { toast.error("Award name required"); return; }
        const tags = [form.category || "Other"];
        if (isEdit) await updateMemory(editingId!, { title: form.award, date: form.year, issuer: form.org, tags, description: form.desc || "", mediaUrl: itemPhoto, childName: form.forChild || undefined });
        else await addMemory({ title: form.award, date: form.year || String(new Date().getFullYear()), type: "award", description: form.desc || "", tags, issuer: form.org, achieved: true, mediaUrl: itemPhoto, childName: form.forChild || undefined });
        resetItemMedia();
        break;
      }
    }
    setForm({});
    setShowAdd(null);
    setEditingId(null);
  }

  const addFields: Record<Tab, {key:string;label:string;ph:string;type?:string}[]> = {
    memories:  [{key:"title",label:"Title *",ph:"e.g. Christmas 2025"},{key:"date",label:"Date Taken",ph:"e.g. Dec 25, 2025"},{key:"desc",label:"Description",ph:"What happened?"},{key:"tags",label:"Tags (comma-separated)",ph:"family, holiday"}],
    messages:  [{key:"title",label:"Video Title *",ph:"e.g. Christmas Morning 1994"},{key:"filmed",label:"When It Was Filmed",ph:"e.g. Dec 25, 1994"},{key:"source",label:"Source",ph:"e.g. Digitized VHS tape"},{key:"desc",label:"Description",ph:"What's on this video"}],
    audio:     [{key:"title",label:"Audio Memory Title *",ph:"e.g. Life Advice for Michael"},{key:"recipient",label:"For",ph:"e.g. Michael Doe (Son)"},{key:"desc",label:"Description",ph:"What this recording covers"}],
    kids:      [{key:"name",label:"Child's Name & Relation *",ph:"e.g. Tyler Doe (Grandson, age 8)"},{key:"school",label:"School",ph:""},{key:"activities",label:"Activities (comma-separated)",ph:"Baseball, Swimming"},{key:"notes",label:"Notes",ph:""}],
    keepsakes: [{key:"item",label:"Item Name *",ph:"e.g. Grandfather's Watch"},{key:"location",label:"Where It Is",ph:""},{key:"value",label:"Value",ph:"e.g. Sentimental / ~$500"},{key:"intendedFor",label:"Intended For",ph:""},{key:"story",label:"Story / Significance",ph:"Why this item matters"}],
    goals:     [{key:"goal",label:"Goal *",ph:"e.g. Pay off mortgage"},{key:"notes",label:"Notes",ph:""}],
    awards:    [{key:"award",label:"Award Name *",ph:""},{key:"year",label:"Year",ph:String(new Date().getFullYear())},{key:"org",label:"Organization",ph:""},{key:"category",label:"Category",ph:"e.g. Military, Professional"},{key:"desc",label:"Description",ph:""},{key:"forChild",label:"For (child, if applicable)",ph:"e.g. Tyler Doe (Grandson)"}],
  };

  const tabs = [
    { id: "memories" as Tab, label: "Photo Memories", icon: <Camera size={14} /> },
    { id: "messages" as Tab, label: "Video Memories", icon: <Video size={14} /> },
    { id: "audio" as Tab,    label: "Audio Memories", icon: <Mic size={14} /> },
    { id: "kids" as Tab, label: "Kids & Family", icon: <Heart size={14} /> },
    { id: "keepsakes" as Tab, label: "Keepsakes", icon: <Star size={14} /> },
    { id: "goals" as Tab, label: "Goals", icon: <Target size={14} /> },
    { id: "awards" as Tab, label: "Awards", icon: <Trophy size={14} /> },
  ];

  const familyRecordsCount = kidsList.length + keepsakesList.length + goalsList.length + awardsList.length;
  const kpis = [
    { label: "Photo Memories", value: String(memoriesList.length), sub: "Moments preserved", icon: <Camera size={14} />, dot: ACCENT2 },
    { label: "Video Memories", value: String(videoList.length), sub: "Home movies & clips", icon: <Video size={14} />, dot: ACCENT2 },
    { label: "Audio Recordings", value: String(audioList.length), sub: "In your own voice", icon: <Mic size={14} />, dot: ACCENT2 },
    { label: "Family Records", value: String(familyRecordsCount), sub: "Kids, keepsakes, goals & awards", icon: <Heart size={14} />, dot: POS },
  ];

  return (
    <div className="fpd-fam">
      <style dangerouslySetInnerHTML={{ __html: FAM_CSS }} />
      <div className="fpd-fam-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroFamilyPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">The Moments Worth Keeping</span>
            <h1>Stories, photos, and memories — <span className="accent">saved for the people who'll want them.</span></h1>
            <p>Photos, videos, voice recordings, and keepsakes — preserved in one place so the people you love can hold onto what mattered most.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => { setTab("memories"); setShowAdd("memories"); }}>
                <Plus size={15}/> Add Memory
              </button>
              <button className="hbtn ghost" onClick={() => tabContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <ImageIcon size={15}/> View All Memories
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Heart size={12} /> Family &amp; Legacy</div>
          <h1 className="pg-h1">Family &amp; Memories</h1>
          <div className="pg-sub">Preserve your stories, messages, keepsakes, and the things that matter most.</div>
        </div>

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background:`linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
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

        {/* ── Tab content ── */}
        <div ref={tabContentRef}>

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
              {memoriesList.map(m => (
                <div key={m.id} className="card pad">
                  <div className="r-top" style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Camera size={16} color="#FFFFFF" />
                      <span className="r-sub">{m.date}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="Edit memory" onClick={() => editMemory(m)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                      <button title="Delete memory" onClick={() => confirmRemoveMemory(m.id, m.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {m.mediaUrl && (
                    <div className="thumbs" style={{ marginBottom: 12 }}>
                      <img className="thumb" src={m.mediaUrl} alt=""/>
                    </div>
                  )}
                  <div className="r-title">{m.title}</div>
                  <div className="r-desc">{m.description}</div>
                  <div className="chiprow" style={{ marginTop: 12 }}>
                    {m.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Video Memories ── */}
        {tab === "messages" && (
          <div className="stack">
            <div className="toolbar">
              <p>
                Upload the videos you already have — home movies, phone clips, digitized VHS and camcorder tapes.
                To record a new message for someone, use <span style={{ color: "#6FAE8B" }}>Messages to Loved Ones</span>.
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
                <div key={vid.id} className="card pad">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {vid.url ? (
                      <video src={vid.url} controls preload="metadata"
                        style={{ width: 168, borderRadius: 12, background: "#000", flexShrink: 0 }}/>
                    ) : (
                      <button className="vplay" onClick={() => toast.success(`▶ Playing: ${vid.title}`)}>
                        <Play size={22} color="#FFFFFF" />
                      </button>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="r-title">{vid.title}</div>
                      <div className="r-sub accent" style={{ marginBottom: 4 }}>Filmed: {vid.date}</div>
                      <div className="r-desc">{vid.description}</div>
                      <div className="r-meta">
                        <span className="txt">{vid.tags[0]}</span>
                        <span className="pill" style={{ background: "rgba(95,190,145,0.14)", color: "#D99A6B", marginLeft: "auto" }}>SECURED</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button title="Edit video" onClick={() => editVideoMemory(vid)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                      <button title="Delete video" onClick={() => confirmRemoveMemory(vid.id, vid.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
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
            <div className="toolbar">
              <p className="pg-sub" style={{ margin: 0 }}>Record memories in your own voice — stories, life advice, family history, songs. Kept private in your vault and passed down to the people you choose.</p>
              <div className="actions">
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => { stageAudio(e.target.files); e.target.value = ""; }}/>
                <button className="btn-primary" onClick={()=>audioInputRef.current?.click()}><Upload size={14} /> Upload Audio</button>
                <button className="btn-sec" onClick={()=>setShowAdd("audio")}><Plus size={14} /> Add Details Only</button>
              </div>
            </div>

            {/* ── Recorder ─────────────────────────────────────────────── */}
            <div className="recorder">
              <div className="rec-eyebrow"><Mic size={13} /> Audio Memory Recorder</div>

              {/* Mic error */}
              {micError && (
                <div className="rec-error">{micError}</div>
              )}

              {/* Idle — prompt to record */}
              {recState === "idle" && !recBlob && (
                <div className="rec-idle">
                  <div className="rec-orb">
                    <Mic size={36} color="#FFFFFF"/>
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
                    <div key={msg.id} className="card pad">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        <div className="r-icon"><Volume2 size={22}/></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="r-title">{msg.title}</div>
                          <div className="r-sub accent" style={{ marginBottom: 4 }}>For: {msg.recipient}</div>
                          <div className="r-desc">{msg.description}</div>
                          {msg.mediaUrl && <audio src={msg.mediaUrl} controls style={{ marginTop:10 }}/>}
                          <div className="r-meta">
                            <span className="txt">Recorded {msg.date}</span>
                            {!msg.mediaUrl && (
                              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 14 }}
                                onClick={() => toast.success(`▶ Playing: ${msg.title}`)}>
                                <Play size={11}/> Play
                              </button>
                            )}
                            <span className="pill" style={{ background: "rgba(95,190,145,0.14)", color: "#D99A6B", marginLeft: "auto" }}>SECURED</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button title="Edit audio memory" onClick={() => editAudioMemory(msg)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                          <button title="Delete audio memory" onClick={() => confirmRemoveMemory(msg.id, msg.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
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
              <div key={kid.id} className="card pad">
                <div className="r-top" style={{ marginBottom: 0 }}>
                  <div className="r-title" style={{ fontSize: 21.5 }}>{kid.title}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button title="Edit child" onClick={() => editKid(kid)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                    <button title="Delete child" onClick={() => confirmRemoveMemory(kid.id, kid.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                </div>
                {kid.recipient && <div className="r-sub" style={{ marginBottom: 12 }}>School: {kid.recipient}</div>}
                {kid.tags.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Activities</div>
                    <div className="chiprow">
                      {kid.tags.map(a => <span key={a} className="tag" style={{ padding: "7px 12px", fontSize: 16 }}>{a}</span>)}
                    </div>
                  </div>
                )}
                {kid.description && <div className="tile"><span className="tv">Notes: {kid.description}</span></div>}
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
              <div key={k.id} className="card" style={{ overflow: "hidden" }}>
                {k.mediaUrl && (
                  <div className="photo-frame" style={{ height: 180 }}>
                    <img src={k.mediaUrl} alt={k.title}/>
                  </div>
                )}
                <div className="pad" style={{ padding: 22 }}>
                  <div className="r-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="r-title">{k.title}</div>
                      <div className="r-sub accent" style={{ marginBottom: 8 }}>→ {k.recipient}</div>
                      <div className="r-grid">
                        {[{ label: "Location", value: k.tags[0] }, { label: "Estimated Value", value: k.tags[1] }].map(f => (
                          <div key={f.label} className="tile">
                            <div className="tk">{f.label}</div>
                            <div className="tv">{f.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ color: SOFT, fontSize: 16, fontStyle: "italic", lineHeight: 1.6 }}>"{k.description}"</div>
                      <div style={{ marginTop: 12 }}>
                        <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" scanned and saved to File Cabinet`)} size="sm" label="Scan Document"/>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="Edit keepsake" onClick={() => editKeepsake(k)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                      <button title="Delete keepsake" onClick={() => confirmRemoveMemory(k.id, k.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
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
              const s = g.achieved ? statusStyles.completed : statusStyles.in_progress;
              return (
                <div key={g.id} className="card pad">
                  <div className="r-top" style={{ marginBottom: 12 }}>
                    <div style={{ color: TEXT, fontSize: 19, fontWeight: 500 }}>{g.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="pill" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      <button title="Edit goal" onClick={() => editGoal(g)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                      <button title="Delete goal" onClick={() => confirmRemoveMemory(g.id, g.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {g.description && <div className="r-sub" style={{ marginTop: 6 }}>{g.description}</div>}
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
              <div key={a.id} className="card" style={{ overflow: "hidden" }}>
                {a.mediaUrl && (
                  <div className="photo-frame" style={{ height: 180 }}>
                    <img src={a.mediaUrl} alt={a.title}/>
                  </div>
                )}
                <div className="pad" style={{ padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div className="r-icon"><Trophy size={20} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="r-title">{a.title}</div>
                      <div className="r-sub">{a.issuer} · {a.date}{a.childName ? ` · For ${a.childName}` : ""}</div>
                      <div style={{ marginTop: 8 }}>
                        <span className="tag" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{a.tags[0]}</span>
                      </div>
                      {a.description && <div className="r-desc" style={{ marginTop: 6 }}>{a.description}</div>}
                      <div style={{ marginTop: 12 }}>
                        <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" scanned and saved to File Cabinet`)} size="sm" label="Scan Document"/>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button title="Edit award" onClick={() => editAward(a)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Edit2 size={14} /></button>
                      <button title="Delete award" onClick={() => confirmRemoveMemory(a.id, a.title)} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        </div>
        {/* ── Universal Add Modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>
                  {editingId !== null ? "Edit " : "Add "}
                  {showAdd === "memories" ? "Photo Memory" : showAdd === "messages" ? "Video Memory" : showAdd === "audio" ? "Audio Memory" : showAdd === "kids" ? "Child / Family Member" : showAdd === "keepsakes" ? "Keepsake" : showAdd === "goals" ? "Goal" : "Award"}
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

                {/* Staged audio */}
                {showAdd === "audio" && (
                  pendingAudio ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <audio src={pendingAudio.url} controls preload="metadata" style={{ width: "100%" }}/>
                      <div className="stagevideorow">
                        <span className="nm">{pendingAudio.name}</span>
                        <button className="btn-sec" onClick={()=>{ URL.revokeObjectURL(pendingAudio.url); setPendingAudio(null); }}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button className="stagedrop" onClick={()=>audioInputRef.current?.click()}>
                      <Upload size={14}/> Attach an audio file
                    </button>
                  )
                )}

                {(addFields[showAdd]||[]).map(f=>(
                  <div key={f.key} className="field">
                    <label>{f.label.toUpperCase()}</label>
                    <input value={form[f.key]||""} onChange={F(f.key)} placeholder={f.ph}/>
                  </div>
                ))}

                {/* Goals — achieved y/n (the DB tracks a done flag, not a numeric progress %) */}
                {showAdd === "goals" && (
                  <div className="field">
                    <label>STATUS</label>
                    <select value={form.achieved||""} onChange={F("achieved")}>
                      <option value="">In Progress</option>
                      <option value="yes">Achieved</option>
                    </select>
                  </div>
                )}

                {/* Keepsakes & Awards — picture + document upload/scan */}
                {(showAdd === "keepsakes" || showAdd === "awards") && (
                  <>
                    <PhotoPicker value={itemPhoto} onChange={setItemPhoto} label="Photo" aspectRatio="4/3"/>
                    <AttachDocumentField
                      value={itemDoc}
                      onChange={setItemDoc}
                      folder="personal"
                      sectionId="family-memories"
                      sectionLabel="Family & Memories"
                      label={showAdd === "keepsakes" ? "Attach Document (appraisal, certificate, provenance)" : "Attach Document (certificate, citation)"}
                    />
                  </>
                )}
              </div>
              <div className="modal-foot">
                <button className="save" onClick={quickAdd}>{editingId !== null ? "Save Changes" : "Add"}</button>
                <button className="btn-sec" onClick={closeAddModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
