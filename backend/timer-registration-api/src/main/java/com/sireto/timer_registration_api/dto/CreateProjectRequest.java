package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateProjectRequest {

    @NotBlank
    private String projectCode;

    @NotBlank
    private String projectName;
}
