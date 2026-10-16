"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import ReservationCard from "@/components/ReservationCard";
import ReviewFormModal from "@/components/ReviewFormModal";
import { getMyReservations, getMyReviews } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Reservation, Review } from "@/lib/types";

// The closed-out half of a reservation's lifecycle - CHECKED_OUT stays and
// CANCELLED bookings. Active/upcoming reservations live on
// app/reservations/page.tsx ("Bookings") instead of being mixed in here.
const CLOSED_STATUSES: Reservation["status"][] = ["CHECKED_OUT", "CANCELLED"];

export default function ReservationHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTarget, setReviewTarget] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([getMyReservations(), getMyReviews().catch(() => [])])
      .then(([resData, reviewData]) => {
        setReservations(resData.filter((r) => CLOSED_STATUSES.includes(r.status)));
        setReviews(reviewData);
      })
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/reservations/history");
      return;
    }
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  function reviewFor(reservationId: number) {
    return reviews.find((r) => r.reservationId === reservationId);
  }

  function handleReviewSaved(review: Review) {
    setReviews((prev) => {
      const exists = prev.some((r) => r.id === review.id);
      return exists ? prev.map((r) => (r.id === review.id ? review : r)) : [review, ...prev];
    });
    setReviewTarget(null);
  }

  if (authLoading || !user) {
    return (
      <SiteShell>
        <p className="text-sm text-muted">{t.common.loading}</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">{t.reservationHistory.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.reservationHistory.subtitle} {user.email}.</p>
      </div>

      <div className="mt-4">
        <Link href="/reservations" className="text-sm font-medium text-primary hover:underline">
          {t.reservationHistory.backToBookings}
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted">{t.reservationHistory.loading}</p>
        ) : reservations.length === 0 ? (
          <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
            {t.reservationHistory.noHistory}
          </p>
        ) : (
          // No onCancel here - a closed-out reservation (checked out or
          // already cancelled) can't be cancelled again.
          reservations.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onReview={r.status === "CHECKED_OUT" ? () => setReviewTarget(r) : undefined}
              reviewLabel={reviewFor(r.id) ? t.reviews.editReview : t.reviews.writeReview}
            />
          ))
        )}
      </div>

      {reviewTarget && (
        <ReviewFormModal
          reservationId={reviewTarget.id}
          hotelName={reviewTarget.room.hotel?.name ?? ""}
          existingReview={reviewFor(reviewTarget.id) ?? null}
          onClose={() => setReviewTarget(null)}
          onSaved={handleReviewSaved}
        />
      )}
    </SiteShell>
  );
}
