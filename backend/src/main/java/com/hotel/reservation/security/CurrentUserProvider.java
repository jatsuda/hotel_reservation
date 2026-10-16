package com.hotel.reservation.security;

import com.hotel.reservation.entity.Permission;
import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Small convenience wrapper so services don't need to reach into
 * SecurityContextHolder directly. Since JwtAuthenticationFilter puts the
 * loaded User (a UserDetails) straight into the Authentication principal,
 * we can cast it back here.
 */
@Component
public class CurrentUserProvider {

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User)) {
            return null;
        }
        return (User) auth.getPrincipal();
    }

    public boolean isAdmin() {
        User user = getCurrentUser();
        return user != null && user.getRole().name().equals("ADMIN");
    }

    public boolean isHotelOwner() {
        User user = getCurrentUser();
        return user != null && user.getRole() == Role.HOTEL_OWNER;
    }

    /**
     * True when the current user may act on the given hotel with the given
     * permission: any ADMIN; the HOTEL_OWNER linked to that hotel (an owner
     * always has full access to their own hotel, regardless of the
     * fine-grained Permission set, which only exists to narrow down staff);
     * or a HOTEL_STAFF account linked to that hotel that was explicitly
     * granted this permission.
     */
    private boolean hasHotelAccess(Long hotelId, Permission required) {
        User user = getCurrentUser();
        if (user == null || hotelId == null) {
            return false;
        }
        if (user.getRole() == Role.ADMIN) {
            return true;
        }
        if (user.getHotel() == null || !user.getHotel().getId().equals(hotelId)) {
            return false;
        }
        if (user.getRole() == Role.HOTEL_OWNER) {
            return true;
        }
        return user.getRole() == Role.HOTEL_STAFF && user.getPermissions().contains(required);
    }

    /** Edit the hotel's own details/description/images (HotelService.updateHotel). */
    public boolean canManageHotel(Long hotelId) {
        return hasHotelAccess(hotelId, Permission.MANAGE_HOTEL_INFO);
    }

    /** Create/edit/delete rooms and change their status (RoomService). */
    public boolean canManageRooms(Long hotelId) {
        return hasHotelAccess(hotelId, Permission.MANAGE_ROOMS);
    }

    /** Confirm/check-in/check-out/cancel/delete reservations (ReservationService). */
    public boolean canManageReservations(Long hotelId) {
        return hasHotelAccess(hotelId, Permission.MANAGE_RESERVATIONS);
    }

    /** Read-only: view the hotel's reservations/revenue. Managing reservations implies this too. */
    public boolean canViewFinance(Long hotelId) {
        return hasHotelAccess(hotelId, Permission.VIEW_FINANCE) || canManageReservations(hotelId);
    }

    /**
     * Uploading photos (UploadController): any ADMIN; a HOTEL_OWNER linked to
     * a hotel; or a HOTEL_STAFF linked to a hotel with MANAGE_HOTEL_INFO or
     * MANAGE_ROOMS. A finance-only / reservations-only staff account cannot.
     */
    public boolean canUploadImages() {
        User user = getCurrentUser();
        if (user == null) {
            return false;
        }
        if (user.getRole() == Role.ADMIN) {
            return true;
        }
        if (user.getHotel() == null) {
            return false;
        }
        if (user.getRole() == Role.HOTEL_OWNER) {
            return true;
        }
        return user.getRole() == Role.HOTEL_STAFF
                && (user.getPermissions().contains(Permission.MANAGE_HOTEL_INFO)
                    || user.getPermissions().contains(Permission.MANAGE_ROOMS));
    }

    /**
     * Adding/editing/removing HOTEL_STAFF accounts is owner/admin-only - a
     * HOTEL_STAFF account can never manage other staff, no matter what
     * permissions it holds itself.
     */
    public boolean canManageStaff(Long hotelId) {
        User user = getCurrentUser();
        if (user == null || hotelId == null) {
            return false;
        }
        if (user.getRole() == Role.ADMIN) {
            return true;
        }
        return user.getRole() == Role.HOTEL_OWNER
                && user.getHotel() != null
                && user.getHotel().getId().equals(hotelId);
    }
}
