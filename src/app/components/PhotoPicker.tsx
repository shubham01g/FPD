/**
 * PhotoPicker — reusable inline photo upload widget for Add modals.
 * Shows a click-to-upload zone, previews the selected image, and
 * allows clearing. Returns a blob URL string via onChange.
 */
import React, { useRef } from "react";
import { Camera, X, ImageIcon } from "lucide-react";

interface PhotoPickerProps {
  value: string;          // current blob URL or ""
  onChange: (url: string) => void;
  label?: string;
  aspectRatio?: string;   // e.g. "16/9", "4/3", "1/1"
}

export function PhotoPicker({ value, onChange, label = "Add Photo", aspectRatio = "16/9" }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(URL.createObjectURL(file));
    e.target.value = "";
  }

  return (
    <div>
      <label style={{ color:"var(--muted-foreground)", fontSize:12.5, display:"block", marginBottom:6, fontFamily:"var(--font-mono)" }}>
        {label.toUpperCase()}
      </label>

      {value ? (
        /* Preview */
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio, background:"#000" }}>
          <img src={value} alt="Preview" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          <div className="absolute inset-0 flex items-end justify-between p-2"
            style={{ background:"linear-gradient(transparent 50%, rgba(0,0,0,0.5))" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(255,255,255,0.15)", color:"#fff", backdropFilter:"blur(4px)" }}>
              <Camera size={11}/> Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center justify-center rounded-full"
              style={{ width:26, height:26, background:"rgba(0,0,0,0.5)", color:"#fff" }}>
              <X size={12}/>
            </button>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all"
          style={{ aspectRatio, borderColor:"rgba(91,110,225,0.25)", background:"rgba(91,110,225,0.03)", color:"var(--muted-foreground)" }}>
          <div className="flex items-center justify-center rounded-full"
            style={{ width:44, height:44, background:"rgba(91,110,225,0.08)" }}>
            <ImageIcon size={20} color="var(--primary)"/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:"var(--primary)" }}>Click to add photo</div>
            <div style={{ fontSize:14, marginTop:2 }}>JPG, PNG, HEIC — from camera or files</div>
          </div>
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
    </div>
  );
}
