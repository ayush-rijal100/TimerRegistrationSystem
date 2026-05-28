package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.AssignUserProjectRequest;
import com.sireto.timer_registration_api.dto.AssignUserProjectResponse;
import com.sireto.timer_registration_api.dto.CreateProjectRequest;
import com.sireto.timer_registration_api.dto.CreateUserRequest;
import com.sireto.timer_registration_api.dto.CurrentUserResponse;
import com.sireto.timer_registration_api.dto.ProjectResponse;
import com.sireto.timer_registration_api.dto.UserProjectAssignmentResponse;
import com.sireto.timer_registration_api.dto.UserResponse;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.service.AdminService;
import com.sireto.timer_registration_api.service.ExternalIdentityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/bot/admin")
@RequiredArgsConstructor
public class BotAdminController {

    private final ExternalIdentityService externalIdentityService;
    private final AdminService adminService;

    @Value("${app.bot.service-token}")
    private String botServiceToken;

    @GetMapping("/users")
    public List<UserResponse> getAllUsers(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId
    ) {
        validateAdminBotRequest(providedToken, provider, providerUserId);
        return adminService.getAllUsers();
    }

    @PostMapping("/users")
    public UserResponse createUser(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @Valid @RequestBody CreateUserRequest request
    ) {
        validateAdminBotRequest(providedToken, provider, providerUserId);
        User adminUser = externalIdentityService.resolveUserEntity(provider, providerUserId);
        return adminService.createUserForBot(request, adminUser);
    }

    @GetMapping("/projects")
    public List<ProjectResponse> getAllProjects(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId
    ) {
        validateAdminBotRequest(providedToken, provider, providerUserId);
        return adminService.getAllProjects();
    }

    @PostMapping("/projects")
    public ProjectResponse createProject(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @Valid @RequestBody CreateProjectRequest request
    ) {
        validateAdminBotRequest(providedToken, provider, providerUserId);
        User adminUser = externalIdentityService.resolveUserEntity(provider, providerUserId);
        return adminService.createProjectForBot(request, adminUser);
    }

    @GetMapping("/user-projects")
    public List<UserProjectAssignmentResponse> getAllUserProjectAssignments(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId
    ) {
        validateAdminBotRequest(providedToken, provider, providerUserId);
        return adminService.getAllUserProjectAssignments();
    }

    @PostMapping("/user-projects")
    public AssignUserProjectResponse assignUserToProject(
            @RequestHeader("X-Bot-Service-Token") String providedToken,
            @RequestParam String provider,
            @RequestParam String providerUserId,
            @Valid @RequestBody AssignUserProjectRequest request
    ) {
        validateAdminBotRequest(providedToken, provider, providerUserId);
        User adminUser = externalIdentityService.resolveUserEntity(provider, providerUserId);
        return adminService.assignUserToProjectForBot(request, adminUser);
    }

    private void validateAdminBotRequest(String providedToken, String provider, String providerUserId) {
        if (!botServiceToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bot service token");
        }

        CurrentUserResponse user = externalIdentityService.resolveUser(provider, providerUserId);

        if (!"ADMIN".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role is required");
        }
    }
}


