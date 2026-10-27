/**
 * TwoFactorDetails — the "extra code" on a login, for Password Manager and
 * Auto Pay & Subscriptions (client list item 1a, Phase 5a; migration 042).
 *
 * A legacy contact with the right password can still be stopped by the
 * account's own 2-step verification: a text to the owner's phone, an
 * authenticator app, a security key. This records how that code arrives and
 * how the contact can get it, so the password is actually usable.
 *
 * Method and "where the code goes" are ordinary metadata. Backup codes and
 * the instructions (which tend to hold phone PINs and drawer locations) are
 * secrets and go through vaultCrypto like the password does.
 *
 * Both host screens already style `.field` / `.field-grid` identically, so the
 * form reuses them; the read-only box carries its own `.tfa-*` styles.
 */
import React, { useState } from "react";
import { Shield, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../utils/clipboard";
import { encryptField, decryptField } from "../services/vaultCrypto";

export type TwoFaMethod = "sms" | "email" | "authenticator" | "phone_call" | "security_key" | "other";

export interface TwoFactorInfo {
  method?: TwoFaMethod;
  /** "phone ending 4421", "j•••@gmail.com", "Google Authenticator on my iPhone" */
  destination?: string;
  backupCodes?: string;
  instructions?: string;
}

export const TWO_FA_METHODS: Record<TwoFaMethod, { label: string; destLabel: string; destPh: string }> = {
  sms:           { label: "Text message (SMS)",   destLabel: "CODE IS TEXTED TO",    destPh: "e.g. my mobile, ending 4421" },
  email:         { label: "Email code",           destLabel: "CODE IS EMAILED TO",   destPh: "e.g. j•••@gmail.com" },
  authenticator: { label: "Authenticator app",    destLabel: "APP AND DEVICE",       destPh: "e.g. Google Authenticator on my iPhone" },
  phone_call:    { label: "Phone call",           destLabel: "CALL GOES TO",         destPh: "e.g. home landline, ending 0193" },
  security_key:  { label: "Security key",         destLabel: "WHERE THE KEY IS",     destPh: "e.g. YubiKey on my keyring" },
  other:         { label: "Other / not sure",     destLabel: "DETAILS",              destPh: "e.g. bank asks for a code — not sure how it arrives" },
};

const isMethod = (v: unknown): v is TwoFaMethod => typeof v === "string" && v in TWO_FA_METHODS;

/** Read the four columns off a row, decrypting the two secret ones. */
export async function twoFactorFromRow(r: Record<string, unknown>, legacyEnabled = false): Promise<TwoFactorInfo> {
  const method = isMethod(r.two_fa_method) ? r.two_fa_method : legacyEnabled ? "other" : undefined;
  return {
    method,
    destination: (r.two_fa_destination as string | null) ?? undefined,
    backupCodes: (await decryptField(r.encrypted_backup_codes as string | null)) || undefined,
    instructions: (await decryptField(r.encrypted_two_fa_instructions as string | null)) || undefined,
  };
}

/** The four columns to write. Switching 2FA off clears the rest. */
export async function twoFactorToRow(t: TwoFactorInfo) {
  const on = !!t.method;
  return {
    two_fa_method: t.method ?? null,
    two_fa_destination: on ? t.destination?.trim() || null : null,
    encrypted_backup_codes: on ? (await encryptField(t.backupCodes?.trim() ?? "")) || null : null,
    encrypted_two_fa_instructions: on ? (await encryptField(t.instructions?.trim() ?? "")) || null : null,
  };
}

const TFA_CSS = `
.tfa-form{padding:15px;border-radius:16px;background:rgba(95,190,145,0.04);border:1px solid rgba(95,190,145,0.18);display:flex;flex-direction:column;gap:12px;}
.tfa-form .tfa-lbl{font-size:12px;font-weight:700;color:#7FC9A6;display:flex;align-items:center;gap:7px;}
.tfa-form .tfa-hint{font-size:14px;color:#A3ADC9;line-height:1.6;margin-top:-4px;}
.tfa-box{padding:13px 15px;border-radius:16px;background:rgba(95,190,145,0.06);border:1px solid rgba(95,190,145,0.22);margin-top:10px;display:flex;flex-direction:column;gap:9px;}
.tfa-box .tfa-head{display:flex;align-items:center;gap:8px;color:#7FC9A6;font-size:15px;font-weight:600;}
.tfa-box .tk{font-size:11px;font-weight:600;color:#A3ADC9;margin-bottom:3px;}
.tfa-box .tv{color:#EFF2F9;font-size:16px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
.tfa-box .tv.mono{font-family:var(--font-mono);}
.tfa-box .tfa-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.tfa-box .tfa-btns{display:flex;gap:2px;flex-shrink:0;}
.tfa-box .tfa-btns button{background:none;border:none;cursor:pointer;padding:6px;border-radius:12px;color:#A3ADC9;display:flex;}
.tfa-box .tfa-btns button:hover{color:#fff;background:rgba(91,110,225,0.1);}
`;

/** Edit form section — sits inside the host's Add/Edit modal. */
export function TwoFactorFields({ value, onChange }: { value: TwoFactorInfo; onChange: (v: TwoFactorInfo) => void }) {
  const set = (patch: Partial<TwoFactorInfo>) => onChange({ ...value, ...patch });
  const meta = value.method ? TWO_FA_METHODS[value.method] : null;
  return (
    <div className="tfa-form">
      <style dangerouslySetInnerHTML={{ __html: TFA_CSS }} />
      <div className="tfa-lbl"><Shield size={13} /> EXTRA CODE / 2-STEP VERIFICATION (for legacy contacts)</div>
      <div className="field">
        <label>DOES THIS ACCOUNT ASK FOR AN EXTRA CODE?</label>
        <select value={value.method ?? ""} onChange={e => set({ method: isMethod(e.target.value) ? e.target.value : undefined })}>
          <option value="">No extra code</option>
          {(Object.keys(TWO_FA_METHODS) as TwoFaMethod[]).map(m => <option key={m} value={m}>{TWO_FA_METHODS[m].label}</option>)}
        </select>
      </div>
      {meta && (
        <>
          <div className="field">
            <label>{meta.destLabel}</label>
            <input value={value.destination ?? ""} onChange={e => set({ destination: e.target.value })} placeholder={meta.destPh} />
          </div>
          <div className="field">
            <label>BACKUP / RECOVERY CODES (encrypted)</label>
            <textarea rows={2} style={{ resize: "vertical", fontFamily: "var(--font-mono)" }} value={value.backupCodes ?? ""}
              onChange={e => set({ backupCodes: e.target.value })} placeholder="One-time codes the site gave you when you turned on 2-step verification" />
          </div>
          <div className="field">
            <label>HOW YOUR LEGACY CONTACT GETS THE CODE (encrypted)</label>
            <textarea rows={3} style={{ resize: "vertical" }} value={value.instructions ?? ""} spellCheck
              onChange={e => set({ instructions: e.target.value })}
              placeholder="e.g. My phone is in the top desk drawer — its PIN is in my Will. If the phone is gone, call the bank and ask to update the number; they will want the death certificate." />
          </div>
          <div className="tfa-hint">Without this, the password alone may not get your legacy contact in.</div>
        </>
      )}
    </div>
  );
}

/** Read-only box for the host's detail panel. Renders nothing when 2FA is off. */
export function TwoFactorSummary({ info }: { info: TwoFactorInfo }) {
  const [showCodes, setShowCodes] = useState(false);
  if (!info.method) return null;
  const meta = TWO_FA_METHODS[info.method];
  return (
    <div className="tfa-box">
      <style dangerouslySetInnerHTML={{ __html: TFA_CSS }} />
      <div className="tfa-head"><Shield size={13} /> Extra code: {meta.label}</div>
      {info.destination && (
        <div><div className="tk">{meta.destLabel}</div><div className="tv">{info.destination}</div></div>
      )}
      {info.backupCodes && (
        <div className="tfa-row">
          <div style={{ minWidth: 0 }}>
            <div className="tk">BACKUP CODES</div>
            <div className="tv mono">{showCodes ? info.backupCodes : "•••• •••• ••••"}</div>
          </div>
          <div className="tfa-btns">
            <button type="button" onClick={() => setShowCodes(s => !s)}>{showCodes ? <EyeOff size={12} /> : <Eye size={12} />}</button>
            <button type="button" onClick={() => { copyToClipboard(info.backupCodes!); toast.success("Backup codes copied to clipboard"); }}><Copy size={12} /></button>
          </div>
        </div>
      )}
      {info.instructions && (
        <div><div className="tk">HOW A LEGACY CONTACT GETS THE CODE</div><div className="tv">{info.instructions}</div></div>
      )}
    </div>
  );
}
