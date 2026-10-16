package com.hotel.reservation.controller;

import com.hotel.reservation.dto.CommissionRateDto;
import com.hotel.reservation.dto.HotelDto;
import com.hotel.reservation.entity.Hotel;
import com.hotel.reservation.service.HotelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
public class HotelController {

    private final HotelService hotelService;

    @GetMapping
    public ResponseEntity<List<Hotel>> getAllHotels() {
        return ResponseEntity.ok(hotelService.getAllHotels());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Hotel> getHotelById(@PathVariable Long id) {
        return ResponseEntity.ok(hotelService.getHotelById(id));
    }

    @PostMapping
    public ResponseEntity<Hotel> createHotel(@Valid @RequestBody HotelDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(hotelService.createHotel(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Hotel> updateHotel(@PathVariable Long id, @Valid @RequestBody HotelDto dto) {
        return ResponseEntity.ok(hotelService.updateHotel(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHotel(@PathVariable Long id) {
        hotelService.deleteHotel(id);
        return ResponseEntity.noContent().build();
    }

    // ADMIN, or that hotel's own HOTEL_OWNER/HOTEL_STAFF with VIEW_FINANCE (HotelService narrows this).
    @GetMapping("/{id}/commission-rate")
    public ResponseEntity<CommissionRateDto> getCommissionRate(@PathVariable Long id) {
        return ResponseEntity.ok(new CommissionRateDto(hotelService.getCommissionRate(id)));
    }

    // ADMIN only - a hotel cannot set its own cut.
    @PatchMapping("/{id}/commission-rate")
    public ResponseEntity<CommissionRateDto> updateCommissionRate(
            @PathVariable Long id, @Valid @RequestBody CommissionRateDto dto) {
        Hotel updated = hotelService.updateCommissionRate(id, dto.getCommissionRate());
        return ResponseEntity.ok(new CommissionRateDto(updated.getCommissionRate()));
    }
}
