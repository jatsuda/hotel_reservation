package com.hotel.reservation.service;

import com.hotel.reservation.dto.HotelDto;
import com.hotel.reservation.dto.HotelImageDto;
import com.hotel.reservation.entity.Hotel;
import com.hotel.reservation.entity.HotelImage;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.HotelRepository;
import com.hotel.reservation.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class HotelService {

    private final HotelRepository hotelRepository;
    private final CurrentUserProvider currentUserProvider;

    public List<Hotel> getAllHotels() {
        return hotelRepository.findAll();
    }

    public Hotel getHotelById(Long id) {
        return hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with id: " + id));
    }

    public Hotel createHotel(HotelDto dto) {
        Hotel hotel = new Hotel();
        mapDtoToEntity(dto, hotel);
        return hotelRepository.save(hotel);
    }

    /**
     * Finance-sensitive, so it's deliberately not part of the general
     * update flow below - see Hotel.commissionRate for why. ADMIN can view
     * any hotel's rate; a hotel's own HOTEL_OWNER/HOTEL_STAFF can view it
     * only with the VIEW_FINANCE permission (they need to know their own
     * cut, but can't be allowed to set it).
     */
    public BigDecimal getCommissionRate(Long hotelId) {
        if (!currentUserProvider.isAdmin() && !currentUserProvider.canViewFinance(hotelId)) {
            throw new AccessDeniedException("You do not have access to this hotel's commission rate");
        }
        Hotel hotel = getHotelById(hotelId);
        return hotel.getCommissionRate() != null ? hotel.getCommissionRate() : Hotel.DEFAULT_COMMISSION_RATE;
    }

    /** ADMIN only - the whole point of this being separate from updateHotel is that a hotel can't set its own rate. */
    public Hotel updateCommissionRate(Long hotelId, BigDecimal rate) {
        if (!currentUserProvider.isAdmin()) {
            throw new AccessDeniedException("Only platform admins can change a hotel's commission rate");
        }
        Hotel hotel = getHotelById(hotelId);
        hotel.setCommissionRate(rate);
        return hotelRepository.save(hotel);
    }

    // Route-level security (SecurityConfig) already requires ADMIN or
    // HOTEL_OWNER here; this check narrows a HOTEL_OWNER down to only their
    // own linked hotel (an ADMIN can edit any hotel).
    public Hotel updateHotel(Long id, HotelDto dto) {
        if (!currentUserProvider.canManageHotel(id)) {
            throw new AccessDeniedException("You do not have permission to edit this hotel");
        }
        Hotel hotel = getHotelById(id);
        mapDtoToEntity(dto, hotel);
        return hotelRepository.save(hotel);
    }

    public void deleteHotel(Long id) {
        Hotel hotel = getHotelById(id);
        hotelRepository.delete(hotel);
    }

    private void mapDtoToEntity(HotelDto dto, Hotel hotel) {
        hotel.setName(dto.getName());
        hotel.setDescription(dto.getDescription());
        hotel.setAddress(dto.getAddress());
        hotel.setCity(dto.getCity());
        hotel.setCountry(dto.getCountry());
        hotel.setPhone(dto.getPhone());
        hotel.setEmail(dto.getEmail());
        hotel.setStarRating(dto.getStarRating());
        hotel.setImageUrl(dto.getImageUrl());
        hotel.setLatitude(dto.getLatitude());
        hotel.setLongitude(dto.getLongitude());
        if (dto.getImages() != null) {
            replaceImages(hotel, dto.getImages());
        }
    }

    // Gallery images are owned by the Hotel (orphanRemoval = true), so
    // clearing the existing list and re-adding the incoming ones keeps a
    // single source of truth without needing a separate images endpoint -
    // same pattern as RoomService.replaceAmenities.
    private void replaceImages(Hotel hotel, List<HotelImageDto> imageDtos) {
        hotel.getImages().clear();
        List<HotelImage> updated = new ArrayList<>();
        for (HotelImageDto i : imageDtos) {
            HotelImage image = new HotelImage();
            image.setHotel(hotel);
            image.setCategory(i.getCategory());
            image.setLabel(i.getLabel());
            image.setImageUrl(i.getImageUrl());
            image.setSortOrder(i.getSortOrder() != null ? i.getSortOrder() : 0);
            updated.add(image);
        }
        hotel.getImages().addAll(updated);
    }
}

