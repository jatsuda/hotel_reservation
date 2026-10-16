package com.hotel.reservation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewDto {

    // Required on create (POST /api/reviews); ignored on update (PUT
    // /api/reviews/{id}) - a review always stays attached to the
    // reservation it was created for.
    private Long reservationId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;

    @Size(max = 2000, message = "Comment must be under 2000 characters")
    private String comment;
}
