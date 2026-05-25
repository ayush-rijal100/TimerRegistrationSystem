package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class TimeEntryRequest {

    @NotNull
    private Long projectId;

    @NotNull
    private LocalDate entryDate;

    @NotNull
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "24.00")
    private BigDecimal hours;

    private String notes;
}