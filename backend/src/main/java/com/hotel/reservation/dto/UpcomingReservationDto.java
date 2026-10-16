package com.hotel.reservation.dto;

import com.hotel.reservation.entity.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

/**
 * What GET /api/reservations/room/{roomId}/upcoming returns. That endpoint is
 * PUBLIC (it powers the availability calendar for logged-out visitors), so it
 * must only ever expose what the page needs: the booked dates and a privacy-safe
 * display name (first name + last INITIAL). No email, phone, address, price,
 * payment or special-request data.
 */
@Data
@AllArgsConstructor
public class UpcomingReservationDto {
    private Long id;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private ReservationStatus status;
    private GuestSummary guest;

    @Data
    @AllArgsConstructor
    public static class GuestSummary {
        private String firstName;
        // Only the first letter of the last name, e.g. "S" - never the full name.
        private String lastName;
    }
}
