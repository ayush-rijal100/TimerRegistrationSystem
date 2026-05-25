package com.sireto.timer_registration_api.service;

import com.sireto.timer_registration_api.dto.AssignUserProjectRequest;
import com.sireto.timer_registration_api.dto.AssignUserProjectResponse;
import com.sireto.timer_registration_api.dto.CreateProjectRequest;
import com.sireto.timer_registration_api.dto.CreateUserRequest;
import com.sireto.timer_registration_api.dto.ProjectResponse;
import com.sireto.timer_registration_api.dto.UserResponse;
import com.sireto.timer_registration_api.entity.Project;
import com.sireto.timer_registration_api.entity.Role;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.entity.UserProject;
import com.sireto.timer_registration_api.repository.ProjectRepository;
import com.sireto.timer_registration_api.repository.RoleRepository;
import com.sireto.timer_registration_api.repository.UserProjectRepository;
import com.sireto.timer_registration_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectRepository projectRepository;
    private final UserProjectRepository userProjectRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;
    private final com.sireto.timer_registration_api.repository.AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setIsActive(true);

        User saved = userRepository.save(user);

        auditLogService.log(
                currentUserService.getCurrentUser(),
                "CREATE_USER",
                "USER",
                saved.getId(),
                "{\"email\":\"" + saved.getEmail() + "\",\"role\":\"" + role.getName() + "\"}"
        );

        return toUserResponse(saved);
    }

    @Transactional
    public UserResponse updateUserStatus(Long userId, com.sireto.timer_registration_api.dto.UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getId().equals(currentUserService.getCurrentUser().getId())) {
            throw new RuntimeException("Admins cannot change their own active status");
        }

        user.setIsActive(request.getIsActive());
        User saved = userRepository.save(user);

        auditLogService.log(
                currentUserService.getCurrentUser(),
                "UPDATE_USER_STATUS",
                "USER",
                saved.getId(),
                "{\"isActive\":" + saved.getIsActive() + "}"
        );

        return toUserResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll()
                .stream()
                .map(this::toProjectResponse)
                .toList();
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request) {
        if (projectRepository.existsByProjectCode(request.getProjectCode())) {
            throw new RuntimeException("Project code already exists");
        }

        Project project = new Project();
        project.setProjectCode(request.getProjectCode());
        project.setProjectName(request.getProjectName());
        project.setIsActive(true);

        Project saved = projectRepository.save(project);

        auditLogService.log(
                currentUserService.getCurrentUser(),
                "CREATE_PROJECT",
                "PROJECT",
                saved.getId(),
                "{\"projectCode\":\"" + saved.getProjectCode() + "\"}"
        );

        return toProjectResponse(saved);
    }

    @Transactional
    public AssignUserProjectResponse assignUserToProject(AssignUserProjectRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (userProjectRepository.existsByUser_IdAndProject_Id(user.getId(), project.getId())) {
            throw new RuntimeException("User is already assigned to project");
        }

        UserProject userProject = new UserProject();
        userProject.setUser(user);
        userProject.setProject(project);

        userProjectRepository.save(userProject);

        auditLogService.log(
                currentUserService.getCurrentUser(),
                "ASSIGN_USER_PROJECT",
                "USER_PROJECT",
                user.getId(),
                "{\"userId\":" + user.getId() + ",\"projectId\":" + project.getId() + "}"
        );

        return new AssignUserProjectResponse(
                user.getId(),
                project.getId(),
                "User assigned to project successfully"
        );
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().getName(),
                user.getIsActive()
        );
    }

    @Transactional(readOnly = true)
    public List<com.sireto.timer_registration_api.dto.AuditLogResponse> getRecentAuditLogs(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        List<com.sireto.timer_registration_api.entity.AuditLog> logs;
        if (startDate != null && endDate != null) {
            java.time.LocalDateTime start = startDate.atStartOfDay();
            java.time.LocalDateTime end = endDate.plusDays(1).atStartOfDay();
            logs = auditLogRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        } else {
            logs = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        }
        return logs.stream()
                .map(log -> new com.sireto.timer_registration_api.dto.AuditLogResponse(
                        log.getId(),
                        log.getActorUser().getFullName(),
                        log.getActorUser().getEmail(),
                        log.getAction(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getMetaJson(),
                        log.getCreatedAt()
                ))
                .toList();
    }

    private ProjectResponse toProjectResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getProjectCode(),
                project.getProjectName(),
                project.getIsActive()
        );
    }
}
