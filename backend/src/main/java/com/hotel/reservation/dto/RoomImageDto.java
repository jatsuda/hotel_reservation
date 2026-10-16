package com.hotel.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RoomImageDto {
    @Size(max = 150, message = "Image label must be at most 150 characters")
    private String label;

    @NotBlank(message = "Image path is required")
    @Size(max = 500, message = "Image path must be at most 500 characters")
    @Pattern(regexp = ImageUrlRules.PATTERN, message = ImageUrlRules.MESSAGE)
    private String imageUrl;

    private Integer sortOrder;
}
