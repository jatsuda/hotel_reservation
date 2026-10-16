package com.hotel.reservation.dto;

import com.hotel.reservation.entity.Permission;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
public class UpdateStaffRequest {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotEmpty(message = "At least one permission is required")
    private Set<Permission> permissions;
}
