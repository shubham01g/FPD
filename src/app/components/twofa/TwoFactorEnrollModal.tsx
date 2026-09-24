/**
 * Turning on two-step verification, for all three methods.
 *
 * Step machine, entered with the method already chosen:
 *   authenticator  setup (QR + secret) -> verify -> backup codes
 *   sms            phone number        -> verify -> backup codes
 *   email_otp      (code sent on open) -> verify -> backup codes
 *
 * The backup-codes step is not skippable: it is the only time those codes are
 * ever shown, and without them a lost device means a support ticket.
 *
 * Class names (backdrop / modal / modal-head / modal-body / modal-foot) are
 * load-bearing — mobile.css turns exactly those into a bottom sheet on phones.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Copy, Download, Check, AlertCircle, ShieldCheck, Smartphone, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useOnline } from "../../hooks/useNetStatus";
import {
  type TwoFAMethod,
  enrollTotp, enrollPhone, challengeFactor, verifyChallenge, verifyFactor, unenrollFactor,
  confirmNativeEnrollment, startEmailCode, checkEmailCode,
} from "../../services/twoFactor";

const TEXT  = "#EFF2F9";
const MUTED = "#A3ADC9";
const POS   = "#5FBE91";

const CSS = `
.fpd-2fa .backdrop{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-2fa .modal{width:100%;max-width:440px;background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-2fa .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-2fa .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;margin:0;}
.fpd-2fa .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-2fa .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-2fa .modal-body p{margin:0;color:${MUTED};font-size:16px;line-height:1.7;}
.fpd-2fa .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-2fa .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-2fa .modal-foot .save:hover{filter:brightness(1.08);}
.fpd-2fa .modal-foot .save:disabled{opacity:.7;cursor:default;}
.fpd-2fa .modal-foot .btn-sec{padding:12px 16px;border-radius:18px;font-size:15.5px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:${MUTED};cursor:pointer;font-family:var(--font-body);}

.fpd-2fa .field label{display:block;color:${MUTED};font-size:13px;font-family:var(--font-mono);letter-spacing:.08em;margin-bottom:6px;}
.fpd-2fa .field input{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};outline:none;font-size:16px;}
.fpd-2fa .field input:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-2fa .code-input{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};outline:none;font-family:var(--font-mono);text-align:center;font-size:30px;letter-spacing:0.3em;transition:border-color .18s,box-shadow .18s;}
.fpd-2fa .code-input:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-2fa .hint{color:${MUTED};font-size:14px;text-align:center;}
.fpd-2fa .err{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:14px;background:rgba(208,107,107,0.1);border:1px solid rgba(208,107,107,0.25);color:#D06B6B;font-size:15px;}

.fpd-2fa .qr{display:flex;justify-content:center;padding:14px;background:#fff;border-radius:16px;}
.fpd-2fa .qr img{width:190px;height:190px;display:block;}
.fpd-2fa .secret{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-2fa .secret code{flex:1;font-family:var(--font-mono);font-size:14px;color:${TEXT};word-break:break-all;letter-spacing:.06em;}
.fpd-2fa .secret button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;flex-shrink:0;}

.fpd-2fa .codes{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-2fa .codes span{font-family:var(--font-mono);font-size:15px;color:${TEXT};letter-spacing:.08em;text-align:center;}
.fpd-2fa .codes-actions{display:flex;gap:8px;}
.fpd-2fa .codes-actions button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:${MUTED};font-size:14.5px;cursor:pointer;font-family:var(--font-body);}
.fpd-2fa .warn{display:flex;gap:10px;padding:12px 13px;border-radius:14px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.22);color:#D9A55E;font-size:14.5px;line-height:1.6;}
`;

type Step = "setup" | "phone" | "verify" | "backup";

const TITLES: Record<TwoFAMethod, string> = {
  authenticator: "Authenticator app",
  sms: "Text message",
  email_otp: "Email code",
};

export interface TwoFactorEnrollModalProps {
  method: TwoFAMethod;
  /** Shown on the email step so the user knows which inbox to check. */
  email?: string;
  /** Fired once enrollment is fully complete and the codes have been seen. */
  onEnrolled: () => void;
  onClose: () => void;
}

