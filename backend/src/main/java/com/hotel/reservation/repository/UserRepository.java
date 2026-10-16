package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    // Powers the "staff of my hotel" list on the HOTEL_OWNER admin panel.
    List<User> findByHotel_IdAndRole(Long hotelId, Role role);
}
