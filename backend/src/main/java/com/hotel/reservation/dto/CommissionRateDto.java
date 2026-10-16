package com.hotel.reservation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Used both ways on /api/hotels/{id}/commission-rate: the GET response and the PATCH request body. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommissionRateDto {

    @NotNull(message = "commissionRate is required")
    @DecimalMin(value = "0", message = "commissionRate cannot be negative")
    @DecimalMax(value = "100", message = "commissionRate cannot exceed 100")
    private BigDecimal commissionRate;
}
