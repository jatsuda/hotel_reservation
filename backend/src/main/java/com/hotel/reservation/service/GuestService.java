package com.hotel.reservation.service;

import com.hotel.reservation.dto.GuestDto;
import com.hotel.reservation.entity.Guest;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class GuestService {

    private final GuestRepository guestRepository;

    public List<Guest> getAllGuests() {
        return guestRepository.findAll();
    }

    public Guest getGuestById(Long id) {
        return guestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Guest not found with id: " + id));
    }

    /**
     * Finds an existing guest by email, or creates a new one.
     * Used by the booking flow so returning guests aren't duplicated.
     */
    public Guest findOrCreateGuest(GuestDto dto) {
        Optional<Guest> existing = guestRepository.findByEmailIgnoreCase(dto.getEmail());
        if (existing.isPresent()) {
            Guest guest = existing.get();
            mapDtoToEntity(dto, guest);
            return guestRepository.save(guest);
        }
        Guest guest = new Guest();
        mapDtoToEntity(dto, guest);
        return guestRepository.save(guest);
    }

    public Guest createGuest(GuestDto dto) {
        if (guestRepository.existsByEmailIgnoreCase(dto.getEmail())) {
            throw new BadRequestException("A guest with this email already exists: " + dto.getEmail());
        }
        Guest guest = new Guest();
        mapDtoToEntity(dto, guest);
        return guestRepository.save(guest);
    }

    public Guest updateGuest(Long id, GuestDto dto) {
        Guest guest = getGuestById(id);
        mapDtoToEntity(dto, guest);
        return guestRepository.save(guest);
    }

    public void deleteGuest(Long id) {
        Guest guest = getGuestById(id);
        guestRepository.delete(guest);
    }

    private void mapDtoToEntity(GuestDto dto, Guest guest) {
        guest.setFirstName(dto.getFirstName());
        guest.setLastName(dto.getLastName());
        guest.setEmail(dto.getEmail());
        guest.setPhone(dto.getPhone());
        guest.setAddress(dto.getAddress());
        guest.setCity(dto.getCity());
        guest.setCountry(dto.getCountry());
    }
}
