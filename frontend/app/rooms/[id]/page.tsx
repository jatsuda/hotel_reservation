"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, Ruler } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import RoomHeroGallery from "@/components/RoomHeroGallery";
import RoomAmenitiesSidebar from "@/components/RoomAmenitiesSidebar";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import AdvanceBookingList from "@/components/AdvanceBookingList";
import PromoCard from "@/components/PromoCard";
import StatusBadge from "@/components/StatusBadge";
import RoomBookingCta from "@/components/RoomBookingCta";
import { getRoomById, getUpcomingReservationsByRoom } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { Room, UpcomingReservation } from "@/lib/types";

const ROOM_IMAGE_NOTES: Record<string, string> = {
  SINGLE: "Room with a single bed",
  DOUBLE: "Room with a double/queen bed",
  TWIN: "Room with two single beds",
  DELUXE: "Premium decor, upscale finish",
  FAMILY: "Multiple beds, or space for 3-4 guests",
  SUITE: "Large suite with a living area",
};

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const { t } = useLocale();

  const [room, setRoom] = useState<Room | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    getRoomById(params.id)
      .then((r) => {
        setRoom(r);
        return getUpcomingReservationsByRoom(r.id).catch(() => []);
      })
      .then((res) => setUpcoming(res || []))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <SiteShell>
        <p className="text-sm text-muted">{t.room.loading}</p>
      </SiteShell>
    );
  }

  if (notFound || !room) {
    return (
      <SiteShell>
        <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
          {t.reservationDetail.notFound}
        </p>
      </SiteShell>
    );
  }

  // Main photo first, then every extra photo uploaded in /admin/rooms. Until
  // at least one extra photo exists, keep the three placeholder slots.
  const extraImages = (room.images ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const galleryShots = [
    { label: `${room.roomType} room - main view`, note: ROOM_IMAGE_NOTES[room.roomType], src: room.imageUrl },
    ...(extraImages.length > 0
      ? extraImages.map((img, i) => ({
          label: img.label || `Photo ${i + 2}`,
          note: "Room photo",
          src: img.imageUrl,
        }))
      : [
          { label: "Room detail", note: "Close-up of bedding / seating area" },
          { label: "Bathroom", note: "Bathtub or shower" },
          { label: "View", note: "Window or balcony view" },
        ]),
  ];

  return (
    <SiteShell>
      <div className="mb-6 flex items-start justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">{t.room.viewDetailsTitle}</h1>
          <p className="mt-1 text-sm text-muted">{room.hotel?.name}</p>
        </div>
        <span className="whitespace-nowrap text-sm text-muted">{t.room.roomNo} {room.roomNumber}</span>
      </div>

      {/* Main 2-column layout: ~65-70% content, ~30-35% sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Column 1 */}
        <div className="flex flex-col gap-6">
          <RoomHeroGallery
            shots={galleryShots}
            sizeLabel={room.size ? `${room.size} sq. ft` : undefined}
            bedTypeLabel={room.bedType}
            floorLabel={
              room.floor
                ? `${room.floor}${room.floor === 1 ? "st" : room.floor === 2 ? "nd" : room.floor === 3 ? "rd" : "th"} Floor`
                : undefined
            }
          />

          <div className="rounded-card border border-outline bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold text-dark">{t.room.detailsHeader}</h2>
              <StatusBadge status={room.status} />
            </div>

            <h3 className="mt-5 text-sm font-semibold text-text">{t.room.roomOverview}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">{t.room.roomName}</dt>
                <dd className="capitalize text-text">{room.roomType.toLowerCase()} Room</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t.room.type}</dt>
                <dd className="text-text">{room.bedType || "-"}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <div>
                  <dt className="text-xs text-muted">{t.room.capacity}</dt>
                  <dd className="text-text">{room.capacity} {t.room.guests}</dd>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-primary" />
                <div>
                  <dt className="text-xs text-muted">{t.room.size}</dt>
                  <dd className="text-text">{room.size ? `${room.size} sq. ft` : "-"}</dd>
                </div>
              </div>
            </dl>

            <h3 className="mt-6 text-sm font-semibold text-text">{t.room.descriptionOther}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {room.description || t.room.defaultDescription}
            </p>
          </div>

          <AvailabilityCalendar
            bookedRanges={upcoming.map((r) => ({ checkInDate: r.checkInDate, checkOutDate: r.checkOutDate }))}
          />

          <PromoCard />
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-6">
          <RoomAmenitiesSidebar room={room} />
          <AdvanceBookingList reservations={upcoming} />
          <RoomBookingCta roomId={room.id} status={room.status} pricePerNight={room.pricePerNight} />
        </div>
      </div>
    </SiteShell>
  );
}
