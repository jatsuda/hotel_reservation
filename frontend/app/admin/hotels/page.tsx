"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import Button from "@/components/Button";
import ImageUploadField from "@/components/ImageUploadField";
import MultiImageUpload from "@/components/MultiImageUpload";
import { getHotels, getHotelById, createHotel, updateHotel, deleteHotel } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Hotel, HotelImageCategory } from "@/lib/types";

const IMAGE_CATEGORIES: HotelImageCategory[] = ["ROOM", "BATHROOM", "FACILITY", "OTHER"];

interface ImageFormRow {
  category: HotelImageCategory;
  label: string;
  imageUrl: string;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  starRating: 5,
  imageUrl: "",
  latitude: "",
  longitude: "",
  images: [] as ImageFormRow[],
};

export default function AdminHotelsPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const isOwner = user?.role === "HOTEL_OWNER";
  const isStaff = user?.role === "HOTEL_STAFF";
  const canManageHotelInfo = isOwner || (isStaff && (user?.permissions ?? []).includes("MANAGE_HOTEL_INFO"));
  // A HOTEL_OWNER or a HOTEL_STAFF with MANAGE_HOTEL_INFO both get the same
  // "single hotel, no add/delete" experience - only an ADMIN sees the full
  // 20-hotel list with create/delete.
  const isSingleHotelView = isOwner || isStaff;
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const CATEGORY_LABELS: Record<HotelImageCategory, string> = {
    ROOM: t.admin.hotels.categoryRoom,
    BATHROOM: t.admin.hotels.categoryBathroom,
    FACILITY: t.admin.hotels.categoryFacility,
    OTHER: t.admin.hotels.categoryOther,
  };

  // A HOTEL_OWNER/HOTEL_STAFF only ever sees their own single hotel (GET
  // /api/hotels is a public listing of all 20, so we fetch just their one
  // by id instead of filtering the full list client-side). An ADMIN keeps
  // the full list.
  function load() {
    setLoading(true);
    const request = isSingleHotelView
      ? user?.hotelId
        ? getHotelById(user.hotelId).then((h) => [h])
        : Promise.resolve([])
      : getHotels();
    request
      .then((data) => {
        setHotels(data);
        // Only one hotel to manage - skip straight to the edit form instead
        // of making them click into a 1-row table (only if they can
        // actually edit it - a finance/reservations-only staff account
        // would otherwise land on an edit form they can't submit).
        if (isSingleHotelView && canManageHotelInfo && data.length === 1) {
          startEdit(data[0]);
        }
      })
      .catch(() => setHotels([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManageHotelInfo || !isStaff) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.hotelId]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(hotel: Hotel) {
    setForm({
      name: hotel.name,
      description: hotel.description || "",
      address: hotel.address || "",
      city: hotel.city || "",
      country: hotel.country || "",
      phone: hotel.phone || "",
      email: hotel.email || "",
      starRating: hotel.starRating || 5,
      imageUrl: hotel.imageUrl || "",
      latitude: hotel.latitude != null ? String(hotel.latitude) : "",
      longitude: hotel.longitude != null ? String(hotel.longitude) : "",
      images: (hotel.images || [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((img) => ({ category: img.category, label: img.label || "", imageUrl: img.imageUrl })),
    });
    setEditingId(hotel.id);
    setShowForm(true);
    setError(null);
  }

  function addImageRow() {
    setForm((f) => ({ ...f, images: [...f.images, { category: "ROOM", label: "", imageUrl: "" }] }));
  }

  function updateImageRow(index: number, patch: Partial<ImageFormRow>) {
    setForm((f) => ({
      ...f,
      images: f.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }));
  }

  // One new gallery row per uploaded photo (category defaults to OTHER; the
  // admin can change it, and add a label, on each row afterwards).
  function addUploadedImages(urls: string[]) {
    setForm((f) => ({
      ...f,
      images: [...f.images, ...urls.map((imageUrl) => ({ category: "OTHER" as HotelImageCategory, label: "", imageUrl }))],
    }));
  }

  function removeImageRow(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setError(null);
    try {
      const payload = {
        ...form,
        latitude: form.latitude.trim() !== "" ? Number(form.latitude) : null,
        longitude: form.longitude.trim() !== "" ? Number(form.longitude) : null,
        images: form.images
          .filter((img) => img.imageUrl.trim() !== "")
          .map((img, i) => ({ ...img, sortOrder: i })),
      };
      if (editingId) {
        await updateHotel(editingId, payload);
      } else {
        await createHotel(payload);
      }
      setShowForm(false);
      load();
    } catch {
      setError(t.admin.hotels.errorSave);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t.admin.hotels.confirmDelete)) return;
    await deleteHotel(id);
    load();
  }

  if (isStaff && !canManageHotelInfo) {
    return <p className="text-sm text-muted">{t.admin.checkingAccess}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-dark">
          {isSingleHotelView ? t.admin.tabs.myHotel : t.admin.hotels.title}
        </h2>
        {!isSingleHotelView && (
          <Button onClick={startCreate} className="gap-2">
            <Plus className="h-4 w-4" /> {t.admin.hotels.addHotel}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
          <h3 className="font-heading text-base font-semibold text-dark">
            {editingId ? t.admin.hotels.editHotel : t.admin.hotels.newHotel}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              placeholder={t.admin.hotels.phName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder={t.admin.hotels.phAddress}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder={t.admin.hotels.phCity}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder={t.admin.hotels.phCountry}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder={t.admin.hotels.phPhone}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder={t.admin.hotels.phEmail}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              max={5}
              placeholder={t.admin.hotels.phStarRating}
              value={form.starRating}
              onChange={(e) => setForm({ ...form, starRating: Number(e.target.value) })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="any"
              placeholder={t.admin.hotels.phLatitude}
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="any"
              placeholder={t.admin.hotels.phLongitude}
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm"
            />
            <div className="sm:col-span-2">
              <ImageUploadField
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                placeholder={t.admin.hotels.phImagePath}
              />
            </div>
            <textarea
              placeholder={t.admin.hotels.phDescription}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-control border border-secondary bg-background px-3 py-2 text-sm sm:col-span-2"
              rows={3}
            />
          </div>

          {/* IMAGE PLACEHOLDER: อัพโหลดรูปหลักของโรงแรม - เก็บไฟล์ไว้ที่ public/images/hotels/ แล้วอ้างอิง path ในช่อง Image path ด้านบน */}
          <p className="mt-2 text-xs text-muted">{t.admin.hotels.imageNote}</p>
          <p className="mt-1 text-xs text-muted">{t.admin.hotels.coordinatesNote}</p>

          {/* Gallery images: additional photos beyond the single card image above */}
          <div className="mt-6 border-t border-secondary/40 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">{t.admin.hotels.galleryImages}</p>
              <button
                type="button"
                onClick={addImageRow}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> {t.admin.hotels.addImage}
              </button>
            </div>

            <MultiImageUpload className="mt-3" onUploaded={addUploadedImages} />

            {form.images.length > 0 && (
              <div className="mt-3 flex flex-col gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-control border border-secondary/60 p-3 sm:flex-row sm:items-center">
                    <select
                      value={img.category}
                      onChange={(e) => updateImageRow(i, { category: e.target.value as HotelImageCategory })}
                      className="rounded-control border border-secondary bg-background px-2 py-2 text-xs sm:w-32"
                    >
                      {IMAGE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                    <input
                      placeholder={t.admin.hotels.imageLabelPlaceholder}
                      value={img.label}
                      onChange={(e) => updateImageRow(i, { label: e.target.value })}
                      className="rounded-control border border-secondary bg-background px-2 py-2 text-xs sm:w-40"
                    />
                    <ImageUploadField
                      compact
                      className="flex-1"
                      value={img.imageUrl}
                      onChange={(url) => updateImageRow(i, { imageUrl: url })}
                      placeholder={t.admin.hotels.galleryImagePath}
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
            <Button onClick={handleSubmit}>{t.admin.hotels.save}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t.admin.hotels.cancel}</Button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-card border border-secondary/60 bg-card shadow-soft">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60 text-xs uppercase text-muted">
              <th className="p-4">{t.admin.hotels.tableName}</th>
              <th className="p-4">{t.admin.hotels.tableCity}</th>
              <th className="p-4">{t.admin.hotels.tableRating}</th>
              <th className="p-4">{t.admin.hotels.tableRooms}</th>
              <th className="p-4 text-right">{t.admin.hotels.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-muted" colSpan={5}>{t.admin.hotels.loading}</td></tr>
            ) : hotels.length === 0 ? (
              <tr><td className="p-4 text-muted" colSpan={5}>{t.admin.hotels.noHotels}</td></tr>
            ) : (
              hotels.map((hotel) => (
                <tr key={hotel.id} className="border-b border-secondary/30">
                  <td className="p-4 font-medium text-text">{hotel.name}</td>
                  <td className="p-4">{hotel.city}</td>
                  <td className="p-4">{hotel.starRating} ★</td>
                  <td className="p-4">{hotel.rooms?.length ?? "-"}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(hotel)} className="rounded-control p-2 hover:bg-secondary/30">
                        <Pencil className="h-4 w-4 text-text" />
                      </button>
                      {!isSingleHotelView && (
                        <button onClick={() => handleDelete(hotel.id)} className="rounded-control p-2 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      )}
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
