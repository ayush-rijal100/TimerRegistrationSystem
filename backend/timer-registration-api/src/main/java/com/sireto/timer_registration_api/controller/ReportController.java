package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.MissingEntriesReportResponse;
import com.sireto.timer_registration_api.dto.ProjectHoursReportResponse;
import com.sireto.timer_registration_api.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import com.sireto.timer_registration_api.dto.UtilizationReportResponse;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/project-hours")
    public List<ProjectHoursReportResponse> getProjectHoursReport(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return reportService.getProjectHoursReport(startDate, endDate);
    }

    @GetMapping("/utilization")
    public List<UtilizationReportResponse> getUtilizationReport(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return reportService.getUtilizationReport(startDate, endDate);
    }

    @GetMapping("/missing-entries")
    public List<MissingEntriesReportResponse> getMissingEntriesReport(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return reportService.getMissingEntriesReport(startDate, endDate);
    }

}