export function TwoFactorEnrollModal({ method, email, onEnrolled, onClose }: TwoFactorEnrollModalProps) {
  const online = useOnline();

  const [step, setStep] = useState<Step>(
    method === "authenticator" ? "setup" : method === "sms" ? "phone" : "verify",
  );
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(method !== "sms");
  const [error, setError] = useState("");

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // An abandoned native enrollment leaves an unverified factor on the account.
  // Track whether we still own it so closing early can clean it up.
  const pendingFactor = useRef<string | null>(null);
  const finished = useRef(false);

  const fail = (err: unknown, fallback: string) =>
    setError(err instanceof Error ? err.message : fallback);

  /* ── Opening moves that happen without the user doing anything ── */
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        if (method === "authenticator") {
          const enrollment = await enrollTotp();
          if (cancelled) return;
          setQrCode(enrollment.qrCode);
          setSecret(enrollment.secret);
          setFactorId(enrollment.factorId);
          pendingFactor.current = enrollment.factorId;
        } else if (method === "email_otp") {
          await startEmailCode();
        }
      } catch (err) {
        if (!cancelled) fail(err, "Could not start setup.");
      } finally {
        if (!cancelled) setPreparing(false);
      }
    }

    if (method !== "sms") prepare();
    return () => { cancelled = true; };
  }, [method]);

  const close = useCallback(() => {
    // Only tear down a factor the user never finished verifying.
    if (!finished.current && pendingFactor.current) {
      unenrollFactor(pendingFactor.current).catch(() => {});
    }
    onClose();
  }, [onClose]);

  /* ── SMS: bind the number, which also sends the first code ── */
  async function submitPhone() {
    const trimmed = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
      setError("Enter your number in international format, e.g. +14155552671.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { factorId: id } = await enrollPhone(trimmed);
      pendingFactor.current = id;
      setFactorId(id);
      setChallengeId(await challengeFactor(id));
      setStep("verify");
    } catch (err) {
      fail(err, "Could not send a code to that number.");
    } finally {
      setBusy(false);
    }
  }

  /* ── Verify the code, then record the enrollment ── */
  async function submitCode() {
    if (code.length !== 6) return;
    setError("");
    setBusy(true);
    try {
      if (method === "email_otp") {
        const res = await checkEmailCode(code, "enroll");
        setBackupCodes(res.backupCodes ?? []);
      } else if (method === "sms") {
        await verifyChallenge(factorId, challengeId, code);
        const res = await confirmNativeEnrollment("sms", phone.trim());
        setBackupCodes(res.backupCodes);
      } else {
        await verifyFactor(factorId, code);
        const res = await confirmNativeEnrollment("authenticator");
        setBackupCodes(res.backupCodes);
      }
      finished.current = true;
      pendingFactor.current = null;
      setStep("backup");
    } catch (err) {
      fail(err, "That code isn't right.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    setBusy(true);
    try {
      if (method === "email_otp") await startEmailCode();
      else if (method === "sms") setChallengeId(await challengeFactor(factorId));
      toast.success("A new code is on its way.");
    } catch (err) {
      fail(err, "Could not send a new code.");
    } finally {
      setBusy(false);
    }
  }

  function copyCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"))
      .then(() => { setCopied(true); toast.success("Backup codes copied"); })
      .catch(() => toast.error("Could not copy — write them down instead."));
  }

  function downloadCodes() {
    const body =
      "Final Pass Down — two-step verification backup codes\n" +
      `Generated ${new Date().toLocaleString()}\n\n` +
      backupCodes.join("\n") +
      "\n\nEach code works once. Keep them somewhere you can reach without your phone.\n";
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "final-pass-down-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const destination = method === "sms" ? phone : email;

  return (
    <div className="fpd-2fa">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="backdrop" onClick={e => { if (e.target === e.currentTarget && step !== "backup") close(); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>{step === "backup" ? "Save your backup codes" : `Set up ${TITLES[method]}`}</h3>
            {step !== "backup" && (
              <button onClick={close} aria-label="Close"><X size={16} /></button>
            )}
          </div>

          <div className="modal-body">
            {error && <div className="err"><AlertCircle size={15} />{error}</div>}

            {/* ── Authenticator: QR + manual secret ── */}
            {step === "setup" && (
              preparing ? (
                <p>Preparing your authenticator setup…</p>
              ) : qrCode ? (
                <>
                  <p>Scan this with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code it shows.</p>
                  <div className="qr"><img src={qrCode} alt="Authenticator QR code" /></div>
                  <div className="field">
                    <label>OR ENTER THIS KEY MANUALLY</label>
                    <div className="secret">
                      <code>{secret}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(secret).then(
                          () => toast.success("Key copied"),
                          () => toast.error("Could not copy"),
                        )}
                        aria-label="Copy setup key">
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p>Setup could not be started. Close this and try again.</p>
              )
            )}

            {/* ── SMS: collect the number ── */}
            {step === "phone" && (
              <>
                <p>We'll text a 6-digit code to this number every time you sign in.</p>
                <div className="field">
                  <label>MOBILE NUMBER</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 415 555 2671"
                    inputMode="tel"
                    autoFocus
                  />
                </div>
                <div className="hint">Include your country code, starting with +.</div>
              </>
            )}

            {/* ── The code box, shared by all three ── */}
            {step === "verify" && (
              <>
                <p>
                  {method === "authenticator"
                    ? "Enter the 6-digit code from your authenticator app."
                    : preparing
                      ? "Sending your code…"
                      : `Enter the 6-digit code we sent to ${destination || "you"}.`}
                </p>
                <div className="field">
                  <label>VERIFICATION CODE</label>
                  <input
                    className="code-input"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                {method !== "authenticator" && (
                  <button
                    onClick={resend}
                    disabled={busy || !online}
                    className="hint"
                    style={{ background: "none", border: "none", cursor: busy || !online ? "default" : "pointer", color: online ? "#5B6EE1" : MUTED }}>
                    {online ? "Didn't get it? Send a new code" : "You're offline — reconnect to send a new code"}
                  </button>
                )}
              </>
            )}

            {/* ── Backup codes, shown exactly once ── */}
            {step === "backup" && (
              <>
                <div className="err" style={{ background: "rgba(95,190,145,0.08)", border: "1px solid rgba(95,190,145,0.25)", color: POS }}>
                  <ShieldCheck size={15} />Two-step verification is on.
                </div>
                <p>Each of these works once. Keep them somewhere you can reach <em>without</em> your phone.</p>
                <div className="codes">
                  {backupCodes.map(c => <span key={c}>{c}</span>)}
                </div>
                <div className="codes-actions">
                  <button onClick={copyCodes}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
                  <button onClick={downloadCodes}><Download size={14} />Download</button>
                </div>
                <div className="warn">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  This is the only time these are shown. Using one turns two-step verification off so you can get back in and set it up again.
                </div>
              </>
            )}
          </div>

          <div className="modal-foot">
            {step === "setup" && (
              <>
                <button className="save" onClick={() => setStep("verify")} disabled={preparing || !qrCode}>
                  <QrCode size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  I've scanned it
                </button>
                <button className="btn-sec" onClick={close}>Cancel</button>
              </>
            )}
            {step === "phone" && (
              <>
                <button className="save" onClick={submitPhone} disabled={busy || !online}>
                  <Smartphone size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  {busy ? "Sending…" : online ? "Send code" : "Offline"}
                </button>
                <button className="btn-sec" onClick={close}>Cancel</button>
              </>
            )}
            {step === "verify" && (
              <>
                <button className="save" onClick={submitCode} disabled={busy || code.length !== 6}>
                  {busy ? "Verifying…" : "Confirm code"}
                </button>
                <button className="btn-sec" onClick={close}>Cancel</button>
              </>
            )}
            {step === "backup" && (
              <button className="save" onClick={() => { onEnrolled(); onClose(); }}>
                <Check size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                I've saved my codes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
