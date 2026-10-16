package com.hotel.reservation.entity;

public enum PayoutStatus {
    // Money is owed to the hotel but hasn't been transferred yet.
    PENDING,
    // The platform has transferred the net amount to the hotel (see
    // Payout.payoutMethod/transactionReference/paidAt).
    PAID,
    // The underlying Payment was refunded before this payout was ever
    // transferred, so nothing is owed after all - see
    // PayoutService.cancelForPayment.
    CANCELLED
}
