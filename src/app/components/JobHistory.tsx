import React, { useState } from "react";
import { Briefcase, Plus, X, MapPin, Calendar, DollarSign, User, ChevronDown, ChevronUp, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

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

export function JobHistory() {
  const [jobs, setJobs] = useState<Job[]>(initJobs);
  const [expanded, setExpanded] = useState<number | null>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employer:"", title:"", type:"Full-time", location:"", startDate:"", endDate:"", current:false, salary:"", supervisor:"", supervisorPhone:"", reasonLeft:"", achievements:"", notes:"" });

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

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1240, margin:"0 auto" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Job History</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Complete employment record — positions, employers, supervisors, salaries, and important documents.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
          style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Position
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {jobs.map((job, i) => (
          <div key={job.id} className="rounded-2xl overflow-hidden glow-surface" style={CARD}>
            <button className="w-full p-5 text-left" onClick={() => setExpanded(expanded === job.id ? null : job.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ width:48, height:48, background: job.current ? "rgba(72,187,120,0.12)" : "rgba(58,91,217,0.08)" }}>
                    <Briefcase size={20} color={job.current ? "#48BB78" : "var(--primary)"}/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontFamily:"var(--font-display)", fontSize:17, color:"var(--foreground)" }}>{job.title}</span>
                      {job.current && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(72,187,120,0.12)", color:"#48BB78", ...MONO }}>CURRENT</span>}
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background:"rgba(58,91,217,0.08)", color:"var(--primary)", ...MONO }}>{job.type.toUpperCase()}</span>
                    </div>
                    <div style={{ color:"var(--foreground)", fontSize:14, fontWeight:500 }}>{job.employer}</div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><MapPin size={10}/>{job.location}</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Calendar size={10}/>{job.startDate} — {job.endDate}</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><DollarSign size={10}/>{job.salary}</span>
                    </div>
                  </div>
                </div>
                {expanded === job.id ? <ChevronUp size={16} color="var(--muted-foreground)"/> : <ChevronDown size={16} color="var(--muted-foreground)"/>}
              </div>
            </button>

            {expanded === job.id && (
              <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"var(--border)" }}>
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  {[
                    { label:"Supervisor", value:job.supervisor },
                    { label:"Supervisor Phone", value:job.supervisorPhone || "—" },
                    { label:"Employment Type", value:job.type },
                    { label:"Location", value:job.location },
                    { label:"Start Date", value:job.startDate },
                    { label:"End Date", value:job.endDate },
                    { label:"Salary / Compensation", value:job.salary },
                    { label:"Reason for Leaving", value:job.reasonLeft || "N/A — Current position" },
                  ].map(f => (
                    <div key={f.label} className="px-4 py-3 rounded-xl" style={{ background:"#141B2E" }}>
                      <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:3 }}>{f.label.toUpperCase()}</div>
                      <div style={{ color:"var(--foreground)", fontSize:13 }}>{f.value}</div>
                    </div>
                  ))}
                </div>

                {job.achievements && (
                  <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(72,187,120,0.05)", border:"1px solid rgba(72,187,120,0.2)" }}>
                    <div style={{ color:"#48BB78", fontSize:10, ...MONO, marginBottom:4 }}>KEY ACHIEVEMENTS</div>
                    <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{job.achievements}</div>
                  </div>
                )}

                {job.notes && (
                  <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.05)", border:"1px solid rgba(246,173,85,0.2)" }}>
                    <div style={{ color:"#F6AD55", fontSize:10, ...MONO, marginBottom:4 }}>NOTES</div>
                    <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{job.notes}</div>
                  </div>
                )}

                {job.documents.length > 0 && (
                  <div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:8 }}>DOCUMENTS ({job.documents.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {job.documents.map(d => (
                        <button key={d} onClick={() => toast.success(`Opening: ${d}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                          style={{ background:"rgba(58,91,217,0.07)", color:"var(--primary)", border:"1px solid rgba(58,91,217,0.15)" }}>
                          📄 {d}
                        </button>
                      ))}
                      <ScanButton folder="legal" onUpload={doc => { setJobs(p => p.map(j => j.id === job.id ? { ...j, documents:[...j.documents, doc.name] } : j)); toast.success(`"${doc.name}" added`); }} size="sm" label="Add Document"/>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Employment Record</h3>
              <button onClick={() => setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            {[["Job Title *","title","e.g. Senior Manager"],["Employer / Company *","employer","e.g. TechCorp Inc."],["Location","location","e.g. New York, NY"],["Start Date","startDate","e.g. Jan 2020"],["End Date","endDate","e.g. Mar 2024 (leave blank if current)"],["Salary","salary","e.g. $85,000/year"],["Supervisor Name","supervisor",""],["Supervisor Phone","supervisorPhone",""],["Reason for Leaving","reasonLeft","Leave blank if current position"],["Key Achievements","achievements","Notable accomplishments"],["Notes","notes","Benefits, pension info, etc."]].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key as keyof typeof form)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>EMPLOYMENT TYPE</label>
              <select value={form.type} onChange={F("type")} style={INPUT}>
                {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 py-1">
              <input type="checkbox" id="current" checked={form.current} onChange={e => setForm(p=>({...p,current:e.target.checked}))} style={{ width:16, height:16 }}/>
              <label htmlFor="current" style={{ color:"var(--foreground)", fontSize:13 }}>This is my current position</label>
            </div>
            <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (offer letter, W-2, contract)" sectionId="job-history" sectionLabel="Job History"/>
            <div className="flex gap-3 pt-2">
              <button onClick={addJob} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Record</button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
