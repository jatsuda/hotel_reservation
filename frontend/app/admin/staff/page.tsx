"use client";

import { useEffect, useState } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { getStaff, createStaff, updateStaff, deleteStaff, ApiRequestError } from "@/lib/api";
import type { Permission, StaffMember } from "@/lib/types";

const ALL_PERMISSIONS: Permission[] = ["MANAGE_HOTEL_INFO", "MANAGE_ROOMS", "MANAGE_RESERVATIONS", "VIEW_FINANCE"];

// Department presets are purely a frontend convenience: they just pre-check
// a sensible combination of the underlying Permission flags. The owner can
// still tick/untick individual boxes afterwards - the data model is always
// just a Set<Permission>, never a fixed job title.
const PRESETS: { key: string; permissions: Permission[] }[] = [
  { key: "presetMarketing", permissions: ["MANAGE_HOTEL_INFO"] },
  { key: "presetFinance", permissions: ["VIEW_FINANCE"] },
  { key: "presetSales", permissions: ["MANAGE_RESERVATIONS"] },
  { key: "presetRoomData", permissions: ["MANAGE_ROOMS", "MANAGE_HOTEL_INFO"] },
];

const EMPTY_FORM = { fullName: "", email: "", password: "", permissions: [] as Permission[] };

export default function AdminStaffPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const isOwner = user?.role === "HOTEL_OWNER";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    getStaff().then(setStaff).catch(() => setStaff([])).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isOwner) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  const PERMISSION_LABELS: Record<Permission, string> = {
    MANAGE_HOTEL_INFO: t.admin.staff.permissionManageHotelInfo,
    MANAGE_ROOMS: t.admin.staff.permissionManageRooms,
    MANAGE_RESERVATIONS: t.admin.staff.permissionManageReservations,
    VIEW_FINANCE: t.admin.staff.permissionViewFinance,
  };
  const PRESET_LABELS: Record<string, string> = {
    presetMarketing: t.admin.staff.presetMarketing,
    presetFinance: t.admin.staff.presetFinance,
    presetSales: t.admin.staff.presetSales,
    presetRoomData: t.admin.staff.presetRoomData,
  };

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(member: StaffMember) {
    setForm({ fullName: member.fullName, email: member.email, password: "", permissions: member.permissions });
    setEditingId(member.id);
    setShowForm(true);
    setError(null);
  }

  function togglePermission(p: Permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
    }));
  }

  async function handleSubmit() {
    setError(null);
    if (form.permissions.length === 0) {
      setError(t.admin.staff.errorPermissionsRequired);
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateStaff(editingId, { fullName: form.fullName, permissions: form.permissions });
        setStaff((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      } else {
        const created = await createStaff(form);
        setStaff((prev) => [...prev, created]);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.admin.staff.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t.admin.staff.confirmRemove)) return;
    try {
      await deleteStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // Silently ignore - the row simply stays in the list if this fails.
    }
  }

  if (!isOwner) {
    // Tab is hidden for everyone else in the layout, but guard direct
    // navigation too (e.g. a HOTEL_STAFF account typing the URL).
    return <p className="text-sm text-muted">{t.admin.checkingAccess}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dark">{t.admin.staff.title}</h2>
          <p className="mt-1 text-sm text-muted">{t.admin.staff.subtitle}</p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t.admin.staff.addStaff}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-card border border-secondary bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-dark">
              {editingId ? t.admin.staff.save : t.admin.staff.addStaff}
            </h3>
            <button onClick={() => setShowForm(false)} className="rounded-control p-1 hover:bg-secondary/30">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text">{t.admin.staff.formFullName}</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text">{t.admin.staff.formEmail}</label>
              <input
                type="email"
                value={form.email}
                disabled={!!editingId}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm disabled:bg-secondary/20"
              />
            </div>
            {!editingId && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-text">{t.admin.staff.formPassword}</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted">{t.admin.staff.formPasswordHint}</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-text">{t.admin.staff.presetsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, permissions: preset.permissions }))}
                  className="rounded-control border border-secondary px-3 py-1.5 text-xs font-medium text-text hover:bg-secondary/30"
                >
                  {PRESET_LABELS[preset.key]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-text">{t.admin.staff.formPermissions}</p>
            <div className="flex flex-col gap-2">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePermission(p)} />
                  {PERMISSION_LABELS[p]}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (editingId ? t.admin.staff.saving : t.admin.staff.creating) : editingId ? t.admin.staff.save : t.admin.staff.create}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t.admin.staff.cancel}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">{t.admin.staff.loading}</p>
      ) : staff.length === 0 ? (
        <p className="rounded-card border border-dashed border-secondary bg-card p-8 text-center text-sm text-muted">
          {t.admin.staff.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-secondary/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/20 text-xs uppercase text-muted">
              <tr>
                <th className="p-4">{t.admin.staff.tableName}</th>
                <th className="p-4">{t.admin.staff.tableEmail}</th>
                <th className="p-4">{t.admin.staff.tablePermissions}</th>
                <th className="p-4 text-right">{t.admin.staff.tableActions}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t border-secondary/40">
                  <td className="p-4 font-medium text-dark">{member.fullName}</td>
                  <td className="p-4 text-text">{member.email}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.map((p) => (
                        <span key={p} className="rounded-full bg-secondary/30 px-2 py-0.5 text-xs text-text">
                          {PERMISSION_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(member)} className="rounded-control p-2 hover:bg-secondary/30">
                        <Pencil className="h-4 w-4 text-text" />
                      </button>
                      <button onClick={() => handleDelete(member.id)} className="rounded-control p-2 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
