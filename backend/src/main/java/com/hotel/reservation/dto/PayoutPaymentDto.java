package com.hotel.reservation.dto;

import com.hotel.reservation.entity.PayoutMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Request body for POST /api/payouts/{id}/pay - recording that the platform actually sent the money. */
@Data
public class PayoutPaymentDto {

    @NotNull(message = "payoutMethod is required")
    private PayoutMethod payoutMethod;

    @NotBlank(message = "transactionReference is required")
    private String transactionReference;
}
