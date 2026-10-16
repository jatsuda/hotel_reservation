"use client";

import { useState } from "react";
import { Maximize2, BedDouble, Layers } from "lucide-react";
import ImagePlaceholder from "./ImagePlaceholder";

interface GalleryShot {
  label: string;
  note: string;
  src?: string; // real image path/URL - falls back to the placeholder if missing or fails to load
}

interface RoomHeroGalleryProps {
  shots: GalleryShot[]; // first is the large hero image, rest are thumbnails
  sizeLabel?: string; // e.g. "400 sq. ft"
  bedTypeLabel?: string; // e.g. "Double bed"
  floorLabel?: string; // e.g. "3rd Floor"
}

/**
 * Room Detail hero: one large image with a thumbnail strip underneath, plus
 * floating pill badges (size / bed type / floor) overlaid on the image -
 * matching the reference layout.
 */
export default function RoomHeroGallery({
  shots,
  sizeLabel,
  bedTypeLabel,
  floorLabel,
}: RoomHeroGalleryProps) {
  const [active, setActive] = useState(0);
  const current = shots[active] ?? shots[0];

  const badges = [
    sizeLabel && { icon: Maximize2, label: sizeLabel },
    bedTypeLabel && { icon: BedDouble, label: bedTypeLabel },
    floorLabel && { icon: Layers, label: floorLabel },
  ].filter(Boolean) as { icon: typeof Maximize2; label: string }[];

  return (
    <div>
      <div className="relative">
        {/* IMAGE PLACEHOLDER (shown if current.src is empty or fails to load): {current.note} - แนวนอน คุณภาพสูง */}
        <div className="relative aspect-[16/9] w-full">
          <ImagePlaceholder fill src={current.src} label={current.label} note={current.note} />
        </div>

        {badges.length > 0 && (
          <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
            {badges.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-text shadow-soft backdrop-blur"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {shots.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {shots.map((shot, i) => (
            <button
              key={`${shot.label}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-control border-2 transition-colors ${
                i === active ? "border-primary" : "border-transparent"
              }`}
            >
              {/* IMAGE PLACEHOLDER: {shot.note} (thumbnail) */}
              <ImagePlaceholder fill src={shot.src} label={shot.label} className="rounded-none border-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
