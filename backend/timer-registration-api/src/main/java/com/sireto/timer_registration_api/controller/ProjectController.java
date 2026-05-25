package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.ProjectResponse;
import com.sireto.timer_registration_api.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("/my")
    public List<ProjectResponse> getMyProjects() {
        return projectService.getMyProjects();
    }

    @GetMapping
    public List<ProjectResponse> getAllProjects() {
        return projectService.getAllProjects();
    }
}