package com.hotel.reservation.repository;

import com.hotel.reservation.entity.Payout;
import com.hotel.reservation.entity.PayoutStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PayoutRepository extends JpaRepository<Payout, Long> {

    List<Payout> findByHotel_IdOrderByCreatedAtDesc(Long hotelId);

    List<Payout> findAllByOrderByCreatedAtDesc();

    List<Payout> findByStatusOrderByCreatedAtDesc(PayoutStatus status);

    Optional<Payout> findByPayment_Id(Long paymentId);

    long countByHotel_IdAndStatus(Long hotelId, PayoutStatus status);

    long countByStatus(PayoutStatus status);

    // Gross/commission totals exclude CANCELLED payouts (a payout is
    // cancelled when its Payment was refunded - see
    // PayoutService.cancelForPayment - so that money was never actually
    // collected/earned and must not inflate GMV or commission). This keeps
    // these totals consistent with pendingCount/paidCount above, which
    // already only ever count PENDING or PAID payouts.
    @Query("SELECT COALESCE(SUM(p.grossAmount), 0) FROM Payout p WHERE p.hotel.id = :hotelId AND p.status <> com.hotel.reservation.entity.PayoutStatus.CANCELLED")
    BigDecimal sumGrossByHotel(@Param("hotelId") Long hotelId);

    @Query("SELECT COALESCE(SUM(p.commissionAmount), 0) FROM Payout p WHERE p.hotel.id = :hotelId AND p.status <> com.hotel.reservation.entity.PayoutStatus.CANCELLED")
    BigDecimal sumCommissionByHotel(@Param("hotelId") Long hotelId);

    @Query("SELECT COALESCE(SUM(p.netAmount), 0) FROM Payout p WHERE p.hotel.id = :hotelId AND p.status = :status")
    BigDecimal sumNetByHotelAndStatus(@Param("hotelId") Long hotelId, @Param("status") PayoutStatus status);

    @Query("SELECT COALESCE(SUM(p.grossAmount), 0) FROM Payout p WHERE p.status <> com.hotel.reservation.entity.PayoutStatus.CANCELLED")
    BigDecimal sumGrossAll();

    @Query("SELECT COALESCE(SUM(p.commissionAmount), 0) FROM Payout p WHERE p.status <> com.hotel.reservation.entity.PayoutStatus.CANCELLED")
    BigDecimal sumCommissionAll();

    @Query("SELECT COALESCE(SUM(p.netAmount), 0) FROM Payout p WHERE p.status = :status")
    BigDecimal sumNetAllByStatus(@Param("status") PayoutStatus status);
}
