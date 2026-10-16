"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import BookingCard from "@/components/BookingCard";
import PaymentForm from "@/components/PaymentForm";
import Button from "@/components/Button";
import { getReservationById, createPayment, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { formatTHB } from "@/lib/currency";
import type { Reservation, PaymentMethod } from "@/lib/types";

function PaymentFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get("reservationId");
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && reservationId) {
      router.replace(`/login?redirect=${encodeURIComponent(`/payment?reservationId=${reservationId}`)}`);
    }
  }, [authLoading, user, reservationId, router]);

  useEffect(() => {
    if (!reservationId || !user) {
      setLoading(false);
      return;
    }
    getReservationById(reservationId)
      .then(setReservation)
      .catch(() => setError(t.payment.errorLoadReservation))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId, user]);

  async function handlePay(method: PaymentMethod) {
    if (!reservation) return;
    setError(null);
    setSubmitting(true);
    try {
      await createPayment({
        reservationId: reservation.id,
        amount: reservation.totalPrice,
        paymentMethod: method,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.payment.errorPaymentFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <p className="text-sm text-muted">{t.payment.loadingReservation}</p>;

  if (!user) {
    return <p className="text-sm text-muted">{t.payment.redirecting}</p>;
  }

  if (!reservation) {
    return (
      <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
        {t.payment.noReservationFound}
      </p>
    );
  }

  if (success) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-card border border-secondary/60 bg-card p-10 text-center shadow-soft">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h2 className="font-heading text-2xl font-semibold text-dark">{t.payment.paymentSuccessful}</h2>
        <p className="text-sm text-muted">{t.payment.reservationConfirmed}</p>
        <Button href={`/reservations/${reservation.id}`} fullWidth className="mt-2">
          {t.payment.viewReservation}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <h1 className="font-heading text-2xl font-semibold text-dark">{t.payment.title}</h1>

        <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">{t.payment.guestInformation}</h3>
          <p className="mt-2 text-sm text-text">
            {reservation.guest.firstName} {reservation.guest.lastName}
          </p>
          <p className="text-sm text-muted">{reservation.guest.email}</p>
        </div>

        <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">{t.payment.roomInformation}</h3>
          <p className="mt-2 text-sm text-text">
            {reservation.room.hotel?.name} &middot; {reservation.room.roomType.toLowerCase()} room{" "}
            {reservation.room.roomNumber}
          </p>
          <p className="text-sm text-muted">
            {reservation.checkInDate} &rarr; {reservation.checkOutDate}
          </p>
        </div>

        {error && (
          <p className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <PaymentForm onSubmit={(method) => handlePay(method)} submitting={submitting} />
      </div>

      <div className="h-fit">
        <BookingCard
          items={[
            { label: t.booking.checkIn, value: reservation.checkInDate, muted: true },
            { label: t.booking.checkOut, value: reservation.checkOutDate, muted: true },
            { label: t.payment.totalPrice, value: formatTHB(reservation.totalPrice) },
          ]}
          total={formatTHB(reservation.totalPrice)}
        />
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { t } = useLocale();
  return (
    <SiteShell>
      <Suspense fallback={<p className="text-sm text-muted">{t.common.loading}</p>}>
        <PaymentFlow />
      </Suspense>
    </SiteShell>
  );
}
