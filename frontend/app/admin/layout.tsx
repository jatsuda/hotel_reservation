"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";

const ADMIN_ROLES = ["ADMIN", "HOTEL_OWNER", "HOTEL_STAFF"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const isOwner = user?.role === "HOTEL_OWNER";
  const isStaff = user?.role === "HOTEL_STAFF";
  const permissions = user?.permissions ?? [];
  // An ADMIN or HOTEL_OWNER has full access to whatever they're allowed to
  // touch; a HOTEL_STAFF account only sees tabs for the specific areas its
  // owner granted (see entity/Permission.java on the backend) - hiding the
  // tab here is just UX, the same scoping is enforced again on every page
  // and, for real, on the backend.
  const has = (p: "MANAGE_HOTEL_INFO" | "MANAGE_ROOMS" | "MANAGE_RESERVATIONS" | "VIEW_FINANCE") =>
    !isStaff || permissions.includes(p);

  const TABS = [
    { href: "/admin", label: t.admin.tabs.dashboard, show: true },
    { href: "/admin/hotels", label: isOwner ? t.admin.tabs.myHotel : t.admin.tabs.hotels, show: has("MANAGE_HOTEL_INFO") },
    { href: "/admin/rooms", label: t.admin.tabs.rooms, show: has("MANAGE_ROOMS") },
    { href: "/admin/reservations", label: t.admin.tabs.reservations, show: has("MANAGE_RESERVATIONS") || has("VIEW_FINANCE") },
    // Same visibility as Reservations: viewing payouts only needs
    // VIEW_FINANCE, but ADMIN/HOTEL_OWNER always pass has() regardless.
    { href: "/admin/payouts", label: t.admin.tabs.payouts, show: has("VIEW_FINANCE") || has("MANAGE_RESERVATIONS") },
    // Managing staff accounts is owner/admin-only - never shown to a
    // HOTEL_STAFF account regardless of its permissions.
    { href: "/admin/staff", label: t.admin.tabs.staff, show: isOwner },
  ].filter((tab) => tab.show);

  // Client-side backup to middleware.ts (which checks a cookie at the edge).
  // This covers the case where the cookie hasn't been set yet in this tab.
  useEffect(() => {
    if (!loading && (!user || !ADMIN_ROLES.includes(user.role))) {
      router.replace("/login?redirect=/admin");
    }
  }, [loading, user, router]);

  if (loading || !user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <SiteShell>
        <p className="text-sm text-muted">{t.admin.checkingAccess}</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">
            {isOwner ? t.admin.ownerTitle : isStaff ? t.admin.staffTitle : t.admin.title}
          </h1>
          {(isOwner || isStaff) && <p className="mt-1 text-sm text-muted">{user.fullName}</p>}
        </div>
        <Link
          href="/account/password"
          className="no-print flex items-center gap-1.5 rounded-control border border-secondary px-3 py-2 text-xs font-medium text-text hover:bg-secondary/30"
        >
          <UserCog className="h-3.5 w-3.5" /> {t.admin.accountSettings}
        </Link>
      </div>
      <nav className="no-print -mt-4 mb-8 flex gap-2 border-b border-secondary/60">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-3 py-2 text-sm font-medium text-muted hover:text-primary"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </SiteShell>
  );
}
