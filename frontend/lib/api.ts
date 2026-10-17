// Centralised API client. Every network call to the Spring Boot backend
// goes through this file so components never call fetch() directly.

import type {
  Hotel,
  HotelInput,
  Room,
  Guest,
  Reservation,
  Payment,
  RoomStatus,
  AuthResponse,
  StaffMember,
  Permission,
  Review,
  ReviewSummary,
  Payout,
  PayoutStatus,
  PayoutSummary,
  PayoutMethod,
  UpcomingReservation,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://hotel-reservation-pdau.onrender.com/api";
const TOKEN_KEY = "hotel_auth_token";

class ApiRequestError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Token lives in localStorage for API calls, and mirrored into a plain
// cookie so Next.js middleware (which can't read localStorage) can guard
// /admin routes. Neither is httpOnly - this is a reference build, not a
// hardened production auth setup.
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers,
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // response had no JSON body
    }
    let message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${res.status}`;
    // Bean-validation failures come back as a generic "fields are invalid"
    // message plus a per-field map - surface the first specific reason.
    if (body && typeof body === "object" && "validationErrors" in body) {
      const fieldErrors = (body as { validationErrors?: Record<string, string> }).validationErrors;
      const first = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
      if (first) message = first;
    }
    throw new ApiRequestError(message, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------------- Image upload ----------------
// Sends the file as multipart/form-data (so no JSON Content-Type - the browser
// sets the multipart boundary itself) and returns the public URL of the
// stored image, ready to drop into a hotel/room imageUrl field.
export async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/uploads/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) {
    let message = `Upload failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.message === "string") message = body.message;
    } catch {
      // no JSON body
    }
    throw new ApiRequestError(message, res.status, null);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

// ---------------- Hotels ----------------
export const getHotels = () => request<Hotel[]>("/hotels");
export const getHotelById = (id: number | string) => request<Hotel>(`/hotels/${id}`);
export const createHotel = (data: HotelInput) =>
  request<Hotel>("/hotels", { method: "POST", body: JSON.stringify(data) });
