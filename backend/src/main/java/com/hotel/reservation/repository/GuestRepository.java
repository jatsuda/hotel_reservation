package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Long> {
    Optional<Guest> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
