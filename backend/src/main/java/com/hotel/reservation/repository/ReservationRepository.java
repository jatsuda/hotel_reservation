package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Reservation;
import com.hotel.reservation.entity.ReservationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByGuestId(Long guestId);

    // Row lock used when taking a payment, so two simultaneous payment
    // requests for the same reservation can't both succeed.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reservation r WHERE r.id = :id")
    Optional<Reservation> findByIdForUpdate(@Param("id") Long id);

    List<Reservation> findByRoomId(Long roomId);

    // Every reservation for any room belonging to the given hotel - powers
    // the HOTEL_OWNER-scoped view of /api/reservations (see ReservationService.getReservations).
    List<Reservation> findByRoom_Hotel_Id(Long hotelId);

    List<Reservation> findByStatus(ReservationStatus status);

    // Finds reservations for a room that overlap a given date range and are
    // not cancelled - used to prevent double-booking.
    @Query("""
           SELECT r FROM Reservation r
           WHERE r.room.id = :roomId
           AND r.status <> com.hotel.reservation.entity.ReservationStatus.CANCELLED
           AND r.checkInDate < :checkOutDate
           AND r.checkOutDate > :checkInDate
           """)
    List<Reservation> findOverlappingReservations(
            @Param("roomId") Long roomId,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate
    );

    // Upcoming, non-cancelled reservations for a room, soonest first - used by
    // the Room Detail page's "Advance Booking" widget.
    @Query("""
           SELECT r FROM Reservation r
           WHERE r.room.id = :roomId
           AND r.status <> com.hotel.reservation.entity.ReservationStatus.CANCELLED
           AND r.checkOutDate >= :fromDate
           ORDER BY r.checkInDate ASC
           """)
    List<Reservation> findUpcomingByRoomId(
            @Param("roomId") Long roomId,
            @Param("fromDate") LocalDate fromDate
    );

    // Same as above but excludes a given reservation id (useful when updating an existing reservation)
    @Query("""
           SELECT r FROM Reservation r
           WHERE r.room.id = :roomId
           AND r.id <> :excludeReservationId
           AND r.status <> com.hotel.reservation.entity.ReservationStatus.CANCELLED
           AND r.checkInDate < :checkOutDate
           AND r.checkOutDate > :checkInDate
           """)
    List<Reservation> findOverlappingReservationsExcluding(
            @Param("roomId") Long roomId,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate,
            @Param("excludeReservationId") Long excludeReservationId
    );
}
