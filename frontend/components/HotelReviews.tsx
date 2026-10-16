"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import StarRating from "./StarRating";
import Button from "./Button";
import ReviewFormModal from "./ReviewFormModal";
import { getReviewableReservations, deleteReview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Review, ReviewSummary, Reservation } from "@/lib/types";

interface HotelReviewsProps {
  hotelId: number;
  hotelName: string;
  initialReviews: Review[];
  initialSummary: ReviewSummary;
}

// Recomputes the average/count locally after a create/update/delete so the
// summary line updates immediately without a round-trip back to the server.
function summarize(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) return { averageRating: 0, totalReviews: 0 };
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length };
}

export default function HotelReviews({ hotelId, hotelName, initialReviews, initialSummary }: HotelReviewsProps) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [eligible, setEligible] = useState<Reservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    if (!user || user.role !== "GUEST") {
      setEligible([]);
      return;
    }
    getReviewableReservations()
      .then((res) => setEligible(res.filter((r) => r.room.hotel?.id === hotelId)))
      .catch(() => setEligible([]));
  }, [user, hotelId]);

  const myReview = user?.guestId != null ? reviews.find((r) => r.guestId === user.guestId) : undefined;

  function handleSaved(review: Review) {
    setReviews((prev) => {
      const exists = prev.some((r) => r.id === review.id);
      const next = exists ? prev.map((r) => (r.id === review.id ? review : r)) : [review, ...prev];
      setSummary(summarize(next));
      return next;
    });
    setEligible((prev) => prev.filter((r) => r.id !== review.reservationId));
    setShowForm(false);
    setEditingReview(null);
  }

  async function handleDelete(review: Review) {
    if (!confirm(t.reviews.deleteConfirm)) return;
    await deleteReview(review.id);
    setReviews((prev) => {
      const next = prev.filter((r) => r.id !== review.id);
      setSummary(summarize(next));
      return next;
    });
  }

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-dark">{t.reviews.title}</h2>
          <div className="mt-1 flex items-center gap-2">
            <StarRating value={summary.averageRating} size="sm" />
            <span className="text-sm text-muted">
              {summary.totalReviews > 0
                ? `${summary.averageRating.toFixed(1)} \u00b7 ${summary.totalReviews} ${
                    summary.totalReviews === 1 ? t.reviews.reviewWord : t.reviews.reviewsWord
                  }`
                : t.reviews.noReviews}
            </span>
          </div>
        </div>

        {user && user.role === "GUEST" && !myReview && eligible.length > 0 && (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            {t.reviews.writeReview}
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {reviews.length === 0 ? (
          <p className="rounded-card border border-dashed border-secondary bg-card p-6 text-center text-sm text-muted">
            {t.reviews.noReviews}
          </p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-card border border-secondary/60 bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-dark">{review.guestName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating value={review.rating} size="sm" />
                    <span className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {user?.guestId === review.guestId && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingReview(review)}
                      className="text-muted hover:text-primary"
                      aria-label={t.reviews.editReview}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(review)}
                      className="text-muted hover:text-booked2"
                      aria-label={t.reviews.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {review.comment && <p className="mt-3 text-sm leading-relaxed text-text">{review.comment}</p>}
            </div>
          ))
        )}
      </div>

      {showForm && eligible.length > 0 && (
        <ReviewFormModal
          reservationId={eligible[0].id}
          hotelName={hotelName}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
      {editingReview && (
        <ReviewFormModal
          reservationId={editingReview.reservationId}
          hotelName={hotelName}
          existingReview={editingReview}
          onClose={() => setEditingReview(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
