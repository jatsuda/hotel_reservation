package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByHotel_IdOrderByCreatedAtDesc(Long hotelId);

    List<Review> findByGuest_IdOrderByCreatedAtDesc(Long guestId);

    Optional<Review> findByReservation_Id(Long reservationId);

    boolean existsByReservation_Id(Long reservationId);

    long countByHotel_Id(Long hotelId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.hotel.id = :hotelId")
    Double findAverageRatingByHotelId(@Param("hotelId") Long hotelId);
}
