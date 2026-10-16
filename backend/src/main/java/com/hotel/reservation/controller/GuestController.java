package com.hotel.reservation.controller;

import com.hotel.reservation.dto.GuestDto;
import com.hotel.reservation.entity.Guest;
import com.hotel.reservation.service.GuestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
public class GuestController {

    private final GuestService guestService;

    @GetMapping
    public ResponseEntity<List<Guest>> getAllGuests() {
        return ResponseEntity.ok(guestService.getAllGuests());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Guest> getGuestById(@PathVariable Long id) {
        return ResponseEntity.ok(guestService.getGuestById(id));
    }

    @PostMapping
    public ResponseEntity<Guest> createGuest(@Valid @RequestBody GuestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(guestService.createGuest(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Guest> updateGuest(@PathVariable Long id, @Valid @RequestBody GuestDto dto) {
        return ResponseEntity.ok(guestService.updateGuest(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGuest(@PathVariable Long id) {
        guestService.deleteGuest(id);
        return ResponseEntity.noContent().build();
    }
}
