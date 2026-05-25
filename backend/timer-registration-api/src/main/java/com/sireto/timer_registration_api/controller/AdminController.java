package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.AssignUserProjectRequest;
import com.sireto.timer_registration_api.dto.AssignUserProjectResponse;
import com.sireto.timer_registration_api.dto.CreateProjectRequest;
import com.sireto.timer_registration_api.dto.CreateUserRequest;
import com.sireto.timer_registration_api.dto.ProjectResponse;
import com.sireto.timer_registration_api.dto.UserResponse;
import com.sireto.timer_registration_api.dto.AuditLogResponse;
import com.sireto.timer_registration_api.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public List<UserResponse> getAllUsers() {
        return adminService.getAllUsers();
    }

    @PostMapping("/users")
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return adminService.createUser(request);
    }

    @org.springframework.web.bind.annotation.PutMapping("/users/{id}/status")
    public UserResponse updateUserStatus(
            @org.springframework.web.bind.annotation.PathVariable Long id,
            @Valid @RequestBody com.sireto.timer_registration_api.dto.UpdateUserStatusRequest request) {
        return adminService.updateUserStatus(id, request);
    }

    @GetMapping("/projects")
    public List<ProjectResponse> getAllProjects() {
        return adminService.getAllProjects();
    }

    @PostMapping("/projects")
    public ProjectResponse createProject(@Valid @RequestBody CreateProjectRequest request) {
        return adminService.createProject(request);
    }

    @PostMapping("/user-projects")
    public AssignUserProjectResponse assignUserToProject(@Valid @RequestBody AssignUserProjectRequest request) {
        return adminService.assignUserToProject(request);
    }

    @GetMapping("/audit-logs")
    public List<AuditLogResponse> getRecentAuditLogs(
            @org.springframework.web.bind.annotation.RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @org.springframework.web.bind.annotation.RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        return adminService.getRecentAuditLogs(startDate, endDate);
    }
}
