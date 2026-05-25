package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignUserProjectRequest {

    @NotNull
    private Long userId;

    @NotNull
    private Long projectId;
}
