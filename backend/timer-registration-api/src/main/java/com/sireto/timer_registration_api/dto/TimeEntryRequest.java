package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class TimeEntryRequest {

    @NotNull
    @Positive
    private Long projectId;

    @NotNull
    private LocalDate entryDate;

    @NotNull
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "24.00")
    private BigDecimal hours;

    @Size(max = 500)
    private String notes;
}
