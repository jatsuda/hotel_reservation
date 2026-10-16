import { MapPin, Star, Phone, Mail } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import HotelGallery from "@/components/HotelGallery";
import RoomCard from "@/components/RoomCard";
import HotelMap from "@/components/HotelMap";
import HotelReviews from "@/components/HotelReviews";
import StarRating from "@/components/StarRating";
import { getHotelById, getRooms, getHotelReviews, getHotelReviewSummary } from "@/lib/api";
import { notFound } from "next/navigation";
import type { HotelImageCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<HotelImageCategory, string> = {
  ROOM: "Room",
  BATHROOM: "Bathroom",
  FACILITY: "Facility",
  OTHER: "Photo",
};
const CATEGORY_NOTES: Record<HotelImageCategory, string> = {
  ROOM: "Guest room photo",
  BATHROOM: "Hotel bathroom - bathtub or shower",
  FACILITY: "Pool, restaurant, gym, or lobby",
  OTHER: "Additional hotel photo",
};

export default async function HotelDetailPage({ params }: { params: { id: string } }) {
  let hotel;
  try {
    hotel = await getHotelById(params.id);
  } catch {
    notFound();
  }

  const rooms = await getRooms(params.id).catch(() => []);
  const [reviews, reviewSummary] = await Promise.all([
    getHotelReviews(params.id).catch(() => []),
    getHotelReviewSummary(params.id).catch(() => ({ averageRating: 0, totalReviews: 0 })),
  ]);

  const additionalImages = (hotel.images ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const galleryImages = [
    {
      label: "Main hotel image",
      note: "Primary photo - horizontal, high resolution, exterior or lobby",
      src: hotel.imageUrl,
    },
    ...(additionalImages.length > 0
      ? additionalImages.map((img) => ({
          label: img.label || CATEGORY_LABELS[img.category],
          note: CATEGORY_NOTES[img.category],
          src: img.imageUrl,
        }))
      : [
          { label: "Family room", note: "If available: family room with multiple beds" },
          { label: "Bathroom", note: "Hotel bathroom - bathtub or shower" },
          { label: "Facility", note: "Pool, restaurant, gym, or lobby" },
        ]),
  ];

  return (
    <SiteShell>
      <HotelGallery images={galleryImages} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">{hotel.name}</h1>
              <div className="mt-2 flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-4 w-4" />
                {hotel.address}, {hotel.city}, {hotel.country}
              </div>
              {reviewSummary.totalReviews > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating value={reviewSummary.averageRating} size="sm" />
                  <span className="text-sm text-muted">
                    {reviewSummary.averageRating.toFixed(1)} ({reviewSummary.totalReviews})
                  </span>
                </div>
              )}
            </div>
            {hotel.starRating && (
              <div className="flex items-center gap-0.5 text-primary">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary" />
                ))}
              </div>
            )}
          </div>

          {hotel.description && (
            <p className="mt-4 text-sm leading-relaxed text-text">{hotel.description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
            {hotel.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {hotel.phone}
              </span>
            )}
            {hotel.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {hotel.email}
              </span>
            )}
          </div>

          <h2 className="mt-10 font-heading text-xl font-semibold text-dark">Rooms</h2>
          <div className="mt-4 flex flex-col gap-4">
            {rooms.length === 0 ? (
              <p className="rounded-card border border-dashed border-secondary bg-card p-6 text-center text-sm text-muted">
                No rooms found for this hotel yet.
              </p>
            ) : (
              rooms.map((room) => <RoomCard key={room.id} room={room} />)
            )}
          </div>

          <HotelReviews
            hotelId={hotel.id}
            hotelName={hotel.name}
            initialReviews={reviews}
            initialSummary={reviewSummary}
          />
        </div>

        {/* At-a-glance panel + map */}
        <div className="flex h-fit flex-col gap-6">
          <aside className="rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
            <h3 className="font-heading text-base font-semibold text-dark">At a glance</h3>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Rooms available</dt>
                <dd className="font-medium text-text">
                  {rooms.filter((r) => r.status === "AVAILABLE").length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Total rooms</dt>
                <dd className="font-medium text-text">{rooms.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Star rating</dt>
                <dd className="font-medium text-text">{hotel.starRating ?? "-"} / 5</dd>
              </div>
              {reviewSummary.totalReviews > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Guest rating</dt>
                  <dd className="font-medium text-text">
                    {reviewSummary.averageRating.toFixed(1)} / 5 ({reviewSummary.totalReviews})
                  </dd>
                </div>
              )}
            </dl>
          </aside>

          {hotel.latitude != null && hotel.longitude != null && (
            <div>
              <h3 className="mb-3 font-heading text-base font-semibold text-dark">Location</h3>
              <HotelMap name={hotel.name} latitude={hotel.latitude} longitude={hotel.longitude} />
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
