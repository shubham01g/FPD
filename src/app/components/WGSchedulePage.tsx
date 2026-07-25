/**
 * WGSchedulePage — Client-facing scheduling page.
 * No login required. Accessed via a secure token link the specialist sends.
 * Designed large and phone-friendly for elderly or non-tech-savvy clients.
 * When the client picks a slot, the specialist's portal updates instantly.
 */
import React, { useState, useEffect } from "react";
import { CheckCircle, Calendar, Clock, Phone, Star, ArrowRight } from "lucide-react";
import { getScheduleToken, selectSlot, subscribeToScheduleToken, type ScheduleToken } from "../services/wgClientStore";

interface WGSchedulePageProps {
  token: string;
}

export function WGSchedulePage({ token }: WGSchedulePageProps) {
  const [scheduleData, setScheduleData] = useState<ScheduleToken | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    return subscribeToScheduleToken(token, (data) => {
      setScheduleData(data);
      if (data.status === "booked") setConfirmed(true);
    });
  }, [token]);

  /* ── not found ─────────────────────────────────────────────────── */
  if (!scheduleData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background:"#F8FAFF", fontFamily:"var(--font-body)" }}>
        <div className="flex items-center justify-center rounded-full mb-4"
          style={{ width:72, height:72, background:"rgba(252,129,129,0.1)" }}>
          <Calendar size={32} color="#FC8181"/>
        </div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:"#0D1428", marginBottom:8, textAlign:"center" }}>
          Link Not Found
        </div>
        <div style={{ color:"#8A9AB8", fontSize:15, textAlign:"center", maxWidth:300, lineHeight:1.6 }}>
          This scheduling link may have expired or already been used. Please contact your specialist for a new link.
        </div>
      </div>
    );
  }

  /* ── already booked ─────────────────────────────────────────────── */
  if (confirmed || scheduleData.status === "booked") {
    const slot = scheduleData.selectedSlot;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background:"#F8FAFF", fontFamily:"var(--font-body)" }}>
        <div className="w-full max-w-sm space-y-6 text-center">

          {/* FPD logo area */}
          <div>
            <div style={{ color:"#6E90C9", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:"0.15em", marginBottom:4 }}>
              FINAL PASS DOWN
            </div>
            <div className="flex items-center justify-center gap-1">
              <Star size={14} color="#FFFFFF"/>
              <span style={{ color:"#6FAE8B", fontSize:11, fontFamily:"var(--font-mono)" }}>WHITE GLOVE SERVICE</span>
            </div>
          </div>

          {/* Success */}
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center rounded-full"
              style={{ width:96, height:96, background:"rgba(72,187,120,0.12)", border:"3px solid rgba(72,187,120,0.3)" }}>
              <CheckCircle size={44} color="#FFFFFF"/>
            </div>
          </div>

          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:"#0D1428", marginBottom:8 }}>
              You're all set!
            </div>
            <div style={{ color:"#5A6A88", fontSize:16, lineHeight:1.6 }}>
              Your appointment is confirmed with{" "}
              <strong style={{ color:"#0D1428" }}>{scheduleData.specialistName}</strong>.
            </div>
          </div>

          {/* Confirmed slot */}
          {slot && (
            <div className="p-5 rounded-2xl text-left glow-surface"
              style={{ background:"rgba(72,187,120,0.07)", border:"2px solid rgba(72,187,120,0.25)" }}>
              <div style={{ color:"#8A9AB8", fontSize:12, fontFamily:"var(--font-mono)", marginBottom:6 }}>
                YOUR APPOINTMENT
              </div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:"#0D1428" }}>
                {slot.label}
              </div>
              <div style={{ color:"#5A6A88", fontSize:13, marginTop:6 }}>
                {scheduleData.specialistName} will call you at the number on file.
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl glow-surface" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
            <div style={{ color:"#5A6A88", fontSize:13, lineHeight:1.7 }}>
              <strong style={{ color:"#0D1428" }}>What to have ready:</strong><br/>
              Any documents you'd like to upload — wills, insurance policies, photos, medical records — have them nearby so your specialist can walk you through everything.
            </div>
          </div>

          <div style={{ color:"#B0C0DC", fontSize:12 }}>
            Need to reschedule? Call us at <strong style={{ color:"#6E90C9" }}>(800) 555-0199</strong>
          </div>
        </div>
      </div>
    );
  }

  /* ── slot picker ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#F8FAFF", fontFamily:"var(--font-body)" }}>

      {/* Header */}
      <div className="px-6 py-8 text-center" style={{ background:"#fff", borderBottom:"1px solid rgba(91,110,225,0.08)" }}>
        <div style={{ color:"#6E90C9", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:"0.15em", marginBottom:6 }}>
          FINAL PASS DOWN
        </div>
        <div className="flex items-center justify-center gap-1 mb-4">
          <Star size={13} color="#FFFFFF"/>
          <span style={{ color:"#6FAE8B", fontSize:11, fontFamily:"var(--font-mono)" }}>WHITE GLOVE SERVICE</span>
        </div>

        {/* Specialist avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center rounded-full font-bold"
            style={{ width:72, height:72, background:"rgba(91,167,214,0.15)", color:"#6FAE8B", fontSize:26, fontFamily:"var(--font-display)", border:"3px solid rgba(91,167,214,0.3)" }}>
            {scheduleData.specialistName.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#0D1428" }}>
              Hi, {scheduleData.clientName.split(" ")[0]}! 👋
            </div>
            <div style={{ color:"#5A6A88", fontSize:14, marginTop:4, lineHeight:1.5 }}>
              <strong style={{ color:"#0D1428" }}>{scheduleData.specialistName}</strong> tried to reach you.<br/>
              Pick a time below and they'll call you back.
            </div>
          </div>
        </div>
      </div>

      {/* Slot list */}
      <div className="flex-1 px-6 py-6 space-y-4 max-w-sm mx-auto w-full">
        <div style={{ color:"#8A9AB8", fontSize:12, fontFamily:"var(--font-mono)", letterSpacing:"0.08em", marginBottom:2 }}>
          CHOOSE A TIME THAT WORKS FOR YOU
        </div>

        {scheduleData.slots.map(slot => {
          const isSelecting = selecting === slot.id;
          return (
            <button
              key={slot.id}
              disabled={!!selecting}
              onClick={async () => {
                setSelecting(slot.id);
                // small delay for tactile feel
                await new Promise(r => setTimeout(r, 600));
                selectSlot(token, slot.id);
              }}
              className="w-full flex items-center justify-between rounded-2xl text-left transition-all"
              style={{
                padding:"20px 24px",
                background: isSelecting ? "rgba(72,187,120,0.08)" : "#fff",
                border: `2px solid ${isSelecting ? "rgba(72,187,120,0.4)" : "rgba(91,110,225,0.15)"}`,
                boxShadow: isSelecting ? "0 4px 16px rgba(72,187,120,0.15)" : "0 2px 8px rgba(91,110,225,0.06)",
                opacity: selecting && !isSelecting ? 0.5 : 1,
                cursor: selecting ? "not-allowed" : "pointer",
              }}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width:48, height:48, background: isSelecting ? "rgba(72,187,120,0.15)" : "rgba(91,110,225,0.06)" }}>
                  {isSelecting
                    ? <CheckCircle size={24} color="#FFFFFF"/>
                    : <Calendar size={24} color="#FFFFFF"/>
                  }
                </div>
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#0D1428", lineHeight:1.3 }}>
                    {slot.label.split(" · ")[0]}
                  </div>
                  <div style={{ color:"#5A6A88", fontSize:15, marginTop:2 }}>
                    {slot.label.split(" · ")[1] ?? ""}
                  </div>
                </div>
              </div>
              {isSelecting
                ? <div style={{ color:"#D99A6B", fontSize:13, fontWeight:700 }}>Selecting…</div>
                : <ArrowRight size={20} color="#B0C0DC"/>
              }
            </button>
          );
        })}

        {/* Reassurance note */}
        <div className="flex items-start gap-3 px-4 py-4 rounded-2xl mt-2"
          style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.15)" }}>
          <Phone size={18} color="#FFFFFF" style={{ flexShrink:0, marginTop:2 }}/>
          <div style={{ color:"#5A6A88", fontSize:13, lineHeight:1.6 }}>
            Your specialist will call you at the phone number you provided. You don't need to download anything or be online — just answer your phone at the chosen time.
          </div>
        </div>

        <div style={{ color:"#B0C0DC", fontSize:12, textAlign:"center" }}>
          None of these times work?<br/>
          Call us at <strong style={{ color:"#6E90C9" }}>(800) 555-0199</strong>
        </div>
      </div>
    </div>
  );
}