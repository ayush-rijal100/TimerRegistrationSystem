package com.sireto.timer_registration_api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class UtilizationReportResponse {
    private Long userId;
    private String fullName;
    private BigDecimal totalHours;
    private BigDecimal expectedHours;
    private BigDecimal utilizationPercent;
}