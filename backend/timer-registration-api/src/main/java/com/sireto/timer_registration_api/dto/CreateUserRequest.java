package com.sireto.timer_registration_api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;


//for the admin to create a user
@Getter
@Setter
public class CreateUserRequest {

    @NotBlank
    @Size(min = 2, max = 100)
    private String fullName;

    @Email
    @NotBlank
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @NotBlank
    @Pattern(regexp = "EMPLOYEE|MANAGER|ADMIN", message = "role must be one of EMPLOYEE, MANAGER, ADMIN")
    private String role;
}
