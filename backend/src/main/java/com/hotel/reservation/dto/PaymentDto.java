package com.hotel.reservation.dto;

import com.hotel.reservation.entity.PaymentMethod;
import com.hotel.reservation.entity.PaymentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentDto {
    @NotNull(message = "reservationId is required")
    private Long reservationId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    private PaymentStatus paymentStatus;
    private String transactionId;

    // Only used when paymentStatus is set to REFUNDED via PUT /api/payments/{id} -
    // forwarded as the audit reason on the reservation it cancels (see
    // PaymentService.updatePayment / ReservationService.cancelReservation).
    // The primary refund/cancel entry point is POST /api/reservations/{id}/cancel;
    // this exists so refunding straight from a Payment record stays consistent.
    private String cancelReason;
}
