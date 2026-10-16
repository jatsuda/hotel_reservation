package com.hotel.reservation.controller;

import com.hotel.reservation.dto.CancelReservationDto;
import com.hotel.reservation.dto.ReservationDto;
import com.hotel.reservation.dto.UpcomingReservationDto;
import com.hotel.reservation.entity.Reservation;
import com.hotel.reservation.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping
    public ResponseEntity<List<Reservation>> getAllReservations(
            @RequestParam(required = false) Long guestId,
            @RequestParam(required = false) Long hotelId) {
        if (guestId != null) {
            return ResponseEntity.ok(reservationService.getReservationsByGuest(guestId));
        }
        // hotelId: used by the HOTEL_OWNER-scoped admin view (and optionally
        // by ADMIN to filter one hotel); service enforces who may pass what.
        return ResponseEntity.ok(reservationService.getReservations(hotelId));
    }

    // Reservations belonging to the logged-in user - used by "My Reservations".
    @GetMapping("/me")
    public ResponseEntity<List<Reservation>> getMyReservations() {
        return ResponseEntity.ok(reservationService.getMyReservations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reservation> getReservationById(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    // Used by the Room Detail page's Advance Booking widget and Availability
    // Calendar to show which dates are already taken for this room.
    @GetMapping("/room/{roomId}/upcoming")
    public ResponseEntity<List<UpcomingReservationDto>> getUpcomingByRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(reservationService.getUpcomingReservationsByRoom(roomId));
    }

    @PostMapping
    public ResponseEntity<Reservation> createReservation(@Valid @RequestBody ReservationDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationService.createReservation(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Reservation> updateReservation(@PathVariable Long id, @RequestBody ReservationDto dto) {
        return ResponseEntity.ok(reservationService.updateReservation(id, dto));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Reservation> cancelReservation(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) CancelReservationDto dto) {
        return ResponseEntity.ok(reservationService.cancelReservation(id, dto));
    }

    @PostMapping("/{id}/check-in")
    public ResponseEntity<Reservation> checkIn(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.checkIn(id));
    }

    @PostMapping("/{id}/check-out")
    public ResponseEntity<Reservation> checkOut(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.checkOut(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReservation(@PathVariable Long id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }
}
