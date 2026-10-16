"use client";

import { useState } from "react";
import Button from "./Button";
import { formatTHB } from "@/lib/currency";
import { cancelReservation } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { Reservation } from "@/lib/types";

interface CancelReservationModalProps {
  reservation: Reservation;
  // true for a HOTEL_STAFF/HOTEL_OWNER/ADMIN action (backend requires a
  // reason from these roles for the audit trail); false for a guest
  // cancelling their own booking, where a reason is optional.
  requireReason: boolean;
  onClose: () => void;
  onCancelled: (updated: Reservation) => void;
}

// Preset options for the required staff/owner reason - kept short and
// specific so the audit trail is actually useful to review later, with a
// free-text "Other" escape hatch for anything that doesn't fit.
const PRESET_REASON_KEYS = [
  "cancelModalReasonEmergencyClosure",
  "cancelModalReasonGuestRequest",
  "cancelModalReasonUnableToService",
  "cancelModalReasonDuplicate",
] as const;
const OTHER_KEY = "cancelModalReasonOther";

export default function CancelReservationModal({
  reservation,
  requireReason,
  onClose,
  onCancelled,
}: CancelReservationModalProps) {
  const { t } = useLocale();
  const labels = t.admin.reservations;
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = reservation.payment?.paymentStatus === "PAID";
  const isCheckedIn = reservation.status === "CHECKED_IN";

  const presetLabel = (key: string) => (labels as Record<string, string>)[key];

  async function handleConfirm() {
    let reason: string | undefined;
    if (requireReason) {
      reason = selectedKey === OTHER_KEY ? otherText.trim() : selectedKey ? presetLabel(selectedKey) : "";
      if (!reason) {
        setError(labels.cancelModalReasonRequired);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await cancelReservation(reservation.id, reason);
      onCancelled(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const confirmDisabled =
    submitting || (requireReason && (!selectedKey || (selectedKey === OTHER_KEY && !otherText.trim())));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-card bg-card p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-semibold text-dark">{labels.cancelModalTitle}</h3>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{labels.cancelModalSummaryGuest}</dt>
            <dd className="text-right text-text">{reservation.guest.firstName} {reservation.guest.lastName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{labels.cancelModalSummaryRoom}</dt>
            <dd className="text-right text-text">
              {reservation.room.hotel?.name} - {reservation.room.roomNumber}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{labels.cancelModalSummaryDates}</dt>
            <dd className="text-right text-text">{reservation.checkInDate} - {reservation.checkOutDate}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-secondary/60 pt-1.5 font-semibold">
            <dt className="text-text">{labels.cancelModalSummaryAmount}</dt>
            <dd className="text-right text-dark">{formatTHB(reservation.totalPrice)}</dd>
          </div>
        </dl>

        {(isPaid || isCheckedIn) && (
          <div className="mt-4 space-y-1.5 rounded-control border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {isPaid && <p>{labels.cancelModalWarningPaid}</p>}
            {isCheckedIn && <p>{labels.cancelModalWarningCheckedIn}</p>}
          </div>
        )}

        {requireReason && (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-text">{labels.cancelModalReasonLabel}</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="" disabled>{labels.cancelModalReasonPlaceholder}</option>
              {PRESET_REASON_KEYS.map((key) => (
                <option key={key} value={key}>{presetLabel(key)}</option>
              ))}
              <option value={OTHER_KEY}>{presetLabel(OTHER_KEY)}</option>
            </select>
            {selectedKey === OTHER_KEY && (
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={labels.cancelModalReasonOtherPlaceholder}
                className="mt-2 w-full rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              />
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-booked2">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {labels.cancelModalBack}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="!bg-red-600 hover:!bg-red-700"
          >
            {submitting ? "..." : labels.cancelModalConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
