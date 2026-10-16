// Deterministic "random" deals per hotel - seeded by hotel.id so the same
// hotel always shows the same deal within a session (a real random pick on
// every render would look like a bug, flickering between refreshes).
// Swap this out for a real `Deal`/`Promotion` table once discounts need to
// affect actual pricing or have start/end dates.

export type Deal =
  | { type: "discount"; label: string; percent: number }
  | { type: "breakfast"; label: string };

const DEALS: (Deal | null)[] = [
  { type: "discount", label: "10% OFF", percent: 10 },
  { type: "discount", label: "15% OFF", percent: 15 },
  { type: "discount", label: "20% OFF", percent: 20 },
  { type: "breakfast", label: "Free Breakfast" },
  null,
  null,
  null,
];

export function getHotelDeal(hotelId: number): Deal | null {
  return DEALS[hotelId % DEALS.length];
}
