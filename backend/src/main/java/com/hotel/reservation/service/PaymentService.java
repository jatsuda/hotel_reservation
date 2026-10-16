package com.hotel.reservation.service;

import com.hotel.reservation.dto.CancelReservationDto;
import com.hotel.reservation.dto.PaymentDto;
import com.hotel.reservation.entity.Payment;
import com.hotel.reservation.entity.PaymentStatus;
import com.hotel.reservation.entity.Reservation;
import com.hotel.reservation.entity.ReservationStatus;
import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.PaymentRepository;
import com.hotel.reservation.repository.ReservationRepository;
import com.hotel.reservation.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PayoutService payoutService;
    private final ReservationService reservationService;

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public Payment getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        assertOwnerOrAdmin(payment.getReservation());
        return payment;
    }

    /**
     * Creates a payment for a reservation. In this reference implementation the
     * "payment gateway" is simulated: any well-formed request succeeds and the
     * reservation moves from PENDING -> CONFIRMED. Wire this method up to a real
     * provider (Stripe, Omise, etc.) for production use.
     */
    public Payment createPayment(PaymentDto dto) {
        // Row lock: two simultaneous payment requests for one reservation are
        // processed one after the other, so the "already paid" check is reliable.
        Reservation reservation = reservationRepository.findByIdForUpdate(dto.getReservationId())
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + dto.getReservationId()));

        assertOwnerOrAdmin(reservation);

        // Only a still-pending booking can be paid. Without this a CANCELLED
        // (or checked-out) reservation could be "paid", which flipped it back
        // to CONFIRMED and revived a booking whose dates may already be sold.
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new BadRequestException(
                    "Only a pending reservation can be paid for (current status: " + reservation.getStatus() + ")");
        }

        if (reservation.getPayment() != null) {
            throw new BadRequestException("This reservation has already been paid for");
        }

        if (dto.getAmount().compareTo(reservation.getTotalPrice()) != 0) {
            throw new BadRequestException("Payment amount does not match reservation total price");
        }

        Payment payment = new Payment();
        payment.setReservation(reservation);
        payment.setAmount(dto.getAmount());
        payment.setPaymentMethod(dto.getPaymentMethod());
        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        payment.setPaidAt(LocalDateTime.now());

        Payment saved = paymentRepository.save(payment);

        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservationRepository.save(reservation);

        // The platform is a payment intermediary here: it just took the
        // guest's money, so it now owes the hotel that amount minus its
        // commission. Track that obligation immediately as a PENDING payout.
        payoutService.createForPayment(saved);

        return saved;
    }

    public Payment updatePayment(Long id, PaymentDto dto) {
        Payment payment = getPaymentById(id);
        // A refund also cancelled the reservation and its payout; flipping the
        // payment back to PAID afterwards would leave the three out of sync.
        if (payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new BadRequestException("A refunded payment cannot be modified");
        }
        if (dto.getPaymentStatus() != null) {
            if (dto.getPaymentStatus() == PaymentStatus.REFUNDED) {
                // Delegate to the single cancel+refund entry point
                // (ReservationService.cancelReservation) instead of
                // duplicating its room-freeing/refund/payout-cancel logic
                // here - this call joins the same transaction, so `payment`
                // below is the same managed entity it updates and already
                // reflects paymentStatus=REFUNDED afterwards.
                CancelReservationDto cancelDto = new CancelReservationDto();
                cancelDto.setReason(dto.getCancelReason());
                reservationService.cancelReservation(payment.getReservation().getId(), cancelDto);
            } else {
                payment.setPaymentStatus(dto.getPaymentStatus());
            }
        }
        if (dto.getTransactionId() != null) {
            payment.setTransactionId(dto.getTransactionId());
        }
        return paymentRepository.save(payment);
    }

    private void assertOwnerOrAdmin(Reservation reservation) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        boolean owns = currentUser.getGuest() != null
                && currentUser.getGuest().getId().equals(reservation.getGuest().getId());
        if (!owns) {
            throw new AccessDeniedException("You do not have access to this reservation's payment");
        }
    }
}
