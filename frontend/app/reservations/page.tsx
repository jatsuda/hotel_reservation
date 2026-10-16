"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import ReservationCard from "@/components/ReservationCard";
import Button from "@/components/Button";
import { getMyReservations, cancelReservation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Reservation } from "@/lib/types";

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // "Bookings" (this page) is the active/upcoming half of a reservation's
  // lifecycle; closed-out reservations live on the separate History page
  // (app/reservations/history/page.tsx) instead of being mixed in here.
  const ACTIVE_STATUSES: Reservation["status"][] = ["PENDING", "CONFIRMED", "CHECKED_IN"];

  function load() {
    setLoading(true);
    getMyReservations()
      .then((data) => setReservations(data.filter((r) => ACTIVE_STATUSES.includes(r.status))))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/reservations");
      return;
    }
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleCancel(id: number) {
    await cancelReservation(id);
    load();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">{t.myReservations.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.myReservations.subtitle} {user.email}.</p>
        </div>
        <Button href="/hotels" variant="outline">{t.myReservations.bookNewStay}</Button>
      </div>

      <div className="mt-4">
        <Link href="/reservations/history" className="text-sm font-medium text-primary hover:underline">
          {t.myReservations.viewHistory}
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted">{t.myReservations.loading}</p>
        ) : reservations.length === 0 ? (
          <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
            {t.myReservations.noReservations}
          </p>
        ) : (
          reservations.map((r) => (
            <ReservationCard key={r.id} reservation={r} onCancel={handleCancel} />
          ))
        )}
      </div>
    </SiteShell>
  );
}
