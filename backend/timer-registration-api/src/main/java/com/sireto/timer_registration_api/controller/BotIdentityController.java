package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.CurrentUserResponse;
import com.sireto.timer_registration_api.service.ExternalIdentityService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bot/identity")
@RequiredArgsConstructor
public class BotIdentityController {

    private final ExternalIdentityService externalIdentityService;

    @Value("${app.bot.service-token}")
    private String botServiceToken;

    @GetMapping("/resolve")
    public CurrentUserResponse resolve(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        return externalIdentityService.resolveUser(provider, providerUserId);
    }
}