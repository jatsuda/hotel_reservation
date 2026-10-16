package com.hotel.reservation.service;

import com.hotel.reservation.dto.ReviewDto;
import com.hotel.reservation.dto.ReviewResponseDto;
import com.hotel.reservation.dto.ReviewSummaryDto;
import com.hotel.reservation.entity.*;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.ReservationRepository;
import com.hotel.reservation.repository.ReviewRepository;
import com.hotel.reservation.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReservationRepository reservationRepository;
    private final CurrentUserProvider currentUserProvider;

    /** Public: every review for a hotel, newest first. Powers the Hotel Detail page. */
    public List<ReviewResponseDto> getReviewsByHotel(Long hotelId) {
        return reviewRepository.findByHotel_IdOrderByCreatedAtDesc(hotelId).stream()
                .map(this::toResponseDto)
                .toList();
    }

    /** Public: average rating + count for a hotel. */
    public ReviewSummaryDto getSummary(Long hotelId) {
        Double avg = reviewRepository.findAverageRatingByHotelId(hotelId);
        long count = reviewRepository.countByHotel_Id(hotelId);
        double rounded = avg == null ? 0.0 : Math.round(avg * 10) / 10.0;
        return new ReviewSummaryDto(rounded, count);
    }

    /** The logged-in guest's own reviews, newest first - powers "My Reviews"/history pages. */
    public List<ReviewResponseDto> getMyReviews() {
        Guest guest = requireCurrentGuest();
        return reviewRepository.findByGuest_IdOrderByCreatedAtDesc(guest.getId()).stream()
                .map(this::toResponseDto)
                .toList();
    }

    /**
     * The logged-in guest's completed (CHECKED_OUT) stays that don't have a
     * review yet - powers the "Write a review" prompt on Reservation History
     * and the Hotel Detail page.
     */
    public List<Reservation> getReviewableReservations() {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null || currentUser.getGuest() == null) {
            return List.of();
        }
        return reservationRepository.findByGuestId(currentUser.getGuest().getId()).stream()
                .filter(r -> r.getStatus() == ReservationStatus.CHECKED_OUT)
                .filter(r -> !reviewRepository.existsByReservation_Id(r.getId()))
                .toList();
    }

    /**
     * Creates a review for one of the current guest's own stays. Enforces
     * every rule the feature depends on: only the guest who booked it may
     * review it, the stay must actually be finished (CHECKED_OUT - so no
     * reviewing a room you never checked into), and a stay can only be
     * reviewed once.
     */
    public ReviewResponseDto createReview(ReviewDto dto) {
        if (dto.getReservationId() == null) {
            throw new BadRequestException("reservationId is required");
        }
        Guest guest = requireCurrentGuest();

        Reservation reservation = reservationRepository.findById(dto.getReservationId())
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + dto.getReservationId()));

        if (!reservation.getGuest().getId().equals(guest.getId())) {
            throw new AccessDeniedException("You can only review your own stays");
        }
        if (reservation.getStatus() != ReservationStatus.CHECKED_OUT) {
            throw new BadRequestException("You can only review a stay after it's checked out");
        }
        if (reviewRepository.existsByReservation_Id(reservation.getId())) {
            throw new BadRequestException("This stay has already been reviewed");
        }

        Hotel hotel = reservation.getRoom().getHotel();

        Review review = new Review();
        review.setHotel(hotel);
        review.setGuest(guest);
        review.setReservation(reservation);
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());

        Review saved = reviewRepository.save(review);
        return toResponseDto(saved);
    }

    /** Only the reviewer may edit their own review's rating/comment. */
    public ReviewResponseDto updateReview(Long id, ReviewDto dto) {
        Review review = getOwnReviewOrThrow(id);
        if (dto.getRating() != null) {
            review.setRating(dto.getRating());
        }
        if (dto.getComment() != null) {
            review.setComment(dto.getComment());
        }
        return toResponseDto(reviewRepository.save(review));
    }

    /**
     * Deletable by the reviewer themselves, or by anyone with
     * MANAGE_HOTEL_INFO on the hotel the review belongs to (ADMIN, that
     * hotel's HOTEL_OWNER, or a HOTEL_STAFF granted that permission) -
     * moderation of clearly abusive/spam reviews.
     */
    public void deleteReview(Long id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + id));

        User currentUser = currentUserProvider.getCurrentUser();
        boolean isOwnReview = currentUser != null
                && currentUser.getGuest() != null
                && currentUser.getGuest().getId().equals(review.getGuest().getId());
        boolean canModerate = currentUserProvider.canManageHotel(review.getHotel().getId());

        if (!isOwnReview && !canModerate) {
            throw new AccessDeniedException("You do not have permission to delete this review");
        }
        reviewRepository.delete(review);
    }

    // ---------- helpers ----------

    private Guest requireCurrentGuest() {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null || currentUser.getGuest() == null) {
            throw new AccessDeniedException("Only guests may leave a review");
        }
        return currentUser.getGuest();
    }

    private Review getOwnReviewOrThrow(Long id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + id));
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null || currentUser.getGuest() == null
                || !currentUser.getGuest().getId().equals(review.getGuest().getId())) {
            throw new AccessDeniedException("You can only edit your own review");
        }
        return review;
    }

    private ReviewResponseDto toResponseDto(Review r) {
        Guest g = r.getGuest();
        String lastInitial = (g.getLastName() != null && !g.getLastName().isBlank())
                ? g.getLastName().trim().substring(0, 1) + "."
                : "";
        String guestName = lastInitial.isEmpty() ? g.getFirstName() : g.getFirstName() + " " + lastInitial;

        return new ReviewResponseDto(
                r.getId(),
                r.getHotel().getId(),
                g.getId(),
                guestName,
                r.getReservation().getId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
