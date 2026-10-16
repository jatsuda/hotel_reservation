package com.hotel.reservation.dto;

import com.hotel.reservation.entity.Permission;
import com.hotel.reservation.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String fullName;
    private String email;
    private Role role;
    private Long guestId; // null for ADMIN/HOTEL_OWNER/HOTEL_STAFF users
    private Long hotelId; // set for HOTEL_OWNER and HOTEL_STAFF users
    // Only meaningful for HOTEL_STAFF - see entity/Permission.java. Always
    // populated (even if empty) so the frontend can safely do
    // `permissions.includes(...)` without a null check.
    private Set<Permission> permissions;
}
