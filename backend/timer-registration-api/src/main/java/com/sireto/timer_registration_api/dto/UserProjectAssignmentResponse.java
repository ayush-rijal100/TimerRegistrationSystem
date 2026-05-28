package com.sireto.timer_registration_api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserProjectAssignmentResponse {
    private Long userId;
    private String fullName;
    private String email;
    private String role;
    private Long projectId;
    private String projectCode;
    private String projectName;
    private Boolean projectActive;
}
