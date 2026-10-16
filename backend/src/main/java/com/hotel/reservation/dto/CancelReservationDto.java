package com.hotel.reservation.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Body for POST /api/reservations/{id}/cancel. `reason` is required when a
 * HOTEL_STAFF/HOTEL_OWNER/ADMIN cancels on a guest's behalf (audit trail for
 * later review); a GUEST cancelling their own booking may omit it - see
 * ReservationService.cancelReservation.
 */
@Data
public class CancelReservationDto {
    @Size(max = 500, message = "Reason must be at most 500 characters")
    private String reason;
}
