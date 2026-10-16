package com.hotel.reservation.service;

import com.hotel.reservation.dto.PayoutPaymentDto;
import com.hotel.reservation.dto.PayoutSummaryDto;
import com.hotel.reservation.entity.*;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.repository.PayoutRepository;
import com.hotel.reservation.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * The platform's side of being a payment intermediary: it collects the full
 * amount from the guest (Payment), then owes the hotel that amount minus
 * its commission (Payout). One Payout is created automatically for every
 * successful Payment (see createForPayment, called from PaymentService) and
 * sits PENDING until an ADMIN actually transfers the money and records it
 * (markAsPaid) - this app doesn't move real money, it just tracks the
 * obligation and its settlement, the same way Payment simulates a gateway.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PayoutService {

    private final PayoutRepository payoutRepository;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Called right after a Payment is created (PaymentService.createPayment).
     * Snapshots the hotel's *current* commission rate onto the payout, so a
     * later rate change never rewrites history.
     */
    public Payout createForPayment(Payment payment) {
        Hotel hotel = payment.getReservation().getRoom().getHotel();
        BigDecimal rate = hotel.getCommissionRate() != null ? hotel.getCommissionRate() : Hotel.DEFAULT_COMMISSION_RATE;
        BigDecimal gross = payment.getAmount();
        BigDecimal commission = gross.multiply(rate)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal net = gross.subtract(commission);

        Payout payout = new Payout();
        payout.setHotel(hotel);
        payout.setPayment(payment);
        payout.setGrossAmount(gross);
        payout.setCommissionRate(rate);
        payout.setCommissionAmount(commission);
        payout.setNetAmount(net);
        payout.setStatus(PayoutStatus.PENDING);
        return payoutRepository.save(payout);
    }

    /**
     * Called when a Payment is refunded (PaymentService.updatePayment). If
     * the payout hasn't been transferred yet, there's nothing left to owe -
     * cancel it. If it was already PAID, the money has already left the
     * platform for the hotel; clawing that back is a manual, out-of-band
     * process (bank recall / deduct from a future payout), not something
     * this method does automatically.
     */
    public void cancelForPayment(Payment payment) {
        payoutRepository.findByPayment_Id(payment.getId()).ifPresent(payout -> {
            if (payout.getStatus() == PayoutStatus.PENDING) {
                payout.setStatus(PayoutStatus.CANCELLED);
                payoutRepository.save(payout);
            }
        });
    }

    /** One hotel's payout history - that hotel's own ADMIN/HOTEL_OWNER/HOTEL_STAFF-with-VIEW_FINANCE, or any ADMIN. */
    public List<Payout> getPayoutsByHotel(Long hotelId) {
        assertCanViewHotelFinance(hotelId);
        return payoutRepository.findByHotel_IdOrderByCreatedAtDesc(hotelId);
    }

    /** That hotel's totals: gross processed, commission taken, and how much is still owed vs. already paid. */
    public PayoutSummaryDto getSummaryByHotel(Long hotelId) {
        assertCanViewHotelFinance(hotelId);
        BigDecimal gross = payoutRepository.sumGrossByHotel(hotelId);
        BigDecimal commission = payoutRepository.sumCommissionByHotel(hotelId);
        BigDecimal pending = payoutRepository.sumNetByHotelAndStatus(hotelId, PayoutStatus.PENDING);
        BigDecimal paid = payoutRepository.sumNetByHotelAndStatus(hotelId, PayoutStatus.PAID);
        long pendingCount = payoutRepository.countByHotel_IdAndStatus(hotelId, PayoutStatus.PENDING);
        long paidCount = payoutRepository.countByHotel_IdAndStatus(hotelId, PayoutStatus.PAID);
        return new PayoutSummaryDto(gross, commission, pending, paid, pendingCount, paidCount);
    }

    /** Every payout platform-wide, newest first - the admin payouts dashboard. Optionally narrowed to one status. */
    public List<Payout> getAllPayouts(PayoutStatus status) {
        assertAdmin();
        return status != null
                ? payoutRepository.findByStatusOrderByCreatedAtDesc(status)
                : payoutRepository.findAllByOrderByCreatedAtDesc();
    }

    /** Platform-wide totals: how much has moved through, how much commission the platform has earned, what's owed. */
    public PayoutSummaryDto getPlatformSummary() {
        assertAdmin();
        BigDecimal gross = payoutRepository.sumGrossAll();
        BigDecimal commission = payoutRepository.sumCommissionAll();
        BigDecimal pending = payoutRepository.sumNetAllByStatus(PayoutStatus.PENDING);
        BigDecimal paid = payoutRepository.sumNetAllByStatus(PayoutStatus.PAID);
        long pendingCount = payoutRepository.countByStatus(PayoutStatus.PENDING);
        long paidCount = payoutRepository.countByStatus(PayoutStatus.PAID);
        return new PayoutSummaryDto(gross, commission, pending, paid, pendingCount, paidCount);
    }

    /**
     * ADMIN records that the platform actually transferred a payout's net
     * amount to the hotel (e.g. after doing a real bank transfer) - this
     * doesn't move any money itself, it's the paper trail for a transfer
     * done outside the app, the same way Payment.createPayment simulates a
     * gateway rather than calling a real one.
     */
    public Payout markAsPaid(Long id, PayoutPaymentDto dto) {
        assertAdmin();
        Payout payout = payoutRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found with id: " + id));
        if (payout.getStatus() != PayoutStatus.PENDING) {
            throw new BadRequestException("Only a pending payout can be marked as paid");
        }
        payout.setStatus(PayoutStatus.PAID);
        payout.setPayoutMethod(dto.getPayoutMethod());
        payout.setTransactionReference(dto.getTransactionReference());
        payout.setPaidAt(LocalDateTime.now());
        return payoutRepository.save(payout);
    }

    private void assertCanViewHotelFinance(Long hotelId) {
        if (!currentUserProvider.isAdmin() && !currentUserProvider.canViewFinance(hotelId)) {
            throw new AccessDeniedException("You do not have access to this hotel's payouts");
        }
    }

    private void assertAdmin() {
        if (!currentUserProvider.isAdmin()) {
            throw new AccessDeniedException("Only platform admins can do this");
        }
    }
}
