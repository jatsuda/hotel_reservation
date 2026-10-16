// All prices are stored in the database as plain numbers (originally
// modeled in USD). This utility converts that stored number to a Thai Baht
// display value and formats it with proper thousands separators - it does
// NOT change what's stored in the database or sent to the backend.
//
// Exchange rate is a fixed constant for display purposes only. Update
// EXCHANGE_RATE if you want a different conversion, or change this to call
// a live rates API.

const EXCHANGE_RATE = 35; // 1 USD ≈ 35 THB

export function toTHB(amount: number): number {
  return Math.round(amount * EXCHANGE_RATE);
}

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(toTHB(amount));
}

// For places that just need the number without the currency symbol/commas
// (e.g. feeding into another calculation), use toTHB() directly.
