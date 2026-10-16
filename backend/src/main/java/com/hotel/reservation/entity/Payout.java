package com.hotel.reservation.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * The platform's side of the money as a payment intermediary: for every
 * guest {@link Payment}, exactly one Payout tracks what's owed to the
 * hotel (the payment amount minus the platform's commission) and whether
 * it's been transferred yet.
 *
 * commissionRate/commissionAmount/netAmount are all snapshotted at creation
 * time (see PayoutService.createForPayment) from the hotel's commission
 * rate *at that moment* - if an ADMIN changes a hotel's rate later, every
 * payout already on the books keeps the rate it was actually charged under.
 */
@Entity
@Table(name = "payouts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "rooms", "images"})
    private Hotel hotel;

    // One payout per payment - the guest paid once, the platform owes the
    // hotel once for it.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Payment payment;

    // What the guest paid.
    @Column(name = "gross_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal grossAmount;

    // The rate actually applied to this payout (percentage, e.g. 15.00 = 15%).
    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate;

    // grossAmount * commissionRate / 100 - the platform's revenue on this booking.
    @Column(name = "commission_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal commissionAmount;

    // grossAmount - commissionAmount - what actually gets transferred to the hotel.
    @Column(name = "net_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal netAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayoutStatus status = PayoutStatus.PENDING;

    // Set together when an ADMIN marks this payout PAID (PayoutService.markAsPaid).
    @Enumerated(EnumType.STRING)
    @Column(name = "payout_method")
    private PayoutMethod payoutMethod;

    @Column(name = "transaction_reference")
    private String transactionReference;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = PayoutStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
