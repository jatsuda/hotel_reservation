package com.hotel.reservation.controller;

import com.hotel.reservation.dto.CreateStaffRequest;
import com.hotel.reservation.dto.StaffDto;
import com.hotel.reservation.dto.UpdateStaffRequest;
import com.hotel.reservation.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// SecurityConfig restricts every method here to ADMIN/HOTEL_OWNER; StaffService
// additionally makes sure a HOTEL_OWNER can only ever touch their own hotel's staff.
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @GetMapping
    public ResponseEntity<List<StaffDto>> listStaff() {
        return ResponseEntity.ok(staffService.listStaff());
    }

    @PostMapping
    public ResponseEntity<StaffDto> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffService.createStaff(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StaffDto> updateStaff(@PathVariable Long id, @Valid @RequestBody UpdateStaffRequest request) {
        return ResponseEntity.ok(staffService.updateStaff(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
        return ResponseEntity.noContent().build();
    }
}
