import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Video, Star, Trophy, Target, Heart, PawPrint, Plus, Edit2, Play, X, Upload, ImageIcon, Mic, Volume2, Square, Pause, Circle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

type Tab = "memories" | "messages" | "audio" | "kids" | "keepsakes" | "goals" | "awards" | "pets";

const memories = [
  { id: 1, title: "Family Christmas 2024", date: "Dec 25, 2024", type: "photo", description: "Last Christmas at the Sacramento house. All four kids were home.", tags: ["family", "christmas", "2024"] },
  { id: 2, title: "Michael's Wedding Day", date: "Jun 12, 2022", type: "photo", description: "Michael married Amanda Torres in Napa Valley. One of the best days of my life.", tags: ["michael", "wedding", "family"] },
  { id: 3, title: "Big Sur Camping Trip", date: "Aug 8, 2023", type: "video", description: "Three-day camping trip with the grandkids. Tyler caught his first fish.", tags: ["outdoors", "grandkids", "camping"] },
  { id: 4, title: "Dad's 60th Birthday Celebration", date: "Nov 14, 2021", type: "photo", description: "Surprise party at Mario's. Family flew in from three states.", tags: ["birthday", "family", "milestone"] },
];

const videoMessages = [
  { id: 1, title: "Message to Sarah", recipient: "Sarah Johnson (Spouse)", duration: "12:42", recorded: "Apr 10, 2026", description: "Personal message, life advice, and final words of love." },
  { id: 2, title: "Message to Michael", recipient: "Michael Doe (Son)", duration: "8:17", recorded: "Apr 10, 2026", description: "Career advice, life lessons, and proud father's farewell." },
  { id: 3, title: "Message to Emily", recipient: "Emily Doe (Daughter)", duration: "9:03", recorded: "Apr 10, 2026", description: "Personal message and encouragement for her future." },
  { id: 4, title: "Message to Grandchildren", recipient: "Tyler, Lily, & Jack Doe", duration: "6:28", recorded: "Apr 10, 2026", description: "Stories, life wisdom, and grandfather's love for the next generation." },
];

const audioMessages = [
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
  in_progress: { color: "#2040C0", bg: "rgba(32,64,192,0.12)", label: "IN PROGRESS" },
  not_started: { color: "var(--muted-foreground)", bg: "var(--secondary)", label: "NOT STARTED" },
};

