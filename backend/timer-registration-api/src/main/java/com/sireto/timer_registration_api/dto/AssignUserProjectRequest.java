package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignUserProjectRequest {

    @NotNull
    @Positive
    private Long userId;

    @NotNull
    @Positive
    private Long projectId;
}
