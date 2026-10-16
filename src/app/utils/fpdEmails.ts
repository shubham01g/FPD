/* Every Final Pass Down mailbox, in one place. Screens import from here so an
   address is never typed twice. The edge function keeps its own copy of the
   same list in supabase/functions/server/lib/email.ts (it can't import from
   src/) — change both together. */
export const FPD_EMAIL = {
  /** General questions and the public Contact Us button. */
  contact: "contact@finalpassdown.com",
  /** Company and product information. */
  info: "info@finalpassdown.com",
  /** Account and billing help for members. */
  support: "support@finalpassdown.com",
  /** App problems: sign-in, uploads, 2FA, recovery. */
  techSupport: "techsupport@finalpassdown.com",
  /** Plans, pricing, White Glove, White Label and enterprise enquiries. */
  sales: "sales@finalpassdown.com",
  /** Business partner program. */
  partnerships: "partnerships@finalpassdown.com",
  /** Affiliate program. */
  affiliates: "affiliates@finalpassdown.com",
  /** Legacy access claims. */
  claims: "claims@finalpassdown.com",
  /** ID verification and verification codes. */
  verify: "verify@finalpassdown.com",
  /** Admin portal and staff access. */
  admin: "admin@finalpassdown.com",
} as const;

/** The public directory shown on the Contact Us page. */
export const FPD_EMAIL_DIRECTORY: { label: string; email: string; note: string }[] = [
  { label: "General",           email: FPD_EMAIL.contact,      note: "Anything that doesn't fit below" },
  { label: "Information",       email: FPD_EMAIL.info,         note: "About Final Pass Down and how it works" },
  { label: "Support",           email: FPD_EMAIL.support,      note: "Your account, plan and billing" },
  { label: "Technical Support", email: FPD_EMAIL.techSupport,  note: "Sign-in, uploads and app problems" },
  { label: "Sales",             email: FPD_EMAIL.sales,        note: "Plans, White Glove and White Label" },
  { label: "Partnerships",      email: FPD_EMAIL.partnerships, note: "Business partner program" },
  { label: "Affiliates",        email: FPD_EMAIL.affiliates,   note: "Affiliate program and commissions" },
  { label: "Legacy Claims",     email: FPD_EMAIL.claims,       note: "Claiming access after a passing" },
  { label: "Verification",      email: FPD_EMAIL.verify,       note: "ID verification for contacts" },
];
