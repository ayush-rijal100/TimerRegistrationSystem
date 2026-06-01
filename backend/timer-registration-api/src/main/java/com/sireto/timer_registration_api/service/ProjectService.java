package com.sireto.timer_registration_api.service;

import com.sireto.timer_registration_api.dto.ProjectResponse;
import com.sireto.timer_registration_api.entity.Project;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.entity.UserProject;
import com.sireto.timer_registration_api.repository.ProjectRepository;
import com.sireto.timer_registration_api.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserProjectRepository userProjectRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<ProjectResponse> getMyProjects() {
        User currentUser = currentUserService.getCurrentUser();

        List<UserProject> mappings = userProjectRepository.findByUser_Id(currentUser.getId());

        return mappings.stream()
                .map(UserProject::getProject)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getProjectCode(),
                project.getProjectName(),
                project.getIsActive(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }

@Transactional(readOnly = true)
public List<ProjectResponse> getProjectsForUser(User user) {
    return userProjectRepository.findByUser_Id(user.getId())
            .stream()
            .map(userProject -> {
                Project project = userProject.getProject();

                return new ProjectResponse(
                        project.getId(),
                        project.getProjectCode(),
                        project.getProjectName(),
                        project.getIsActive(),
                        project.getCreatedAt(),
                        project.getUpdatedAt()
                );
            })
            .toList();
}

}
