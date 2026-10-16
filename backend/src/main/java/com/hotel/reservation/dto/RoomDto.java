package com.hotel.reservation.dto;

import com.hotel.reservation.entity.RoomStatus;
import com.hotel.reservation.entity.RoomType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class RoomDto {
    @NotNull(message = "hotelId is required")
    private Long hotelId;

    @NotBlank(message = "Room number is required")
    private String roomNumber;

    @NotNull(message = "Room type is required")
    private RoomType roomType;

    private String description;

    @NotNull(message = "Price per night is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal pricePerNight;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be greater than 0")
    private Integer capacity;

    private String bedType;
    private Double size;

    @Min(value = 0, message = "Floor cannot be negative")
    private Integer floor;

    private RoomStatus status;
    @Size(max = 500, message = "Image path must be at most 500 characters")
    @Pattern(regexp = ImageUrlRules.PATTERN, message = ImageUrlRules.MESSAGE)
    private String imageUrl;

    // Optional: when provided, replaces the room's full amenity list
    // (grouped by category on the frontend's RoomAmenitiesSidebar).
    private List<RoomAmenityDto> amenities;

    // Optional: when provided, replaces the room's full gallery photo list
    // (the thumbnail strip on the Room Detail page).
    @jakarta.validation.Valid
    @jakarta.validation.constraints.Size(max = 30, message = "A room can have at most 30 extra photos")
    private List<RoomImageDto> images;
}
