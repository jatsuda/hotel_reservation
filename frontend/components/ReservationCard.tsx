"use client";

import { Calendar } from "lucide-react";
import type { Reservation } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import Button from "./Button";
import { formatTHB } from "@/lib/currency";
import { useLocale } from "@/lib/locale-context";

interface ReservationCardProps {
  reservation: Reservation;
  onCancel?: (id: number) => void;
  // Shown as an extra button for CHECKED_OUT reservations only. reviewLabel
  // switches between "Write a review" / "Edit review" depending on whether
  // this stay already has one - the caller (Reservation History) knows that.
  onReview?: (reservation: Reservation) => void;
  reviewLabel?: string;
}

export default function ReservationCard({ reservation, onCancel, onReview, reviewLabel }: ReservationCardProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 rounded-card border border-secondary/60 bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted">
            {t.reservationCard.reservationPrefix}{String(reservation.id).padStart(3, "0")}
          </span>
          <StatusBadge status={reservation.status} />
        </div>
        <h4 className="font-heading text-base font-semibold text-dark">
          {reservation.room.hotel?.name}
        </h4>
        <p className="text-sm text-muted capitalize">
          {reservation.room.roomType.toLowerCase()} Room
        </p>
        <div className="flex items-center gap-1.5 text-sm text-text">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          {reservation.checkInDate} &rarr; {reservation.checkOutDate}
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 sm:items-end">
        <p className="text-lg font-semibold text-primary">{formatTHB(reservation.totalPrice)}</p>
        <div className="flex gap-2">
          <Button href={`/reservations/${reservation.id}`} variant="outline">
            {t.reservationCard.viewDetails}
          </Button>
          {onCancel && reservation.status !== "CANCELLED" && reservation.status !== "CHECKED_OUT" && (
            <Button variant="ghost" onClick={() => onCancel(reservation.id)}>
              {t.reservationCard.cancel}
            </Button>
          )}
          {onReview && reservation.status === "CHECKED_OUT" && (
            <Button variant="ghost" onClick={() => onReview(reservation)}>
              {reviewLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
