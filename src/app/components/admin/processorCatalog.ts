/* The card processors the Payment Processors screen offers. Descriptive
   catalog only — whether one is connected, its credentials and which is
   active come from crypto_processor_configs via /admin/crypto. `fields` are
   the credential names stored (encrypted) for that processor. */
export interface CatalogProcessor {
  id: string;
  name: string;
  logo: string;
  color: string;
  website: string;
  description: string;
  features: string[];
  fees: string;
  settlement: string;
  fields: string[];
}

export const CARD_PROCESSORS: CatalogProcessor[] = [
  {
    id: "stripe",
    name: "Stripe",
    logo: "S",
    color: "#635BFF",
    website: "stripe.com",
    description: "The world's leading payment infrastructure. Full-stack card processing, subscriptions, invoicing, and fraud protection built in.",
    features: ["Subscriptions & recurring billing","Stripe Radar fraud detection","3D Secure authentication","ACH & bank transfers","Stripe Connect for marketplaces","Instant payouts","150+ currencies"],
    fees: "2.9% + $0.30 per transaction",
    settlement: "2 business days (Instant available)",
    fields: [
      "publishableKey",
      "secretKey",
      "webhookSecret",
      "accountId",
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    logo: "PP",
    color: "#003087",
    website: "developer.paypal.com",
    description: "Global digital payments with 400M+ active accounts. Ideal for customers who prefer PayPal checkout or Pay Later options.",
    features: ["PayPal Checkout button","Pay Later / Buy Now Pay Later","Venmo (US)","Recurring payments","Dispute resolution","International payments","PayPal Credit"],
    fees: "3.49% + $0.49 per transaction",
    settlement: "Instant to PayPal balance",
    fields: [
      "clientId",
      "clientSecret",
      "webhookId",
    ],
  },
  {
    id: "square",
    name: "Square",
    logo: "SQ",
    color: "#3E4348",
    website: "developer.squareup.com",
    description: "End-to-end payment solution covering online, in-person, and invoice payments with a unified dashboard.",
    features: ["Card present + online","Square invoices","Tap to Pay","ACH bank transfers","Square Installments","Real-time reporting","POS integration"],
    fees: "2.6% + $0.10 (card present) · 2.9% + $0.30 (online)",
    settlement: "Next business day",
    fields: [
      "applicationId",
      "accessToken",
      "locationId",
    ],
  },
  {
    id: "braintree",
    name: "Braintree",
    logo: "BT",
    color: "#1A73E8",
    website: "braintreepayments.com",
    description: "PayPal's full-stack payments platform. Ideal for advanced card vaulting, multi-currency, and marketplace payouts.",
    features: ["Advanced card vaulting","Drop-in UI","PayPal & Venmo","Apple Pay & Google Pay","Multi-currency","Marketplace payouts","Level 2 & 3 data"],
    fees: "2.59% + $0.49 per transaction",
    settlement: "2 business days",
    fields: [
      "merchantId",
      "publicKey",
      "privateKey",
      "environment",
    ],
  },
  {
    id: "authorize",
    name: "Authorize.Net",
    logo: "AN",
    color: "#CC0000",
    website: "authorize.net",
    description: "Veteran payment gateway trusted by 400,000+ merchants. Excellent for businesses needing bank-level fraud tools.",
    features: ["Advanced fraud detection","Customer information manager","eCheck / ACH","Subscription billing","iOS & Android SDKs","Virtual terminal","Level 2 & 3 processing"],
    fees: "$25/mo + 2.9% + $0.30 per transaction",
    settlement: "2 business days",
    fields: [
      "apiLoginId",
      "transactionKey",
      "signatureKey",
    ],
  },
  {
    id: "adyen",
    name: "Adyen",
    logo: "AD",
    color: "#0ABF53",
    website: "adyen.com",
    description: "Enterprise-grade platform used by Spotify, Uber, and Microsoft. Unmatched global acquiring with a single integration.",
    features: ["350+ payment methods","Built-in acquiring bank","Risk management","Real-time data","Unified commerce (online + in-person)","Automatic local optimizations","Issuing"],
    fees: "Interchange++ pricing (volume-based)",
    settlement: "Next business day",
    fields: [
      "merchantAccount",
      "apiKey",
      "clientKey",
      "environment",
    ],
  },
];
