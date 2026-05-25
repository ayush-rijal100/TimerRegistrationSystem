package com.sireto.timer_registration_api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AssignUserProjectResponse {
    private Long userId;
    private Long projectId;
    private String message;
}
