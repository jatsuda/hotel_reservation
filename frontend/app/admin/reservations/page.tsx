"use client";

import { useEffect, useState } from "react";
import { Eye, CheckCircle, XCircle, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import CancelReservationModal from "@/components/CancelReservationModal";
import { formatTHB } from "@/lib/currency";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/lib/auth-context";
import {
  getReservations,
  updateReservation,
  checkInReservation,
  checkOutReservation,
} from "@/lib/api";
import type { Reservation } from "@/lib/types";

export default function AdminReservationsPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const isOwner = user?.role === "HOTEL_OWNER";
  const isStaff = user?.role === "HOTEL_STAFF";
  const permissions = user?.permissions ?? [];
  const canManageReservations = isOwner || (isStaff && permissions.includes("MANAGE_RESERVATIONS"));
  const canViewFinance = isOwner || (isStaff && (permissions.includes("VIEW_FINANCE") || permissions.includes("MANAGE_RESERVATIONS")));
  const isSingleHotelView = isOwner || isStaff;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);

  function load() {
    setLoading(true);
    getReservations({ hotelId: isSingleHotelView ? user?.hotelId ?? undefined : undefined })
      .then(setReservations)
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canViewFinance || !isStaff) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.hotelId]);

  async function handleConfirm(id: number) {
    await updateReservation(id, { status: "CONFIRMED" });
    load();
  }
  async function handleCheckIn(id: number) {
    await checkInReservation(id);
    load();
  }
  async function handleCheckOut(id: number) {
    await checkOutReservation(id);
    load();
  }

  if (isStaff && !canViewFinance) {
    return <p className="text-sm text-muted">{t.admin.checkingAccess}</p>;
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-dark">{t.admin.reservations.title}</h2>

      <div className="mt-4 overflow-x-auto rounded-card border border-secondary/60 bg-card shadow-soft">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60 text-xs uppercase text-muted">
              <th className="p-4">{t.admin.reservations.tableId}</th>
              <th className="p-4">{t.admin.reservations.tableGuest}</th>
              <th className="p-4">{t.admin.reservations.tableHotelRoom}</th>
              <th className="p-4">{t.admin.reservations.tableCheckIn}</th>
              <th className="p-4">{t.admin.reservations.tableCheckOut}</th>
              <th className="p-4">{t.admin.reservations.tableTotal}</th>
              <th className="p-4">{t.admin.reservations.tableStatus}</th>
              <th className="p-4">{t.admin.reservations.tablePayment}</th>
              {canManageReservations && <th className="p-4 text-right">{t.admin.reservations.tableActions}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-muted" colSpan={canManageReservations ? 9 : 8}>{t.admin.reservations.loading}</td></tr>
            ) : reservations.length === 0 ? (
              <tr><td className="p-4 text-muted" colSpan={canManageReservations ? 9 : 8}>{t.admin.reservations.noReservations}</td></tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id} className="border-b border-secondary/30 align-top">
                  <td className="p-4">#{r.id}</td>
                  <td className="p-4">{r.guest.firstName} {r.guest.lastName}</td>
                  <td className="p-4">
                    {r.room.hotel?.name}
                    <br />
                    <span className="text-xs capitalize text-muted">{r.room.roomType.toLowerCase()} - {r.room.roomNumber}</span>
                  </td>
                  <td className="p-4">{r.checkInDate}</td>
                  <td className="p-4">{r.checkOutDate}</td>
                  <td className="p-4">{formatTHB(r.totalPrice)}</td>
                  <td className="p-4"><StatusBadge status={r.status} /></td>
                  <td className="p-4">
                    {r.payment ? <StatusBadge status={r.payment.paymentStatus} /> : <span className="text-xs text-muted">{t.admin.reservations.unpaid}</span>}
                  </td>
                  {canManageReservations ? (
                    <td className="p-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link href={`/reservations/${r.id}`} title="View" className="rounded-control p-2 hover:bg-secondary/30">
                          <Eye className="h-4 w-4 text-text" />
                        </Link>
                        {r.status === "PENDING" && (
                          <button onClick={() => handleConfirm(r.id)} title="Confirm" className="rounded-control p-2 hover:bg-emerald-50">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </button>
                        )}
                        {r.status === "CONFIRMED" && (
                          <button onClick={() => handleCheckIn(r.id)} title="Check in" className="rounded-control p-2 hover:bg-blue-50">
                            <LogIn className="h-4 w-4 text-blue-600" />
                          </button>
                        )}
                        {r.status === "CHECKED_IN" && (
                          <button onClick={() => handleCheckOut(r.id)} title="Check out" className="rounded-control p-2 hover:bg-secondary/30">
                            <LogOut className="h-4 w-4 text-text" />
                          </button>
                        )}
                        {r.status !== "CANCELLED" && r.status !== "CHECKED_OUT" && (
                          <button onClick={() => setCancelTarget(r)} title="Cancel" className="rounded-control p-2 hover:bg-red-50">
                            <XCircle className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cancelTarget && (
        <CancelReservationModal
          reservation={cancelTarget}
          requireReason
          onClose={() => setCancelTarget(null)}
          onCancelled={() => {
            setCancelTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
