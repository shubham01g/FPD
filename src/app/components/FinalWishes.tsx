import React, { useState } from "react";
import {
  Heart, FileText, Church, HelpCircle, Plus, ChevronRight,
  Save, CheckCircle, Edit2, Trash2, ChevronDown
} from "lucide-react";

type Tab = "wishes" | "funeral" | "questionnaire";

const questionnaireCategories = [
  {
    title: "Personal Values & Beliefs",
    questions: [
      { id: "q1", q: "What values do you most want passed on to your family?", a: "Integrity, compassion, and always putting family first. Work hard but never sacrifice health for money." },
      { id: "q2", q: "What is your religious or spiritual preference for end-of-life?", a: "Non-denominational Christian service preferred. Simple and intimate." },
      { id: "q3", q: "Do you have any cultural traditions to be honored?", a: "" },
    ],
  },
  {
    title: "Medical Wishes",
    questions: [
      { id: "q4", q: "Do you have a Do Not Resuscitate (DNR) order?", a: "Yes — on file with my primary care physician Dr. Karen Fields." },
      { id: "q5", q: "Do you wish to be an organ donor?", a: "Yes, all viable organs." },
      { id: "q6", q: "Your wishes regarding life-sustaining treatment?", a: "If in a permanent vegetative state, discontinue life support after 30 days." },
    ],
  },
  {
    title: "Final Arrangements",
    questions: [
      { id: "q7", q: "Burial or cremation?", a: "Cremation. Scatter ashes at Big Sur, California." },
      { id: "q8", q: "Preferred funeral home or service?", a: "Green Valley Funeral Services, Sacramento CA." },
      { id: "q9", q: "Music or readings for memorial service?", a: "Amazing Grace, reading from Psalm 23." },
    ],
  },
];

const funeralPlan = {
  serviceType: "Memorial Service",
  location: "Green Valley Funeral Services, 1240 Oak Street, Sacramento, CA 95814",
  preferredDate: "Within 10 days of passing",
  budget: "$8,000–$12,000",
  prearranged: true,
  prearrangedWith: "Green Valley Funeral Services — Contract #GV-2024-8821",
  music: ["Amazing Grace", "How Great Thou Art", "Fly Me to the Moon"],
  readings: ["Psalm 23", "John 14:1-6"],
  flowers: "White lilies and blue hydrangeas",
  reception: "Family home — catered by Mario's Italian Kitchen",
  obituaryDraft: "James William Doe, beloved husband, father, and friend, passed peacefully surrounded by his family...",
  specialRequests: "No black attire — please wear bright colors to celebrate a life well lived.",
};

const finalWishes = [
  { id: 1, category: "Personal Property", item: "1967 Ford Mustang (Red)", recipient: "Michael Doe (Son)", notes: "Keep it in the family. Never sell it." },
  { id: 2, category: "Sentimental Items", item: "Grandfather's pocket watch", recipient: "Emily Doe (Daughter)", notes: "Has been in the family since 1892." },
  { id: 3, category: "Financial", item: "Savings account at First National", recipient: "Sarah Johnson (Spouse)", notes: "Primary beneficiary already designated." },
  { id: 4, category: "Personal Property", item: "Book collection (600+ volumes)", recipient: "Local Public Library", notes: "Donate the entire collection." },
  { id: 5, category: "Digital", item: "Photography portfolio (hard drives)", recipient: "Michael Doe (Son)", notes: "Archive and publish the wildlife series." },
];

const wills = [
  { id: 1, type: "Last Will & Testament", attorney: "Linda Torres, Esq.", dateExecuted: "March 15, 2026", lastReviewed: "March 15, 2026", status: "current", location: "Original: Safe deposit box, Copy: Legacy Vault" },
  { id: 2, type: "Living Will / Advance Directive", attorney: "Linda Torres, Esq.", dateExecuted: "March 15, 2026", lastReviewed: "March 15, 2026", status: "current", location: "On file with Dr. Karen Fields & Legacy Vault" },
  { id: 3, type: "Durable Power of Attorney", attorney: "Linda Torres, Esq.", dateExecuted: "March 15, 2026", lastReviewed: "March 15, 2026", status: "current", location: "Legacy Vault" },
];

