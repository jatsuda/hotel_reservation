package com.hotel.reservation.dto;

import com.hotel.reservation.entity.AmenityCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoomAmenityDto {
    @NotNull(message = "Amenity category is required")
    private AmenityCategory category;

    @NotBlank(message = "Amenity title is required")
    private String title;

    private String description;
    private String icon;
}
