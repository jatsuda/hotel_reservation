package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Room;
import com.hotel.reservation.entity.RoomStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByHotelId(Long hotelId);
    List<Room> findByStatus(RoomStatus status);
    List<Room> findByHotelIdAndStatus(Long hotelId, RoomStatus status);

    // Row lock (SELECT ... FOR UPDATE). Taken before the overlap check when
    // creating/editing a reservation so two concurrent requests for the same
    // room can't both pass the check and double-book it.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);
}
