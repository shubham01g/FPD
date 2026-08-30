-- ============================================================
-- Final Pass Down — Email Templates Seed Data
-- Migration 003 (run after 002_admin_backend_gaps.sql)
--
-- Seeds email_templates with the same 16 templates that used to
-- live as hardcoded content in EmailTemplates.tsx, so the admin
-- screen shows real data immediately once this is applied instead
-- of an empty table.
--
-- NOT YET APPLIED to any project — draft only.
-- ============================================================

INSERT INTO public.email_templates (id, category, name, subject, trigger_event, variables, html) VALUES
  ('welcome', 'Account', 'Welcome Email', 'Welcome to Final Pass Down — Your Legacy Begins Today', 'On new account registration', ARRAY['{{user_name}}', '{{plan_name}}', '{{login_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:40px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <img src="https://finalpassdown.com/logo.png" alt="Final Pass Down" style="height:50px;margin-bottom:16px"/>
    <h1 style="color:#6E90C9;font-size:27.5px;margin:0;font-weight:700">Welcome to Final Pass Down</h1>
    <p style="color:#6B7FA8;margin-top:8px;font-size:17.5px">My Life · My Wishes · My Way</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">Welcome to Final Pass Down — you''ve taken the most important step in protecting your family''s future. Your <strong style="color:#6E90C9">{{plan_name}}</strong> vault is now active and ready.</p>
    <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);border-radius:12px;padding:24px;margin:24px 0">
      <p style="color:#6E90C9;font-size:16px;font-weight:700;margin:0 0 12px;letter-spacing:0.08em">GET STARTED IN 3 STEPS</p>
      <p style="color:#B8C8E0;font-size:17.5px;margin:8px 0">📁 <strong>Upload your first document</strong> — start with a will or insurance policy</p>
      <p style="color:#B8C8E0;font-size:17.5px;margin:8px 0">👥 <strong>Add a Legacy Contact</strong> — someone who will receive your vault</p>
      <p style="color:#B8C8E0;font-size:17.5px;margin:8px 0">❤️ <strong>Record your final wishes</strong> — what you want done with your life''s work</p>
    </div>
    <div style="text-align:center;margin:32px 0">
      <a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:19px;box-shadow:0 0 30px rgba(91,110,225,0.35)">Open My Vault →</a>
    </div>
  </div>
  <div style="background:rgba(0,0,0,0.3);padding:24px;text-align:center;border-top:1px solid rgba(91,110,225,0.1)">
    <p style="color:#4A5A7A;font-size:14px;margin:0">© 2026 Final Pass Down Inc. · <a href="#" style="color:#6E90C9">Privacy</a> · <a href="#" style="color:#6E90C9">Unsubscribe</a></p>#6E90C9">Unsubscribe</a></p>
  </div>
</div>'),
  ('otp_verify', 'Account', 'OTP Verification', 'Your Final Pass Down Verification Code', 'On login or sensitive action', ARRAY['{{user_name}}', '{{otp_code}}', '{{expires_in}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:32px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <h1 style="color:#6E90C9;font-size:25px;margin:0">Security Verification</h1>
  </div>
  <div style="padding:40px;text-align:center">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>, your one-time code is:</p>
    <div style="background:rgba(91,110,225,0.08);border:2px solid rgba(91,110,225,0.4);border-radius:16px;padding:32px;margin:24px auto;display:inline-block;min-width:200px">
      <span style="font-family:monospace;font-size:52.5px;font-weight:700;color:#6E90C9;letter-spacing:12px">{{otp_code}}</span>
    </div>
    <p style="color:#6B7FA8;font-size:16px">This code expires in <strong style="color:#F6AD55">{{expires_in}} minutes</strong>. Do not share it with anyone.</p>
    <p style="color:#4A5A7A;font-size:15px;margin-top:24px">If you did not request this code, your account may be at risk. <a href="#" style="color:#FC8181">Report unauthorized access</a></p>
  </div>
</div>'),
  ('password_reset', 'Account', 'Password Reset', 'Reset Your Final Pass Down Password', 'On forgot password request', ARRAY['{{user_name}}', '{{reset_url}}', '{{expires_in}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:32px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <h1 style="color:#E8EDF5;font-size:25px;margin:0">Password Reset Request</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">We received a request to reset your Final Pass Down password. Click the button below to create a new password. This link expires in <strong style="color:#F6AD55">{{expires_in}}</strong>.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{{reset_url}}" style="display:inline-block;background:rgba(91,110,225,0.15);color:#6E90C9;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:19px;border:1px solid rgba(91,110,225,0.4)">Reset My Password</a>
    </div>
    <div style="background:rgba(229,62,62,0.08);border:1px solid rgba(229,62,62,0.25);border-radius:10px;padding:16px">
      <p style="color:#FC8181;font-size:16px;margin:0">⚠ If you did not request this, please ignore this email. Your password will not change.</p>
    </div>
  </div>
</div>'),
  ('storage_80', 'Storage', 'Storage Warning — 80%', '⚠ You''ve used 80% of your storage — Final Pass Down', 'When user reaches 80% of storage limit', ARRAY['{{user_name}}', '{{used_gb}}', '{{limit_gb}}', '{{plan_name}}', '{{upgrade_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(246,173,85,0.25)">
  <div style="background:rgba(246,173,85,0.12);padding:32px;text-align:center;border-bottom:1px solid rgba(246,173,85,0.2)">
    <p style="color:#F6AD55;font-size:60.5px;margin:0">⚠</p>
    <h1 style="color:#F6AD55;font-size:25px;margin:8px 0">Storage at 80%</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">Your <strong>{{plan_name}}</strong> vault has used <strong style="color:#F6AD55">{{used_gb}} GB</strong> of your <strong>{{limit_gb}} GB</strong> monthly allowance.</p>
    <div style="background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;height:12px;margin:20px 0">
      <div style="width:80%;height:100%;background:linear-gradient(90deg,#5B6EE1,#F6AD55);border-radius:8px"></div>
    </div>
    <p style="color:#6B7FA8;font-size:16px">Remember: Unused storage does not carry forward. Your allowance resets at the start of your next billing cycle.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{upgrade_url}}" style="display:inline-block;background:linear-gradient(135deg,#F6AD55,#ED8936);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:17.5px">Upgrade My Plan</a>
    </div>
  </div>
</div>'),
  ('storage_90', 'Storage', 'Storage Warning — 90%', '🚨 Storage at 90% — Upgrade recommended', 'When user reaches 90% of storage limit', ARRAY['{{user_name}}', '{{used_gb}}', '{{limit_gb}}', '{{upgrade_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(252,129,129,0.3)">
  <div style="background:rgba(252,129,129,0.12);padding:32px;text-align:center;border-bottom:1px solid rgba(252,129,129,0.2)">
    <p style="color:#FC8181;font-size:60.5px;margin:0">🚨</p>
    <h1 style="color:#FC8181;font-size:25px;margin:8px 0">Upgrade Recommended — Storage at 90%</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">You are at <strong style="color:#FC8181">{{used_gb}} GB / {{limit_gb}} GB</strong>. At 100%, overage billing begins automatically at <strong>$0.10 per GB</strong>.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{upgrade_url}}" style="display:inline-block;background:linear-gradient(135deg,#FC8181,#E53E3E);color:#fff;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:17.5px">Upgrade Now — Avoid Overage</a>
    </div>
  </div>
</div>'),
  ('storage_95', 'Storage', 'Storage Critical Alert — 95%', '🔴 CRITICAL: Storage at 95% — Action required', 'When user reaches 95% of storage limit', ARRAY['{{user_name}}', '{{used_gb}}', '{{limit_gb}}', '{{upgrade_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#0A0000;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:2px solid #E53E3E">
  <div style="background:rgba(229,62,62,0.25);padding:32px;text-align:center">
    <h1 style="color:#FC8181;font-size:27.5px;margin:0">🔴 CRITICAL: Storage at 95%</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong> — immediate action required.</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">Your vault is at <strong style="color:#FC8181">{{used_gb}} GB / {{limit_gb}} GB</strong>. The next file upload will trigger overage billing. Upgrade now to avoid unexpected charges.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{upgrade_url}}" style="display:inline-block;background:#E53E3E;color:#fff;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:19px;box-shadow:0 0 20px rgba(229,62,62,0.4)">Upgrade Immediately</a>
    </div>
  </div>
</div>'),
  ('storage_overage', 'Storage', 'Overage Billing Notification', 'Storage Overage Charge — Final Pass Down', 'When overage billing is triggered', ARRAY['{{user_name}}', '{{overage_gb}}', '{{overage_charge}}', '{{billing_date}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:#060F1E;padding:32px;border-bottom:1px solid rgba(91,110,225,0.1)">
    <h1 style="color:#E8EDF5;font-size:25px;margin:0">Storage Overage Invoice</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px">An overage charge has been applied to your account for storage used beyond your plan limit.</p>
    <div style="background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.2);border-radius:12px;padding:24px;margin:24px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:16px">Overage Used</span><span style="color:#E8EDF5;font-weight:700">{{overage_gb}} GB</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:16px">Rate</span><span style="color:#E8EDF5;font-weight:700">$0.10 / GB</span>
      </div>
      <div style="height:1px;background:rgba(91,110,225,0.15);margin:12px 0"></div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#E8EDF5;font-size:19px;font-weight:700">Total Charged</span><span style="color:#6E90C9;font-size:22.5px;font-weight:700">{{overage_charge}}</span>
      </div>
    </div>
    <p style="color:#4A5A7A;font-size:15px">Billed on {{billing_date}}. Consider upgrading your plan to avoid future overage charges.</p>
  </div>
</div>'),
  ('contact_invite', 'Contacts', 'Legacy Contact Invitation', 'You''ve been designated as a Legacy Contact — Final Pass Down', 'When user adds a legacy contact', ARRAY['{{contact_name}}', '{{owner_name}}', '{{verify_url}}', '{{access_level}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:40px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <p style="font-size:50.5px;margin:0">🛡️</p>
    <h1 style="color:#6E90C9;font-size:27.5px;margin:12px 0">You''re a Trusted Legacy Contact</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Dear <strong>{{contact_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8"><strong style="color:#E8EDF5">{{owner_name}}</strong> has designated you as a <strong style="color:#6E90C9">Legacy Contact</strong> on their Final Pass Down vault. This means you will receive access to their important documents and final wishes when the time comes.</p>#6E90C9">Legacy Contact</strong> on their Final Pass Down vault. This means you will receive access to their important documents and final wishes when the time comes.</p>
    <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#6B7FA8;font-size:15px;margin:0 0 6px;letter-spacing:0.08em">YOUR ACCESS LEVEL</p>
      <p style="color:#6E90C9;font-size:19px;font-weight:600;margin:0">{{access_level}}</p>
    </div>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">To complete your designation, you must verify your identity by uploading a government-issued photo ID. This ensures only you can access the vault.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{{verify_url}}" style="display:inline-block;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:19px;box-shadow:0 0 30px rgba(91,110,225,0.35)">Complete Verification →</a>
    </div>
    <p style="color:#4A5A7A;font-size:15px;text-align:center">Verification takes 1–2 business days. Your ID is reviewed by our compliance team and never shared.</p>
  </div>
</div>'),
  ('contact_verified', 'Contacts', 'Contact Verification Approved', 'Identity Verified — You''re now an active Legacy Contact', 'When admin approves ID verification', ARRAY['{{contact_name}}', '{{owner_name}}', '{{access_level}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(72,187,120,0.25)">
  <div style="background:rgba(72,187,120,0.1);padding:40px;text-align:center;border-bottom:1px solid rgba(72,187,120,0.2)">
    <p style="font-size:50.5px;margin:0">✅</p>
    <h1 style="color:#D99A6B;font-size:27.5px;margin:12px 0">Identity Verified Successfully</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{contact_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">Your identity has been verified and you are now an active Legacy Contact for <strong style="color:#E8EDF5">{{owner_name}}</strong>''s vault. You will receive access when the designated conditions are met.</p>
    <div style="background:rgba(72,187,120,0.08);border:1px solid rgba(72,187,120,0.2);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#D99A6B;font-size:16px;font-weight:700;margin:0 0 8px">ACCESS LEVEL: {{access_level}}</p>
      <p style="color:#8AA3C8;font-size:16px;margin:0">You will be notified when access is granted. No action is required from you at this time.</p>
    </div>
  </div>
</div>'),
  ('affiliate_welcome', 'Affiliate', 'Affiliate Welcome', 'Welcome to the Final Pass Down Affiliate Program!', 'On affiliate program enrollment', ARRAY['{{user_name}}', '{{affiliate_link}}', '{{affiliate_code}}', '{{dashboard_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:linear-gradient(135deg,#060F1E,#0A1628);padding:40px;text-align:center;border-bottom:1px solid rgba(91,110,225,0.15)">
    <p style="font-size:45.5px;margin:0">💰</p>
    <h1 style="color:#6E90C9;font-size:27.5px;margin:12px 0">You''re Now an Affiliate!</h1>
    <p style="color:#6B7FA8;font-size:17.5px">Start earning up to 30% commission</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">Your affiliate account is active. Share your unique link and earn monthly commissions for every person you refer who stays subscribed.</p>
    <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.25);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#6B7FA8;font-size:14px;margin:0 0 8px;letter-spacing:0.08em">YOUR REFERRAL LINK</p>
      <p style="color:#6E90C9;font-size:17.5px;font-weight:700;font-family:monospace;word-break:break-all;margin:0">{{affiliate_link}}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:24px 0">
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;text-align:center">
        <p style="color:#6E90C9;font-size:30px;font-weight:700;margin:0">20%</p>
        <p style="color:#6B7FA8;font-size:14px;margin:4px 0 0">Tier 1: 5–24 refs</p>
      </div>
      <div style="background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);border-radius:8px;padding:16px;text-align:center">
        <p style="color:#6E90C9;font-size:30px;font-weight:700;margin:0">25%</p>
        <p style="color:#6B7FA8;font-size:14px;margin:4px 0 0">Tier 2: 25–74 refs</p>
      </div>
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;text-align:center">
        <p style="color:#6E90C9;font-size:30px;font-weight:700;margin:0">30%</p>
        <p style="color:#6B7FA8;font-size:14px;margin:4px 0 0">Tier 3: 74+ refs</p>
      </div>
    </div>
    <div style="text-align:center">
      <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:17.5px">View My Dashboard →</a>
    </div>
  </div>
</div>'),
  ('affiliate_commission', 'Affiliate', 'Commission Earned', 'You earned a commission! 💰', 'When monthly affiliate commission is calculated', ARRAY['{{user_name}}', '{{commission_amount}}', '{{referrals_count}}', '{{tier}}', '{{payout_date}}', '{{dashboard_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(72,187,120,0.25)">
  <div style="background:rgba(72,187,120,0.1);padding:40px;text-align:center;border-bottom:1px solid rgba(72,187,120,0.2)">
    <p style="font-size:45.5px;margin:0">🎉</p>
    <h1 style="color:#D99A6B;font-size:27.5px;margin:12px 0">Commission Earned!</h1>
  </div>
  <div style="padding:40px;text-align:center">
    <p style="color:#8AA3C8;font-size:17.5px">Hi <strong style="color:#E8EDF5">{{user_name}}</strong>, your monthly commission is ready:</p>
    <div style="margin:32px auto">
      <p style="color:#6B7FA8;font-size:15px;letter-spacing:0.1em;margin:0">COMMISSION THIS MONTH</p>
      <p style="color:#D99A6B;font-size:65px;font-weight:700;margin:8px 0;font-family:monospace">{{commission_amount}}</p>
      <p style="color:#6B7FA8;font-size:16px">from {{referrals_count}} active referrals · {{tier}}</p>
    </div>
    <p style="color:#8AA3C8;font-size:16px">Payout scheduled: <strong style="color:#E8EDF5">{{payout_date}}</strong></p>
    <a href="{{dashboard_url}}" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:17.5px">View Earnings Dashboard</a>
  </div>
</div>'),
  ('affiliate_tier_upgrade', 'Affiliate', 'Affiliate Tier Upgrade', '🎊 You''ve reached a new tier — your commission rate just increased!', 'When affiliate crosses a tier threshold', ARRAY['{{user_name}}', '{{new_tier}}', '{{new_rate}}', '{{referrals_count}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.25)">
  <div style="background:linear-gradient(135deg,#5B6EE1,#5B6EE1);padding:40px;text-align:center">
    <p style="font-size:50.5px;margin:0">🏆</p>
    <h1 style="color:#04080F;font-size:30px;margin:12px 0;font-weight:900">Tier Upgrade!</h1>
    <p style="color:rgba(4,8,15,0.7);font-size:19px;margin:0">Your commission rate just increased</p>
  </div>
  <div style="padding:40px;text-align:center">
    <p style="color:#8AA3C8;font-size:17.5px">Hi <strong style="color:#E8EDF5">{{user_name}}</strong>, with <strong style="color:#6E90C9">{{referrals_count}}</strong> active referrals, you''ve reached:</p>
    <div style="margin:32px auto">
      <p style="color:#6B7FA8;font-size:15px;letter-spacing:0.1em">NEW TIER</p>
      <p style="color:#6E90C9;font-size:35.5px;font-weight:700;margin:8px 0">{{new_tier}}</p>
      <p style="color:#E8EDF5;font-size:65px;font-weight:900;color:#6E90C9;margin:0;font-family:monospace">{{new_rate}}%</p>
      <p style="color:#6B7FA8;font-size:16px">commission on all active referrals</p>
    </div>
  </div>
</div>'),
  ('partnership_welcome', 'Partnership', 'Partnership Welcome', 'Welcome to Final Pass Down Strategic Partnerships', 'When a new partner is approved', ARRAY['{{partner_name}}', '{{organization}}', '{{partner_link}}', '{{initial_tier}}', '{{dashboard_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,167,214,0.25)">
  <div style="background:linear-gradient(135deg,#1A0A3A,#2A1450);padding:40px;text-align:center;border-bottom:1px solid rgba(91,167,214,0.2)">
    <p style="font-size:45.5px;margin:0">🤝</p>
    <h1 style="color:#6FAE8B;font-size:27.5px;margin:12px 0">Strategic Partnership Activated</h1>
    <p style="color:#6B7FA8;font-size:17.5px">Lifetime recurring commissions · No cap</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Dear <strong>{{partner_name}}</strong> at <strong>{{organization}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">Your Strategic Partnership with Final Pass Down is now active. You will earn <strong style="color:#6FAE8B">recurring lifetime commissions</strong> on every account you refer — with no time cap and automatic tier upgrades as your network grows.</p>
    <div style="background:rgba(91,167,214,0.08);border:1px solid rgba(91,167,214,0.25);border-radius:12px;padding:20px;margin:24px 0">
      <p style="color:#6FAE8B;font-size:15px;font-weight:700;margin:0 0 6px;letter-spacing:0.08em">STARTING TIER: {{initial_tier}} — RECURRING LIFETIME</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:8px;padding:12px">
          <p style="color:#6FAE8B;font-size:25px;font-weight:700;margin:0">20%</p>
          <p style="color:#6B7FA8;font-size:12.5px;margin:2px 0 0">0–50 accounts</p>
        </div>
        <div style="text-align:center;background:rgba(91,167,214,0.1);border:1px solid rgba(91,167,214,0.3);border-radius:8px;padding:12px">
          <p style="color:#6FAE8B;font-size:25px;font-weight:700;margin:0">25%</p>
          <p style="color:#6B7FA8;font-size:12.5px;margin:2px 0 0">51–100 accounts</p>
        </div>
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:8px;padding:12px">
          <p style="color:#6FAE8B;font-size:25px;font-weight:700;margin:0">30%</p>
          <p style="color:#6B7FA8;font-size:12.5px;margin:2px 0 0">101+ accounts</p>
        </div>
      </div>
    </div>
    <div style="text-align:center">
      <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#5BA7D6,#6F9E94);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:17.5px;box-shadow:0 0 20px rgba(91,167,214,0.3)">Access Partner Dashboard →</a>
    </div>
  </div>
</div>'),
  ('whitelabel_welcome', 'White Label', 'White Label Onboarding', 'Your White Label Platform is Being Set Up — Final Pass Down', 'When white label contract is signed', ARRAY['{{contact_name}}', '{{organization}}', '{{setup_url}}', '{{account_manager}}', '{{launch_date}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,167,214,0.3)">
  <div style="background:linear-gradient(135deg,#5BA7D6,#5B6EE1);padding:40px;text-align:center">
    <p style="font-size:45.5px;margin:0">🚀</p>
    <h1 style="color:#fff;font-size:27.5px;margin:12px 0;font-weight:900">White Label Setup Initiated</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:17.5px;margin:0">Welcome to the Final Pass Down White Label Program</p>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:20px">Hi <strong>{{contact_name}}</strong> at <strong>{{organization}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">We''ve received your white label agreement. Your dedicated account manager <strong style="color:#E8EDF5">{{account_manager}}</strong> will reach out within 24 hours to begin the customization process. Estimated launch: <strong style="color:#6FAE8B">{{launch_date}}</strong>.</p>#6FAE8B">{{launch_date}}</strong>.</p>
    <div style="background:rgba(91,167,214,0.08);border:1px solid rgba(91,167,214,0.2);border-radius:12px;padding:24px;margin:24px 0">
      <p style="color:#6FAE8B;font-size:15px;font-weight:700;margin:0 0 12px;letter-spacing:0.08em">WHAT HAPPENS NEXT</p>
      <p style="color:#B8C8E0;font-size:16px;margin:6px 0">✅ Custom domain configuration</p>
      <p style="color:#B8C8E0;font-size:16px;margin:6px 0">✅ Logo and brand color integration</p>
      <p style="color:#B8C8E0;font-size:16px;margin:6px 0">✅ Custom email template configuration</p>
      <p style="color:#B8C8E0;font-size:16px;margin:6px 0">✅ Data migration assistance</p>
      <p style="color:#B8C8E0;font-size:16px;margin:6px 0">✅ API key provisioning</p>
      <p style="color:#B8C8E0;font-size:16px;margin:6px 0">✅ Staff training session</p>
    </div>
    <div style="text-align:center">
      <a href="{{setup_url}}" style="display:inline-block;background:linear-gradient(135deg,#5BA7D6,#6F9E94);color:#04080F;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:17.5px">Begin Setup Portal →</a>
    </div>
  </div>
</div>'),
  ('subscription_receipt', 'Subscriptions', 'Monthly Billing Receipt', 'Your Final Pass Down receipt — {{billing_month}}', 'Monthly on successful subscription renewal', ARRAY['{{user_name}}', '{{plan_name}}', '{{amount}}', '{{billing_date}}', '{{next_billing}}', '{{invoice_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,110,225,0.15)">
  <div style="background:#060F1E;padding:32px;border-bottom:1px solid rgba(91,110,225,0.1)">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h1 style="color:#E8EDF5;font-size:25px;margin:0">Payment Receipt</h1>
      <span style="color:#D99A6B;background:rgba(72,187,120,0.12);padding:6px 12px;border-radius:20px;font-size:15px;font-weight:700">PAID</span>
    </div>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:19px">Hi <strong>{{user_name}}</strong>, thank you for your payment.</p>
    <div style="background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.15);border-radius:12px;padding:24px;margin:24px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:16px">Plan</span><span style="color:#E8EDF5;font-weight:600">{{plan_name}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:16px">Billing Date</span><span style="color:#E8EDF5">{{billing_date}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="color:#6B7FA8;font-size:16px">Next Billing</span><span style="color:#E8EDF5">{{next_billing}}</span>
      </div>
      <div style="height:1px;background:rgba(91,110,225,0.1);margin:16px 0"></div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#E8EDF5;font-size:20px;font-weight:700">Total</span>
        <span style="color:#6E90C9;font-size:25px;font-weight:700">{{amount}}</span>
      </div>
    </div>
    <div style="text-align:center">
      <a href="{{invoice_url}}" style="display:inline-block;background:rgba(91,110,225,0.1);color:#6E90C9;font-weight:600;padding:12px 30px;border-radius:10px;text-decoration:none;font-size:16px;border:1px solid rgba(91,110,225,0.3)">Download Invoice</a>
    </div>
  </div>
</div>'),
  ('security_alert', 'Security', 'New Device Login Alert', '⚠ New login detected on your Final Pass Down account', 'When login detected from unrecognized device/location', ARRAY['{{user_name}}', '{{device}}', '{{location}}', '{{time}}', '{{secure_url}}']::TEXT[], '<div style="font-family:''DM Sans'',sans-serif;background:#04080F;color:#E8EDF5;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(246,173,85,0.3)">
  <div style="background:rgba(246,173,85,0.12);padding:32px;text-align:center;border-bottom:1px solid rgba(246,173,85,0.2)">
    <p style="font-size:45.5px;margin:0">🔐</p>
    <h1 style="color:#F6AD55;font-size:25px;margin:12px 0">New Login Detected</h1>
  </div>
  <div style="padding:40px">
    <p style="color:#E8EDF5;font-size:19px">Hi <strong>{{user_name}}</strong>,</p>
    <p style="color:#8AA3C8;font-size:17.5px;line-height:1.8">A new login to your vault was detected. If this was you, no action is needed.</p>
    <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin:20px 0">
      <p style="color:#6B7FA8;font-size:15px;margin:0 0 12px;letter-spacing:0.08em">LOGIN DETAILS</p>
      <p style="color:#E8EDF5;font-size:16px;margin:4px 0">📱 Device: <strong>{{device}}</strong></p>
      <p style="color:#E8EDF5;font-size:16px;margin:4px 0">📍 Location: <strong>{{location}}</strong></p>
      <p style="color:#E8EDF5;font-size:16px;margin:4px 0">🕐 Time: <strong>{{time}}</strong></p>
    </div>
    <div style="text-align:center">
      <a href="{{secure_url}}" style="display:inline-block;background:rgba(229,62,62,0.15);color:#FC8181;font-weight:700;padding:14px 30px;border-radius:12px;text-decoration:none;font-size:17.5px;border:1px solid rgba(229,62,62,0.3)">This wasn''t me — Secure my account</a>
    </div>
  </div>
</div>');