const INPUT: React.CSSProperties = { background:"rgba(32,64,192,0.05)", border:"1px solid rgba(32,64,192,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };

export function FamilyMemories() {
  const [tab, setTab] = useState<Tab>("memories");
  const [memoriesList, setMemoriesList] = useState(memories);
  const [messagesList, setMessagesList] = useState(videoMessages);
  const [audioList, setAudioList] = useState(audioMessages);

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

  function saveAudioMessage() {
    if (!recTitle.trim()) { toast.error("Please enter a title for the recording"); return; }
    const duration = formatTime(recSeconds);
    setAudioList(p => [...p, {
      id: Date.now(),
      title: recTitle,
      recipient: recRecipient || "Family",
      duration,
      recorded: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      description: recDesc || `Audio recording — ${duration}`,
    }]);
    toast.success(`"${recTitle}" saved to Audio Messages`);
    // cleanup
    if (recUrl) URL.revokeObjectURL(recUrl);
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
      case "memories":
        if (!form.title) { toast.error("Title required"); return; }
        setMemoriesList(p=>[...p,{id:Date.now(),title:form.title,date:form.date||new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),type:form.type||"photo",description:form.desc||"",tags:(form.tags||"").split(",").map(t=>t.trim()).filter(Boolean)}]);
        toast.success(`"${form.title}" added to Memories`); break;
      case "messages":
        if (!form.title) { toast.error("Title required"); return; }
        setMessagesList(p=>[...p,{id:Date.now(),title:form.title,recipient:form.recipient||"Family",duration:"0:00",recorded:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),description:form.desc||""}]);
        toast.success(`"${form.title}" video message added`); break;
      case "audio":
        if (!form.title) { toast.error("Title required"); return; }
        setAudioList(p=>[...p,{id:Date.now(),title:form.title,recipient:form.recipient||"Family",duration:"0:00",recorded:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),description:form.desc||""}]);
        toast.success(`"${form.title}" audio message added`); break;
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
    memories:  [{key:"title",label:"Title *",ph:"e.g. Christmas 2025"},{key:"date",label:"Date",ph:"e.g. Dec 25, 2025"},{key:"type",label:"Type (photo/video)",ph:"photo"},{key:"desc",label:"Description",ph:"What happened?"},{key:"tags",label:"Tags (comma-separated)",ph:"family, holiday"}],
    messages:  [{key:"title",label:"Message Title *",ph:"e.g. Message to Sarah"},{key:"recipient",label:"Recipient",ph:"e.g. Sarah Johnson (Spouse)"},{key:"desc",label:"Description",ph:"What this message covers"}],
    audio:     [{key:"title",label:"Audio Message Title *",ph:"e.g. Life Advice for Michael"},{key:"recipient",label:"Recipient",ph:"e.g. Michael Doe (Son)"},{key:"desc",label:"Description",ph:"What this recording covers"}],
    kids:      [{key:"name",label:"Child's Name & Relation *",ph:"e.g. Tyler Doe (Grandson, age 8)"},{key:"school",label:"School",ph:""},{key:"activities",label:"Activities (comma-separated)",ph:"Baseball, Swimming"},{key:"notes",label:"Notes",ph:""}],
    keepsakes: [{key:"item",label:"Item Name *",ph:"e.g. Grandfather's Watch"},{key:"location",label:"Where It Is",ph:""},{key:"value",label:"Value",ph:"e.g. Sentimental / ~$500"},{key:"intendedFor",label:"Intended For",ph:""},{key:"story",label:"Story / Significance",ph:"Why this item matters"}],
    goals:     [{key:"goal",label:"Goal *",ph:"e.g. Pay off mortgage"},{key:"progress",label:"Current Progress (%)",ph:"0"},{key:"notes",label:"Notes",ph:""}],
    awards:    [{key:"award",label:"Award Name *",ph:""},{key:"year",label:"Year",ph:String(new Date().getFullYear())},{key:"org",label:"Organization",ph:""},{key:"category",label:"Category",ph:"e.g. Military, Professional"},{key:"desc",label:"Description",ph:""}],
    pets: [], // pets use dedicated PetForm modal
  };

  const tabs = [
    { id: "memories" as Tab, label: "Memories", icon: <Camera size={14} /> },
    { id: "messages" as Tab, label: "Video Messages", icon: <Video size={14} /> },
    { id: "audio" as Tab,    label: "Audio Messages", icon: <Mic size={14} /> },
    { id: "kids" as Tab, label: "Kids & Family", icon: <Heart size={14} /> },
    { id: "keepsakes" as Tab, label: "Keepsakes", icon: <Star size={14} /> },
    { id: "goals" as Tab, label: "Goals", icon: <Target size={14} /> },
    { id: "awards" as Tab, label: "Awards", icon: <Trophy size={14} /> },
    { id: "pets" as Tab, label: "Pets", icon: <PawPrint size={14} /> },
  ];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4 }}>Family & Memories</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Preserve your stories, messages, keepsakes, and the things that matter most.</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: "var(--card)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ background: tab === t.id ? "var(--primary)" : "transparent", color: tab === t.id ? "#070D1A" : "var(--muted-foreground)", fontWeight: tab === t.id ? 600 : 400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "memories" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setShowAdd("memories")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Memory</button></div>
          <div className="grid md:grid-cols-2 gap-4">
            {memoriesList.map(m => (
              <div key={m.id} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  {m.type === "video" ? <Video size={16} color="var(--primary)" /> : <Camera size={16} color="var(--primary)" />}
                  <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{m.date}</span>
                  <span className="px-2 py-0.5 rounded text-xs capitalize ml-auto" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{m.type}</span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--foreground)", marginBottom: 6 }}>{m.title}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>{m.description}</div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {m.tags.map(tag => <span key={tag} className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(32,64,192,0.1)", color: "var(--primary)" }}>#{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "messages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Private video messages delivered to designated recipients only after your passing.</p>
            <button onClick={()=>setShowAdd("messages")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Video size={14} /> Record Message</button>
          </div>
          {messagesList.map(msg => (
            <div key={msg.id} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center rounded-xl" style={{ width: 52, height: 52, background: "rgba(32,64,192,0.1)", flexShrink: 0 }}>
                  <Play size={22} color="var(--primary)" />
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 2 }}>{msg.title}</div>
                  <div style={{ color: "var(--primary)", fontSize: 13, marginBottom: 4 }}>For: {msg.recipient}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{msg.description}</div>
                  <div className="flex items-center gap-4 mt-3">
                    <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{msg.duration}</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Recorded {msg.recorded}</span>
                    <span className="px-2 py-0.5 rounded text-xs ml-auto" style={{ background: "rgba(72,187,120,0.12)", color: "#48BB78", fontFamily: "var(--font-mono)" }}>SECURED</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "audio" && (
        <div className="space-y-5">
          <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Record your voice for loved ones — stories, life advice, love letters, songs. Private audio messages delivered after your passing.</p>

          {/* ── Recorder ─────────────────────────────────────────────── */}
          <div className="p-6 rounded-2xl space-y-4" style={{ background:"rgba(159,122,234,0.06)", border:"2px solid rgba(159,122,234,0.2)" }}>
            <div style={{ color:"#9F7AEA", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:"0.1em" }}>🎙️ AUDIO RECORDER</div>

            {/* Mic error */}
            {micError && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)" }}>
                {micError}
              </div>
            )}

            {/* Idle — prompt to record */}
            {recState === "idle" && !recBlob && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center justify-center rounded-full"
                  style={{ width:80, height:80, background:"rgba(159,122,234,0.12)", border:"2px solid rgba(159,122,234,0.25)" }}>
                  <Mic size={36} color="#9F7AEA"/>
                </div>
                <div style={{ color:"var(--muted-foreground)", fontSize:13, textAlign:"center" }}>
                  Press Record to start capturing your audio message.<br/>Your microphone will be activated.
                </div>
                <button onClick={startRecording}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F", boxShadow:"0 4px 20px rgba(159,122,234,0.4)" }}>
                  <Circle size={14} color="#FC8181" fill="#FC8181"/> Record
                </button>
              </div>
            )}

            {/* Recording / Paused */}
            {(recState === "recording" || recState === "paused") && (
              <div className="flex flex-col items-center gap-4 py-2">
                {/* Animated indicator */}
                <div className="flex items-center gap-3">
                  <div style={{ width:12, height:12, borderRadius:"50%", background:"#FC8181", animation:recState==="recording"?"pulse 1s ease-in-out infinite":"none", opacity:recState==="recording"?1:0.4 }}/>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:32, color:"var(--foreground)", fontWeight:700, letterSpacing:"0.05em" }}>
                    {formatTime(recSeconds)}
                  </span>
                  <span style={{ color:recState==="recording"?"#FC8181":"#F6AD55", fontSize:11, fontFamily:"var(--font-mono)", fontWeight:700 }}>
                    {recState==="recording" ? "● REC" : "⏸ PAUSED"}
                  </span>
                </div>

                {/* Waveform animation (CSS) */}
                {recState === "recording" && (
                  <div className="flex items-center gap-0.5" style={{ height:32 }}>
                    {Array.from({length:20}).map((_,i)=>(
                      <div key={i} style={{ width:3, borderRadius:2, background:"#9F7AEA", animation:`pulse ${0.4+Math.random()*0.6}s ease-in-out ${i*0.05}s infinite alternate`, opacity:0.7, height:`${20+Math.floor(Math.random()*60)}%` }}/>
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {recState === "recording" ? (
                    <button onClick={pauseRecording}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                      style={{ background:"rgba(246,173,85,0.15)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.3)" }}>
                      <Pause size={14}/> Pause
                    </button>
                  ) : (
                    <button onClick={resumeRecording}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                      style={{ background:"rgba(159,122,234,0.15)", color:"#9F7AEA", border:"1px solid rgba(159,122,234,0.3)" }}>
                      <Mic size={14}/> Resume
                    </button>
                  )}
                  <button onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                    style={{ background:"rgba(252,129,129,0.15)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.3)" }}>
                    <Square size={14}/> Stop & Save
                  </button>
                </div>
              </div>
            )}

            {/* Done — preview and save */}
            {recState === "done" && recUrl && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.2)" }}>
                  <Volume2 size={16} color="#48BB78"/>
                  <span style={{ color:"#48BB78", fontSize:13, fontWeight:600 }}>Recording complete — {formatTime(recSeconds)}</span>
                </div>

                {/* Native audio player */}
                <audio src={recUrl} controls style={{ width:"100%", borderRadius:10 }}/>

                {/* Title + recipient + desc */}
                {[
                  { label:"Message Title *", val:recTitle, setter:setRecTitle, ph:"e.g. Life Advice for Michael" },
                  { label:"Recipient", val:recRecipient, setter:setRecRecipient, ph:"e.g. Michael Doe (Son)" },
                  { label:"Description", val:recDesc, setter:setRecDesc, ph:"What this recording is about" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:4, fontFamily:"var(--font-mono)" }}>{f.label.toUpperCase()}</label>
                    <input value={f.val} onChange={e=>f.setter(e.target.value)} placeholder={f.ph}
                      style={{ background:"rgba(32,64,192,0.05)", border:"1px solid rgba(32,64,192,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" }}/>
                  </div>
                ))}

                <div className="flex gap-3">
                  <button onClick={saveAudioMessage}
                    className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F" }}>
                    <Volume2 size={14}/> Save Audio Message
                  </button>
                  <button onClick={discardRecording}
                    className="px-4 py-3 rounded-xl text-sm"
                    style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Saved audio messages ──────────────────────────────────── */}
          {audioList.length > 0 && (
            <div>
              <div style={{ color:"var(--muted-foreground)", fontSize:11, fontFamily:"var(--font-mono)", marginBottom:10 }}>SAVED AUDIO MESSAGES ({audioList.length})</div>
              <div className="space-y-3">
                {audioList.map(msg => (
                  <div key={msg.id} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                        style={{ width: 52, height: 52, background: "rgba(159,122,234,0.1)" }}>
                        <Volume2 size={22} color="#9F7AEA"/>
                      </div>
                      <div className="flex-1">
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 2 }}>{msg.title}</div>
                        <div style={{ color: "#9F7AEA", fontSize: 13, marginBottom: 4 }}>For: {msg.recipient}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{msg.description}</div>
                        <div className="flex items-center gap-4 mt-3">
                          <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{msg.duration}</span>
                          <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Recorded {msg.recorded}</span>
                          <button
                            onClick={() => toast.success(`▶ Playing: ${msg.title}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ml-auto"
                            style={{ background: "rgba(159,122,234,0.1)", color: "#9F7AEA" }}>
                            <Play size={11}/> Play
                          </button>
                          <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(72,187,120,0.12)", color: "#48BB78", fontFamily: "var(--font-mono)" }}>SECURED</span>
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

      {tab === "kids" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setShowAdd("kids")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Child</button></div>
          {kidsList.map(kid => (
            <div key={kid.id} className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--foreground)", marginBottom: 4 }}>{kid.child}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 12 }}>School: {kid.school}</div>
              <div className="mb-3">
                <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 8 }}>ACTIVITIES</div>
                <div className="flex flex-wrap gap-2">
                  {kid.activities.map(a => <span key={a} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "rgba(32,64,192,0.1)", color: "var(--primary)" }}>{a}</span>)}
                </div>
              </div>
              {kid.notes && <div className="px-4 py-3 rounded-lg" style={{ background: "#EAF0FC" }}><span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Notes: {kid.notes}</span></div>}
            </div>
          ))}
        </div>
      )}

      {tab === "keepsakes" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setShowAdd("keepsakes")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Keepsake</button></div>
          {keepsakesList.map(k => (
            <div key={k.id} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 4 }}>{k.item}</div>
                  <div style={{ color: "var(--primary)", fontSize: 13, marginBottom: 8 }}>→ {k.intendedFor}</div>
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    {[{ label: "Location", value: k.location }, { label: "Estimated Value", value: k.value }].map(f => (
                      <div key={f.label} className="px-3 py-2 rounded-lg" style={{ background: "#EAF0FC" }}>
                        <div style={{ color: "var(--muted-foreground)", fontSize: 10 }}>{f.label.toUpperCase()}</div>
                        <div style={{ color: "var(--foreground)", fontSize: 12 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic", lineHeight: 1.6 }}>"{k.story}"</div>
                </div>
                <button style={{ color: "var(--muted-foreground)" }}><Edit2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "goals" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setShowAdd("goals")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Goal</button></div>
          {goalsList.map(g => {
            const s = statusStyles[g.status as keyof typeof statusStyles];
            return (
              <div key={g.id} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 500 }}>{g.goal}</div>
                  <span className="px-2 py-1 rounded text-xs font-bold whitespace-nowrap" style={{ background: s.bg, color: s.color, fontFamily: "var(--font-mono)" }}>{s.label}</span>
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Progress</span>
                    <span style={{ color: s.color, fontSize: 12, fontFamily: "var(--font-mono)" }}>{g.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "var(--secondary)" }}>
                    <div className="h-2 rounded-full" style={{ width: `${g.progress}%`, background: s.color }} />
                  </div>
                </div>
                {g.notes && <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 6 }}>{g.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "awards" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setShowAdd("awards")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Award</button></div>
          {awardsList.map(a => (
            <div key={a.id} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-start gap-4">
                <div className="rounded-xl p-3" style={{ background: "rgba(32,64,192,0.1)", flexShrink: 0 }}>
                  <Trophy size={20} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 2 }}>{a.award}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{a.organization} · {a.year}</div>
                  <div className="mt-2">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{a.category}</span>
                  </div>
                  {a.description && <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 6 }}>{a.description}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "pets" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setShowPetForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background:"var(--primary)", color:"#070D1A", fontWeight:600 }}>
              <Plus size={14}/> Add Pet Record
            </button>
          </div>

          {petsList.map(pet => (
            <div key={pet.id} className="rounded-2xl border overflow-hidden" style={{ background:"var(--card)", borderColor:"var(--border)" }}>
              {/* Photos */}
              {pet.photos.length > 0 && (
                <div className="flex gap-2 p-3 overflow-x-auto" style={{ background:"rgba(32,64,192,0.03)" }}>
                  {pet.photos.map((url,i) => (
                    <img key={i} src={url} alt="" style={{ width:100, height:80, objectFit:"cover", borderRadius:10, flexShrink:0 }}/>
                  ))}
                </div>
              )}

              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl p-3" style={{ background:"rgba(32,64,192,0.1)" }}><PawPrint size={24} color="var(--primary)"/></div>
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--foreground)" }}>{pet.name}</div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:13 }}>{pet.breed} · {pet.gender} · {pet.colour} · Born {pet.dateOfBirth}</div>
                  </div>
                </div>

                {/* Emergency Pet Caretakers */}
                {pet.caretakers.length > 0 && (
                  <div>
                    <div style={{ fontWeight:700, color:"var(--foreground)", fontSize:14, marginBottom:8 }}>Emergency Pet Caretaker</div>
                    {pet.caretakers.map((c,i) => (
                      <div key={i} className="flex gap-4 px-4 py-3 rounded-xl mb-2" style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.2)" }}>
                        <span style={{ color:"var(--foreground)", fontSize:13 }}>{c.name}</span>
                        <span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Long Term Pet Provider */}
                {pet.providers.length > 0 && (
                  <div>
                    <div style={{ fontWeight:700, color:"var(--foreground)", fontSize:14, marginBottom:8 }}>Long Term Pet Provider</div>
                    {pet.providers.map((p,i) => (
                      <div key={i} className="flex gap-4 px-4 py-3 rounded-xl mb-2" style={{ background:"rgba(74,144,217,0.06)", border:"1px solid rgba(74,144,217,0.2)" }}>
                        <span style={{ color:"var(--foreground)", fontSize:13 }}>{p.name}</span>
                        <span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{p.phone}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Care Instructions */}
                {pet.instructions.length > 0 && (
                  <div>
                    <div style={{ fontWeight:700, color:"var(--foreground)", fontSize:14, marginBottom:8 }}>Special Care Instructions</div>
                    {pet.instructions.map((ins,i) => (
                      <div key={i} className="px-4 py-3 rounded-xl mb-2" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
                        <div className="flex gap-4 mb-1"><span style={{ color:"var(--foreground)", fontSize:13, fontWeight:600 }}>{ins.name}</span><span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{ins.phone}</span></div>
                        {ins.description && <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{ins.description}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Health Info */}
                <div>
                  <div style={{ fontWeight:700, color:"var(--foreground)", fontSize:14, marginBottom:8 }}>Health Info</div>
                  {pet.medicalHistory && <div className="px-4 py-3 rounded-xl mb-3" style={{ background:"#EAF0FC" }}><div style={{ color:"var(--muted-foreground)", fontSize:10, marginBottom:3 }}>MEDICAL HISTORY / BACK STORY</div><div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{pet.medicalHistory}</div></div>}
                  {pet.vaccinations.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-2">
                      {pet.vaccinations.map((v,i) => (
                        <div key={i} className="px-3 py-2 rounded-lg" style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.2)" }}>
                          <div style={{ color:"#48BB78", fontSize:10, fontFamily:"var(--font-mono)" }}>VACCINATION</div>
                          <div style={{ color:"var(--foreground)", fontSize:12 }}>{v.type} · {v.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vet Info */}
                <div>
                  <div style={{ fontWeight:700, color:"var(--foreground)", fontSize:14, marginBottom:8 }}>Vet Info</div>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[["Name",pet.vetName],["Phone",pet.vetPhone],["Email",pet.vetEmail]].map(([label,value])=>(
                      <div key={label} className="px-3 py-2.5 rounded-xl" style={{ background:"#EAF0FC" }}>
                        <div style={{ color:"var(--muted-foreground)", fontSize:10 }}>{(label as string).toUpperCase()}</div>
                        <div style={{ color:"var(--foreground)", fontSize:12 }}>{value||"—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feeding */}
                {pet.feedings.length > 0 && (
                  <div>
                    <div style={{ fontWeight:700, color:"var(--foreground)", fontSize:14, marginBottom:8 }}>Feeding</div>
                    {pet.feedings.map((f,i) => (
                      <div key={i} className="grid md:grid-cols-4 gap-2 mb-2">
                        {[["Food Type",f.foodType],["Time",f.timeType],["Quantity",f.quantity],["Location of Food",f.locationOfFood]].map(([label,value])=>(
                          <div key={label} className="px-3 py-2 rounded-lg" style={{ background:"#EAF0FC" }}>
                            <div style={{ color:"var(--muted-foreground)", fontSize:9 }}>{(label as string).toUpperCase()}</div>
                            <div style={{ color:"var(--foreground)", fontSize:12 }}>{value||"—"}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents */}
                {pet.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pet.documents.map(d=>(
                      <button key={d} onClick={()=>toast.success(`Opening: ${d}`)} className="px-3 py-1.5 rounded-xl text-xs" style={{ background:"rgba(32,64,192,0.07)", color:"var(--primary)", border:"1px solid rgba(32,64,192,0.15)" }}>📄 {d}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PET RECORDS FORM (matches screenshot exactly) ─────────── */}
      {showPetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.4)", maxHeight:"92vh", display:"flex", flexDirection:"column" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor:"var(--border)", background:"rgba(32,64,192,0.05)" }}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Upload Pet Records</h3>
              <button onClick={()=>{ setShowPetForm(false); resetPetForm(); }} style={{ color:"var(--muted-foreground)" }}><X size={18}/></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-6">

              {/* Upload Images or Videos */}
              <div>
                <button onClick={()=>petPhotoRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed"
                  style={{ borderColor:"rgba(32,64,192,0.3)", background:"rgba(32,64,192,0.02)" }}>
                  <ImageIcon size={32} color="var(--primary)"/>
                  <div style={{ color:"var(--foreground)", fontWeight:600, fontSize:14 }}>Upload Images or Videos</div>
                  <div style={{ color:"var(--muted-foreground)", fontSize:12 }}>Minimum 1 Maximum 10 images or videos</div>
                </button>
                <input ref={petPhotoRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => {
                  const files = Array.from(e.target.files||[]).slice(0, 10 - petPhotos.length);
                  const urls = files.map(f => URL.createObjectURL(f));
                  setPetPhotos(p => [...p, ...urls].slice(0,10));
                  e.target.value = "";
                }}/>
                {petPhotos.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {petPhotos.map((url,i)=>(
                      <div key={i} className="relative flex-shrink-0">
                        <img src={url} alt="" style={{ width:72, height:60, objectFit:"cover", borderRadius:8 }}/>
                        <button onClick={()=>setPetPhotos(p=>p.filter((_,idx)=>idx!==i))}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                          style={{ background:"#FC8181", color:"#fff" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Emergency Pet Caretaker */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>Emergency Pet Caretaker</div>
                {petCaretakers.map((c,i)=>(
                  <div key={i} className="space-y-2 mb-3">
                    <input value={c.name} onChange={e=>setPetCaretakers(p=>p.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="Name" style={INPUT}/>
                    <input value={c.phone} onChange={e=>setPetCaretakers(p=>p.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x))} placeholder="🇺🇸 +1  Phone" style={INPUT}/>
                  </div>
                ))}
                <div className="flex justify-end"><button onClick={()=>setPetCaretakers(p=>[...p,{name:"",phone:""}])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background:"var(--primary)", color:"#070D1A" }}><Plus size={12}/> Caretaker</button></div>
              </div>

              {/* Long Term Pet Provider */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>Long Term Pet Provider</div>
                {petProviders.map((p,i)=>(
                  <div key={i} className="space-y-2 mb-3">
                    <input value={p.name} onChange={e=>setPetProviders(pr=>pr.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="Name" style={INPUT}/>
                    <input value={p.phone} onChange={e=>setPetProviders(pr=>pr.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x))} placeholder="🇺🇸 +1  Phone" style={INPUT}/>
                  </div>
                ))}
                <div className="flex justify-end"><button onClick={()=>setPetProviders(p=>[...p,{name:"",phone:""}])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background:"var(--primary)", color:"#070D1A" }}><Plus size={12}/> Provider</button></div>
              </div>

              {/* Special Care Instruction */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>Special Care Instruction</div>
                {petInstructions.map((ins,i)=>(
                  <div key={i} className="space-y-2 mb-3">
                    <input value={ins.name} onChange={e=>setPetInstructions(p=>p.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="Name" style={INPUT}/>
                    <input value={ins.phone} onChange={e=>setPetInstructions(p=>p.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x))} placeholder="🇺🇸 +1  Phone" style={INPUT}/>
                    <textarea value={ins.description} onChange={e=>setPetInstructions(p=>p.map((x,idx)=>idx===i?{...x,description:e.target.value}:x))} placeholder="Description" rows={3} className="resize-none" style={INPUT}/>
                  </div>
                ))}
                <div className="flex justify-end"><button onClick={()=>setPetInstructions(p=>[...p,{name:"",phone:"",description:""}])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background:"var(--primary)", color:"#070D1A" }}><Plus size={12}/> Instruction</button></div>
              </div>

              {/* About Your Beloved Pet */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>About Your Beloved Pet</div>
                <div className="space-y-2">
                  <input value={petAbout.name} onChange={e=>setPetAbout(p=>({...p,name:e.target.value}))} placeholder="Name" style={INPUT}/>
                  <input value={petAbout.dateOfBirth} onChange={e=>setPetAbout(p=>({...p,dateOfBirth:e.target.value}))} placeholder="Date of Birth" style={INPUT}/>
                  <select value={petAbout.gender} onChange={e=>setPetAbout(p=>({...p,gender:e.target.value}))} style={INPUT}>
                    <option value="">Gender</option>
                    <option>Male</option><option>Female</option><option>Unknown</option>
                  </select>
                  <input value={petAbout.breed} onChange={e=>setPetAbout(p=>({...p,breed:e.target.value}))} placeholder="Breed" style={INPUT}/>
                  <input value={petAbout.colour} onChange={e=>setPetAbout(p=>({...p,colour:e.target.value}))} placeholder="Colour" style={INPUT}/>
                  {/* Upload Documents */}
                  <div className="flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed" style={{ borderColor:"rgba(32,64,192,0.25)", background:"rgba(32,64,192,0.02)" }}>
                    <span style={{ fontSize:28 }}>📄</span>
                    <div style={{ color:"var(--foreground)", fontWeight:600, fontSize:13 }}>Upload Documents</div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:11 }}>Minimum 1 Maximum 10 documents</div>
                    <ScanButton folder="pets" onUpload={doc=>{ setPetDocs(p=>[...p,doc.name]); toast.success(`"${doc.name}" attached`); }} size="sm" label="Scan or Upload"/>
                  </div>
                  {petDocs.length > 0 && <div className="flex flex-wrap gap-1.5">{petDocs.map(d=><span key={d} className="px-2 py-1 rounded text-xs" style={{ background:"rgba(32,64,192,0.07)", color:"var(--primary)" }}>📄 {d}</span>)}</div>}
                </div>
              </div>

              {/* Health Info */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>Health Info</div>
                <textarea value={petMedHistory} onChange={e=>setPetMedHistory(e.target.value)} placeholder="Medical History Or Back Story On Your Pet" rows={4} className="resize-none mb-3" style={INPUT}/>
                {petVaccinations.map((v,i)=>(
                  <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                    <input value={v.type} onChange={e=>setPetVaccinations(p=>p.map((x,idx)=>idx===i?{...x,type:e.target.value}:x))} placeholder="Vaccination Type" style={INPUT}/>
                    <input value={v.date} onChange={e=>setPetVaccinations(p=>p.map((x,idx)=>idx===i?{...x,date:e.target.value}:x))} placeholder="Vaccination Date" style={INPUT}/>
                  </div>
                ))}
                <div className="flex justify-end"><button onClick={()=>setPetVaccinations(p=>[...p,{type:"",date:""}])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background:"var(--primary)", color:"#070D1A" }}><Plus size={12}/> Vaccination</button></div>
              </div>

              {/* Vet Info */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>Vet Info</div>
                <div className="space-y-2">
                  <input value={petVet.vetName} onChange={e=>setPetVet(p=>({...p,vetName:e.target.value}))} placeholder="Name" style={INPUT}/>
                  <input value={petVet.vetPhone} onChange={e=>setPetVet(p=>({...p,vetPhone:e.target.value}))} placeholder="🇺🇸 +1  Phone" style={INPUT}/>
                  <input value={petVet.vetEmail} onChange={e=>setPetVet(p=>({...p,vetEmail:e.target.value}))} placeholder="Email Address" type="email" style={INPUT}/>
                </div>
              </div>

              {/* Feeding */}
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--foreground)", marginBottom:12 }}>Feeding</div>
                {petFeedings.map((f,i)=>(
                  <div key={i} className="space-y-2 mb-3">
                    <input value={f.foodType} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,foodType:e.target.value}:x))} placeholder="Food Type" style={INPUT}/>
                    <select value={f.timeType} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,timeType:e.target.value}:x))} style={INPUT}>
                      {["Morning","Afternoon","Evening","Night","As Needed"].map(t=><option key={t}>{t}</option>)}
                    </select>
                    <input value={f.quantity} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,quantity:e.target.value}:x))} placeholder="Quantity" style={INPUT}/>
                    <input value={f.locationOfFood} onChange={e=>setPetFeedings(p=>p.map((x,idx)=>idx===i?{...x,locationOfFood:e.target.value}:x))} placeholder="Location of Food" style={INPUT}/>
                  </div>
                ))}
                <div className="flex justify-end"><button onClick={()=>setPetFeedings(p=>[...p,{foodType:"",timeType:"Morning",quantity:"",locationOfFood:""}])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background:"var(--primary)", color:"#070D1A" }}><Plus size={12}/> Food</button></div>
              </div>
            </div>

            {/* Upload / Save button */}
            <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor:"var(--border)" }}>
              <button onClick={savePetRecord} className="w-full py-3.5 rounded-2xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A", fontSize:15 }}>
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Add Modal */}
      {showAdd && showAdd !== "pets" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 overflow-y-auto" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>
                Add {showAdd === "memories" ? "Memory" : showAdd === "messages" ? "Video Message" : showAdd === "audio" ? "Audio Message" : showAdd === "kids" ? "Child / Family Member" : showAdd === "keepsakes" ? "Keepsake" : showAdd === "goals" ? "Goal" : showAdd === "awards" ? "Award" : "Pet"}
              </h3>
              <button onClick={()=>{setShowAdd(null);setForm({})}} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            {(addFields[showAdd]||[]).map(f=>(
              <div key={f.key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{f.label.toUpperCase()}</label>
                <input value={form[f.key]||""} onChange={F(f.key)} placeholder={f.ph} style={INPUT}/>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={quickAdd} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add</button>
              <button onClick={()=>{setShowAdd(null);setForm({})}} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
