"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import HotelCard from "@/components/HotelCard";
import { getHotels } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { Hotel, RoomType } from "@/lib/types";

const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "TWIN", "DELUXE", "FAMILY", "SUITE"];
const STAR_OPTIONS = [3, 4, 5];

function HotelsBrowser() {
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  // Local, client-side filter state - toggling these never touches the URL
  // or triggers a Next.js navigation, so there's no router-cache staleness.
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [starsFilter, setStarsFilter] = useState<number | null>(null);
  const [roomTypesFilter, setRoomTypesFilter] = useState<RoomType[]>([]);

  useEffect(() => {
    getHotels()
      .then(setHotels)
      .catch(() => setHotels([]))
      .finally(() => setLoading(false));
  }, []);

  // Support arriving here from the homepage search bar (?city=Bangkok) by
  // seeding the initial filter once, on first load only.
  useEffect(() => {
    const initialCity = searchParams.get("city");
    if (initialCity) setCityFilter(initialCity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(hotels.map((h) => h.city).filter(Boolean))) as string[],
    [hotels]
  );

  const filtered = useMemo(() => {
    let result = hotels;
    if (cityFilter) {
      result = result.filter((h) => h.city?.toLowerCase() === cityFilter.toLowerCase());
    }
    if (starsFilter) {
      result = result.filter((h) => h.starRating === starsFilter);
    }
    if (roomTypesFilter.length > 0) {
      result = result.filter((h) => h.rooms?.some((r) => roomTypesFilter.includes(r.roomType)));
    }
    return result;
  }, [hotels, cityFilter, starsFilter, roomTypesFilter]);

  const hasActiveFilters = Boolean(cityFilter || starsFilter || roomTypesFilter.length > 0);

  function toggleRoomType(type: RoomType) {
    setRoomTypesFilter((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function clearAll() {
    setCityFilter(null);
    setStarsFilter(null);
    setRoomTypesFilter([]);
  }

  return (
    <SiteShell>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">
            {t.hotels.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? t.hotels.loading
              : `${filtered.length} ${filtered.length === 1 ? t.hotels.hotelAvailable : t.hotels.hotelsAvailable}`}
          </p>
        </div>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-sm font-medium text-primary hover:underline">
            {t.hotels.clearAll}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters */}
        <aside className="w-full flex-shrink-0 rounded-card border border-secondary/60 bg-card p-5 shadow-soft lg:w-64">
          <h3 className="font-heading text-base font-semibold text-dark">{t.hotels.filters}</h3>

          <div className="mt-4 flex flex-col gap-4 text-sm">
            <div>
              <p className="mb-2 font-medium text-text">{t.hotels.location}</p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setCityFilter(null)}
                  className={`text-left ${!cityFilter ? "font-medium text-primary" : "text-muted hover:text-primary"}`}
                >
                  {t.hotels.allLocations}
                </button>
                {cities.map((city) => {
                  const isActive = cityFilter?.toLowerCase() === city.toLowerCase();
                  return (
                    <button
                      key={city}
                      onClick={() => setCityFilter(isActive ? null : city)}
                      className={`text-left ${isActive ? "font-medium text-primary" : "text-muted hover:text-primary"}`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium text-text">{t.hotels.starRating}</p>
              <div className="flex gap-1.5">
                {STAR_OPTIONS.map((star) => {
                  const isActive = starsFilter === star;
                  return (
                    <button
                      key={star}
                      onClick={() => setStarsFilter(isActive ? null : star)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-secondary text-muted hover:bg-secondary/30"
                      }`}
                    >
                      {star} ★
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium text-text">{t.hotels.roomType}</p>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_TYPES.map((type) => {
                  const isActive = roomTypesFilter.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleRoomType(type)}
                      className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-secondary text-muted hover:bg-secondary/30"
                      }`}
                    >
                      {type.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <p className="text-sm text-muted">{t.hotels.loadingHotels}</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
              {t.hotels.noMatch}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

export default function HotelsPage() {
  return (
    <Suspense fallback={<SiteShell><p className="text-sm text-muted">Loading...</p></SiteShell>}>
      <HotelsBrowser />
    </Suspense>
  );
}
