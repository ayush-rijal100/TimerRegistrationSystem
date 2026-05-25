package com.sireto.timer_registration_api.dto;

// IMPORTS REQUIRED
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class TimeEntryResponse {
    private Long id;
    private Long projectId;
    private String projectCode;
    private String projectName;
    private LocalDate entryDate;
    private BigDecimal hours;
    private String notes;
    private String status;
}