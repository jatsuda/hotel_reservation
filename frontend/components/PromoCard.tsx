"use client";

import ImagePlaceholder from "./ImagePlaceholder";
import { useLocale } from "@/lib/locale-context";

interface PromoCardProps {
  title?: string;
  message?: string;
  note?: string;
  imageUrl?: string;
}

/**
 * Small promotional card (e.g. complimentary breakfast) shown under the
 * room details. Defaults to /images/facilities/breakfast.jpg - drop a photo
 * there and it renders automatically, or pass a different `imageUrl`.
 */
export default function PromoCard({ title, message, note, imageUrl = "/images/facilities/breakfast.jpg" }: PromoCardProps) {
  const { t } = useLocale();
  const resolvedTitle = title ?? t.promo.title;
  const resolvedMessage = message ?? t.promo.message;
  const resolvedNote = note ?? t.promo.note;

  return (
    <div className="overflow-hidden rounded-card border border-outline bg-card shadow-soft">
      {/* IMAGE PLACEHOLDER
          ใส่รูปอาหารเช้า / โต๊ะอาหารเช้า - แนวนอนหรือสี่เหลี่ยมจัตุรัส */}
      <ImagePlaceholder
        src={imageUrl}
        label={resolvedTitle}
        note="Breakfast spread or table setting"
        aspect="aspect-[4/3]"
        className="rounded-none border-0"
      />
      <div className="p-5">
        <p className="text-sm font-medium text-text">{resolvedMessage}</p>
        <p className="mt-1 text-xs text-muted">{resolvedNote}</p>
      </div>
    </div>
  );
}
