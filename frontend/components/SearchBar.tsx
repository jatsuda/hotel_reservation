"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { MapPin, Calendar, Users, Search } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set("city", destination);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", String(guests));
    router.push(`/hotels?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full max-w-4xl grid-cols-1 gap-3 rounded-card bg-card/95 p-4 shadow-soft backdrop-blur sm:grid-cols-4 sm:items-end sm:gap-4 sm:p-5"
    >
      <label className="flex flex-col gap-1 text-left">
        <span className="flex items-center gap-1 text-xs font-medium text-muted">
          <MapPin className="h-3.5 w-3.5" /> Destination
        </span>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="City or hotel"
          className="rounded-control border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-left">
        <span className="flex items-center gap-1 text-xs font-medium text-muted">
          <Calendar className="h-3.5 w-3.5" /> Check-in
        </span>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="rounded-control border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-left">
        <span className="flex items-center gap-1 text-xs font-medium text-muted">
          <Calendar className="h-3.5 w-3.5" /> Check-out
        </span>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="rounded-control border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-left">
          <span className="flex items-center gap-1 text-xs font-medium text-muted">
            <Users className="h-3.5 w-3.5" /> Guests
          </span>
          <input
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="rounded-control border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <button
          type="submit"
          className="mt-5 flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-control bg-primary text-white hover:bg-dark"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
