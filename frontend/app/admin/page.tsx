"use client";

import { useEffect, useState } from "react";
import { Building2, BedDouble, Users, CalendarCheck, DollarSign, Percent, Printer, Receipt, Wallet, PiggyBank } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import FinanceCharts from "@/components/admin/FinanceCharts";
import { getHotels, getHotelById, getRooms, getGuests, getReservations, getPayoutSummary, getHotelPayoutSummary, getPayouts, getHotelPayouts } from "@/lib/api";
import { formatTHB } from "@/lib/currency";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Hotel, Room, Guest, Reservation, PayoutSummary, Payout } from "@/lib/types";

export default function AdminDashboardPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const isOwner = user?.role === "HOTEL_OWNER";
  const isStaff = user?.role === "HOTEL_STAFF";
  const permissions = user?.permissions ?? [];
  const canManageHotelInfo = isOwner || (isStaff && permissions.includes("MANAGE_HOTEL_INFO"));
  const canManageRooms = isOwner || (isStaff && permissions.includes("MANAGE_ROOMS"));
  const canViewFinance = isOwner || (isStaff && (permissions.includes("VIEW_FINANCE") || permissions.includes("MANAGE_RESERVATIONS")));
  const isSingleHotelView = isOwner || isStaff;
  // The GMV / commission / cash-flow report and its Print button are
  // restricted to this one platform account, not shown to any other
  // ADMIN, HOTEL_OWNER, or HOTEL_STAFF login.
  const canViewFinanceReport = user?.email === "admin@hotel.com";
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  // A HOTEL_OWNER/HOTEL_STAFF only sees their own hotel's numbers - and a
  // HOTEL_STAFF only fetches the sections its specific permissions cover
  // (the backend would 403 on the rest anyway). The guest directory is
  // ADMIN-only regardless of role.
  useEffect(() => {
    const ownHotelId = user?.hotelId ?? null;
    const request = isSingleHotelView
      ? Promise.all([
          canManageHotelInfo && ownHotelId ? getHotelById(ownHotelId).then((h) => [h]) : Promise.resolve<Hotel[]>([]),
          canManageRooms ? getRooms(ownHotelId ?? undefined) : Promise.resolve<Room[]>([]),
          Promise.resolve<Guest[]>([]),
          canViewFinance ? getReservations({ hotelId: ownHotelId ?? undefined }) : Promise.resolve<Reservation[]>([]),
        ])
      : Promise.all([getHotels(), getRooms(), getGuests(), getReservations()]);

    request
      .then(([h, r, g, res]) => {
        setHotels(h);
        setRooms(r);
        setGuests(g);
        setReservations(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSingleHotelView, canManageHotelInfo, canManageRooms, canViewFinance, user?.hotelId]);

  // GMV / commission / cash-flow figures come from the payout ledger (see
  // lib/api.ts getPayoutSummary / getHotelPayoutSummary), not from
  // reservations - that's the same source of truth the Payouts tab uses,
  // so the numbers always agree with each other. The raw list (not just
  // the summary) is also fetched here so the trend charts below can
  // bucket individual payouts by month.
  useEffect(() => {
    if (!canViewFinanceReport) {
      setPayoutSummary(null);
      setPayouts([]);
      return;
    }
    const ownHotelId = user?.hotelId ?? null;
    const request = isSingleHotelView
      ? ownHotelId
        ? Promise.all([getHotelPayoutSummary(ownHotelId), getHotelPayouts(ownHotelId)])
        : Promise.resolve<[PayoutSummary | null, Payout[]]>([null, []])
      : Promise.all([getPayoutSummary(), getPayouts()]);
    request
      .then(([summary, list]) => {
        setPayoutSummary(summary);
        setPayouts(list);
      })
      .catch(() => {
        setPayoutSummary(null);
        setPayouts([]);
      });
  }, [canViewFinanceReport, isSingleHotelView, user?.hotelId]);

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((r) => r.status === "OCCUPIED").length;
  const revenue = reservations
    .filter((r) => r.status !== "CANCELLED")
    .reduce((sum, r) => sum + Number(r.totalPrice), 0);
  const occupancyRate = rooms.length ? Math.round((occupiedRooms / rooms.length) * 100) : 0;

  // GMV: total value of every completed booking payment - used below for
  // AOV. Commission and net cash flow are now shown via the FinanceCharts
  // trend/pie visuals instead of as separate numbers here.
  const gmv = payoutSummary?.totalGross ?? 0;

  // Total Transactions/Orders: every reservation that reached a completed,
  // successful payment (a Payout only ever gets created for a successful
  // Payment - see backend PayoutService.createForPayment), counting both
  // still-pending and already-paid payouts but not cancelled/refunded ones.
  const totalOrders = payoutSummary ? payoutSummary.pendingCount + payoutSummary.paidCount : 0;

  // AOV: the average amount collected per completed transaction.
  const aov = totalOrders > 0 ? gmv / totalOrders : 0;

  // Platform's earned commission across all payouts (same source as the
  // "Commission (platform revenue)" pie slice below).
  const commission = payoutSummary?.totalCommission ?? 0;

  const printedAt = new Date().toLocaleString(locale === "th" ? "th-TH" : "en-US");

  const stats = [
    ...(!isSingleHotelView ? [{ icon: Building2, label: t.admin.dashboard.totalHotels, value: hotels.length }] : []),
    ...(canManageRooms ? [
      { icon: BedDouble, label: t.admin.dashboard.totalRooms, value: rooms.length },
      { icon: BedDouble, label: t.admin.dashboard.availableRooms, value: availableRooms },
    ] : []),
    ...(isSingleHotelView ? [] : [{ icon: Users, label: t.admin.dashboard.totalGuests, value: guests.length }]),
    ...(canViewFinance ? [
      { icon: CalendarCheck, label: t.admin.dashboard.totalReservations, value: reservations.length },
      { icon: DollarSign, label: t.admin.dashboard.revenue, value: formatTHB(revenue) },
    ] : []),
  ];

  if (loading) return <p className="text-sm text-muted">{t.admin.dashboard.loading}</p>;

  return (
    <div>
      {/* Only visible on the printed page (see .print-only in globals.css) */}
      {canViewFinanceReport && (
        <p className="print-only mb-6 text-xs text-muted">
          {t.admin.dashboard.printedOn} {printedAt}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-card border border-secondary/60 bg-card p-4 shadow-soft">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-xl font-semibold text-dark">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      {canViewFinanceReport && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-base font-semibold text-dark">{t.admin.dashboard.financeTitle}</h3>
              <p className="text-xs text-muted">
                {isSingleHotelView ? t.admin.dashboard.financeSubtitleHotel : t.admin.dashboard.financeSubtitlePlatform}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-1.5 rounded-control border border-secondary px-3 py-2 text-xs font-medium text-text hover:bg-secondary/30"
            >
              <Printer className="h-3.5 w-3.5" /> {t.admin.dashboard.print}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-card border border-secondary/60 bg-card p-4 shadow-soft">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="mt-2 text-xl font-semibold text-dark">{formatTHB(gmv)}</p>
              <p className="text-xs text-muted">{t.admin.dashboard.gmv}</p>
              <p className="mt-1 text-[11px] text-muted">{t.admin.dashboard.gmvHint}</p>
            </div>
            <div className="rounded-card border border-secondary/60 bg-card p-4 shadow-soft">
              <PiggyBank className="h-5 w-5 text-primary" />
              <p className="mt-2 text-xl font-semibold text-dark">{formatTHB(commission)}</p>
              <p className="text-xs text-muted">{t.admin.dashboard.commission}</p>
              <p className="mt-1 text-[11px] text-muted">{t.admin.dashboard.commissionHint}</p>
            </div>
            <div className="rounded-card border border-secondary/60 bg-card p-4 shadow-soft">
              <Receipt className="h-5 w-5 text-primary" />
              <p className="mt-2 text-xl font-semibold text-dark">{totalOrders.toLocaleString()}</p>
              <p className="text-xs text-muted">{t.admin.dashboard.totalOrders}</p>
              <p className="mt-1 text-[11px] text-muted">{t.admin.dashboard.totalOrdersHint}</p>
            </div>
            <div className="rounded-card border border-secondary/60 bg-card p-4 shadow-soft">
              <Percent className="h-5 w-5 text-primary" />
              <p className="mt-2 text-xl font-semibold text-dark">{formatTHB(aov)}</p>
              <p className="text-xs text-muted">{t.admin.dashboard.aov}</p>
              <p className="mt-1 text-[11px] text-muted">{t.admin.dashboard.aovHint}</p>
            </div>
          </div>

          <FinanceCharts
            payouts={payouts}
            guests={guests}
            reservations={reservations}
            payoutSummary={payoutSummary}
            locale={locale}
            labels={{
              gmv: t.admin.dashboard.gmv,
              commission: t.admin.dashboard.commission,
              orders: t.admin.dashboard.totalOrders,
              conversionRate: t.admin.dashboard.conversionRate,
              gmvTrendTitle: t.admin.dashboard.gmvTrendTitle,
              ordersConversionTitle: t.admin.dashboard.ordersConversionTitle,
              breakdownTitle: t.admin.dashboard.breakdownTitle,
              breakdownHint: t.admin.dashboard.breakdownHint,
              commissionSlice: t.admin.dashboard.commissionSlice,
              pendingSlice: t.admin.dashboard.pendingSlice,
              paidSlice: t.admin.dashboard.paidSlice,
              noData: t.admin.dashboard.chartNoData,
            }}
          />

          <p className="mt-3 text-[11px] text-muted">{t.admin.dashboard.conversionRateHint}</p>
        </div>
      )}

      {(canManageRooms || canViewFinance) && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {canManageRooms && (
            <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
              <h3 className="font-heading text-base font-semibold text-dark">{t.admin.dashboard.roomOccupancy}</h3>
              <div className="mt-4 flex items-center gap-4">
                <Percent className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-semibold text-dark">{occupancyRate}%</p>
                  <p className="text-xs text-muted">
                    {occupiedRooms} {t.admin.dashboard.roomsOccupiedOf} {rooms.length} {t.admin.dashboard.roomsOccupiedSuffix}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary/40">
                <div className="h-full bg-primary" style={{ width: `${occupancyRate}%` }} />
              </div>
            </div>
          )}

          {canViewFinance && (
            <div className={`rounded-card border border-secondary/60 bg-card p-6 shadow-soft ${canManageRooms ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <h3 className="font-heading text-base font-semibold text-dark">{t.admin.dashboard.reservationsByStatus}</h3>
              <div className="mt-4 flex flex-col gap-2">
                {(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"] as const).map((status) => {
                  const count = reservations.filter((r) => r.status === status).length;
                  const pct = reservations.length ? (count / reservations.length) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-28"><StatusBadge status={status} /></div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/40">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs text-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {canViewFinance && (
        <div className="mt-8 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">{t.admin.dashboard.recentReservations}</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary/60 text-xs uppercase text-muted">
                  <th className="py-2 pr-4">{t.admin.dashboard.tableId}</th>
                  <th className="py-2 pr-4">{t.admin.dashboard.tableGuest}</th>
                  <th className="py-2 pr-4">{t.admin.dashboard.tableRoom}</th>
                  <th className="py-2 pr-4">{t.admin.dashboard.tableDates}</th>
                  <th className="py-2 pr-4">{t.admin.dashboard.tableTotal}</th>
                  <th className="py-2 pr-4">{t.admin.dashboard.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-b border-secondary/30">
                    <td className="py-2 pr-4">#{r.id}</td>
                    <td className="py-2 pr-4">{r.guest.firstName} {r.guest.lastName}</td>
                    <td className="py-2 pr-4 capitalize">{r.room.roomType.toLowerCase()}</td>
                    <td className="py-2 pr-4">{r.checkInDate} - {r.checkOutDate}</td>
                    <td className="py-2 pr-4">{formatTHB(r.totalPrice)}</td>
                    <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
