"use client";

import Link from "next/link";
import { MapPin, Star, Tag, Coffee } from "lucide-react";
import type { Hotel } from "@/lib/types";
import ImagePlaceholder from "./ImagePlaceholder";
import { getHotelDeal } from "@/lib/deals";
import { formatTHB } from "@/lib/currency";
import { useLocale } from "@/lib/locale-context";

interface HotelCardProps {
  hotel: Hotel;
}

export default function HotelCard({ hotel }: HotelCardProps) {
  const { t } = useLocale();
  const lowestPrice = hotel.rooms?.length
    ? Math.min(...hotel.rooms.map((r) => r.pricePerNight))
    : null;

  const deal = getHotelDeal(hotel.id);
  const discountedPrice =
    deal?.type === "discount" && lowestPrice !== null
      ? Math.round(lowestPrice * (1 - deal.percent / 100))
      : null;

  return (
    <Link
      href={`/hotels/${hotel.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-secondary/60 bg-card shadow-soft transition-transform hover:-translate-y-1"
    >
      <div className="relative">
        {/* IMAGE PLACEHOLDER (shown only if hotel.imageUrl is empty or fails to load)
            ใส่รูปด้านหน้าโรงแรม / Lobby / สระว่ายน้ำ ของ "{hotel.name}"
            แนะนำรูปแนวนอน ขนาด 1200x800 px */}
        <ImagePlaceholder
          src={hotel.imageUrl}
          label={hotel.name}
          note="Hotel exterior or lobby - 1200x800px landscape"
          aspect="aspect-[4/3]"
          className="rounded-none rounded-t-card border-0"
        />

        {deal && (
          <span
            className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-soft ${
              deal.type === "discount" ? "bg-booked2" : "bg-primary"
            }`}
          >
            {deal.type === "discount" ? (
              <Tag className="h-3 w-3" />
            ) : (
              <Coffee className="h-3 w-3" />
            )}
            {deal.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-heading text-lg font-semibold text-dark">{hotel.name}</h3>

        {hotel.starRating && (
          <div className="flex items-center gap-0.5 text-primary">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-primary" />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            {hotel.city}
            {hotel.country ? `, ${hotel.country}` : ""}
          </span>
        </div>

        {lowestPrice !== null && (
          <p className="mt-1 text-sm text-text">
            {t.hotels.startingFrom}{" "}
            {discountedPrice !== null ? (
              <>
                <span className="text-muted line-through">{formatTHB(lowestPrice)}</span>{" "}
                <span className="font-semibold text-booked2">{formatTHB(discountedPrice)}</span>
              </>
            ) : (
              <span className="font-semibold text-primary">{formatTHB(lowestPrice)}</span>
            )}{" "}
            {t.hotels.perNight}
          </p>
        )}

        <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">
          {t.hotels.viewHotel}
        </span>
      </div>
    </Link>
  );
}
