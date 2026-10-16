package com.hotel.reservation.service;

import com.hotel.reservation.dto.CreateStaffRequest;
import com.hotel.reservation.dto.StaffDto;
import com.hotel.reservation.dto.UpdateStaffRequest;
import com.hotel.reservation.entity.Hotel;
import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.UserRepository;
import com.hotel.reservation.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lets a HOTEL_OWNER (or ADMIN) add/edit/remove HOTEL_STAFF accounts scoped
 * to a single hotel - e.g. a marketing person who can only edit the hotel's
 * listing, or a front-desk person who can only manage reservations. See
 * entity/Permission.java for the available permissions and
 * CurrentUserProvider for how they're enforced elsewhere.
 *
 * Every method here resolves "which hotel" from the *target* - either the
 * hotel of the current HOTEL_OWNER (create/list), or the hotel already
 * linked to the staff member being edited/removed - rather than trusting a
 * hotelId sent by the client, so a HOTEL_OWNER can never manage another
 * hotel's staff by guessing IDs.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StaffService {

    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder passwordEncoder;

    public List<StaffDto> listStaff() {
        Hotel hotel = requireOwnHotel();
        return userRepository.findByHotel_IdAndRole(hotel.getId(), Role.HOTEL_STAFF)
                .stream().map(StaffDto::from).toList();
    }

    public StaffDto createStaff(CreateStaffRequest request) {
        Hotel hotel = requireOwnHotel();

        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }

        User staff = new User();
        staff.setFullName(request.getFullName());
        staff.setEmail(request.getEmail());
        staff.setPassword(passwordEncoder.encode(request.getPassword()));
        staff.setRole(Role.HOTEL_STAFF);
        staff.setHotel(hotel);
        staff.setPermissions(request.getPermissions());

        return StaffDto.from(userRepository.save(staff));
    }

    public StaffDto updateStaff(Long staffId, UpdateStaffRequest request) {
        User staff = getOwnHotelStaff(staffId);
        staff.setFullName(request.getFullName());
        staff.setPermissions(request.getPermissions());
        return StaffDto.from(userRepository.save(staff));
    }

    public void deleteStaff(Long staffId) {
        User staff = getOwnHotelStaff(staffId);
        userRepository.delete(staff);
    }

    /** The current user's own hotel, if they're allowed to manage its staff. */
    private Hotel requireOwnHotel() {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null || currentUser.getHotel() == null) {
            throw new BadRequestException("This account is not linked to a hotel");
        }
        Hotel hotel = currentUser.getHotel();
        if (!currentUserProvider.canManageStaff(hotel.getId())) {
            throw new AccessDeniedException("You do not have permission to manage staff for this hotel");
        }
        return hotel;
    }

    /** A HOTEL_STAFF row, but only if it belongs to a hotel the current user may manage staff for. */
    private User getOwnHotelStaff(Long staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff account not found with id: " + staffId));
        if (staff.getRole() != Role.HOTEL_STAFF || staff.getHotel() == null
                || !currentUserProvider.canManageStaff(staff.getHotel().getId())) {
            throw new AccessDeniedException("You do not have permission to manage this staff account");
        }
        return staff;
    }
}
