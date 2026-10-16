"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatTHB } from "@/lib/currency";
import type { Payout, Guest, Reservation, PayoutSummary } from "@/lib/types";

// Brand palette (see tailwind.config.ts) - kept as literal hex here because
// recharts reads colors as plain CSS/SVG values, not Tailwind classes.
const COLOR_PRIMARY = "#A88A5A"; // GMV / Orders
const COLOR_DARK = "#292722"; // Commission / already paid out
const COLOR_BOOKED = "#F97316"; // Conversion rate / still owed to hotels
const COLOR_GRID = "#D8C8AD";

const MONTH_WINDOW = 6;

function monthKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(n: number, locale: string): { key: string; label: string }[] {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { month: "short", year: "2-digit" }),
    });
  }
  return out;
}

export interface FinanceChartsLabels {
  gmv: string;
  commission: string;
  orders: string;
  conversionRate: string;
  gmvTrendTitle: string;
  ordersConversionTitle: string;
  breakdownTitle: string;
  breakdownHint: string;
  commissionSlice: string;
  pendingSlice: string;
  paidSlice: string;
  noData: string;
}

interface Props {
  payouts: Payout[];
  guests: Guest[];
  reservations: Reservation[];
  payoutSummary: PayoutSummary | null;
  locale: string;
  labels: FinanceChartsLabels;
}

export default function FinanceCharts({ payouts, guests, reservations, payoutSummary, locale, labels }: Props) {
  const months = lastMonths(MONTH_WINDOW, locale);

  // GMV & commission per month - excludes CANCELLED payouts (refunded
  // before transfer, so nothing was actually collected/earned - see
  // backend PayoutStatus.CANCELLED) to stay consistent with the platform
  // summary totals above and with the Orders count on the chart to the
  // right, which already excludes them.
  const trendData = months.map(({ key, label }) => {
    const inMonth = payouts.filter((p) => monthKey(p.createdAt) === key && p.status !== "CANCELLED");
    return {
      month: label,
      [labels.gmv]: Math.round(inMonth.reduce((s, p) => s + Number(p.grossAmount), 0)),
      [labels.commission]: Math.round(inMonth.reduce((s, p) => s + Number(p.commissionAmount), 0)),
    };
  });

  // Orders: completed transactions that aren't cancelled/refunded, same
  // definition as the Total Transactions stat above.
  // Conversion rate: this system has no visitor/traffic analytics (see the
  // note on the Conversion Rate card), so this is a proxy - registered
  // guests who went on to complete a paid booking that month, out of all
  // registered guests today. Filtering on r.payment?.paymentStatus === "PAID"
  // (not just reservation status) matters here: a reservation can exist and
  // sit PENDING/CONFIRMED before payment succeeds, or have a FAILED payment,
  // so checking only r.status !== "CANCELLED" would count guests who never
  // actually paid - inflating this line relative to Orders right next to it,
  // which is built from Payouts and only ever exists for a successful
  // payment (see backend PayoutService.createForPayment).
  const totalGuests = guests.length;
  const ordersConversionData = months.map(({ key, label }) => {
    const orders = payouts.filter((p) => monthKey(p.createdAt) === key && p.status !== "CANCELLED").length;
    const buyers = new Set(
      reservations
        .filter((r) => r.payment?.paymentStatus === "PAID" && monthKey(r.createdAt) === key)
        .map((r) => r.guest.id)
    );
    const conversion = totalGuests ? Number(((buyers.size / totalGuests) * 100).toFixed(1)) : 0;
    return { month: label, [labels.orders]: orders, [labels.conversionRate]: conversion };
  });

  // Where GMV currently sits: platform's commission (kept regardless of
  // payout status), money still owed to hotels (PENDING payouts), and
  // money already transferred to hotels (PAID payouts).
  const pieData = payoutSummary
    ? [
        { name: labels.commissionSlice, value: Number(payoutSummary.totalCommission), color: COLOR_PRIMARY },
        { name: labels.pendingSlice, value: Number(payoutSummary.totalNetPending), color: COLOR_BOOKED },
        { name: labels.paidSlice, value: Number(payoutSummary.totalNetPaid), color: COLOR_DARK },
      ].filter((d) => d.value > 0)
    : [];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft lg:col-span-2">
        <h3 className="font-heading text-base font-semibold text-dark">{labels.gmvTrendTitle}</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#8B877F" />
              <YAxis tick={{ fontSize: 12 }} stroke="#8B877F" tickFormatter={(v) => new Intl.NumberFormat().format(v)} />
              <Tooltip formatter={(v: number) => formatTHB(v)} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Line type="monotone" dataKey={labels.gmv} stroke={COLOR_PRIMARY} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={labels.commission} stroke={COLOR_DARK} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
        <h3 className="font-heading text-base font-semibold text-dark">{labels.ordersConversionTitle}</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ordersConversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#8B877F" />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#8B877F" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#8B877F" unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Line yAxisId="left" type="monotone" dataKey={labels.orders} stroke={COLOR_PRIMARY} strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey={labels.conversionRate} stroke={COLOR_BOOKED} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
        <h3 className="font-heading text-base font-semibold text-dark">{labels.breakdownTitle}</h3>
        <p className="mt-1 text-[11px] text-muted">{labels.breakdownHint}</p>
        <div className="mt-4 h-56">
          {pieData.length === 0 ? (
            <p className="text-sm text-muted">{labels.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                  {pieData.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatTHB(v)} />
                <Legend
                  wrapperStyle={{ fontSize: 14 }}
                  formatter={(value: string, entry: any) => {
                    const v = Number(entry?.payload?.value ?? 0);
                    const pct = pieTotal ? Math.round((v / pieTotal) * 100) : 0;
                    return `${value}: ${formatTHB(v)} (${pct}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
