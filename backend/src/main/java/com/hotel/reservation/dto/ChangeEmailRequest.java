package com.hotel.reservation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangeEmailRequest {
    @NotBlank(message = "New email is required")
    @Email(message = "Email must be valid")
    @Size(max = 254, message = "Email must be at most 254 characters")
    private String newEmail;

    @NotBlank(message = "Current password is required")
    @Size(max = 72, message = "Current password is too long")
    private String currentPassword;
}
