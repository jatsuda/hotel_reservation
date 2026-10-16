"use client";

import { FormEvent, useState } from "react";
import StarRating from "./StarRating";
import Button from "./Button";
import { createReview, updateReview } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { Review } from "@/lib/types";

interface ReviewFormModalProps {
  reservationId: number;
  hotelName: string;
  // Pass the guest's existing review to edit it in place; omit to create a
  // brand new one for this reservation.
  existingReview?: Review | null;
  onClose: () => void;
  onSaved: (review: Review) => void;
}

export default function ReviewFormModal({
  reservationId,
  hotelName,
  existingReview,
  onClose,
  onSaved,
}: ReviewFormModalProps) {
  const { t } = useLocale();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const saved = existingReview
        ? await updateReview(existingReview.id, { rating, comment })
        : await createReview({ reservationId, rating, comment });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-card bg-card p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-semibold text-dark">
          {existingReview ? t.reviews.editReview : t.reviews.writeReview}
        </h3>
        <p className="mt-1 text-sm text-muted">{hotelName}</p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">{t.reviews.rating}</label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">{t.reviews.comment}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t.reviews.commentPlaceholder}
              className="w-full rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-booked2">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.reviews.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t.reviews.submitting : existingReview ? t.reviews.update : t.reviews.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
