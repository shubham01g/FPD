// The exact words a buyer agrees to before a recurring or card-on-file
// checkout. The app shows this text, sends it back with the checkout request,
// and the server refuses a request whose text doesn't match the current
// version (so nobody is charged under wording they didn't see). The accepted
// text is stored in billing_consents with the Checkout session id.
//
// Change the wording → bump CONSENT_VERSION.
export const CONSENT_VERSION = "2026-10-25";

export type ConsentPurpose = "plan" | "dr_addon" | "wg_card_on_file";

export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function consentText(input: {
  purpose: ConsentPurpose;
  name: string;
  amountCents: number;
  interval?: "month" | "year" | null;
  blockCents?: number;
}): string {
  if (input.purpose === "wg_card_on_file") {
    return `I agree that Final Pass Down will charge my card ${usd(input.amountCents)} now for ${input.name}, ` +
      `save the card, and charge it ${usd(input.blockCents ?? 0)} for each 30-minute block of White Glove session time ` +
      `after each session. I can remove the card or end the service by contacting support.`;
  }
  const every = input.interval === "year" ? "year" : "month";
  return `I agree that Final Pass Down will charge my card ${usd(input.amountCents)} now and every ${every} after that ` +
    `for ${input.name} until I cancel. I can cancel any time in Usage & Billing → Manage billing. Cancelling stops ` +
    `the next renewal; what I've paid for stays active until the end of that ${every}.`;
}
