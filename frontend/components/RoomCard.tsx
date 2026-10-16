import { Users, BedDouble, Ruler } from "lucide-react";
import type { Room } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import Button from "./Button";
import ImagePlaceholder from "./ImagePlaceholder";
import { formatTHB } from "@/lib/currency";

interface RoomCardProps {
  room: Room;
}

const ROOM_IMAGE_NOTES: Record<string, string> = {
  SINGLE: "Room with a single bed",
  DOUBLE: "Room with a double/queen bed",
  TWIN: "Room with two single beds",
  DELUXE: "Premium decor, upscale finish",
  FAMILY: "Multiple beds, space for 3-4 guests",
  SUITE: "Large suite with a living area",
};

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-secondary/60 bg-card p-4 shadow-soft sm:flex-row">
      {/* IMAGE PLACEHOLDER (shown only if room.imageUrl is empty or fails to load)
          ใส่รูปห้อง {room.roomType}: {ROOM_IMAGE_NOTES[room.roomType]}
          แนะนำรูปแนวนอน 1200x800 px */}
      <ImagePlaceholder
        src={room.imageUrl}
        label={`${room.roomType} room`}
        note={ROOM_IMAGE_NOTES[room.roomType]}
        aspect="aspect-[4/3]"
        className="sm:w-56 sm:flex-shrink-0"
      />

      <div className="flex flex-1 flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-heading text-base font-semibold capitalize text-dark">
              {room.roomType.toLowerCase()} Room
            </h4>
            <StatusBadge status={room.status} />
          </div>
          {room.description && (
            <p className="mt-1 text-sm text-muted line-clamp-2">{room.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-text">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" /> {room.capacity} Guests
          </span>
          {room.bedType && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-primary" /> {room.bedType}
            </span>
          )}
          {room.size && (
            <span className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-primary" /> {room.size} m²
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-primary">
            {formatTHB(room.pricePerNight)}
            <span className="text-sm font-normal text-muted"> /night</span>
          </p>
          <Button
            href={`/rooms/${room.id}`}
            variant={room.status === "AVAILABLE" ? "primary" : "outline"}
            disabled={room.status !== "AVAILABLE"}
          >
            {room.status === "AVAILABLE" ? "Reserve" : "Unavailable"}
          </Button>
        </div>
      </div>
    </div>
  );
}
