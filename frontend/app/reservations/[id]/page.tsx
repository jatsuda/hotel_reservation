"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import { getReservationById, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { formatTHB } from "@/lib/currency";
import type { Reservation, ReservationStatus } from "@/lib/types";

function stepIndex(status: ReservationStatus) {
  if (status === "CANCELLED") return -1;
  const order: ReservationStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];
  return order.indexOf(status);
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const TIMELINE_STEPS: { key: ReservationStatus; label: string }[] = [
    { key: "PENDING", label: t.reservationDetail.stepCreated },
    { key: "CONFIRMED", label: t.reservationDetail.stepPayment },
    { key: "CHECKED_IN", label: t.reservationDetail.stepCheckIn },
    { key: "CHECKED_OUT", label: t.reservationDetail.stepCheckOut },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/reservations/${params.id}`)}`);
    }
  }, [authLoading, user, params.id, router]);

  useEffect(() => {
    if (!user || !params.id) {
      setLoading(false);
      return;
    }
    getReservationById(params.id)
      .then(setReservation)
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : t.reservationDetail.notFound);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  if (authLoading || loading) {
    return (
      <SiteShell>
        <p className="text-sm text-muted">{t.reservationDetail.loading}</p>
      </SiteShell>
    );
  }

  if (!user) {
    return (
      <SiteShell>
        <p className="text-sm text-muted">{t.reservationDetail.redirecting}</p>
      </SiteShell>
    );
  }

  if (error || !reservation) {
    return (
      <SiteShell>
        <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
          {error || t.reservationDetail.notFound}
        </p>
      </SiteShell>
    );
  }

  const currentStep = stepIndex(reservation.status);

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold text-dark">
            {t.reservationCard.reservationPrefix}{String(reservation.id).padStart(3, "0")}
          </h1>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="mt-6 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <dl className="grid grid-cols-2 gap-y-4 text-sm">
            <dt className="text-muted">{t.reservationDetail.hotel}</dt>
            <dd className="text-right font-medium text-text">{reservation.room.hotel?.name}</dd>

            <dt className="text-muted">{t.reservationDetail.room}</dt>
            <dd className="text-right font-medium capitalize text-text">
              {reservation.room.roomType.toLowerCase()} - {reservation.room.roomNumber}
            </dd>

            <dt className="text-muted">{t.reservationDetail.checkIn}</dt>
            <dd className="text-right font-medium text-text">{reservation.checkInDate}</dd>

            <dt className="text-muted">{t.reservationDetail.checkOut}</dt>
            <dd className="text-right font-medium text-text">{reservation.checkOutDate}</dd>

            <dt className="text-muted">{t.reservationDetail.guests}</dt>
            <dd className="text-right font-medium text-text">{reservation.numberOfGuests}</dd>

            <dt className="text-muted">{t.reservationDetail.total}</dt>
            <dd className="text-right font-semibold text-primary">{formatTHB(reservation.totalPrice)}</dd>
          </dl>

          {reservation.specialRequest && (
            <p className="mt-4 rounded-control bg-background p-3 text-sm text-muted">
              &ldquo;{reservation.specialRequest}&rdquo;
            </p>
          )}
        </div>

        {/* Status Timeline */}
        <div className="mt-8 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">{t.reservationDetail.statusTimeline}</h3>
          <ol className="mt-5 flex flex-col gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentStep >= i && reservation.status !== "CANCELLED";
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <li key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-secondary" />
                    )}
                    {!isLast && <div className={`w-px flex-1 ${done ? "bg-primary" : "bg-secondary"}`} style={{ minHeight: "2rem" }} />}
                  </div>
                  <p className={`pb-8 text-sm ${done ? "font-medium text-text" : "text-muted"}`}>{step.label}</p>
                </li>
              );
            })}
          </ol>
          {reservation.status === "CANCELLED" && (
            <p className="text-sm font-medium text-red-500">{t.reservationDetail.cancelledNote}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button href="/reservations" variant="outline">
            {t.reservationDetail.backToReservations}
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
