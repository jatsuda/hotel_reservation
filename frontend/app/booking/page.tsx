"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import BookingCard from "@/components/BookingCard";
import Button from "@/components/Button";
import { getRoomById, createReservation, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { formatTHB } from "@/lib/currency";
import type { Room } from "@/lib/types";

function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId");
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequest, setSpecialRequest] = useState("");

  // Redirect to login (preserving the intended destination) once we know
  // for sure there's no logged-in user - booking always requires an account.
  useEffect(() => {
    if (!authLoading && !user && roomId) {
      router.replace(`/login?redirect=${encodeURIComponent(`/booking?roomId=${roomId}`)}`);
    }
  }, [authLoading, user, roomId, router]);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    getRoomById(roomId)
      .then(setRoom)
      .catch(() => setError("Could not load this room. Please go back and try again."))
      .finally(() => setLoading(false));
  }, [roomId]);

  const nights =
    checkIn && checkOut
      ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
  const subtotal = room ? room.pricePerNight * nights : 0;
  // No service fee is actually charged anywhere on the backend -
  // ReservationService computes totalPrice as pricePerNight * nights *
  // numberOfRooms only, and that's the exact amount charged on the payment
  // page. A flat ฿20 fee here used to be added to the total the guest sees
  // on this page but never actually charged, so the amount shown here and
  // the amount shown/charged one step later on /payment silently didn't
  // match. Keeping this line item at ฿0 (like the Discount line below it)
  // rather than removing it entirely, so the summary layout doesn't jump if
  // this ever becomes real.
  const serviceFee = 0;
  const total = subtotal + serviceFee;

  async function handleSubmit() {
    if (!room || !user) return;
    setError(null);

    if (!user.guestId) {
      setError(t.booking.errorNoGuestProfile);
      return;
    }
    if (!checkIn || !checkOut) {
      setError(t.booking.errorDatesRequired);
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError(t.booking.errorCheckoutBeforeCheckin);
      return;
    }
    if (adults + children > room.capacity) {
      setError(`${t.booking.errorCapacityPrefix} ${room.capacity} ${t.booking.errorCapacitySuffix}`);
      return;
    }

    setSubmitting(true);
    try {
      const reservation = await createReservation({
        guestId: user.guestId,
        roomId: room.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: adults + children,
        numberOfRooms: 1,
        specialRequest,
      });
      router.push(`/payment?reservationId=${reservation.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(t.booking.errorGeneric);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-sm text-muted">{t.booking.loading}</p>;
  }

  if (!user) {
    // useEffect above is already redirecting to /login
    return <p className="text-sm text-muted">{t.booking.redirecting}</p>;
  }

  if (!room) {
    return (
      <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
        {t.booking.noRoomSelected}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-dark">{t.booking.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {room.hotel?.name} &middot; {room.roomType.toLowerCase()} room {room.roomNumber}
          </p>
        </div>

        <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">{t.booking.stayDetails}</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.booking.checkIn}</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.booking.checkOut}</span>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.booking.adults}</span>
              <input
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.booking.children}</span>
              <input
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
        </div>

        <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">{t.booking.guestInformation}</h3>
          <p className="mt-1 text-xs text-muted">{t.booking.bookingUnderAccount}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted">{t.booking.name}</p>
              <p className="text-sm text-text">{user.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">{t.booking.email}</p>
              <p className="text-sm text-text">{user.email}</p>
            </div>
          </div>
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">{t.booking.specialRequest}</span>
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              rows={3}
              className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>

        {error && (
          <p className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="h-fit">
        <BookingCard
          items={[
            { label: t.booking.room, value: `${room.roomType} - ${room.roomNumber}`, muted: true },
            { label: t.booking.pricePerNight, value: formatTHB(room.pricePerNight) },
            { label: t.booking.numberOfNights, value: String(nights) },
            { label: t.booking.serviceFee, value: formatTHB(serviceFee) },
            { label: t.booking.discount, value: formatTHB(0) },
          ]}
          total={formatTHB(total)}
        >
          <Button onClick={handleSubmit} fullWidth disabled={submitting}>
            {submitting ? t.booking.booking : t.booking.continueToPayment}
          </Button>
        </BookingCard>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <SiteShell>
      <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
        <BookingForm />
      </Suspense>
    </SiteShell>
  );
}