export const updateHotel = (id: number | string, data: HotelInput) =>
  request<Hotel>(`/hotels/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteHotel = (id: number | string) =>
  request<void>(`/hotels/${id}`, { method: "DELETE" });

// ---------------- Rooms ----------------
export const getRooms = (hotelId?: number | string) =>
  request<Room[]>(hotelId ? `/rooms?hotelId=${hotelId}` : "/rooms");
export const getAvailableRooms = () => request<Room[]>("/rooms/available");
export const getRoomById = (id: number | string) => request<Room>(`/rooms/${id}`);
export const createRoom = (data: Record<string, unknown>) =>
  request<Room>("/rooms", { method: "POST", body: JSON.stringify(data) });
export const updateRoom = (id: number | string, data: Record<string, unknown>) =>
  request<Room>(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const changeRoomStatus = (id: number | string, status: RoomStatus) =>
  request<Room>(`/rooms/${id}/status?status=${status}`, { method: "PATCH" });
export const deleteRoom = (id: number | string) =>
  request<void>(`/rooms/${id}`, { method: "DELETE" });

// ---------------- Guests ----------------
// Admin-only in the backend (/api/guests/**). Guest signup for regular users
// goes through /api/auth/register instead (see registerAccount below).
export const getGuests = () => request<Guest[]>("/guests");
export const getGuestById = (id: number | string) => request<Guest>(`/guests/${id}`);
export const createGuest = (data: Partial<Guest>) =>
  request<Guest>("/guests", { method: "POST", body: JSON.stringify(data) });
export const updateGuest = (id: number | string, data: Partial<Guest>) =>
  request<Guest>(`/guests/${id}`, { method: "PUT", body: JSON.stringify(data) });

// ---------------- Reservations ----------------
// hotelId: passed by the HOTEL_OWNER-scoped admin views (or by an ADMIN who
// wants a single hotel's reservations) - see ReservationService.getReservations.
export const getReservations = (params?: { guestId?: number | string; hotelId?: number | string }) => {
  const query = new URLSearchParams();
  if (params?.guestId != null) query.set("guestId", String(params.guestId));
  if (params?.hotelId != null) query.set("hotelId", String(params.hotelId));
  const qs = query.toString();
  return request<Reservation[]>(`/reservations${qs ? `?${qs}` : ""}`);
};
export const getMyReservations = () => request<Reservation[]>("/reservations/me");
export const getReservationById = (id: number | string) =>
  request<Reservation>(`/reservations/${id}`);
export const createReservation = (data: Record<string, unknown>) =>
  request<Reservation>("/reservations", { method: "POST", body: JSON.stringify(data) });
export const updateReservation = (id: number | string, data: Record<string, unknown>) =>
  request<Reservation>(`/reservations/${id}`, { method: "PUT", body: JSON.stringify(data) });
// reason is required for a staff/owner/admin cancellation (audit trail -
// see backend ReservationService.cancelReservation) and optional for a
// guest cancelling their own booking.
export const cancelReservation = (id: number | string, reason?: string) =>
  request<Reservation>(`/reservations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
export const checkInReservation = (id: number | string) =>
  request<Reservation>(`/reservations/${id}/check-in`, { method: "POST" });
export const checkOutReservation = (id: number | string) =>
  request<Reservation>(`/reservations/${id}/check-out`, { method: "POST" });
export const deleteReservation = (id: number | string) =>
  request<void>(`/reservations/${id}`, { method: "DELETE" });
export const getUpcomingReservationsByRoom = (roomId: number | string) =>
  request<UpcomingReservation[]>(`/reservations/room/${roomId}/upcoming`);

// ---------------- Reviews ----------------
// Public - shown on the Hotel Detail page to anyone, logged in or not.
export const getHotelReviews = (hotelId: number | string) =>
  request<Review[]>(`/reviews/hotel/${hotelId}`);
export const getHotelReviewSummary = (hotelId: number | string) =>
  request<ReviewSummary>(`/reviews/hotel/${hotelId}/summary`);
// The logged-in guest's own reviews.
export const getMyReviews = () => request<Review[]>("/reviews/me");
// The logged-in guest's checked-out stays that don't have a review yet.
export const getReviewableReservations = () => request<Reservation[]>("/reviews/reviewable");
export const createReview = (data: { reservationId: number; rating: number; comment?: string }) =>
  request<Review>("/reviews", { method: "POST", body: JSON.stringify(data) });
export const updateReview = (id: number | string, data: { rating: number; comment?: string }) =>
  request<Review>(`/reviews/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteReview = (id: number | string) =>
  request<void>(`/reviews/${id}`, { method: "DELETE" });

// ---------------- Payouts (platform -> hotel, net of commission) ----------------
// ADMIN only - the platform-wide payouts dashboard, optionally narrowed to one status.
export const getPayouts = (status?: PayoutStatus) =>
  request<Payout[]>(`/payouts${status ? `?status=${status}` : ""}`);
// ADMIN only - total commission earned, and what's owed vs. already paid, across every hotel.
export const getPayoutSummary = () => request<PayoutSummary>("/payouts/summary");
// ADMIN, or that hotel's own HOTEL_OWNER/HOTEL_STAFF with VIEW_FINANCE.
export const getHotelPayouts = (hotelId: number | string) =>
  request<Payout[]>(`/payouts/hotel/${hotelId}`);
export const getHotelPayoutSummary = (hotelId: number | string) =>
  request<PayoutSummary>(`/payouts/hotel/${hotelId}/summary`);
// ADMIN only - records that the platform actually transferred a payout's net amount to the hotel.
export const markPayoutAsPaid = (id: number | string, data: { payoutMethod: PayoutMethod; transactionReference: string }) =>
  request<Payout>(`/payouts/${id}/pay`, { method: "POST", body: JSON.stringify(data) });

// A hotel's commission rate is finance-sensitive and never returned by the
// general GET /hotels/{id} - these are the only endpoints that expose it.
export const getCommissionRate = (hotelId: number | string) =>
  request<{ commissionRate: number }>(`/hotels/${hotelId}/commission-rate`);
// ADMIN only.
export const updateCommissionRate = (hotelId: number | string, commissionRate: number) =>
  request<{ commissionRate: number }>(`/hotels/${hotelId}/commission-rate`, {
    method: "PATCH",
    body: JSON.stringify({ commissionRate }),
  });

// ---------------- Payments ----------------
export const getPayments = () => request<Payment[]>("/payments");
export const getPaymentById = (id: number | string) => request<Payment>(`/payments/${id}`);
export const createPayment = (data: Record<string, unknown>) =>
  request<Payment>("/payments", { method: "POST", body: JSON.stringify(data) });
export const updatePayment = (id: number | string, data: Record<string, unknown>) =>
  request<Payment>(`/payments/${id}`, { method: "PUT", body: JSON.stringify(data) });

export { ApiRequestError };

// ---------------- Auth ----------------
export const registerAccount = (data: { fullName: string; email: string; password: string; phone?: string }) =>
  request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) });
export const loginAccount = (data: { email: string; password: string }) =>
  request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) });
export const getCurrentUser = () => request<AuthResponse>("/auth/me");
export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  request<void>("/auth/change-password", { method: "PUT", body: JSON.stringify(data) });
// Returns a fresh AuthResponse (with a new token) - the old token's embedded
// email stops matching any account the moment this saves, so the caller
// must swap in the new token/user (see auth-context.tsx's applySession).
export const changeEmail = (data: { newEmail: string; currentPassword: string }) =>
  request<AuthResponse>("/auth/change-email", { method: "PUT", body: JSON.stringify(data) });

// ---------------- Staff (a hotel owner's internal team) ----------------
export const getStaff = () => request<StaffMember[]>("/staff");
export const createStaff = (data: { fullName: string; email: string; password: string; permissions: Permission[] }) =>
  request<StaffMember>("/staff", { method: "POST", body: JSON.stringify(data) });
export const updateStaff = (id: number, data: { fullName: string; permissions: Permission[] }) =>
  request<StaffMember>(`/staff/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteStaff = (id: number) => request<void>(`/staff/${id}`, { method: "DELETE" });
