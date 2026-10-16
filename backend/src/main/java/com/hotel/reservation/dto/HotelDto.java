package com.hotel.reservation.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class HotelDto {
    @NotBlank(message = "Hotel name is required")
    private String name;

    private String description;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "Country is required")
    private String country;

    private String phone;

    @Email(message = "Email must be valid")
    private String email;

    @Min(value = 1, message = "Star rating must be between 1 and 5")
    @Max(value = 5, message = "Star rating must be between 1 and 5")
    private Integer starRating;

    @Size(max = 500, message = "Image path must be at most 500 characters")
    @Pattern(regexp = ImageUrlRules.PATTERN, message = ImageUrlRules.MESSAGE)
    private String imageUrl;

    @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
    private Double latitude;

    @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
    private Double longitude;

    // Optional: when provided, replaces the hotel's full gallery image list
    // (rendered on the Hotel Detail page gallery, grouped/labeled by category).
    @jakarta.validation.Valid
    @Size(max = 30, message = "A hotel can have at most 30 gallery photos")
    private List<HotelImageDto> images;
}

