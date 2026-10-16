package com.hotel.reservation.controller;

import com.hotel.reservation.dto.RoomDto;
import com.hotel.reservation.entity.Room;
import com.hotel.reservation.entity.RoomStatus;
import com.hotel.reservation.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms(@RequestParam(required = false) Long hotelId) {
        if (hotelId != null) {
            return ResponseEntity.ok(roomService.getRoomsByHotel(hotelId));
        }
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/available")
    public ResponseEntity<List<Room>> getAvailableRooms() {
        return ResponseEntity.ok(roomService.getAvailableRooms());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    @PostMapping
    public ResponseEntity<Room> createRoom(@Valid @RequestBody RoomDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.createRoom(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(@PathVariable Long id, @Valid @RequestBody RoomDto dto) {
        return ResponseEntity.ok(roomService.updateRoom(id, dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Room> changeStatus(@PathVariable Long id, @RequestParam RoomStatus status) {
        return ResponseEntity.ok(roomService.changeStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
