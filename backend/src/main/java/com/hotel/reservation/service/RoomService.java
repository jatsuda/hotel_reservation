package com.hotel.reservation.service;

import com.hotel.reservation.dto.RoomAmenityDto;
import com.hotel.reservation.dto.RoomDto;
import com.hotel.reservation.dto.RoomImageDto;
import com.hotel.reservation.entity.RoomImage;
import com.hotel.reservation.entity.Hotel;
import com.hotel.reservation.entity.Room;
import com.hotel.reservation.entity.RoomAmenity;
import com.hotel.reservation.entity.RoomStatus;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.HotelRepository;
import com.hotel.reservation.repository.RoomRepository;
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
public class RoomService {

    private final RoomRepository roomRepository;
    private final HotelRepository hotelRepository;
    private final CurrentUserProvider currentUserProvider;

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
    }

    public List<Room> getRoomsByHotel(Long hotelId) {
        return roomRepository.findByHotelId(hotelId);
    }

    public List<Room> getAvailableRooms() {
        return roomRepository.findByStatus(RoomStatus.AVAILABLE);
    }

    public Room createRoom(RoomDto dto) {
        Hotel hotel = hotelRepository.findById(dto.getHotelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with id: " + dto.getHotelId()));

        if (!currentUserProvider.canManageRooms(hotel.getId())) {
            throw new AccessDeniedException("You do not have permission to add rooms to this hotel");
        }

        validate(dto);

        Room room = new Room();
        room.setHotel(hotel);
        mapDtoToEntity(dto, room);
        return roomRepository.save(room);
    }

    public Room updateRoom(Long id, RoomDto dto) {
        Room room = getRoomById(id);

        if (!currentUserProvider.canManageRooms(room.getHotel().getId())) {
            throw new AccessDeniedException("You do not have permission to edit this room");
        }

        if (dto.getHotelId() != null && !dto.getHotelId().equals(room.getHotel().getId())) {
            // Only an ADMIN may move a room to a different hotel - a
            // HOTEL_OWNER is confined to their own single hotel.
            if (!currentUserProvider.isAdmin()) {
                throw new AccessDeniedException("You cannot move a room to a different hotel");
            }
            Hotel hotel = hotelRepository.findById(dto.getHotelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with id: " + dto.getHotelId()));
            room.setHotel(hotel);
        }

        validate(dto);
        mapDtoToEntity(dto, room);
        return roomRepository.save(room);
    }

    public Room changeStatus(Long id, RoomStatus status) {
        Room room = getRoomById(id);
        if (!currentUserProvider.canManageRooms(room.getHotel().getId())) {
            throw new AccessDeniedException("You do not have permission to change this room's status");
        }
        room.setStatus(status);
        return roomRepository.save(room);
    }

    public void deleteRoom(Long id) {
        Room room = getRoomById(id);
        if (!currentUserProvider.canManageRooms(room.getHotel().getId())) {
            throw new AccessDeniedException("You do not have permission to delete this room");
        }
        roomRepository.delete(room);
    }

    private void validate(RoomDto dto) {
        if (dto.getPricePerNight() != null && dto.getPricePerNight().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Price per night must be greater than 0");
        }
        if (dto.getCapacity() != null && dto.getCapacity() <= 0) {
            throw new BadRequestException("Capacity must be greater than 0");
        }
    }

    private void mapDtoToEntity(RoomDto dto, Room room) {
        room.setRoomNumber(dto.getRoomNumber());
        room.setRoomType(dto.getRoomType());
        room.setDescription(dto.getDescription());
        room.setPricePerNight(dto.getPricePerNight());
        room.setCapacity(dto.getCapacity());
        room.setBedType(dto.getBedType());
        room.setSize(dto.getSize());
        room.setFloor(dto.getFloor());
        room.setImageUrl(dto.getImageUrl());
        if (dto.getStatus() != null) {
            room.setStatus(dto.getStatus());
        }
        if (dto.getAmenities() != null) {
            replaceAmenities(room, dto.getAmenities());
        }
        if (dto.getImages() != null) {
            replaceImages(room, dto.getImages());
        }
    }

    // Gallery photos are owned by the Room (orphanRemoval = true) - same
    // clear-and-re-add pattern as replaceAmenities above.
    private void replaceImages(Room room, List<RoomImageDto> imageDtos) {
        room.getImages().clear();
        List<RoomImage> updated = new ArrayList<>();
        int position = 0;
        for (RoomImageDto i : imageDtos) {
            RoomImage image = new RoomImage();
            image.setRoom(room);
            image.setLabel(i.getLabel());
            image.setImageUrl(i.getImageUrl());
            image.setSortOrder(i.getSortOrder() != null ? i.getSortOrder() : position);
            updated.add(image);
            position++;
        }
        room.getImages().addAll(updated);
    }

    // Amenities are owned by the Room (orphanRemoval = true), so clearing the
    // existing list and re-adding the incoming ones keeps a single source of
    // truth without needing a separate amenities endpoint.
    private void replaceAmenities(Room room, List<RoomAmenityDto> amenityDtos) {
        room.getAmenities().clear();
        List<RoomAmenity> updated = new ArrayList<>();
        for (RoomAmenityDto a : amenityDtos) {
            RoomAmenity amenity = new RoomAmenity();
            amenity.setRoom(room);
            amenity.setCategory(a.getCategory());
            amenity.setTitle(a.getTitle());
            amenity.setDescription(a.getDescription());
            amenity.setIcon(a.getIcon());
            updated.add(amenity);
        }
        room.getAmenities().addAll(updated);
    }
}
