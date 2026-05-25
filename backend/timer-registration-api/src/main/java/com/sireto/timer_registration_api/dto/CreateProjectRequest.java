package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateProjectRequest {

    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "[A-Za-z0-9\\-_.]+", message = "projectCode can only contain letters, numbers, dash, underscore, or dot")
    private String projectCode;

    @NotBlank
    @Size(min = 2, max = 120)
    private String projectName;
}