export function FinalWishes() {
  const [tab, setTab] = useState<Tab>("wishes");
  const [expandedCat, setExpandedCat] = useState<number | null>(0);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questionnaireCategories.flatMap(c => c.questions).map(q => [q.id, q.a]))
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "wishes",        label: "Final Wishes",    icon: <Heart size={15} /> },
    { id: "funeral",       label: "Funeral Planning", icon: <Church size={15} /> },
    { id: "questionnaire", label: "Questionnaire",    icon: <HelpCircle size={15} /> },
  ];

  const completedAnswers = Object.values(answers).filter(a => a.trim().length > 0).length;
  const totalQuestions = questionnaireCategories.flatMap(c => c.questions).length;

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4 }}>Final Wishes</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Document your wishes, legal instruments, and funeral preferences in one secure place.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--card)", width: "fit-content" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: tab === t.id ? "var(--primary)" : "transparent", color: tab === t.id ? "#070D1A" : "var(--muted-foreground)", fontWeight: tab === t.id ? 600 : 400 }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Final Wishes */}
      {tab === "wishes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Specific items, property, or bequests you want to leave to individuals or organizations.</p>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}>
              <Plus size={14} /> Add Wish
            </button>
          </div>
          <div className="space-y-3">
            {finalWishes.map((wish, i) => (
              <div key={wish.id} className="p-5 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(58,91,217,0.1)", color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                        {wish.category.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{wish.item}</div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
                      <span style={{ color: "var(--primary)" }}>→</span> {wish.recipient}
                    </div>
                    {wish.notes && <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 6, fontStyle: "italic" }}>"{wish.notes}"</div>}
                  </div>
                  <div className="flex gap-2">
                    <button style={{ color: "var(--muted-foreground)" }}><Edit2 size={14} /></button>
                    <button style={{ color: "#FC8181" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funeral Planning */}
      {tab === "funeral" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Service Details</h3>
              <div className="space-y-3">
                {[
                  { label: "Service Type", value: funeralPlan.serviceType },
                  { label: "Location / Funeral Home", value: funeralPlan.location },
                  { label: "Preferred Timing", value: funeralPlan.preferredDate },
                  { label: "Budget Range", value: funeralPlan.budget },
                  { label: "Prearranged Contract", value: funeralPlan.prearranged ? funeralPlan.prearrangedWith : "Not prearranged" },
                ].map(f => (
                  <div key={f.label} className="flex flex-col gap-1 px-4 py-3 rounded-lg" style={{ background: "#141B2E" }}>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{f.label.toUpperCase()}</span>
                    <span style={{ color: "var(--foreground)", fontSize: 13 }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Service Preferences</h3>
              <div className="space-y-3">
                <div className="px-4 py-3 rounded-lg" style={{ background: "#141B2E" }}>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 6 }}>MUSIC</div>
                  <div className="flex flex-wrap gap-2">
                    {funeralPlan.music.map(m => (
                      <span key={m} className="px-2 py-1 rounded text-xs" style={{ background: "rgba(58,91,217,0.1)", color: "var(--primary)" }}>{m}</span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 rounded-lg" style={{ background: "#141B2E" }}>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 6 }}>READINGS</div>
                  <div className="flex flex-wrap gap-2">
                    {funeralPlan.readings.map(r => (
                      <span key={r} className="px-2 py-1 rounded text-xs" style={{ background: "rgba(110,139,255,0.1)", color: "#6E8BFF" }}>{r}</span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 rounded-lg" style={{ background: "#141B2E" }}>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 3 }}>FLOWERS</div>
                  <div style={{ color: "var(--foreground)", fontSize: 13 }}>{funeralPlan.flowers}</div>
                </div>
                <div className="px-4 py-3 rounded-lg" style={{ background: "#141B2E" }}>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 3 }}>SPECIAL REQUESTS</div>
                  <div style={{ color: "var(--foreground)", fontSize: 13 }}>{funeralPlan.specialRequests}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 12 }}>Obituary Draft</h3>
            <div className="p-4 rounded-xl glow-surface" style={{ background: "#141B2E", color: "var(--foreground)", fontSize: 14, lineHeight: 1.8 }}>
              {funeralPlan.obituaryDraft}
            </div>
            <button className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}>
              <Edit2 size={13} /> Edit Obituary
            </button>
          </div>
        </div>
      )}

      {/* Questionnaire */}
      {tab === "questionnaire" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Answer these questions to help your loved ones understand your wishes and values.</p>
            <div className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(58,91,217,0.1)", color: "var(--primary)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
              {completedAnswers}/{totalQuestions} Answered
            </div>
          </div>
          <div className="h-2 rounded-full" style={{ background: "var(--secondary)" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${(completedAnswers / totalQuestions) * 100}%`, background: "linear-gradient(90deg, #3A5BD9, #3A5BD9)" }} />
          </div>
          {questionnaireCategories.map((cat, ci) => (
            <div key={ci} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <button
                className="w-full flex items-center justify-between px-5 py-4"
                style={{ background: "var(--card)" }}
                onClick={() => setExpandedCat(expandedCat === ci ? null : ci)}
              >
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--foreground)" }}>{cat.title}</span>
                <div className="flex items-center gap-3">
                  <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                    {cat.questions.filter(q => answers[q.id]?.trim()).length}/{cat.questions.length} answered
                  </span>
                  <ChevronDown size={16} color="var(--muted-foreground)" style={{ transform: expandedCat === ci ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                </div>
              </button>
              {expandedCat === ci && (
                <div className="space-y-4 p-5 border-t" style={{ borderColor: "var(--border)", background: "#141B2E" }}>
                  {cat.questions.map(q => (
                    <div key={q.id}>
                      <div style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{q.q}</div>
                      {editingAnswer === q.id ? (
                        <div>
                          <textarea
                            value={answers[q.id]}
                            onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl"
                            style={{ background: "var(--card)", border: "1px solid var(--primary)", color: "var(--foreground)", fontSize: 14, outline: "none", resize: "vertical" }}
                          />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => setEditingAnswer(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm" style={{ background: "rgba(72,187,120,0.15)", color: "#48BB78" }}>
                              <CheckCircle size={13} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer"
                          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                          onClick={() => setEditingAnswer(q.id)}
                        >
                          <div style={{ flex: 1, color: answers[q.id] ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 13, fontStyle: answers[q.id] ? "normal" : "italic" }}>
                            {answers[q.id] || "Click to answer..."}
                          </div>
                          <Edit2 size={13} color="var(--muted-foreground)" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
