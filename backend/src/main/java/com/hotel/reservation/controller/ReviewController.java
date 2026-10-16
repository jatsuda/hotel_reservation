package com.hotel.reservation.controller;

import com.hotel.reservation.dto.ReviewDto;
import com.hotel.reservation.dto.ReviewResponseDto;
import com.hotel.reservation.dto.ReviewSummaryDto;
import com.hotel.reservation.entity.Reservation;
import com.hotel.reservation.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // Public - shown on the Hotel Detail page.
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<ReviewResponseDto>> getByHotel(@PathVariable Long hotelId) {
        return ResponseEntity.ok(reviewService.getReviewsByHotel(hotelId));
    }

    // Public - average rating + review count for a hotel.
    @GetMapping("/hotel/{hotelId}/summary")
    public ResponseEntity<ReviewSummaryDto> getSummary(@PathVariable Long hotelId) {
        return ResponseEntity.ok(reviewService.getSummary(hotelId));
    }

    // The logged-in guest's own reviews.
    @GetMapping("/me")
    public ResponseEntity<List<ReviewResponseDto>> getMyReviews() {
        return ResponseEntity.ok(reviewService.getMyReviews());
    }

    // The logged-in guest's checked-out stays that don't have a review yet.
    @GetMapping("/reviewable")
    public ResponseEntity<List<Reservation>> getReviewable() {
        return ResponseEntity.ok(reviewService.getReviewableReservations());
    }

    @PostMapping
    public ResponseEntity<ReviewResponseDto> create(@Valid @RequestBody ReviewDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createReview(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReviewResponseDto> update(@PathVariable Long id, @Valid @RequestBody ReviewDto dto) {
        return ResponseEntity.ok(reviewService.updateReview(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
}
