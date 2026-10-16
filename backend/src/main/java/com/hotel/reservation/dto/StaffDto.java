package com.hotel.reservation.dto;

import com.hotel.reservation.entity.Permission;
import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class StaffDto {
    private Long id;
    private String fullName;
    private String email;
    private Role role;
    private Set<Permission> permissions;
    private Long hotelId;
    private LocalDateTime createdAt;

    public static StaffDto from(User user) {
        StaffDto dto = new StaffDto();
        dto.setId(user.getId());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setPermissions(user.getPermissions());
        dto.setHotelId(user.getHotel() != null ? user.getHotel().getId() : null);
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}
