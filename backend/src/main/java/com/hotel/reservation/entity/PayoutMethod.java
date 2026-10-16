package com.hotel.reservation.entity;

// How the platform actually moved the net amount to the hotel. Separate
// from PaymentMethod (which is how the *guest* paid the platform) - the two
// legs of the money flow can use completely different rails.
public enum PayoutMethod {
    BANK_TRANSFER,
    PROMPTPAY,
    CHEQUE,
    OTHER
}
