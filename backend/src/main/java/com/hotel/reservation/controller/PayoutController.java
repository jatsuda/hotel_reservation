package com.hotel.reservation.controller;

import com.hotel.reservation.dto.PayoutPaymentDto;
import com.hotel.reservation.dto.PayoutSummaryDto;
import com.hotel.reservation.entity.Payout;
import com.hotel.reservation.entity.PayoutStatus;
import com.hotel.reservation.service.PayoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payouts")
@RequiredArgsConstructor
public class PayoutController {

    private final PayoutService payoutService;

    // ADMIN only - the platform-wide payouts dashboard, optionally narrowed
    // to one status (e.g. ?status=PENDING to see what's due to go out).
    @GetMapping
    public ResponseEntity<List<Payout>> getAllPayouts(@RequestParam(required = false) PayoutStatus status) {
        return ResponseEntity.ok(payoutService.getAllPayouts(status));
    }

    // ADMIN only - total commission earned, and how much is owed vs. already paid, across every hotel.
    @GetMapping("/summary")
    public ResponseEntity<PayoutSummaryDto> getPlatformSummary() {
        return ResponseEntity.ok(payoutService.getPlatformSummary());
    }

    // ADMIN, or that hotel's own HOTEL_OWNER/HOTEL_STAFF-with-VIEW_FINANCE (PayoutService narrows this).
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<Payout>> getPayoutsByHotel(@PathVariable Long hotelId) {
        return ResponseEntity.ok(payoutService.getPayoutsByHotel(hotelId));
    }

    @GetMapping("/hotel/{hotelId}/summary")
    public ResponseEntity<PayoutSummaryDto> getSummaryByHotel(@PathVariable Long hotelId) {
        return ResponseEntity.ok(payoutService.getSummaryByHotel(hotelId));
    }

    // ADMIN only - records that the platform actually transferred this payout's net amount to the hotel.
    @PostMapping("/{id}/pay")
    public ResponseEntity<Payout> markAsPaid(@PathVariable Long id, @Valid @RequestBody PayoutPaymentDto dto) {
        return ResponseEntity.ok(payoutService.markAsPaid(id, dto));
    }
}
