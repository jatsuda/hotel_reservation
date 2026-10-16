"use client";

import { LogIn } from "lucide-react";
import Button from "./Button";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { formatTHB } from "@/lib/currency";
import type { RoomStatus } from "@/lib/types";

interface RoomBookingCtaProps {
  roomId: number;
  status: RoomStatus;
  pricePerNight: number;
}

/**
 * The booking button needs to know the client's auth state: logged-in
 * guests go straight to /booking, everyone else is sent to /login first
 * (and bounced back to /booking afterward) - browsing stays open, booking
 * requires an account.
 */
export default function RoomBookingCta({ roomId, status, pricePerNight }: RoomBookingCtaProps) {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const unavailable = status !== "AVAILABLE";
  const bookingHref = `/booking?roomId=${roomId}`;

  if (loading) {
    return (
      <Button fullWidth disabled className="!bg-cta">
        {t.room.loading}
      </Button>
    );
  }

  if (!user) {
    return (
      <>
        <Button
          href={`/login?redirect=${encodeURIComponent(bookingHref)}`}
          fullWidth
          disabled={unavailable}
          className="!bg-cta hover:!bg-black gap-2"
        >
          <LogIn className="h-4 w-4" />
          {unavailable ? t.room.currentlyUnavailable : t.room.loginToBook}
        </Button>
        {!unavailable && (
          <p className="-mt-3 text-center text-xs text-muted">
            {formatTHB(pricePerNight)} /night - {t.room.loginToReserveNote}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <Button href={bookingHref} fullWidth disabled={unavailable} className="!bg-cta hover:!bg-black">
        {unavailable ? t.room.currentlyUnavailable : t.room.newBooking}
      </Button>
      {!unavailable && (
        <p className="-mt-3 text-center text-xs text-muted">
          {formatTHB(pricePerNight)} /night - {t.room.wontBeChargedYet}
        </p>
      )}
    </>
  );
}
