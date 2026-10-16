package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    boolean existsByNameIgnoreCase(String name);
}
