import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { prepareImage, shrinkNotice, MAX_MB } from "../utils/imageInput";
import { PawPrint, Plus, X, ImageIcon, Heart, Stethoscope, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { ScanButton } from "./DocumentScanner";
import heroPetPhoto from "../../imports/petrecords_hero_photo.webp";

/* ── Royal Vault Blue palette (matched to the rest of Life Records) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

interface PetVaccination { type: string; date: string; }
interface PetCaretaker { name: string; phone: string; }
interface PetProvider { name: string; phone: string; }
interface PetInstruction { name: string; phone: string; description: string; }
interface PetFeeding { foodType: string; timeType: string; quantity: string; locationOfFood: string; }
interface PetRecord {
  id: string;
  photos: string[];
  caretakers: PetCaretaker[];
  providers: PetProvider[];
  instructions: PetInstruction[];
  name: string;
  dateOfBirth: string;
  gender: string;
  breed: string;
  colour: string;
  documents: string[];
  medicalHistory: string;
  vaccinations: PetVaccination[];
  vetName: string;
  vetPhone: string;
  vetEmail: string;
  feedings: PetFeeding[];
}

/* Rows come from the `pet_records` table — the screen used to open on sample
   pets identical for every account and lost on refresh. */

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-pets so nothing else in the app is affected. */
const PETS_CSS = `
.fpd-pets{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-pets *{box-sizing:border-box;}
.fpd-pets-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-pets .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* hero banner */
.fpd-pets .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-pets .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-pets .hbanner:hover .art{transform:scale(1.08);}
.fpd-pets .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-pets .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-pets .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-pets .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-pets .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-pets .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-pets .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-pets .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-pets .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-pets .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-pets .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-pets .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-pets .hbanner{min-height:auto;} .fpd-pets .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-pets .hbanner h1{font-size:29px;}}

.fpd-pets .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-pets .card.pad{padding:28px;}
.fpd-pets .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-pets .sec-title{font-size:18px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:14px;}
.fpd-pets .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});flex-shrink:0;}

/* header */
.fpd-pets .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-pets .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-pets .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-pets .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-pets .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-pets .btn-mini{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-pets .btn-mini:hover{filter:brightness(1.08);}

/* KPI ledger */
.fpd-pets .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-pets .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-pets .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-pets .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-pets .kpi-mini-txt{flex:1;min-width:0;}
.fpd-pets .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-pets .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-pets .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-pets .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-pets .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-pets .kpi-stack{grid-template-columns:1fr;}}

.fpd-pets .stack{display:flex;flex-direction:column;gap:14px;}
.fpd-pets .r-icon{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-pets .r-grid{display:grid;grid-template-columns:repeat(2,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin:14px 0;}
.fpd-pets .r-grid.c3{grid-template-columns:repeat(3,1fr);}
.fpd-pets .r-grid.c4{grid-template-columns:repeat(4,1fr);}
.fpd-pets .r-grid:not(.c3):not(.c4) .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-pets .r-grid:not(.c3):not(.c4) .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-pets .r-grid.c3 .tile:nth-child(3n+2),.fpd-pets .r-grid.c3 .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-pets .r-grid.c3 .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-pets .r-grid.c4 .tile:nth-child(4n+2),.fpd-pets .r-grid.c4 .tile:nth-child(4n+3),.fpd-pets .r-grid.c4 .tile:nth-child(4n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-pets .r-grid.c4 .tile:nth-child(n+5){border-top:1px solid rgba(255,255,255,0.08);}
@media (max-width:900px){
.fpd-pets .r-grid,.fpd-pets .r-grid.c3,.fpd-pets .r-grid.c4{grid-template-columns:1fr 1fr;}
.fpd-pets .r-grid.c3 .tile:nth-child(3n+2),.fpd-pets .r-grid.c3 .tile:nth-child(3n){border-left:none;}
.fpd-pets .r-grid.c4 .tile:nth-child(4n+2),.fpd-pets .r-grid.c4 .tile:nth-child(4n+3),.fpd-pets .r-grid.c4 .tile:nth-child(4n){border-left:none;}
.fpd-pets .r-grid.c3 .tile:nth-child(2n),.fpd-pets .r-grid.c4 .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-pets .r-grid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
}

.fpd-pets .tile{padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-pets .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-pets .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
.fpd-pets .tile.warn{background:rgba(217,165,94,0.06);border-color:rgba(217,165,94,0.2);}
.fpd-pets .tile.neg{background:rgba(208,107,107,0.06);border-color:rgba(208,107,107,0.2);}
.fpd-pets .tile.info{background:rgba(91,110,225,0.06);border-color:rgba(91,110,225,0.2);}
.fpd-pets .tile.pos{background:rgba(95,190,145,0.07);border-color:rgba(95,190,145,0.2);}

/* pets */
.fpd-pets .petphotos{display:flex;gap:8px;padding:12px;overflow-x:auto;background:rgba(91,110,225,0.03);}
.fpd-pets .petphoto{width:100px;height:80px;object-fit:cover;border-radius:18px;flex-shrink:0;}
.fpd-pets .pethead{display:flex;align-items:center;gap:16px;}
.fpd-pets .petname{font-family:var(--font-display);font-size:25px;color:${TEXT};font-weight:600;}
.fpd-pets .petmeta{color:${MUTED};font-size:16px;margin-top:2px;}
.fpd-pets .petrow{display:flex;gap:16px;align-items:center;padding:12px 16px;border-radius:16px;margin-bottom:8px;}
.fpd-pets .petrow .nm{color:${TEXT};font-size:16px;}
.fpd-pets .petrow .ph{color:${MUTED};font-size:16px;}
.fpd-pets .instruction{padding:14px 16px;border-radius:16px;margin-bottom:8px;}
.fpd-pets .instruction .top{display:flex;gap:16px;margin-bottom:6px;}
.fpd-pets .instruction .nm{color:${TEXT};font-size:16px;font-weight:600;}
.fpd-pets .instruction .ph{color:${MUTED};font-size:16px;}
.fpd-pets .instruction .desc{color:${SOFT};font-size:16px;line-height:1.6;}
.fpd-pets .petdocs{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-pets .petdoc{padding:8px 13px;border-radius:16px;font-size:15.5px;cursor:pointer;background:rgba(91,110,225,0.08);color:#6FAE8B;border:1px solid rgba(91,110,225,0.18);font-family:var(--font-body);}

/* modal (shared pattern) */
.fpd-pets .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-pets .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-pets .modal.wide{max-width:580px;}
.fpd-pets .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);position:sticky;top:0;background:#0D1421;z-index:2;}
.fpd-pets .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-pets .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-pets .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-pets .fin{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-pets .fin::placeholder{color:${FAINT};}
.fpd-pets .fin:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-pets .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);position:sticky;bottom:0;background:#0D1421;}
.fpd-pets .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-pets .modal-foot .save:hover{filter:brightness(1.08);}

/* pet form sections */
.fpd-pets .pfsection .st{font-weight:700;font-size:19px;color:${TEXT};margin-bottom:12px;font-family:var(--font-display);}
.fpd-pets .pfrow{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
.fpd-pets .pfaddwrap{display:flex;justify-content:flex-end;}
.fpd-pets .dropzone{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:26px;border-radius:18px;border:2px dashed rgba(91,110,225,0.3);background:rgba(91,110,225,0.03);cursor:pointer;color:inherit;}
.fpd-pets .dropzone .dt{color:${TEXT};font-weight:600;font-size:17.5px;}
.fpd-pets .dropzone .ds{color:${MUTED};font-size:15px;}
.fpd-pets .dropzone.sm{padding:18px;}
.fpd-pets .pfthumbs{display:flex;gap:8px;margin-top:12px;overflow-x:auto;padding-bottom:2px;}
.fpd-pets .pfthumb{position:relative;flex-shrink:0;}
.fpd-pets .pfthumb img{width:72px;height:60px;object-fit:cover;border-radius:16px;}
.fpd-pets .pfremove{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:${NEG};color:#fff;border:none;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;line-height:1;}
.fpd-pets .pfdocs{display:flex;flex-wrap:wrap;gap:7px;}
.fpd-pets .pfdoc{padding:5px 10px;border-radius:7px;font-size:14.5px;background:rgba(91,110,225,0.08);color:#6FAE8B;}
`;

export function PetRecords() {
  const { authUser } = useAuth();
  const [petsList, setPetsList] = useState<PetRecord[]>([]);

  const reload = useCallback(async () => {
    if (!authUser) { setPetsList([]); return; }
    const { data, error } = await tables.petRecords.list(authUser.id);
    if (error) { toast.error(`Could not load pet records: ${error.message}`); return; }
    setPetsList((data ?? []).map(r => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      dateOfBirth: String(r.date_of_birth ?? ""),
      gender: String(r.gender ?? ""),
      breed: String(r.breed ?? ""),
      colour: String(r.color ?? ""),
      medicalHistory: String(r.medical_history ?? ""),
      vetName: String(r.vet_name ?? ""),
      vetPhone: String(r.vet_phone ?? ""),
      vetEmail: String(r.vet_email ?? ""),
      documents: (r.document_urls as string[] | null) ?? [],
      // These four are lists in the UI; 012 gave each one a column that can
      // actually hold a list rather than collapsing it to a single value.
      photos: (r.photo_urls as string[] | null) ?? [],
      caretakers: (r.caretakers as PetCaretaker[] | null) ?? [],
      providers: (r.providers as PetProvider[] | null) ?? [],
      instructions: (r.instructions as PetInstruction[] | null) ?? [],
      vaccinations: (r.vaccinations as PetVaccination[] | null) ?? [],
      feedings: (r.feedings as PetFeeding[] | null) ?? [],
    })));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);
  const [showPetForm, setShowPetForm] = useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Pet form state matching the original app design exactly
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const petPhotoRef = useRef<HTMLInputElement>(null);

  function resetPetForm() {
    setPetPhotos([]); setPetCaretakers([{name:"",phone:""}]); setPetProviders([{name:"",phone:""}]);
    setPetInstructions([{name:"",phone:"",description:""}]); setPetAbout({name:"",dateOfBirth:"",gender:"",breed:"",colour:""});
    setPetDocs([]); setPetMedHistory(""); setPetVaccinations([{type:"",date:""}]);
    setPetVet({vetName:"",vetPhone:"",vetEmail:""}); setPetFeedings([{foodType:"",timeType:"Morning",quantity:"",locationOfFood:""}]);
  }

  function openAddPet() {
    resetPetForm();
    setEditingId(null);
    setShowPetForm(true);
  }

  function openEditPet(pet: PetRecord) {
    setPetPhotos(pet.photos);
    setPetCaretakers(pet.caretakers.length ? pet.caretakers : [{name:"",phone:""}]);
    setPetProviders(pet.providers.length ? pet.providers : [{name:"",phone:""}]);
    setPetInstructions(pet.instructions.length ? pet.instructions : [{name:"",phone:"",description:""}]);
    setPetAbout({ name: pet.name, dateOfBirth: pet.dateOfBirth, gender: pet.gender, breed: pet.breed, colour: pet.colour });
    setPetDocs(pet.documents);
    setPetMedHistory(pet.medicalHistory);
    setPetVaccinations(pet.vaccinations.length ? pet.vaccinations : [{type:"",date:""}]);
    setPetVet({ vetName: pet.vetName, vetPhone: pet.vetPhone, vetEmail: pet.vetEmail });
    setPetFeedings(pet.feedings.length ? pet.feedings : [{foodType:"",timeType:"Morning",quantity:"",locationOfFood:""}]);
    setEditingId(pet.id);
    setShowPetForm(true);
  }

  function closePetForm() {
    setShowPetForm(false);
    resetPetForm();
    setEditingId(null);
  }

  async function savePetRecord() {
    if (!petAbout.name) { toast.error("Pet name required"); return; }
    if (!authUser) { toast.error("Sign in to save pet records."); return; }

    const row = {
      name: petAbout.name,
      date_of_birth: petAbout.dateOfBirth,
      gender: petAbout.gender,
      breed: petAbout.breed,
      color: petAbout.colour,
      medical_history: petMedHistory,
      vet_name: petVet.vetName,
      vet_phone: petVet.vetPhone,
      vet_email: petVet.vetEmail,
      document_urls: petDocs,
      photo_urls: petPhotos,
      caretakers: petCaretakers.filter(c => c.name.trim()),
      providers: petProviders.filter(p => p.name.trim()),
      instructions: petInstructions.filter(i => i.description.trim() || i.name.trim()),
      vaccinations: petVaccinations.filter(v => v.type.trim()),
      feedings: petFeedings.filter(f => f.foodType.trim()),
    };

    const { error } = editingId !== null
      ? await tables.petRecords.update(editingId, row)
      : await tables.petRecords.add(authUser.id, row);

    if (error) { toast.error(`Could not save: ${error.message}`); return; }

    await reload();
    toast.success(editingId !== null ? `${petAbout.name} updated` : `${petAbout.name} added to Pet Records`);
    resetPetForm(); setEditingId(null); setShowPetForm(false);
  }

  useEscapeKey(showPetForm, closePetForm);

  const totalVaccinations = petsList.reduce((s, p) => s + p.vaccinations.length, 0);
  const totalCaretakers = petsList.reduce((s, p) => s + p.caretakers.length + p.providers.length, 0);
  const kpis = [
    { label: "Pets on File", value: String(petsList.length), sub: "Full records", icon: <PawPrint size={14} />, dot: ACCENT2 },
    { label: "Caretakers & Providers", value: String(totalCaretakers), sub: "Emergency & long-term", icon: <Heart size={14} />, dot: POS },
    { label: "Vaccinations Tracked", value: String(totalVaccinations), sub: "Across all pets", icon: <Stethoscope size={14} />, dot: ACCENT2 },
    { label: "Vet Contacts", value: String(petsList.filter(p => p.vetName).length), sub: "On file", icon: <Heart size={14} />, dot: WARN },
  ];

  return (
    <div className="fpd-pets">
      <style dangerouslySetInnerHTML={{ __html: PETS_CSS }} />
      <div className="fpd-pets-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroPetPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">For The Ones Who Depend On You</span>
            <h1>Everything a caretaker <span className="accent">would need to know.</span></h1>
            <p>Vet info, feeding routines, medications, and emergency caretakers — so your pet is never left without instructions.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAddPet}>
                <Plus size={15}/> Add Pet Record
              </button>
              <button className="hbtn ghost" onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <PawPrint size={15}/> View All Pets
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><PawPrint size={12} /> Life Records</div>
            <h1 className="pg-h1">Pet Records</h1>
            <div className="pg-sub">Caretakers, vet info, feeding routines, and health history for every pet — kept separate so it's easy to hand off.</div>
          </div>
          <button className="btn-primary" onClick={openAddPet}>
            <Plus size={14} /> Add Pet Record
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background: `linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pets ── */}
        <div className="stack" ref={listRef}>
          {petsList.map(pet => (
            <div key={pet.id} className="card" style={{ overflow: "hidden" }}>
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
                <div className="pethead" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <div className="r-icon" style={{ width: 52, height: 52, borderRadius: 16 }}><PawPrint size={24}/></div>
                    <div>
                      <div className="petname">{pet.name}</div>
                      <div className="petmeta">{pet.breed} · {pet.gender} · {pet.colour} · Born {pet.dateOfBirth}</div>
                    </div>
                  </div>
                  <button className="btn-mini" onClick={() => openEditPet(pet)}><Edit2 size={13}/> Edit</button>
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
                          <div className="tk" style={{ color: "#D99A6B" }}>Vaccination</div>
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

        {/* ── PET RECORDS FORM ──────────────────────────────────────── */}
        {showPetForm && (
          <div className="backdrop">
            <div className="card modal wide">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Pet Record" : "Upload Pet Records"}</h3>
                <button onClick={closePetForm}><X size={18}/></button>
              </div>
              <div className="modal-body">

                {/* Upload Images or Videos */}
                <div>
                  <button className="dropzone" onClick={()=>petPhotoRef.current?.click()}>
                    <ImageIcon size={32} color="#FFFFFF"/>
                    <div className="dt">Upload Images or Videos</div>
                    <div className="ds">Minimum 1 Maximum 10 images or videos · photos resized automatically, max {MAX_MB}MB</div>
                  </button>
                  <input ref={petPhotoRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={async e => {
                    const files = Array.from(e.target.files||[]).slice(0, 10 - petPhotos.length);
                    e.target.value = "";
                    const urls: string[] = [];
                    for (const f of files) {
                      // Videos are passed through untouched; only images can be
                      // resized, and rejecting a clip here would be surprising.
                      if (!f.type.startsWith("image/")) { urls.push(URL.createObjectURL(f)); continue; }
                      try {
                        const img = await prepareImage(f);
                        const note = shrinkNotice(img);
                        if (note) toast.success(note);
                        urls.push(img.url);
                      } catch (err) { toast.error((err as Error).message); }
                    }
                    if (urls.length) setPetPhotos(p => [...p, ...urls].slice(0,10));
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
                      <span style={{ fontSize: 35.5 }}>📄</span>
                      <div className="dt" style={{ fontSize: 16 }}>Upload Documents</div>
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
                <button className="save" onClick={savePetRecord}>{editingId !== null ? "Save Changes" : "Upload"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}