"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, User, LogOut, Languages } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t, locale, toggleLocale } = useLocale();
  const router = useRouter();

  const NAV_LINKS = [
    { label: t.nav.home, href: "/" },
    { label: t.nav.support, href: "/support" },
    { label: t.nav.rent, href: "/hotels" },
    { label: t.nav.contact, href: "/contact" },
  ];

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-secondary/60 bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-heading text-xl font-semibold text-dark">
          Aurelia<span className="text-primary">Stay</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          {(user?.role === "ADMIN" || user?.role === "HOTEL_OWNER" || user?.role === "HOTEL_STAFF") && (
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              {user.role === "ADMIN" ? t.nav.admin : t.nav.hotelPanel}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleLocale}
            title={locale === "en" ? "เปลี่ยนเป็นภาษาไทย" : "Switch to English"}
            className="flex items-center gap-1.5 rounded-full border border-secondary px-3 py-1.5 text-xs font-medium text-text hover:bg-secondary/30"
          >
            <Languages className="h-3.5 w-3.5" />
            {locale === "en" ? "EN" : "ไทย"}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/reservations"
                className="flex items-center gap-1.5 rounded-full border border-secondary px-3 py-1.5 text-xs font-medium text-text hover:bg-secondary/30"
              >
                <User className="h-3.5 w-3.5" />
                {user.fullName.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                title={t.nav.logout}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary text-red-400 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-dark"
            >
              {t.nav.login}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleLocale}
            className="flex h-10 items-center justify-center rounded-control border border-secondary px-2.5 text-xs font-medium text-text"
          >
            {locale === "en" ? "EN" : "ไทย"}
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-control border border-secondary"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-secondary/60 bg-card px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control px-3 py-2 text-sm text-text hover:bg-secondary/30"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {(user?.role === "ADMIN" || user?.role === "HOTEL_OWNER" || user?.role === "HOTEL_STAFF") && (
            <Link href="/admin" className="rounded-control px-3 py-2 text-sm font-medium text-primary" onClick={() => setOpen(false)}>
              {user.role === "ADMIN" ? t.nav.admin : t.nav.hotelPanel}
            </Link>
          )}
          {user ? (
            <>
              <Link href="/reservations" className="rounded-control px-3 py-2 text-sm text-text" onClick={() => setOpen(false)}>
                {t.nav.myReservations} ({user.fullName.split(" ")[0]})
              </Link>
              <button onClick={handleLogout} className="rounded-control px-3 py-2 text-left text-sm text-red-500">
                {t.nav.logout}
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-control px-3 py-2 text-sm font-medium text-primary" onClick={() => setOpen(false)}>
              {t.nav.login}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
