package com.hotel.reservation.dto;

import com.hotel.reservation.entity.Permission;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class CreateStaffRequest {
    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must be at most 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 254, message = "Email must be at most 254 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).{8,72}$",
             message = "Password must be 8-72 characters and contain at least one letter and one number")
    private String password;

    @NotEmpty(message = "At least one permission is required")
    private Set<Permission> permissions;
}
