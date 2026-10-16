"use client";

import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { UpcomingReservation } from "@/lib/types";

interface AdvanceBookingListProps {
  reservations: UpcomingReservation[];
}

function formatRange(checkIn: string, checkOut: string, locale: "en" | "th") {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const localeTag = locale === "th" ? "th-TH-u-ca-gregory" : "en-US";
  const inLabel = inDate.toLocaleDateString(localeTag, { day: "2-digit", month: "short" });
  const outLabel = outDate.toLocaleDateString(localeTag, { day: "2-digit", month: "short" });
  return `${inLabel} - ${outLabel}`;
}

/**
 * Shows other guests' upcoming stays for this room, sourced from
 * GET /api/reservations/room/{roomId}/upcoming - guest names are shown as
 * first name + last initial for privacy, matching typical booking-site UX.
 */
export default function AdvanceBookingList({ reservations }: AdvanceBookingListProps) {
  const { t, locale } = useLocale();

  return (
    <div className="rounded-card border border-outline bg-card p-5 shadow-soft">
      <h3 className="font-heading text-base font-semibold text-dark">{t.advanceBooking.title}</h3>

      <div className="mt-4 flex flex-col gap-3">
        {reservations.length === 0 ? (
          <p className="text-xs text-muted">{t.advanceBooking.noUpcoming}</p>
        ) : (
          reservations.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-panel text-xs font-medium text-text">
                {r.guest.firstName.charAt(0)}
                {r.guest.lastName.charAt(0)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {r.guest.firstName} {r.guest.lastName.charAt(0)}.
                </p>
                <p className="text-xs text-muted">{formatRange(r.checkInDate, r.checkOutDate, locale)}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
