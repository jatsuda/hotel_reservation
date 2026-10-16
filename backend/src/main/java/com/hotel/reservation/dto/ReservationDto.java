package com.hotel.reservation.dto;

import com.hotel.reservation.entity.ReservationStatus;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ReservationDto {
    @NotNull(message = "guestId is required")
    private Long guestId;

    @NotNull(message = "roomId is required")
    private Long roomId;

    @NotNull(message = "Check-in date is required")
    @FutureOrPresent(message = "Check-in date cannot be in the past")
    private LocalDate checkInDate;

    @NotNull(message = "Check-out date is required")
    private LocalDate checkOutDate;

    @NotNull(message = "Number of guests is required")
    @Min(value = 1, message = "There must be at least 1 guest")
    @Max(value = 100, message = "Too many guests")
    private Integer numberOfGuests;

    @Min(value = 1, message = "Number of rooms must be at least 1")
    @Max(value = 20, message = "Number of rooms must be at most 20")
    private Integer numberOfRooms = 1;

    @Size(max = 1000, message = "Special request must be at most 1000 characters")
    private String specialRequest;

    // Only used for admin/manual status updates via PUT
    private ReservationStatus status;
}
