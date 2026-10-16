"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-secondary/60 bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div>
          <p className="font-heading text-lg font-semibold text-dark">
            Aurelia<span className="text-primary">Stay</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">{t.footer.tagline}</p>
        </div>

        <div className="flex gap-12 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-text">{t.footer.explore}</span>
            <Link href="/hotels" className="text-muted hover:text-primary">{t.footer.hotels}</Link>
            <Link href="/reservations" className="text-muted hover:text-primary">{t.footer.myReservations}</Link>
            <Link href="/admin" className="text-muted hover:text-primary">{t.footer.admin}</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-text">{t.footer.support}</span>
            <Link href="/support" className="text-muted hover:text-primary">{t.footer.helpCenter}</Link>
            <Link href="/contact" className="text-muted hover:text-primary">{t.footer.contactUs}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-secondary/60 py-4 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} AureliaStay {t.footer.rights}
      </div>
    </footer>
  );
}
