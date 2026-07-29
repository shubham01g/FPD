import React, { useState } from "react";
import { Briefcase, Plus, X, MapPin, Calendar, DollarSign, User, ChevronDown, ChevronUp, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";
import heroJobPhoto from "../../imports/jobhistory_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";

const EMP_TYPES = ["Full-time","Part-time","Contract","Freelance","Internship","Self-employed","Volunteer"];

interface Job {
  id: number;
  employer: string;
  title: string;
  type: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  salary: string;
  supervisor: string;
  supervisorPhone: string;
  reasonLeft: string;
  achievements: string;
  notes: string;
  documents: string[];
}

const initJobs: Job[] = [
  { id:1, employer:"TechCorp Inc.", title:"Senior Software Engineer", type:"Full-time", location:"Sacramento, CA (Hybrid)", startDate:"Mar 2019", endDate:"Present", current:true, salary:"$138,000/year", supervisor:"Angela Brooks", supervisorPhone:"(916) 555-0281", reasonLeft:"", achievements:"Led migration to cloud infrastructure saving $400K/year. Promoted twice.", notes:"Health insurance through employer. 401(k) with 5% match.", documents:["Offer Letter 2019","2023 W-2","2024 W-2"] },
  { id:2, employer:"DataSoft LLC", title:"Software Engineer", type:"Full-time", location:"San Francisco, CA", startDate:"Jun 2015", endDate:"Feb 2019", current:false, salary:"$95,000/year", supervisor:"Mark Chen", supervisorPhone:"(415) 555-0492", reasonLeft:"Better opportunity + relocation to Sacramento", achievements:"Built core analytics pipeline. Employee of the Quarter Q3 2017.", notes:"Reference available from Mark Chen.", documents:["DataSoft Offer Letter","2018 W-2"] },
  { id:3, employer:"Freelance Web Development", title:"Freelance Developer", type:"Freelance", location:"Remote", startDate:"Jan 2013", endDate:"May 2015", current:false, salary:"~$60,000/year", supervisor:"N/A — Self-employed", supervisorPhone:"", reasonLeft:"Transitioned to full-time employment", achievements:"Served 12 clients. Built e-commerce sites and CMS platforms.", notes:"Tax records filed as Schedule C. Copies in Legacy Vault.", documents:["2013–2014 Tax Returns"] },
  { id:4, employer:"City of Sacramento", title:"IT Help Desk Technician", type:"Full-time", location:"Sacramento, CA", startDate:"Aug 2010", endDate:"Dec 2012", current:false, salary:"$42,000/year", supervisor:"Linda Hayes", supervisorPhone:"(916) 555-0184", reasonLeft:"Career advancement — moved to software development", achievements:"Supported 400+ city employees. Reduced ticket resolution time by 35%.", notes:"State pension contributions — check CalPERS for balance.", documents:["2012 W-2","CalPERS Statement"] },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-job so nothing else in the app is affected. */
const JOB_CSS = `
.fpd-job{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-job *{box-sizing:border-box;}
.fpd-job-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-job .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-job .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-job .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-job .hbanner:hover .art{transform:scale(1.08);}
.fpd-job .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-job .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-job .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-job .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-job .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-job .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-job .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-job .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-job .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-job .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-job .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-job .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-job .hbanner{min-height:auto;} .fpd-job .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-job .hbanner h1{font-size:29px;}}

.fpd-job .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-job .card.pad{padding:28px;}
.fpd-job .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-job .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-job .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-job .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-job .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-job .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-job .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-job .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-job .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-job .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-job .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-job .kpi-mini-txt{flex:1;min-width:0;}
.fpd-job .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-job .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-job .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-job .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-job .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:420px){.fpd-job .kpi-stack{grid-template-columns:1fr;}}

/* job timeline cards */
.fpd-job .jlist{display:flex;flex-direction:column;gap:14px;}
.fpd-job .jcard{overflow:hidden;}
.fpd-job .jhead{width:100%;text-align:left;padding:20px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-job .jico{width:48px;height:48px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-job .jtitle{font-family:var(--font-display);font-size:21.5px;color:${TEXT};font-weight:600;}
.fpd-job .jbadge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:0.04em;}
.fpd-job .jemployer{color:${SOFT};font-size:17.5px;font-weight:500;margin-top:2px;}
.fpd-job .jmeta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:6px;}
.fpd-job .jmeta span{display:flex;align-items:center;gap:5px;font-size:14.5px;color:${MUTED};}
.fpd-job .jbody{padding:0 20px 20px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-job .jgrid{display:grid;grid-template-columns:repeat(2,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-top:16px;}
.fpd-job .jgrid .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-job .jgrid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-job .tile{padding:12px 14px;}
.fpd-job .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-job .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
.fpd-job .callout{padding:12px 14px;border-radius:16px;margin-top:14px;}
.fpd-job .callout .ck{font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.06em;margin-bottom:4px;}
.fpd-job .callout .cv{color:${TEXT};font-size:16px;line-height:1.6;}
.fpd-job .docs-lbl{font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.08em;color:${MUTED};margin-bottom:8px;margin-top:14px;}
.fpd-job .docchip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:18px;font-size:14.5px;background:rgba(91,110,225,0.08);color:#6FAE8B;border:1px solid rgba(91,110,225,0.18);cursor:pointer;font-family:var(--font-body);}
@media (max-width:640px){
.fpd-job .jgrid{grid-template-columns:1fr;}
.fpd-job .jgrid .tile:nth-child(2n){border-left:none;}
.fpd-job .jgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

/* modal */
.fpd-job .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-job .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-job .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-job .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-job .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-job .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-job .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-job .field input,.fpd-job .field select{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-job .field input::placeholder{color:${FAINT};}
.fpd-job .field input:focus,.fpd-job .field select:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-job .checkrow{display:flex;align-items:center;gap:10px;padding:2px 0;}
.fpd-job .checkrow label{color:${SOFT};font-size:16px;}
.fpd-job .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-job .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-job .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function JobHistory() {
  const [jobs, setJobs] = useState<Job[]>(initJobs);
  const [expanded, setExpanded] = useState<number | null>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employer:"", title:"", type:"Full-time", location:"", startDate:"", endDate:"", current:false, salary:"", supervisor:"", supervisorPhone:"", reasonLeft:"", achievements:"", notes:"" });
  const jlistRef = React.useRef<HTMLDivElement>(null);

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function addJob() {
    if (!form.employer || !form.title) { toast.error("Employer and title required"); return; }
    const job: Job = { ...form, id:Date.now(), endDate:form.current ? "Present" : form.endDate, documents:[] };
    setJobs(p => [job, ...p]);
    toast.success(`${form.title} at ${form.employer} added`);
    setForm({ employer:"", title:"", type:"Full-time", location:"", startDate:"", endDate:"", current:false, salary:"", supervisor:"", supervisorPhone:"", reasonLeft:"", achievements:"", notes:"" });
    setShowAdd(false);
  }

  const employerCount = new Set(jobs.map(j => j.employer)).size;
  const docCount = jobs.reduce((sum, j) => sum + j.documents.length, 0);
  const currentJob = jobs.find(j => j.current);

  const kpis = [
    { label: "Positions on Record", value: String(jobs.length), sub: "Full employment timeline", icon: <Briefcase size={14} />, dot: ACCENT2 },
    { label: "Current Role", value: currentJob ? "Active" : "None", sub: currentJob ? `${currentJob.title} · ${currentJob.employer}` : "No active position", icon: <CheckCircle size={14} />, dot: POS },
    { label: "Employers", value: String(employerCount), sub: employerCount === 1 ? "Company on file" : "Companies on file", icon: <User size={14} />, dot: ACCENT2 },
    { label: "Documents on File", value: String(docCount), sub: "Offer letters, W-2s & more", icon: <Upload size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-job">
      <style dangerouslySetInnerHTML={{ __html: JOB_CSS }} />
      <div className="fpd-job-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroJobPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Your Working Life, Documented</span>
            <h1>Every role, every employer — <span className="accent">one complete timeline.</span></h1>
            <p>Titles, employers, dates, and documents — a full record of your career for reference or estate purposes.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setShowAdd(true)}>
                <Plus size={15}/> Add Position
              </button>
              <button className="hbtn ghost" onClick={() => jlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Briefcase size={15}/> View Timeline
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Briefcase size={12} /> EMPLOYMENT RECORD</div>
            <h1 className="pg-h1">Job History</h1>
            <div className="pg-sub">
              Complete employment record — positions, employers, supervisors, salaries, and important documents.
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Position
          </button>
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

        {/* ── Timeline ── */}
        <div className="jlist" ref={jlistRef}>
          {jobs.map(job => (
            <div key={job.id} className="card jcard">
              <button className="jhead" onClick={() => setExpanded(expanded === job.id ? null : job.id)}>
                <div className="flex items-start gap-4">
                  <div className="jico" style={{ background: job.current ? "rgba(95,190,145,0.14)" : "rgba(91,110,225,0.10)" }}>
                    <Briefcase size={20} color={job.current ? POS : ACCENT2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 3 }}>
                      <span className="jtitle">{job.title}</span>
                      {job.current && <span className="jbadge" style={{ background: "rgba(95,190,145,0.16)", color: "#D99A6B" }}>CURRENT</span>}
                      <span className="jbadge" style={{ background: "rgba(91,110,225,0.14)", color: "#6FAE8B" }}>{job.type.toUpperCase()}</span>
                    </div>
                    <div className="jemployer">{job.employer}</div>
                    <div className="jmeta">
                      <span><MapPin size={10} />{job.location}</span>
                      <span><Calendar size={10} />{job.startDate} — {job.endDate}</span>
                      <span><DollarSign size={10} />{job.salary}</span>
                    </div>
                  </div>
                </div>
                {expanded === job.id ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
              </button>

              {expanded === job.id && (
                <div className="jbody">
                  <div className="jgrid">
                    {[
                      { label: "Supervisor", value: job.supervisor },
                      { label: "Supervisor Phone", value: job.supervisorPhone || "—" },
                      { label: "Employment Type", value: job.type },
                      { label: "Location", value: job.location },
                      { label: "Start Date", value: job.startDate },
                      { label: "End Date", value: job.endDate },
                      { label: "Salary / Compensation", value: job.salary },
                      { label: "Reason for Leaving", value: job.reasonLeft || "N/A — Current position" },
                    ].map(f => (
                      <div key={f.label} className="tile">
                        <div className="tk">{f.label}</div>
                        <div className="tv">{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {job.achievements && (
                    <div className="callout" style={{ background: "rgba(95,190,145,0.06)", border: "1px solid rgba(95,190,145,0.2)" }}>
                      <div className="ck" style={{ color: "#D99A6B" }}>KEY ACHIEVEMENTS</div>
                      <div className="cv">{job.achievements}</div>
                    </div>
                  )}

                  {job.notes && (
                    <div className="callout" style={{ background: "rgba(217,165,94,0.06)", border: "1px solid rgba(217,165,94,0.2)" }}>
                      <div className="ck" style={{ color: WARN }}>NOTES</div>
                      <div className="cv">{job.notes}</div>
                    </div>
                  )}

                  {job.documents.length > 0 && (
                    <div>
                      <div className="docs-lbl">DOCUMENTS ({job.documents.length})</div>
                      <div className="flex flex-wrap gap-2">
                        {job.documents.map(d => (
                          <button key={d} className="docchip" onClick={() => toast.success(`Opening: ${d}`)}>
                            📄 {d}
                          </button>
                        ))}
                        <ScanButton folder="legal" onUpload={doc => { setJobs(p => p.map(j => j.id === job.id ? { ...j, documents: [...j.documents, doc.name] } : j)); toast.success(`"${doc.name}" added`); }} size="sm" label="Add Document" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Add modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>Add Employment Record</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                {[["Job Title *","title","e.g. Senior Manager"],["Employer / Company *","employer","e.g. TechCorp Inc."],["Location","location","e.g. New York, NY"],["Start Date","startDate","e.g. Jan 2020"],["End Date","endDate","e.g. Mar 2024 (leave blank if current)"],["Salary","salary","e.g. $85,000/year"],["Supervisor Name","supervisor",""],["Supervisor Phone","supervisorPhone",""],["Reason for Leaving","reasonLeft","Leave blank if current position"],["Key Achievements","achievements","Notable accomplishments"],["Notes","notes","Benefits, pension info, etc."]].map(([label,key,ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(form as any)[key]} onChange={F(key as keyof typeof form)} placeholder={ph} />
                  </div>
                ))}
                <div className="field">
                  <label>EMPLOYMENT TYPE</label>
                  <select value={form.type} onChange={F("type")}>
                    {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="checkrow">
                  <input type="checkbox" id="current" checked={form.current} onChange={e => setForm(p => ({ ...p, current: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <label htmlFor="current">This is my current position</label>
                </div>
                <AttachDocumentField value={null} onChange={doc => { if (doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (offer letter, W-2, contract)" sectionId="job-history" sectionLabel="Job History" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addJob}>Add Record</button>
                <button className="btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
