// Shared TypeScript types that mirror the backend entities/enums.
// Keeping these in one place means every component and API call
// shares a single source of truth for the data shape.

export type RoomType = "SINGLE" | "DOUBLE" | "TWIN" | "DELUXE" | "FAMILY" | "SUITE";
export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED";
export type PaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER" | "CASH";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type AmenityCategory = "BED" | "TECHNOLOGY" | "BATHROOM" | "ACCESSIBILITY" | "KITCHEN";
export type HotelImageCategory = "ROOM" | "BATHROOM" | "FACILITY" | "OTHER";
// What a HOTEL_STAFF account is allowed to do on its hotel - see backend
// entity/Permission.java. Ignored for every other role.
export type Permission = "MANAGE_HOTEL_INFO" | "MANAGE_ROOMS" | "MANAGE_RESERVATIONS" | "VIEW_FINANCE";

export interface HotelImage {
  id: number;
  category: HotelImageCategory;
  label?: string;
  imageUrl: string;
  sortOrder?: number;
}

export interface Hotel {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  starRating?: number;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
  rooms?: Room[];
  images?: HotelImage[];
}

// What the admin form SENDS when creating/updating a hotel. Not the same as
// Hotel: the gallery rows have no id yet when new (or keep their id when
// re-submitted), and latitude/longitude are null when the boxes are left empty
// (the backend then clears the map pin).
export type HotelInput = Omit<Partial<Hotel>, "images" | "latitude" | "longitude"> & {
  latitude?: number | null;
  longitude?: number | null;
  images?: Array<Omit<HotelImage, "id"> & { id?: number }>;
};

export interface RoomAmenity {
  id: number;
  category: AmenityCategory;
  title: string;
  description?: string;
  icon?: string;
}

export interface RoomImage {
  id: number;
  label?: string;
  imageUrl: string;
  sortOrder?: number;
}

export interface Room {
  id: number;
  hotel: Hotel;
  roomNumber: string;
  roomType: RoomType;
  description?: string;
  pricePerNight: number;
  capacity: number;
  bedType?: string;
  size?: number;
  floor?: number;
  status: RoomStatus;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  amenities?: RoomAmenity[];
  images?: RoomImage[];
}

export interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface Reservation {
  id: number;
  guest: Guest;
  room: Room;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfRooms: number;
  specialRequest?: string;
  status: ReservationStatus;
  totalPrice: number;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt?: string;
  updatedAt?: string;
  payment?: Payment;
}

// What the PUBLIC GET /reservations/room/{id}/upcoming endpoint returns: just the
// booked dates and a privacy-safe name (lastName is a single initial).
export interface UpcomingReservation {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  status: ReservationStatus;
  guest: { firstName: string; lastName: string };
}

export interface Payment {
  id: number;
  reservation: Reservation;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  createdAt?: string;
}

// A guest's star rating + written feedback for a hotel, tied to the
// reservation (completed stay) that earned it. Returned by GET
// /api/reviews/** as a privacy-safe projection - guestName is a display
// name only ("Somchai J."), never the reviewer's email/phone/address.
export interface Review {
  id: number;
  hotelId: number;
  guestId: number;
  guestName: string;
  reservationId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
}

export type PayoutStatus = "PENDING" | "PAID" | "CANCELLED";
export type PayoutMethod = "BANK_TRANSFER" | "PROMPTPAY" | "CHEQUE" | "OTHER";

// The platform's side of being a payment intermediary: for every guest
// Payment, one Payout tracks what's owed to the hotel (gross minus the
// platform's commission) and whether it's been transferred yet. See
// backend entity/Payout.java + service/PayoutService.java.
export interface Payout {
  id: number;
  hotel: Hotel;
  payment: Payment;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: PayoutStatus;
  payoutMethod?: PayoutMethod;
  transactionReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayoutSummary {
  totalGross: number;
  totalCommission: number;
  totalNetPending: number;
  totalNetPaid: number;
  pendingCount: number;
  paidCount: number;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}

// ---------------- Auth ----------------
export type UserRole = "ADMIN" | "HOTEL_OWNER" | "HOTEL_STAFF" | "GUEST";

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  guestId: number | null;
  hotelId: number | null; // set for HOTEL_OWNER and HOTEL_STAFF
  permissions: Permission[]; // only meaningful for HOTEL_STAFF
}

export interface AuthResponse extends AuthUser {
  token: string;
}

// A hotel's internal team member, added by its HOTEL_OWNER - see
// app/admin/staff/page.tsx.
export interface StaffMember {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  hotelId: number;
  createdAt: string;
}
