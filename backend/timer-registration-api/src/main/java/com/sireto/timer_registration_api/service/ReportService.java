package com.sireto.timer_registration_api.service;

import com.sireto.timer_registration_api.dto.ProjectHoursReportResponse;
import com.sireto.timer_registration_api.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import com.sireto.timer_registration_api.dto.UtilizationReportResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;

import com.sireto.timer_registration_api.dto.MissingEntriesReportResponse;
import com.sireto.timer_registration_api.entity.TimeEntry;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.repository.UserRepository;

import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;


@Service
@RequiredArgsConstructor
public class ReportService {

    private final TimeEntryRepository timeEntryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ProjectHoursReportResponse> getProjectHoursReport(
            LocalDate startDate,
            LocalDate endDate) {
        return timeEntryRepository.getProjectHoursReport(startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<UtilizationReportResponse> getUtilizationReport(
            LocalDate startDate,
            LocalDate endDate) {
        BigDecimal expectedHours = BigDecimal.valueOf(countWeekdays(startDate, endDate) * 8L);

        return timeEntryRepository.getUtilizationBaseReport(startDate, endDate)
                .stream()
                .map(row -> {
                    Long userId = (Long) row[0];
                    String fullName = (String) row[1];
                    BigDecimal totalHours = (BigDecimal) row[2];

                    BigDecimal utilizationPercent = BigDecimal.ZERO;

                    if (expectedHours.compareTo(BigDecimal.ZERO) > 0) {
                        utilizationPercent = totalHours
                                .multiply(BigDecimal.valueOf(100))
                                .divide(expectedHours, 2, RoundingMode.HALF_UP);
                    }

                    return new UtilizationReportResponse(
                            userId,
                            fullName,
                            totalHours,
                            expectedHours,
                            utilizationPercent);
                })
                .toList();
    }

    private long countWeekdays(LocalDate startDate, LocalDate endDate) {
        long count = 0;
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            DayOfWeek day = current.getDayOfWeek();

            if (day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY) {
                count++;
            }

            current = current.plusDays(1);
        }

        return count;
    }
    @Transactional(readOnly = true)
public List<MissingEntriesReportResponse> getMissingEntriesReport(
        LocalDate startDate,
        LocalDate endDate
) {
    List<User> employees = userRepository.findByIsActiveTrueAndRole_Name("EMPLOYEE");
    List<MissingEntriesReportResponse> report = new ArrayList<>();

    for (User employee : employees) {
        List<TimeEntry> entries = timeEntryRepository.findByUser_IdAndEntryDateBetween(
                employee.getId(),
                startDate,
                endDate
        );

        Set<LocalDate> submittedDates = new HashSet<>();

        for (TimeEntry entry : entries) {
            submittedDates.add(entry.getEntryDate());
        }

        List<LocalDate> missingDates = new ArrayList<>();
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            DayOfWeek day = current.getDayOfWeek();

            if (day != DayOfWeek.SATURDAY
                    && day != DayOfWeek.SUNDAY
                    && !submittedDates.contains(current)) {
                missingDates.add(current);
            }

            current = current.plusDays(1);
        }

        if (!missingDates.isEmpty()) {
            report.add(new MissingEntriesReportResponse(
                    employee.getId(),
                    employee.getFullName(),
                    missingDates
            ));
        }
    }

    return report;
}

}