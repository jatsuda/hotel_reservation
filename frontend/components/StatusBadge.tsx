"use client";

import { useLocale } from "@/lib/locale-context";

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  OCCUPIED: "bg-amber-100 text-amber-700",
  MAINTENANCE: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  PAID: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-200 text-gray-700",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLocale();
  const style = STATUS_STYLES[status] || "bg-secondary/50 text-text";
  const label = t.status[status as keyof typeof t.status] || status.replace(/_/g, " ").toLowerCase();

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${style}`}>
      {label}
    </span>
  );
}
