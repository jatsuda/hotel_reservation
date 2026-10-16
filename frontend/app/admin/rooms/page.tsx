"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import Button from "@/components/Button";
import ImageUploadField from "@/components/ImageUploadField";
import MultiImageUpload from "@/components/MultiImageUpload";
import { getHotels, getRooms, createRoom, updateRoom, deleteRoom, changeRoomStatus } from "@/lib/api";
import { formatTHB } from "@/lib/currency";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Hotel, Room, RoomStatus, RoomType } from "@/lib/types";

const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "TWIN", "DELUXE", "FAMILY", "SUITE"];
const ROOM_STATUSES: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "MAINTENANCE"];

interface RoomImageRow {
  label: string;
  imageUrl: string;
}

const EMPTY_FORM = {
  hotelId: "",
  roomNumber: "",
  roomType: "SINGLE" as RoomType,
  description: "",
  pricePerNight: "",
  capacity: 1,
  bedType: "",
  size: "",
  floor: "",
  status: "AVAILABLE" as RoomStatus,
  imageUrl: "",
  images: [] as RoomImageRow[],
};

export default function AdminRoomsPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const isOwner = user?.role === "HOTEL_OWNER";
  const isStaff = user?.role === "HOTEL_STAFF";
  const canManageRooms = isOwner || (isStaff && (user?.permissions ?? []).includes("MANAGE_ROOMS"));
  // Both an owner and any staff account are confined to their own single
  // hotel - only an ADMIN sees/picks across all 20.
  const isSingleHotelView = isOwner || isStaff;
  const ownHotelId = user?.hotelId ?? null;
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  // A HOTEL_OWNER/HOTEL_STAFF only ever manages rooms within their own
  // hotel: the hotel dropdown is limited to that one hotel and room
  // listing/creation is scoped to it too - RoomService enforces the same on
  // the backend regardless of what the client sends.
  function load() {
    setLoading(true);
    const hotelsRequest = isSingleHotelView
      ? ownHotelId
        ? getHotels().then((all) => all.filter((h) => h.id === ownHotelId))
        : Promise.resolve([])
      : getHotels();
    Promise.all([hotelsRequest, getRooms(isSingleHotelView ? ownHotelId ?? undefined : undefined)])
      .then(([h, r]) => {
        setHotels(h);
        setRooms(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManageRooms || !isStaff) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownHotelId]);

  function startCreate() {
    setForm({ ...EMPTY_FORM, hotelId: isSingleHotelView && ownHotelId ? String(ownHotelId) : "" });
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(room: Room) {
    setForm({
      hotelId: String(room.hotel.id),
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      description: room.description || "",
      pricePerNight: String(room.pricePerNight),
      capacity: room.capacity,
      bedType: room.bedType || "",
      size: room.size ? String(room.size) : "",
      floor: room.floor ? String(room.floor) : "",
      status: room.status,
      imageUrl: room.imageUrl || "",
      images: (room.images || [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((img) => ({ label: img.label || "", imageUrl: img.imageUrl })),
    });
    setEditingId(room.id);
    setShowForm(true);
    setError(null);
  }

  function addUploadedImages(urls: string[]) {
    setForm((f) => ({ ...f, images: [...f.images, ...urls.map((imageUrl) => ({ label: "", imageUrl }))] }));
  }

  function updateImageRow(index: number, patch: Partial<RoomImageRow>) {
    setForm((f) => ({ ...f, images: f.images.map((img, i) => (i === index ? { ...img, ...patch } : img)) }));
  }

  function removeImageRow(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.hotelId) {
      setError(t.admin.rooms.errorSelectHotel);
      return;
    }
    const payload = {
      hotelId: Number(form.hotelId),
      roomNumber: form.roomNumber,
      roomType: form.roomType,
      description: form.description,
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity),
      bedType: form.bedType,
      size: form.size ? Number(form.size) : null,
      floor: form.floor ? Number(form.floor) : null,
      status: form.status,
      imageUrl: form.imageUrl,
      images: form.images
        .filter((img) => img.imageUrl.trim() !== "")
        .map((img, i) => ({ ...img, sortOrder: i })),
    };
    try {
      if (editingId) {
        await updateRoom(editingId, payload);
      } else {
        await createRoom(payload);
      }
      setShowForm(false);
      load();
    } catch {
      setError(t.admin.rooms.errorSave);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t.admin.rooms.confirmDelete)) return;
    await deleteRoom(id);
    load();
  }

  async function handleStatusChange(id: number, status: RoomStatus) {
    await changeRoomStatus(id, status);
    load();
  }

  if (isStaff && !canManageRooms) {
    return <p className="text-sm text-muted">{t.admin.checkingAccess}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-dark">{t.admin.rooms.title}</h2>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t.admin.rooms.addRoom}
        </Button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">
            {editingId ? t.admin.rooms.editRoom : t.admin.rooms.newRoom}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select
              value={form.hotelId}
              onChange={(e) => setForm({ ...form, hotelId: e.target.value })}
              disabled={isSingleHotelView}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-secondary/20"
            >
              <option value="">{t.admin.rooms.selectHotel}</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <input
              placeholder={t.admin.rooms.phRoomNumber}
              value={form.roomNumber}
              onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <select
              value={form.roomType}
              onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomType })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            >
              {ROOM_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as RoomStatus })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            >
              {ROOM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="number"
              min={0.01}
              step={0.01}
              placeholder={t.admin.rooms.phPrice}
              value={form.pricePerNight}
              onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              placeholder={t.admin.rooms.phCapacity}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder={t.admin.rooms.phBedType}
              value={form.bedType}
              onChange={(e) => setForm({ ...form, bedType: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder={t.admin.rooms.phSize}
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder={t.admin.rooms.phFloor}
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <div className="sm:col-span-2">
              <ImageUploadField
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                placeholder={t.admin.rooms.phImagePath}
              />
            </div>
            <textarea
              placeholder={t.admin.rooms.phDescription}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm sm:col-span-2"
              rows={3}
            />
          </div>

          {/* Extra room photos - the thumbnail strip on the Room Detail page */}
          <div className="mt-6 border-t border-secondary/40 pt-4">
            <p className="text-sm font-medium text-text">{t.admin.upload.roomGallery}</p>
            <p className="mt-1 text-xs text-muted">{t.admin.upload.roomGalleryNote}</p>
            <MultiImageUpload className="mt-3" onUploaded={addUploadedImages} />

            {form.images.length > 0 && (
              <div className="mt-3 flex flex-col gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-control border border-secondary/60 p-3 sm:flex-row sm:items-center">
                    <input
                      placeholder={t.admin.upload.roomLabelPlaceholder}
                      value={img.label}
                      onChange={(e) => updateImageRow(i, { label: e.target.value })}
                      className="rounded-control border border-secondary bg-background px-2 py-2 text-xs sm:w-40"
                    />
                    <ImageUploadField
                      compact
                      className="flex-1"
                      value={img.imageUrl}
                      onChange={(url) => updateImageRow(i, { imageUrl: url })}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageRow(i)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center self-end rounded-control hover:bg-red-50 sm:self-auto"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSubmit}>{t.admin.rooms.save}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t.admin.rooms.cancel}</Button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-card border border-secondary/60 bg-card shadow-soft">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60 text-xs uppercase text-muted">
              <th className="p-4">{t.admin.rooms.tableRoom}</th>
              <th className="p-4">{t.admin.rooms.tableHotel}</th>
              <th className="p-4">{t.admin.rooms.tableType}</th>
              <th className="p-4">{t.admin.rooms.tablePrice}</th>
              <th className="p-4">{t.admin.rooms.tableStatus}</th>
              <th className="p-4 text-right">{t.admin.rooms.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-muted" colSpan={6}>{t.admin.rooms.loading}</td></tr>
            ) : rooms.length === 0 ? (
              <tr><td className="p-4 text-muted" colSpan={6}>{t.admin.rooms.noRooms}</td></tr>
            ) : (
              rooms.map((room) => (
                <tr key={room.id} className="border-b border-secondary/30">
                  <td className="p-4 font-medium text-text">{room.roomNumber}</td>
                  <td className="p-4">{room.hotel?.name}</td>
                  <td className="p-4 capitalize">{room.roomType.toLowerCase()}</td>
                  <td className="p-4">{formatTHB(room.pricePerNight)}</td>
                  <td className="p-4">
                    <select
                      value={room.status}
                      onChange={(e) => handleStatusChange(room.id, e.target.value as RoomStatus)}
                      className="rounded-control border border-secondary bg-background px-2 py-1 text-xs"
                    >
                      {ROOM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(room)} className="rounded-control p-2 hover:bg-secondary/30">
                        <Pencil className="h-4 w-4 text-text" />
                      </button>
                      <button onClick={() => handleDelete(room.id)} className="rounded-control p-2 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
