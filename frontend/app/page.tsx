"use client";

import { useEffect, useState } from "react";
import SiteShell from "@/components/SiteShell";
import SearchBar from "@/components/SearchBar";
import HotelCard from "@/components/HotelCard";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { getHotels } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { Hotel } from "@/lib/types";

export default function HomePage() {
  const { t } = useLocale();
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    getHotels()
      .then(setHotels)
      .catch(() => setHotels([])); // Backend not reachable yet - the page still renders, list is just empty.
  }, []);

  return (
    <SiteShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-card">
        {/* IMAGE PLACEHOLDER
            ใส่รูป Hero: Exterior โรงแรม / Luxury lobby / Resort
            ภาพแนวนอน 16:9 ต้องมีพื้นที่ว่างสำหรับวางข้อความ */}
        <ImagePlaceholder
          src="/images/hotels/hero.jpg"
          label="Hero hotel image"
          note="Exterior, lobby, or resort - 16:9 landscape with room for text overlay"
          aspect="aspect-[16/9]"
          className="rounded-card"
        />

        <div className="relative mt-6 flex flex-col items-center gap-2 text-center sm:absolute sm:inset-0 sm:mt-0 sm:justify-center sm:bg-dark/30 sm:text-white">
          <p className="text-sm uppercase tracking-wide text-primary sm:text-secondary">{t.home.luxuryStay}</p>
          <h1 className="font-heading text-3xl font-semibold sm:text-5xl">{t.home.heroTitle}</h1>
        </div>
      </section>

      <div className="-mt-6 flex justify-center px-2 sm:-mt-8">
        <SearchBar />
      </div>

      {/* Featured Hotels */}
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-heading text-2xl font-semibold text-dark">{t.home.featuredHotels}</h2>
          <a href="/hotels" className="text-sm font-medium text-primary hover:underline">
            {t.home.viewAll}
          </a>
        </div>

        {hotels.length === 0 ? (
          <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
            {t.home.noHotels}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.slice(0, 6).map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
