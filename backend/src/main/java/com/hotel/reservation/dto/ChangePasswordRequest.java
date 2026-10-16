package com.hotel.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "Current password is required")
    @Size(max = 72, message = "Current password is too long")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).{8,72}$",
             message = "New password must be 8-72 characters and contain at least one letter and one number")
    private String newPassword;
}
