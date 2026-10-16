package com.hotel.reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Aggregate rating info for a hotel - powers the "4.6 (128 reviews)" summary line. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSummaryDto {
    private double averageRating;
    private long totalReviews;
}
