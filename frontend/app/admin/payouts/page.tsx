"use client";

import { useEffect, useState, FormEvent } from "react";
import { Pencil } from "lucide-react";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { formatTHB } from "@/lib/currency";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/lib/auth-context";
import {
  getHotels,
  getPayouts,
  getPayoutSummary,
  getHotelPayouts,
  getHotelPayoutSummary,
  markPayoutAsPaid,
  getCommissionRate,
  updateCommissionRate,
} from "@/lib/api";
import type { Hotel, Payout, PayoutStatus, PayoutSummary, PayoutMethod } from "@/lib/types";

type StatusFilter = "ALL" | PayoutStatus;

export default function AdminPayoutsPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isOwner = user?.role === "HOTEL_OWNER";
  const isStaff = user?.role === "HOTEL_STAFF";
  const permissions = user?.permissions ?? [];
  const canViewFinance = isAdmin || isOwner || (isStaff && (permissions.includes("VIEW_FINANCE") || permissions.includes("MANAGE_RESERVATIONS")));
  const isSingleHotelView = isOwner || isStaff;

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<Payout | null>(null);

  // The single hotel this view is scoped to, if any - a hotel owner/staff's
  // own hotel, or whichever one an admin has picked from the dropdown.
  // Null means "all hotels" (admin only), where there's no single
  // commission rate to show.
  const activeHotelId = isSingleHotelView ? user?.hotelId ?? null : selectedHotelId === "ALL" ? null : selectedHotelId;

  useEffect(() => {
    if (isAdmin) getHotels().then(setHotels).catch(() => setHotels([]));
  }, [isAdmin]);

  function load() {
    setLoading(true);
    const request = activeHotelId
      ? Promise.all([getHotelPayouts(activeHotelId), getHotelPayoutSummary(activeHotelId)])
      : Promise.all([getPayouts(), getPayoutSummary()]);
    request
      .then(([data, sum]) => {
        setPayouts(data);
        setSummary(sum);
      })
      .catch(() => {
        setPayouts([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canViewFinance) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHotelId, canViewFinance]);

  const visiblePayouts = statusFilter === "ALL" ? payouts : payouts.filter((p) => p.status === statusFilter);

  async function handleMarkPaid(method: PayoutMethod, reference: string) {
    if (!payTarget) return;
    await markPayoutAsPaid(payTarget.id, { payoutMethod: method, transactionReference: reference });
    setPayTarget(null);
    load();
  }

  if (!canViewFinance) {
    return <p className="text-sm text-muted">{t.admin.checkingAccess}</p>;
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-dark">{t.admin.payouts.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {isSingleHotelView ? t.admin.payouts.subtitleHotel : t.admin.payouts.subtitlePlatform}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isAdmin && (
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text"
          >
            <option value="ALL">{t.admin.payouts.allHotels}</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text"
        >
          <option value="ALL">{t.admin.payouts.filterAll}</option>
          <option value="PENDING">{t.admin.payouts.filterPending}</option>
          <option value="PAID">{t.admin.payouts.filterPaid}</option>
          <option value="CANCELLED">{t.admin.payouts.filterCancelled}</option>
        </select>
      </div>

      {activeHotelId != null && <CommissionRateControl hotelId={activeHotelId} isAdmin={isAdmin} />}

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label={t.admin.payouts.summaryGross} value={formatTHB(summary.totalGross)} />
          <SummaryCard label={t.admin.payouts.summaryCommission} value={formatTHB(summary.totalCommission)} />
          <SummaryCard label={t.admin.payouts.summaryPending} value={formatTHB(summary.totalNetPending)} />
          <SummaryCard label={t.admin.payouts.summaryPaid} value={formatTHB(summary.totalNetPaid)} />
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-card border border-secondary/60 bg-card shadow-soft">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60 text-xs uppercase text-muted">
              {!isSingleHotelView && <th className="p-4">{t.admin.payouts.tableHotel}</th>}
              <th className="p-4">{t.admin.payouts.tableReservation}</th>
              <th className="p-4">{t.admin.payouts.tableGross}</th>
              <th className="p-4">{t.admin.payouts.tableCommission}</th>
              <th className="p-4">{t.admin.payouts.tableNet}</th>
              <th className="p-4">{t.admin.payouts.tableStatus}</th>
              <th className="p-4">{t.admin.payouts.tableReference}</th>
              {isAdmin && <th className="p-4 text-right">{t.admin.payouts.tableActions}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-muted" colSpan={8}>
                  {t.admin.payouts.loading}
                </td>
              </tr>
            ) : visiblePayouts.length === 0 ? (
              <tr>
                <td className="p-4 text-muted" colSpan={8}>
                  {t.admin.payouts.noPayouts}
                </td>
              </tr>
            ) : (
              visiblePayouts.map((p) => (
                <tr key={p.id} className="border-b border-secondary/30 align-top">
                  {!isSingleHotelView && <td className="p-4">{p.hotel.name}</td>}
                  <td className="p-4">
                    #{p.payment.reservation.id}
                    <br />
                    <span className="text-xs text-muted">
                      {p.payment.reservation.guest.firstName} {p.payment.reservation.guest.lastName}
                    </span>
                  </td>
                  <td className="p-4">{formatTHB(p.grossAmount)}</td>
                  <td className="p-4">
                    {formatTHB(p.commissionAmount)}
                    <br />
                    <span className="text-xs text-muted">{p.commissionRate}%</span>
                  </td>
                  <td className="p-4 font-medium text-dark">{formatTHB(p.netAmount)}</td>
                  <td className="p-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-4 text-xs text-muted">
                    {p.transactionReference ?? "-"}
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      {p.status === "PENDING" && (
                        <Button variant="outline" onClick={() => setPayTarget(p)}>
                          {t.admin.payouts.markAsPaid}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payTarget && (
        <MarkPaidModal payout={payTarget} onClose={() => setPayTarget(null)} onConfirm={handleMarkPaid} />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-secondary/60 bg-card p-4 shadow-soft">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-heading text-lg font-semibold text-dark">{value}</p>
    </div>
  );
}

// Read-only for hotel owner/staff (VIEW_FINANCE); editable inline for ADMIN only.
function CommissionRateControl({ hotelId, isAdmin }: { hotelId: number; isAdmin: boolean }) {
  const { t } = useLocale();
  const [rate, setRate] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRate(null);
    getCommissionRate(hotelId)
      .then((r) => setRate(r.commissionRate))
      .catch(() => setRate(null));
  }, [hotelId]);

  async function handleSave() {
    // Number("") is 0, so an empty box must be rejected explicitly or it
    // would silently save a 0% commission.
    const parsed = Number(input);
    if (input.trim() === "" || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError(t.admin.payouts.commissionRateInvalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await updateCommissionRate(hotelId, parsed);
      setRate(result.commissionRate);
      setEditing(false);
    } catch {
      setError(t.admin.payouts.commissionRateSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (rate == null) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-secondary/60 bg-card p-4">
      <p className="text-sm text-text">
        <span className="text-muted">{t.admin.payouts.commissionRateLabel}: </span>
        {editing ? (
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            aria-invalid={error != null}
            className="ml-1 w-20 rounded-control border border-secondary/60 px-2 py-1 text-sm"
          />
        ) : (
          <span className="font-medium text-dark">{rate}%</span>
        )}
      </p>
      {isAdmin &&
        (editing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t.admin.payouts.commissionRateSaving : t.admin.payouts.commissionRateSave}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              {t.admin.payouts.cancel}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setInput(String(rate));
              setEditing(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" /> {t.admin.payouts.commissionRateEdit}
          </button>
        ))}
      {!isAdmin && <p className="text-xs text-muted">{t.admin.payouts.commissionRateHint}</p>}
      {error && <p className="w-full text-sm text-booked2">{error}</p>}
    </div>
  );
}

function MarkPaidModal({
  payout,
  onClose,
  onConfirm,
}: {
  payout: Payout;
  onClose: () => void;
  onConfirm: (method: PayoutMethod, reference: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [method, setMethod] = useState<PayoutMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reference.trim()) {
      setError(t.admin.payouts.referenceRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(method, reference.trim());
    } catch {
      setError(t.admin.payouts.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card bg-card p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-semibold text-dark">{t.admin.payouts.markAsPaid}</h3>
        <p className="mt-1 text-sm text-muted">
          {payout.hotel.name} - {formatTHB(payout.netAmount)}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">{t.admin.payouts.formMethod}</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PayoutMethod)}
              className="w-full rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text"
            >
              <option value="BANK_TRANSFER">{t.admin.payouts.methodBankTransfer}</option>
              <option value="PROMPTPAY">{t.admin.payouts.methodPromptpay}</option>
              <option value="CHEQUE">{t.admin.payouts.methodCheque}</option>
              <option value="OTHER">{t.admin.payouts.methodOther}</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">{t.admin.payouts.formReference}</label>
            <input
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setError(null);
              }}
              aria-invalid={error != null}
              placeholder={t.admin.payouts.formReferencePlaceholder}
              className="w-full rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-booked2">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.admin.payouts.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t.admin.payouts.submitting : t.admin.payouts.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
