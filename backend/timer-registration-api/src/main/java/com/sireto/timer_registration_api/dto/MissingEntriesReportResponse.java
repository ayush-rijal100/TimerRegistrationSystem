package com.sireto.timer_registration_api.dto;

// IMPORTS REQUIRED
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@AllArgsConstructor
public class MissingEntriesReportResponse {
    private Long userId;
    private String fullName;
    private List<LocalDate> missingDates;
}