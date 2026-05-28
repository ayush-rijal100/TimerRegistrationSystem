package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.ProjectResponse;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.service.ExternalIdentityService;
import com.sireto.timer_registration_api.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/bot/projects")
@RequiredArgsConstructor
public class BotProjectController {

    private final ExternalIdentityService externalIdentityService;
    private final ProjectService projectService;

    @Value("${app.bot.service-token}")
    private String botServiceToken;

    @GetMapping("/my")
    public List<ProjectResponse> myProjects(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId
    ) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        User user = externalIdentityService.resolveUserEntity(provider, providerUserId);

        return projectService.getProjectsForUser(user);
    }
}