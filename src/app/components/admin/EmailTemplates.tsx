import { copyToClipboard } from "../../utils/clipboard";
import React, { useState } from "react";
import { Mail, Edit2, Save, CheckCircle, Eye, X, Search, Tag, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const GRID: React.CSSProperties = { backgroundImage: "linear-gradient(rgba(91,110,225,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.03) 1px,transparent 1px)", backgroundSize: "50px 50px" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

interface EmailTemplate {
  id: string;
  category: string;
  name: string;
  subject: string;
  trigger: string;
  variables: string[];
  html: string;
}

const categories = ["All","Account","Storage","Contacts","Subscriptions","Affiliate","Partnership","Security","White Label"];

const templates: EmailTemplate[] = [
  {
    id: "welcome",
    category: "Account",
    name: "Welcome Email",
    subject: "Welcome to Final Pass Down — Your Legacy Begins Today",
    trigger: "On new account registration",
    variables: ["{{user_name}}", "{{plan_name}}", "{{login_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:40px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <img src="https://finalpassdown.com/logo.png" alt="Final Pass Down" style="height:50px;margin-bottom:16px"/>
    <h1 style="color:#6E90C9;font-size:22px;margin:0;font-weight:700">Welcome to Final Pass Down</h1>
    <p style="color:#6B7FA8;margin-top:8px;font-size:14px">My Life · My Wishes · My Way</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">Welcome to Final Pass Down — you've taken the most important step in protecting your family's future. Your <strong style="color:#6E90C9">{{plan_name}}</strong> vault is now active and ready.</p>
    <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);border-radius:12px;padding:24px;margin:24px 0">
      <p style="color:#6E90C9;font-size:13px;font-weight:700;margin:0 0 12px;letter-spacing:0.08em">GET STARTED IN 3 STEPS</p>
      <p style="color:#B8C8E0;font-size:14px;margin:8px 0">📁 <strong>Upload your first document</strong> — start with a will or insurance policy</p>
      <p style="color:#B8C8E0;font-size:14px;margin:8px 0">👥 <strong>Add a Legacy Contact</strong> — someone who will receive your vault</p>
      <p style="color:#B8C8E0;font-size:14px;margin:8px 0">❤️ <strong>Record your final wishes</strong> — what you want done with your life's work</p>
    </div>
    <div style="text-align:center;margin:32px 0">
      <a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:15px;box-shadow:0 0 30px rgba(91,110,225,0.35)">Open My Vault →</a>
    </div>
  </div>
  <div style="background:rgba(0,0,0,0.3);padding:24px;text-align:center;border-top:1px solid rgba(91,110,225,0.1)">
    <p style="color:#4A5A7A;font-size:11px;margin:0">© 2026 Final Pass Down Inc. · <a href="#" style="color:#6E90C9">Privacy</a> · <a href="#" style="color:#6E90C9">Unsubscribe</a></p>#6E90C9">Unsubscribe</a></p>
  </div>
</div>`,
  },
  {
    id: "otp_verify",
    category: "Account",
    name: "OTP Verification",
    subject: "Your Final Pass Down Verification Code",
    trigger: "On login or sensitive action",
    variables: ["{{user_name}}", "{{otp_code}}", "{{expires_in}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:32px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <h1 style="color:#6E90C9;font-size:20px;margin:0">Security Verification</h1>
  </div>
  <div style="padding:40px;text-align:center">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>, your one-time code is:</p>
    <div style="background:rgba(91,110,225,0.08);border:2px solid rgba(91,110,225,0.4);border-radius:16px;padding:32px;margin:24px auto;display:inline-block;min-width:200px">
      <span style="font-family:monospace;font-size:42px;font-weight:700;color:#6E90C9;letter-spacing:12px">{{otp_code}}</span>
    </div>
    <p style="color:#6B7FA8;font-size:13px">This code expires in <strong style="color:#F6AD55">{{expires_in}} minutes</strong>. Do not share it with anyone.</p>
    <p style="color:#4A5A7A;font-size:12px;margin-top:24px">If you did not request this code, your account may be at risk. <a href="#" style="color:#FC8181">Report unauthorized access</a></p>
  </div>
</div>`,
  },
  {
    id: "password_reset",
    category: "Account",
    name: "Password Reset",
    subject: "Reset Your Final Pass Down Password",
    trigger: "On forgot password request",
    variables: ["{{user_name}}", "{{reset_url}}", "{{expires_in}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:32px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <h1 style="color:#E8EDF5;font-size:20px;margin:0">Password Reset Request</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">We received a request to reset your Final Pass Down password. Click the button below to create a new password. This link expires in <strong style="color:#F6AD55">{{expires_in}}</strong>.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{{reset_url}}" style="display:inline-block;background:rgba(91,110,225,0.15);color:#6E90C9;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:15px;border:1px solid rgba(91,110,225,0.4)">Reset My Password</a>
    </div>
    <div style="background:rgba(229,62,62,0.08);border:1px solid rgba(229,62,62,0.25);border-radius:10px;padding:16px">
      <p style="color:#FC8181;font-size:13px;margin:0">⚠ If you did not request this, please ignore this email. Your password will not change.</p>
    </div>
  </div>
</div>`,
  },
  {
    id: "storage_80",
    category: "Storage",
    name: "Storage Warning — 80%",
    subject: "⚠ You've used 80% of your storage — Final Pass Down",
    trigger: "When user reaches 80% of storage limit",
    variables: ["{{user_name}}", "{{used_gb}}", "{{limit_gb}}", "{{plan_name}}", "{{upgrade_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(246,173,85,0.25)">
  <div style="background:rgba(246,173,85,0.12);padding:32px;text-align:center;border-bottom:1px solid rgba(246,173,85,0.2)">
    <p style="color:#F6AD55;font-size:48px;margin:0">⚠</p>
    <h1 style="color:#F6AD55;font-size:20px;margin:8px 0">Storage at 80%</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">Your <strong>{{plan_name}}</strong> vault has used <strong style="color:#F6AD55">{{used_gb}} GB</strong> of your <strong>{{limit_gb}} GB</strong> monthly allowance.</p>
    <div style="background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;height:12px;margin:20px 0">
      <div style="width:80%;height:100%;background:linear-gradient(90deg,#5B6EE1,#F6AD55);border-radius:8px"></div>
    </div>
    <p style="color:#6B7FA8;font-size:13px">Remember: Unused storage does not carry forward. Your allowance resets at the start of your next billing cycle.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{upgrade_url}}" style="display:inline-block;background:linear-gradient(135deg,#F6AD55,#ED8936);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px">Upgrade My Plan</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "storage_90",
    category: "Storage",
    name: "Storage Warning — 90%",
    subject: "🚨 Storage at 90% — Upgrade recommended",
    trigger: "When user reaches 90% of storage limit",
    variables: ["{{user_name}}", "{{used_gb}}", "{{limit_gb}}", "{{upgrade_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(252,129,129,0.3)">
  <div style="background:rgba(252,129,129,0.12);padding:32px;text-align:center;border-bottom:1px solid rgba(252,129,129,0.2)">
    <p style="color:#FC8181;font-size:48px;margin:0">🚨</p>
    <h1 style="color:#FC8181;font-size:20px;margin:8px 0">Upgrade Recommended — Storage at 90%</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">You are at <strong style="color:#FC8181">{{used_gb}} GB / {{limit_gb}} GB</strong>. At 100%, overage billing begins automatically at <strong>$0.10 per GB</strong>.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{upgrade_url}}" style="display:inline-block;background:linear-gradient(135deg,#FC8181,#E53E3E);color:#fff;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px">Upgrade Now — Avoid Overage</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "storage_95",
    category: "Storage",
    name: "Storage Critical Alert — 95%",
    subject: "🔴 CRITICAL: Storage at 95% — Action required",
    trigger: "When user reaches 95% of storage limit",
    variables: ["{{user_name}}", "{{used_gb}}", "{{limit_gb}}", "{{upgrade_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#0A0000;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:2px solid #E53E3E">
  <div style="background:rgba(229,62,62,0.25);padding:32px;text-align:center">
    <h1 style="color:#FC8181;font-size:22px;margin:0">🔴 CRITICAL: Storage at 95%</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong> — immediate action required.</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">Your vault is at <strong style="color:#FC8181">{{used_gb}} GB / {{limit_gb}} GB</strong>. The next file upload will trigger overage billing. Upgrade now to avoid unexpected charges.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{upgrade_url}}" style="display:inline-block;background:#E53E3E;color:#fff;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:15px;box-shadow:0 0 20px rgba(229,62,62,0.4)">Upgrade Immediately</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "storage_overage",
    category: "Storage",
    name: "Overage Billing Notification",
    subject: "Storage Overage Charge — Final Pass Down",
    trigger: "When overage billing is triggered",
    variables: ["{{user_name}}", "{{overage_gb}}", "{{overage_charge}}", "{{billing_date}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:#060F1E;padding:32px;border-bottom:1px solid rgba(91,110,225,0.1)">
    <h1 style="color:#E8EDF5;font-size:20px;margin:0">Storage Overage Invoice</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px">An overage charge has been applied to your account for storage used beyond your plan limit.</p>
    <div style="background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.2);border-radius:12px;padding:24px;margin:24px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:13px">Overage Used</span><span style="color:#E8EDF5;font-weight:700">{{overage_gb}} GB</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:13px">Rate</span><span style="color:#E8EDF5;font-weight:700">$0.10 / GB</span>
      </div>
      <div style="height:1px;background:rgba(91,110,225,0.15);margin:12px 0"></div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#E8EDF5;font-size:15px;font-weight:700">Total Charged</span><span style="color:#6E90C9;font-size:18px;font-weight:700">{{overage_charge}}</span>
      </div>
    </div>
    <p style="color:#4A5A7A;font-size:12px">Billed on {{billing_date}}. Consider upgrading your plan to avoid future overage charges.</p>
  </div>
</div>`,
  },
  {
    id: "contact_invite",
    category: "Contacts",
    name: "Legacy Contact Invitation",
    subject: "You've been designated as a Legacy Contact — Final Pass Down",
    trigger: "When user adds a legacy contact",
    variables: ["{{contact_name}}", "{{owner_name}}", "{{verify_url}}", "{{access_level}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:40px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <p style="font-size:40px;margin:0">🛡️</p>
    <h1 style="color:#6E90C9;font-size:22px;margin:12px 0">You're a Trusted Legacy Contact</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Dear <strong>{{contact_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8"><strong style="color:#E8EDF5">{{owner_name}}</strong> has designated you as a <strong style="color:#6E90C9">Legacy Contact</strong> on their Final Pass Down vault. This means you will receive access to their important documents and final wishes when the time comes.</p>#6E90C9">Legacy Contact</strong> on their Final Pass Down vault. This means you will receive access to their important documents and final wishes when the time comes.</p>
    <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#6B7FA8;font-size:12px;margin:0 0 6px;letter-spacing:0.08em">YOUR ACCESS LEVEL</p>
      <p style="color:#6E90C9;font-size:15px;font-weight:600;margin:0">{{access_level}}</p>
    </div>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">To complete your designation, you must verify your identity by uploading a government-issued photo ID. This ensures only you can access the vault.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{{verify_url}}" style="display:inline-block;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:15px;box-shadow:0 0 30px rgba(91,110,225,0.35)">Complete Verification →</a>
    </div>
    <p style="color:#4A5A7A;font-size:12px;text-align:center">Verification takes 1–2 business days. Your ID is reviewed by our compliance team and never shared.</p>
  </div>
</div>`,
  },
  {
    id: "contact_verified",
    category: "Contacts",
    name: "Contact Verification Approved",
    subject: "Identity Verified — You're now an active Legacy Contact",
    trigger: "When admin approves ID verification",
    variables: ["{{contact_name}}", "{{owner_name}}", "{{access_level}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(72,187,120,0.25)">
  <div style="background:rgba(72,187,120,0.1);padding:40px;text-align:center;border-bottom:1px solid rgba(72,187,120,0.2)">
    <p style="font-size:40px;margin:0">✅</p>
    <h1 style="color:#D99A6B;font-size:22px;margin:12px 0">Identity Verified Successfully</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{contact_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">Your identity has been verified and you are now an active Legacy Contact for <strong style="color:#E8EDF5">{{owner_name}}</strong>'s vault. You will receive access when the designated conditions are met.</p>
    <div style="background:rgba(72,187,120,0.08);border:1px solid rgba(72,187,120,0.2);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#D99A6B;font-size:13px;font-weight:700;margin:0 0 8px">ACCESS LEVEL: {{access_level}}</p>
      <p style="color:#8AA3C8;font-size:13px;margin:0">You will be notified when access is granted. No action is required from you at this time.</p>
    </div>
  </div>
</div>`,
  },
  {
    id: "affiliate_welcome",
    category: "Affiliate",
    name: "Affiliate Welcome",
    subject: "Welcome to the Final Pass Down Affiliate Program!",
    trigger: "On affiliate program enrollment",
    variables: ["{{user_name}}", "{{affiliate_link}}", "{{affiliate_code}}", "{{dashboard_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:40px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <p style="font-size:36px;margin:0">💰</p>
    <h1 style="color:#6E90C9;font-size:22px;margin:12px 0">You're Now an Affiliate!</h1>
    <p style="color:#6B7FA8;font-size:14px">Start earning up to 30% commission</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">Your affiliate account is active. Share your unique link and earn monthly commissions for every person you refer who stays subscribed.</p>
    <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.25);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#6B7FA8;font-size:11px;margin:0 0 8px;letter-spacing:0.08em">YOUR REFERRAL LINK</p>
      <p style="color:#6E90C9;font-size:14px;font-weight:700;font-family:monospace;word-break:break-all;margin:0">{{affiliate_link}}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:24px 0">
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;text-align:center">
        <p style="color:#6E90C9;font-size:24px;font-weight:700;margin:0">20%</p>
        <p style="color:#6B7FA8;font-size:11px;margin:4px 0 0">Tier 1: 5–24 refs</p>
      </div>
      <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);border-radius:8px;padding:16px;text-align:center">
        <p style="color:#6E90C9;font-size:24px;font-weight:700;margin:0">25%</p>
        <p style="color:#6B7FA8;font-size:11px;margin:4px 0 0">Tier 2: 25–74 refs</p>
      </div>
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;text-align:center">
        <p style="color:#6E90C9;font-size:24px;font-weight:700;margin:0">30%</p>
        <p style="color:#6B7FA8;font-size:11px;margin:4px 0 0">Tier 3: 74+ refs</p>
      </div>
    </div>
    <div style="text-align:center">
      <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px">View My Dashboard →</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "affiliate_commission",
    category: "Affiliate",
    name: "Commission Earned",
    subject: "You earned a commission! 💰",
    trigger: "When monthly affiliate commission is calculated",
    variables: ["{{user_name}}", "{{commission_amount}}", "{{referrals_count}}", "{{tier}}", "{{payout_date}}", "{{dashboard_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(72,187,120,0.25)">
  <div style="background:rgba(72,187,120,0.1);padding:40px;text-align:center;border-bottom:1px solid rgba(72,187,120,0.2)">
    <p style="font-size:36px;margin:0">🎉</p>
    <h1 style="color:#D99A6B;font-size:22px;margin:12px 0">Commission Earned!</h1>
  </div>
  <div style="padding:40px;text-align:center">
    <p style="color:#8AA3C8;font-size:14px">Hi <strong style="color:#E8EDF5">{{user_name}}</strong>, your monthly commission is ready:</p>
    <div style="margin:32px auto">
      <p style="color:#6B7FA8;font-size:12px;letter-spacing:0.1em;margin:0">COMMISSION THIS MONTH</p>
      <p style="color:#D99A6B;font-size:52px;font-weight:700;margin:8px 0;font-family:monospace">{{commission_amount}}</p>
      <p style="color:#6B7FA8;font-size:13px">from {{referrals_count}} active referrals · {{tier}}</p>
    </div>
    <p style="color:#8AA3C8;font-size:13px">Payout scheduled: <strong style="color:#E8EDF5">{{payout_date}}</strong></p>
    <a href="{{dashboard_url}}" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px">View Earnings Dashboard</a>
  </div>
</div>`,
  },
  {
    id: "affiliate_tier_upgrade",
    category: "Affiliate",
    name: "Affiliate Tier Upgrade",
    subject: "🎊 You've reached a new tier — your commission rate just increased!",
    trigger: "When affiliate crosses a tier threshold",
    variables: ["{{user_name}}", "{{new_tier}}", "{{new_rate}}", "{{referrals_count}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.25)">
  <div style="background:linear-gradient(135deg,#5B6EE1,#5B6EE1);padding:40px;text-align:center">
    <p style="font-size:40px;margin:0">🏆</p>
    <h1 style="color:#04080F;font-size:24px;margin:12px 0;font-weight:900">Tier Upgrade!</h1>
    <p style="color:rgba(4,8,15,0.7);font-size:15px;margin:0">Your commission rate just increased</p>
  </div>
  <div style="padding:40px;text-align:center">
    <p style="color:#8AA3C8;font-size:14px">Hi <strong style="color:#E8EDF5">{{user_name}}</strong>, with <strong style="color:#6E90C9">{{referrals_count}}</strong> active referrals, you've reached:</p>
    <div style="margin:32px auto">
      <p style="color:#6B7FA8;font-size:12px;letter-spacing:0.1em">NEW TIER</p>
      <p style="color:#6E90C9;font-size:28px;font-weight:700;margin:8px 0">{{new_tier}}</p>
      <p style="color:#E8EDF5;font-size:52px;font-weight:900;color:#6E90C9;margin:0;font-family:monospace">{{new_rate}}%</p>
      <p style="color:#6B7FA8;font-size:13px">commission on all active referrals</p>
    </div>
  </div>
</div>`,
  },
  {
    id: "partnership_welcome",
    category: "Partnership",
    name: "Partnership Welcome",
    subject: "Welcome to Final Pass Down Strategic Partnerships",
    trigger: "When a new partner is approved",
    variables: ["{{partner_name}}", "{{organization}}", "{{partner_link}}", "{{initial_tier}}", "{{dashboard_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,167,214,0.25)">
  <div style="background:linear-gradient(135deg,#1A0A3A,#2A1450);padding:40px;text-align:center;border-bottom:1px solid rgba(91,167,214,0.2)">
    <p style="font-size:36px;margin:0">🤝</p>
    <h1 style="color:#6FAE8B;font-size:22px;margin:12px 0">Strategic Partnership Activated</h1>
    <p style="color:#6B7FA8;font-size:14px">Lifetime recurring commissions · No cap</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Dear <strong>{{partner_name}}</strong> at <strong>{{organization}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">Your Strategic Partnership with Final Pass Down is now active. You will earn <strong style="color:#6FAE8B">recurring lifetime commissions</strong> on every account you refer — with no time cap and automatic tier upgrades as your network grows.</p>
    <div style="background:rgba(91,167,214,0.08);border:1px solid rgba(91,167,214,0.25);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#6FAE8B;font-size:12px;font-weight:700;margin:0 0 6px;letter-spacing:0.08em">STARTING TIER: {{initial_tier}} — RECURRING LIFETIME</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:8px;padding:12px">
          <p style="color:#6FAE8B;font-size:20px;font-weight:700;margin:0">20%</p>
          <p style="color:#6B7FA8;font-size:10px;margin:2px 0 0">0–50 accounts</p>
        </div>
        <div style="text-align:center;background:rgba(91,167,214,0.1);border:1px solid rgba(91,167,214,0.3);border-radius:8px;padding:12px">
          <p style="color:#6FAE8B;font-size:20px;font-weight:700;margin:0">25%</p>
          <p style="color:#6B7FA8;font-size:10px;margin:2px 0 0">51–100 accounts</p>
        </div>
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:8px;padding:12px">
          <p style="color:#6FAE8B;font-size:20px;font-weight:700;margin:0">30%</p>
          <p style="color:#6B7FA8;font-size:10px;margin:2px 0 0">101+ accounts</p>
        </div>
      </div>
    </div>
    <div style="text-align:center">
      <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#5BA7D6,#6F9E94);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px;box-shadow:0 0 20px rgba(91,167,214,0.3)">Access Partner Dashboard →</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "whitelabel_welcome",
    category: "White Label",
    name: "White Label Onboarding",
    subject: "Your White Label Platform is Being Set Up — Final Pass Down",
    trigger: "When white label contract is signed",
    variables: ["{{contact_name}}", "{{organization}}", "{{setup_url}}", "{{account_manager}}", "{{launch_date}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,167,214,0.3)">
  <div style="background:linear-gradient(135deg,#5BA7D6,#5B6EE1);padding:40px;text-align:center">
    <p style="font-size:36px;margin:0">🚀</p>
    <h1 style="color:#fff;font-size:22px;margin:12px 0;font-weight:900">White Label Setup Initiated</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0">Welcome to the Final Pass Down White Label Program</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:16px">Hi <strong>{{contact_name}}</strong> at <strong>{{organization}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">We've received your white label agreement. Your dedicated account manager <strong style="color:#E8EDF5">{{account_manager}}</strong> will reach out within 24 hours to begin the customization process. Estimated launch: <strong style="color:#6FAE8B">{{launch_date}}</strong>.</p>#6FAE8B">{{launch_date}}</strong>.</p>
    <div style="background:rgba(91,167,214,0.08);border:1px solid rgba(91,167,214,0.2);border-radius:12px;padding:24px;margin:24px 0">
      <p style="color:#6FAE8B;font-size:12px;font-weight:700;margin:0 0 12px;letter-spacing:0.08em">WHAT HAPPENS NEXT</p>
      <p style="color:#B8C8E0;font-size:13px;margin:6px 0">✅ Custom domain configuration</p>
      <p style="color:#B8C8E0;font-size:13px;margin:6px 0">✅ Logo and brand color integration</p>
      <p style="color:#B8C8E0;font-size:13px;margin:6px 0">✅ Custom email template configuration</p>
      <p style="color:#B8C8E0;font-size:13px;margin:6px 0">✅ Data migration assistance</p>
      <p style="color:#B8C8E0;font-size:13px;margin:6px 0">✅ API key provisioning</p>
      <p style="color:#B8C8E0;font-size:13px;margin:6px 0">✅ Staff training session</p>
    </div>
    <div style="text-align:center">
      <a href="{{setup_url}}" style="display:inline-block;background:linear-gradient(135deg,#5BA7D6,#6F9E94);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px">Begin Setup Portal →</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "subscription_receipt",
    category: "Subscriptions",
    name: "Monthly Billing Receipt",
    subject: "Your Final Pass Down receipt — {{billing_month}}",
    trigger: "Monthly on successful subscription renewal",
    variables: ["{{user_name}}", "{{plan_name}}", "{{amount}}", "{{billing_date}}", "{{next_billing}}", "{{invoice_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:#060F1E;padding:32px;border-bottom:1px solid rgba(91,110,225,0.1)">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h1 style="color:#E8EDF5;font-size:20px;margin:0">Payment Receipt</h1>
      <span style="color:#D99A6B;background:rgba(72,187,120,0.12);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700">PAID</span>
    </div>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:15px">Hi <strong>{{user_name}}</strong>, thank you for your payment.</p>
    <div style="background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.15);border-radius:12px;padding:24px;margin:24px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:13px">Plan</span><span style="color:#E8EDF5;font-weight:600">{{plan_name}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:13px">Billing Date</span><span style="color:#E8EDF5">{{billing_date}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:13px">Next Billing</span><span style="color:#E8EDF5">{{next_billing}}</span>
      </div>
      <div style="height:1px;background:rgba(91,110,225,0.1);margin:16px 0"></div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#E8EDF5;font-size:16px;font-weight:700">Total</span>
        <span style="color:#6E90C9;font-size:20px;font-weight:700">{{amount}}</span>
      </div>
    </div>
    <div style="text-align:center">
      <a href="{{invoice_url}}" style="display:inline-block;background:rgba(91,110,225,0.1);color:#6E90C9;font-weight:600;padding:12px 30px;border-radius:10px;text-decoration:none;font-size:13px;border:1px solid rgba(91,110,225,0.3)">Download Invoice</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "security_alert",
    category: "Security",
    name: "New Device Login Alert",
    subject: "⚠ New login detected on your Final Pass Down account",
    trigger: "When login detected from unrecognized device/location",
    variables: ["{{user_name}}", "{{device}}", "{{location}}", "{{time}}", "{{secure_url}}"],
    html: `<div style="font-family:'DM Sans',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(246,173,85,0.3)">
  <div style="background:rgba(246,173,85,0.12);padding:32px;text-align:center;border-bottom:1px solid rgba(246,173,85,0.2)">
    <p style="font-size:36px;margin:0">🔐</p>
    <h1 style="color:#F6AD55;font-size:20px;margin:12px 0">New Login Detected</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:15px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:14px;line-height:1.8">A new login to your vault was detected. If this was you, no action is needed.</p>
    <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin:20px 0">
      <p style="color:#6B7FA8;font-size:12px;margin:0 0 12px;letter-spacing:0.08em">LOGIN DETAILS</p>
      <p style="color:#E8EDF5;font-size:13px;margin:4px 0">📱 Device: <strong>{{device}}</strong></p>
      <p style="color:#E8EDF5;font-size:13px;margin:4px 0">📍 Location: <strong>{{location}}</strong></p>
      <p style="color:#E8EDF5;font-size:13px;margin:4px 0">🕐 Time: <strong>{{time}}</strong></p>
    </div>
    <div style="text-align:center">
      <a href="{{secure_url}}" style="display:inline-block;background:rgba(229,62,62,0.15);color:#FC8181;font-weight:700;padding:14px 30px;border-radius:12px;text-decoration:none;font-size:14px;border:1px solid rgba(229,62,62,0.3)">This wasn't me — Secure my account</a>
    </div>
  </div>
</div>`,
  },
];

export function EmailTemplates() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState<EmailTemplate>(templates[0]);
  const [editSubject, setEditSubject] = useState(templates[0].subject);
  const [editBody, setEditBody] = useState(templates[0].html);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSelect = (t: EmailTemplate) => {
    setSelected(t);
    setEditSubject(t.subject);
    setEditBody(t.html);
    setEditing(false);
    setPreviewMode(false);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
    toast.success(`Template "${selected.name}" saved successfully`);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setEditSubject(selected.subject);
    setEditBody(selected.html);
    setEditing(false);
    toast.info("Template reset to default");
  };

  const filtered = templates.filter(t =>
    (activeCategory === "All" || t.category === activeCategory) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.trigger.toLowerCase().includes(search.toLowerCase()))
  );

  const previewHtml = editBody
    .replace(/\{\{user_name\}\}/g, "James Doe")
    .replace(/\{\{plan_name\}\}/g, "Premium")
    .replace(/\{\{used_gb\}\}/g, "16.9")
    .replace(/\{\{limit_gb\}\}/g, "25")
    .replace(/\{\{otp_code\}\}/g, "482910")
    .replace(/\{\{expires_in\}\}/g, "10")
    .replace(/\{\{commission_amount\}\}/g, "$189.50")
    .replace(/\{\{referrals_count\}\}/g, "6")
    .replace(/\{\{tier\}\}/g, "Tier 1 · 20%")
    .replace(/\{\{new_tier\}\}/g, "Tier 2")
    .replace(/\{\{new_rate\}\}/g, "25")
    .replace(/\{\{amount\}\}/g, "$24.99")
    .replace(/\{\{billing_date\}\}/g, "Jun 1, 2026")
    .replace(/\{\{next_billing\}\}/g, "Jul 1, 2026")
    .replace(/\{\{payout_date\}\}/g, "Jul 1, 2026")
    .replace(/\{\{contact_name\}\}/g, "Sarah Johnson")
    .replace(/\{\{owner_name\}\}/g, "James Doe")
    .replace(/\{\{access_level\}\}/g, "Full vault access upon death confirmed by executor")
    .replace(/\{\{partner_name\}\}/g, "Dr. Rebecca Hayes")
    .replace(/\{\{organization\}\}/g, "Greenfield Law Offices")
    .replace(/\{\{initial_tier\}\}/g, "Tier 1 · 20%")
    .replace(/\{\{new_rate\}\}/g, "25")
    .replace(/\{\{device\}\}/g, "Chrome on Windows 11")
    .replace(/\{\{location\}\}/g, "Sacramento, CA · 192.168.1.1")
    .replace(/\{\{time\}\}/g, "Jun 12, 2026 at 2:41 PM PST")
    .replace(/\{\{account_manager\}\}/g, "Alex Rivera")
    .replace(/\{\{launch_date\}\}/g, "Jul 15, 2026")
    .replace(/\{\{login_url\}\}/g, "#")
    .replace(/\{\{reset_url\}\}/g, "#")
    .replace(/\{\{verify_url\}\}/g, "#")
    .replace(/\{\{upgrade_url\}\}/g, "#")
    .replace(/\{\{dashboard_url\}\}/g, "#")
    .replace(/\{\{invoice_url\}\}/g, "#")
    .replace(/\{\{partner_link\}\}/g, "https://finalpassdown.com/partner/abc123")
    .replace(/\{\{affiliate_link\}\}/g, "https://finalpassdown.com/r/FPD-JD-2024-XKTZ")
    .replace(/\{\{affiliate_code\}\}/g, "FPD-JD-2024-XKTZ")
    .replace(/\{\{setup_url\}\}/g, "#")
    .replace(/\{\{billing_month\}\}/g, "June 2026")
    .replace(/\{\{overage_gb\}\}/g, "4.2")
    .replace(/\{\{overage_charge\}\}/g, "$0.42")
    .replace(/\{\{secure_url\}\}/g, "#");

  return (
    <div className="p-6 space-y-5 relative" style={{ maxWidth: 1400, ...GRID }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mail size={15} color="#FFFFFF" />
            <span style={{ color: "#6E90C9", fontSize: 11, ...MONO, letterSpacing: "0.12em" }}>ADMIN · EMAIL TEMPLATES</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#E8EDF5" }}>Email Template Manager</h1>
          <p style={{ color: "#8A9AB8", fontSize: 13, marginTop: 4 }}>{templates.length} templates across {categories.length - 1} categories — all editable and live-previewed</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={GLASS}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#48BB78", boxShadow: "0 0 8px #48BB78" }} />
          <span style={{ color: "#D99A6B", fontSize: 11, ...MONO }}>SENDGRID CONNECTED</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "300px 1fr", gap: 16, minHeight: 700 }}>
        {/* Template list */}
        <div className="rounded-2xl overflow-hidden flex flex-col" style={GLASS}>
          {/* Search + filter */}
          <div className="p-3 border-b space-y-2" style={{ borderColor: "rgba(91,110,225,0.1)" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "#141B2E", border: "1px solid rgba(91,110,225,0.3)" }}>
              <Search size={12} color="#8A9AB8" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
                style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", fontSize: 12, width: "100%" }} />
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-2.5 py-1 rounded-xl text-xs transition-all"
                  style={{ background: activeCategory === cat ? "#5B6EE1" : "rgba(91,110,225,0.06)", color: activeCategory === cat ? "#F0F4FA" : "#8A9AB8", fontWeight: activeCategory === cat ? 700 : 400 }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.map(t => (
              <button key={t.id} onClick={() => handleSelect(t)}
                className="w-full text-left px-4 py-3 border-b transition-all"
                style={{ borderColor: "rgba(91,110,225,0.06)", background: selected?.id === t.id ? "rgba(91,110,225,0.1)" : "transparent", borderLeft: selected?.id === t.id ? "2px solid #5B6EE1" : "2px solid transparent" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(91,110,225,0.08)", color: "#6E90C9", fontSize: 9, ...MONO }}>{t.category.toUpperCase()}</span>
                </div>
                <div style={{ color: selected?.id === t.id ? "#E8EDF5" : "#8A9AB8", fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                <div style={{ color: "#8A9AB8", fontSize: 11, marginTop: 2 }}>{t.trigger}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor + Preview */}
        {selected && (
          <div className="rounded-2xl overflow-hidden flex flex-col" style={GLASS}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(91,110,225,0.1)", background: "rgba(3,7,16,0.6)" }}>
              <div>
                <div style={{ color: "#E8EDF5", fontSize: 15, fontWeight: 600 }}>{selected.name}</div>
                <div style={{ color: "#8A9AB8", fontSize: 11, marginTop: 2 }}>Trigger: {selected.trigger}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm"
                  style={{ background: previewMode ? "rgba(91,110,225,0.15)" : "rgba(91,110,225,0.06)", color: previewMode ? "#6E90C9" : "#8A9AB8", border: `1px solid ${previewMode ? "rgba(91,110,225,0.4)" : "rgba(91,110,225,0.15)"}` }}>
                  <Eye size={13} /> {previewMode ? "Edit" : "Preview"}
                </button>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm"
                    style={{ background: "rgba(91,110,225,0.08)", color: "#6E90C9", border: "1px solid rgba(91,110,225,0.25)" }}>
                    <Edit2 size={13} /> Edit
                  </button>
                ) : (
                  <>
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm"
                      style={{ background: saved ? "rgba(72,187,120,0.15)" : "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: saved ? "#D99A6B" : "#F0F4FA", fontWeight: 700 }}>
                      {saved ? <CheckCircle size={13} /> : <Save size={13} />}
                      {saved ? "Saved!" : "Save"}
                    </button>
                    <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm"
                      style={{ background: "rgba(246,173,85,0.08)", color: "#F6AD55", border: "1px solid rgba(246,173,85,0.2)" }}>
                      <RefreshCw size={12} /> Reset
                    </button>
                  </>
                )}
                <button onClick={() => { copyToClipboard(editBody); toast.success("HTML copied to clipboard") }}
                  style={{ color: "#8A9AB8" }}><Copy size={14} /></button>
              </div>
            </div>

            {/* Variables */}
            <div className="px-5 py-2 border-b flex flex-wrap gap-2" style={{ borderColor: "rgba(91,110,225,0.06)", background: "rgba(91,110,225,0.04)" }}>
              <span style={{ color: "#8A9AB8", fontSize: 10, ...MONO, alignSelf: "center" }}>VARIABLES:</span>
              {selected.variables.map(v => (
                <span key={v} className="px-2 py-0.5 rounded cursor-pointer" onClick={() => toast.info(`Variable: ${v}`)}
                  style={{ background: "rgba(91,110,225,0.08)", color: "#6E90C9", fontSize: 10, ...MONO }}>
                  {v}
                </span>
              ))}
            </div>

            {/* Subject line */}
            <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(91,110,225,0.08)" }}>
              <div style={{ color: "#8A9AB8", fontSize: 10, ...MONO, marginBottom: 6 }}>SUBJECT LINE</div>
              {editing ? (
                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl" style={{ background: "#141B2E", border: "1px solid rgba(91,110,225,0.3)", color: "#FFFFFF", fontSize: 14, outline: "none" }} />
              ) : (
                <div style={{ color: "#E8EDF5", fontSize: 14 }}>{editSubject}</div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              {previewMode ? (
                <div className="overflow-y-auto h-full p-4" style={{ background: "#f0f0f0" }}>
                  <iframe
                    srcDoc={previewHtml}
                    style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, minHeight: 500 }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : editing ? (
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="w-full h-full p-5"
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#68D391", fontSize: 12, ...MONO, outline: "none", resize: "none", lineHeight: 1.7 }}
                />
              ) : (
                <div className="overflow-y-auto h-full p-5">
                  <pre style={{ color: "#68D391", fontSize: 12, ...MONO, whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
                    {editBody}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
