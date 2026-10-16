"use client";

import { useState } from "react";
import {
  BedDouble,
  Sofa,
  Tv,
  Bath,
  Accessibility,
  Utensils,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import type { Room, RoomAmenity, AmenityCategory } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";

const CATEGORY_ICONS: Record<AmenityCategory, LucideIcon> = {
  BED: BedDouble,
  TECHNOLOGY: Tv,
  BATHROOM: Bath,
  ACCESSIBILITY: Accessibility,
  KITCHEN: Utensils,
};

const ICON_KEY_MAP: Record<string, LucideIcon> = {
  bed: BedDouble,
  sofa: Sofa,
  tv: Tv,
  bath: Bath,
  accessibility: Accessibility,
  utensils: Utensils,
};

// Extra detail shown when a row is expanded, keyed by amenity title. Titles
// are shared between the seeded RoomAmenity rows and buildFallbackAmenities
// below, so this map applies to both real and fallback data.
const DETAIL_BULLETS: Record<string, (room: Room) => string[]> = {
  "Bed Room": (room) => [
    `Sleeps up to ${room.capacity} guest${room.capacity > 1 ? "s" : ""}`,
    "Daily housekeeping included",
    "Non-smoking room",
  ],
  "Bed Type & Others": (room) => [
    room.bedType ? `Bed type: ${room.bedType}` : "Bedding arranged on request",
    "Extra pillows available on request",
    "Rollaway bed available for some room types (extra charge)",
  ],
  Technology: () => [
    "43-inch Smart TV with streaming apps",
    "Mini refrigerator",
    "Individually controlled air conditioning",
    "In-room coffee & tea maker",
  ],
  Bathroom: () => [
    "Private attached bathroom",
    "Hot & cold shower",
    "Complimentary toiletries",
    "Fresh towels daily",
  ],
  Accessibility: () => [
    "Free high-speed Wifi throughout the room",
    "Step-free access available on request",
    "Ground-floor rooms available on request",
  ],
  Kitchen: () => [
    "Mini kitchenette",
    "Electric kettle",
    "Complimentary bottled drinking water",
  ],
};

interface RoomAmenitiesSidebarProps {
  room: Room;
}

/**
 * Builds a sensible default amenity list from the room's own fields
 * (bed type, capacity, size) so the sidebar still looks complete for rooms
 * that don't have explicit RoomAmenity rows in the database yet.
 */
function buildFallbackAmenities(room: Room): RoomAmenity[] {
  return [
    {
      id: -1,
      category: "BED",
      title: "Bed Room",
      description: `${room.roomType.toLowerCase()} room, up to ${room.capacity} guests`,
      icon: "bed",
    },
    {
      id: -2,
      category: "BED",
      title: "Bed Type & Others",
      description: room.bedType ? `${room.bedType}, extra pillows on request` : "Bedding on request",
      icon: "sofa",
    },
    {
      id: -3,
      category: "TECHNOLOGY",
      title: "Technology",
      description: "TV, fridge, AC, coffee maker",
      icon: "tv",
    },
    {
      id: -4,
      category: "BATHROOM",
      title: "Bathroom",
      description: "1 attached bathroom",
      icon: "bath",
    },
    {
      id: -5,
      category: "ACCESSIBILITY",
      title: "Accessibility",
      description: "Free Wifi",
      icon: "accessibility",
    },
    {
      id: -6,
      category: "KITCHEN",
      title: "Kitchen",
      description: "Mini kitchen / kettle",
      icon: "utensils",
    },
  ];
}

export default function RoomAmenitiesSidebar({ room }: RoomAmenitiesSidebarProps) {
  const { t } = useLocale();
  const amenities = room.amenities && room.amenities.length > 0 ? room.amenities : buildFallbackAmenities(room);
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  return (
    <div className="rounded-card border border-outline bg-card p-5 shadow-soft">
      <h3 className="font-heading text-base font-semibold text-dark">{t.amenitiesSidebar.header}</h3>

      <div className="mt-4 flex flex-col divide-y divide-outline">
        {amenities.map((amenity) => {
          const Icon = (amenity.icon && ICON_KEY_MAP[amenity.icon]) || CATEGORY_ICONS[amenity.category];
          const isOpen = openTitle === amenity.title;
          const bullets = DETAIL_BULLETS[amenity.title]?.(room) ?? (amenity.description ? [amenity.description] : []);

          return (
            <div key={`${amenity.category}-${amenity.title}`}>
              <button
                type="button"
                onClick={() => setOpenTitle(isOpen ? null : amenity.title)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-panel text-text">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">{amenity.title}</p>
                  {amenity.description && <p className="text-xs text-muted">{amenity.description}</p>}
                </div>
                <ChevronRight
                  className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isOpen && bullets.length > 0 && (
                <ul className="ml-12 flex list-disc flex-col gap-1 pb-3 pl-4 text-xs text-muted">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
