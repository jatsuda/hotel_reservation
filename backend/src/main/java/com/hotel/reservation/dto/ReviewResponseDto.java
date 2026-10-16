package com.hotel.reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * What GET /api/reviews/** actually returns. Deliberately not the raw
 * {@link com.hotel.reservation.entity.Review}/{@link com.hotel.reservation.entity.Guest}
 * entities - this endpoint is public, so we only ever expose the reviewer's
 * first name + last initial (e.g. "Somchai J."), never their email, phone,
 * or address. guestId is included (a plain numeric id, not sensitive) so the
 * frontend can tell "is this my review" and show edit/delete controls.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponseDto {
    private Long id;
    private Long hotelId;
    private Long guestId;
    private String guestName;
    private Long reservationId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
