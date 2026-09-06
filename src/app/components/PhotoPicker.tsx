/**
 * PhotoPicker — reusable inline photo upload widget for Add modals.
 * Shows a click-to-upload zone, previews the selected image, and
 * allows clearing.
 *
 * Returns a Storage PATH via onChange, not a URL. The photo is uploaded
 * to the private `record-photos` bucket the moment it is picked, so by
 * the time the surrounding form is submitted the value it holds is
 * already durable. Previously this handed back a `blob:` URL, which the
 * forms wrote straight into the database and which pointed at nothing
 * after a refresh.
 *
 * Uploading on pick rather than on submit is what keeps every call site
 * unchanged — the prop is still just a string. The cost is that a photo
 * picked in a modal the user then cancels stays in the bucket unreferenced.
 * That is deliberate: deleting on cancel would also delete the photo of a
 * record being edited, which is far worse than an orphaned object.
 */
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { prepareImage, shrinkNotice, MAX_MB } from "../utils/imageInput";
import { Camera, X, ImageIcon } from "lucide-react";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useSignedPhoto } from "./StoredImage";

interface PhotoPickerProps {
  value: string;          // current storage path or ""
  onChange: (path: string) => void;
  label?: string;
  aspectRatio?: string;   // e.g. "16/9", "4/3", "1/1"
}

export function PhotoPicker({ value, onChange, label = "Add Photo", aspectRatio = "16/9" }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { authUser } = useAuth();

  const [busy, setBusy] = useState(false);

  /* The just-uploaded image, shown immediately from memory so the preview
     does not wait on a signed-URL round trip for a file the browser
     already has. Tagged with the path it belongs to so a stale preview
     never survives the form being reset or switched to another record. */
  const [justUploaded, setJustUploaded] = useState<{ path: string; url: string } | null>(null);
  const signedUrl = useSignedPhoto(justUploaded?.path === value ? "" : value);
  const previewUrl = justUploaded?.path === value ? justUploaded.url : signedUrl;

  // The object URL is ours to release once it is no longer on screen.
  useEffect(() => () => { if (justUploaded) URL.revokeObjectURL(justUploaded.url); }, [justUploaded]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    if (!authUser) { toast.error("Please sign in again before adding a photo."); return; }
    setBusy(true);
    try {
      // Shrinks first and only complains if it is still oversized, so an
      // ordinary 5MB phone photo is accepted rather than refused.
      const img = await prepareImage(file);
      const note = shrinkNotice(img);
      if (note) toast.success(note);

      const path = await db.uploadRecordPhoto(authUser.id, img.blob);
      setJustUploaded({ path, url: img.url });
      onChange(path);
    } catch (err) {
      // prepareImage throws a message written for the user; an upload
      // failure does not, so it gets framed here.
      const message = (err as Error).message;
      toast.error(message.includes("image") || message.includes("browser")
        ? message
        : `Photo could not be uploaded: ${message}`);
    }
    setBusy(false);
  }

  return (
    <div>
      <label style={{ color:"var(--muted-foreground)", fontSize:12.5, display:"block", marginBottom:6, fontFamily:"var(--font-mono)" }}>
        {label.toUpperCase()} <span style={{ opacity:.65, letterSpacing:0 }}>· max {MAX_MB}MB</span>
      </label>

      {value ? (
        /* Preview */
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio, background:"#000" }}>
          {/* Held back until there is a real URL — an empty src makes the
              browser re-request the page itself. */}
          {previewUrl && <img src={previewUrl} alt="Preview" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>}
          <div className="absolute inset-0 flex items-end justify-between p-2"
            style={{ background:"linear-gradient(transparent 50%, rgba(0,0,0,0.5))" }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(255,255,255,0.15)", color:"#fff", backdropFilter:"blur(4px)" }}>
              <Camera size={11}/> Change
            </button>
            <button
              type="button"
              onClick={() => { setJustUploaded(null); onChange(""); }}
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
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all"
          style={{ aspectRatio, borderColor:"rgba(91,110,225,0.25)", background:"rgba(91,110,225,0.03)", color:"var(--muted-foreground)", opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
          <div className="flex items-center justify-center rounded-full"
            style={{ width:44, height:44, background:"rgba(91,110,225,0.08)" }}>
            <ImageIcon size={20} color="var(--primary)"/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:"var(--primary)" }}>
              {busy ? "Uploading photo…" : "Click to add photo"}
            </div>
            <div style={{ fontSize:14, marginTop:2 }}>
              {busy ? "Resized, then saved to your vault" : `JPG, PNG, HEIC — resized automatically, max ${MAX_MB}MB`}
            </div>
          </div>
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
    </div>
  );
}
