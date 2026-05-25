package com.sireto.timer_registration_api.dto;

// IMPORTS REQUIRED
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class ProjectHoursReportResponse {
    private Long projectId;
    private String projectCode;
    private String projectName;
    private BigDecimal totalHours;
}