package com.hotel.reservation.dto;

import com.hotel.reservation.entity.HotelImageCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HotelImageDto {
    @NotNull(message = "Image category is required")
    private HotelImageCategory category;

    @jakarta.validation.constraints.Size(max = 150, message = "Image label must be at most 150 characters")
    private String label;

    @NotBlank(message = "Image path is required")
    @jakarta.validation.constraints.Size(max = 500, message = "Image path must be at most 500 characters")
    @jakarta.validation.constraints.Pattern(regexp = ImageUrlRules.PATTERN, message = ImageUrlRules.MESSAGE)
    private String imageUrl;

    private Integer sortOrder;
}
