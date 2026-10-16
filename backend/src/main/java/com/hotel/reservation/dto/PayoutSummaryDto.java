package com.hotel.reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Aggregate financial totals - either for one hotel
 * (GET /api/payouts/hotel/{id}/summary) or platform-wide
 * (GET /api/payouts/summary, ADMIN only).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayoutSummaryDto {
    // Total of every guest payment this covers.
    private BigDecimal totalGross;
    // The platform's commission revenue across all of it.
    private BigDecimal totalCommission;
    // Still owed to the hotel(s) - not transferred yet.
    private BigDecimal totalNetPending;
    // Already transferred.
    private BigDecimal totalNetPaid;
    private long pendingCount;
    private long paidCount;
}
