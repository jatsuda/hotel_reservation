"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  Percent,
  Mail,
  Calendar,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";

/**
 * Desktop-only left sidebar, per the reference layout. Hidden on mobile
 * in favor of the Navbar's hamburger menu.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  // History and Bookings are two distinct views of the same underlying
  // reservations (past/closed vs upcoming/active) - see
  // app/reservations/page.tsx and app/reservations/history/page.tsx.
  const ITEMS = [
    { icon: Calendar, href: "/reservations", label: t.sidebar.bookings },
    { icon: Clock, href: "/reservations/history", label: t.sidebar.history },
    { icon: Percent, href: "/hotels", label: t.sidebar.deals },
    { icon: Mail, href: "/contact", label: t.sidebar.messages },
  ];

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-16 flex-col items-center justify-between border-r border-secondary/60 bg-card py-6 lg:flex">
      <nav className="flex flex-col items-center gap-6">
        {ITEMS.map(({ icon: Icon, href, label }) => (
          <Link
            key={label}
            href={href}
            title={label}
            className={`flex h-10 w-10 items-center justify-center rounded-control transition-colors ${
              pathname === href
                ? "bg-primary text-white"
                : "text-muted hover:bg-secondary/30 hover:text-text"
            }`}
          >
            <Icon className="h-4 w-4" />
          </Link>
        ))}
      </nav>

      {user ? (
        <button
          onClick={handleLogout}
          title={t.sidebar.logout}
          className="flex h-10 w-10 items-center justify-center rounded-control text-red-400 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      ) : (
        <Link
          href="/login"
          title={t.sidebar.login}
          className="flex h-10 w-10 items-center justify-center rounded-control text-primary hover:bg-secondary/30"
        >
          <LogIn className="h-4 w-4" />
        </Link>
      )}
    </aside>
  );
}
