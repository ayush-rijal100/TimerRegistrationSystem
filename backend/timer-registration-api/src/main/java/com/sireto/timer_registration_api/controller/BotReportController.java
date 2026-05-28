package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.CurrentUserResponse;
import com.sireto.timer_registration_api.dto.MissingEntriesReportResponse;
import com.sireto.timer_registration_api.dto.UtilizationReportResponse;
import com.sireto.timer_registration_api.service.ExternalIdentityService;
import com.sireto.timer_registration_api.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bot/reports")
@RequiredArgsConstructor
public class BotReportController {

    private final ExternalIdentityService externalIdentityService;
    private final ReportService reportService;

    @Value("${app.bot.service-token}")
    private String botServiceToken;

    @GetMapping("/utilization")
    public List<UtilizationReportResponse> utilizationReport(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        CurrentUserResponse user = externalIdentityService.resolveUser(provider, providerUserId);
        String role = user.getRole();

        if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager or admin role is required");
        }

        return reportService.getUtilizationReport(startDate, endDate);
    }

    @GetMapping("/missing-entries")
    public List<MissingEntriesReportResponse> missingEntriesReport(
        @RequestHeader("X-Bot-Service-Token") String providedToken,
        @RequestParam String provider,
        @RequestParam String providerUserId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
) {
    if (!botServiceToken.equals(providedToken)) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
    }

    CurrentUserResponse user = externalIdentityService.resolveUser(provider, providerUserId);
    String role = user.getRole();

    if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager or admin role is required");
    }

    return reportService.getMissingEntriesReport(startDate, endDate);
}

}
