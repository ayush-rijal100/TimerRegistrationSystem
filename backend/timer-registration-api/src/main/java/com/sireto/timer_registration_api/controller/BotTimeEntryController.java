package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.TimeEntryRequest;
import com.sireto.timer_registration_api.dto.TimeEntryResponse;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.service.ExternalIdentityService;
import com.sireto.timer_registration_api.service.TimeEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bot/time-entries")
@RequiredArgsConstructor
public class BotTimeEntryController {

    private final ExternalIdentityService externalIdentityService;
    private final TimeEntryService timeEntryService;

    @Value("${app.bot.service-token}")
    private String botServiceToken;

    @GetMapping("/my")
    public List<TimeEntryResponse> myTimeEntries(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        User user = externalIdentityService.resolveUserEntity(provider, providerUserId);

        return timeEntryService.getTimeEntriesForUser(user, startDate, endDate);
    }

    @PostMapping("/my")
    public TimeEntryResponse createMyTimeEntry(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @Valid @RequestBody TimeEntryRequest request
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        User user = externalIdentityService.resolveUserEntity(provider, providerUserId);

        return timeEntryService.createTimeEntryForUser(user, request);
    }

    @PutMapping("/my/{id}")
    public TimeEntryResponse updateMyTimeEntry(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @PathVariable Long id,
            @Valid @RequestBody TimeEntryRequest request
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        User user = externalIdentityService.resolveUserEntity(provider, providerUserId);

        return timeEntryService.updateTimeEntryForUser(user, id, request);
    }

    @PatchMapping("/my/{id}/cancel")
    public TimeEntryResponse cancelMyTimeEntry(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @PathVariable Long id
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        User user = externalIdentityService.resolveUserEntity(provider, providerUserId);

        return timeEntryService.cancelTimeEntryForUser(user, id);
    }
}
