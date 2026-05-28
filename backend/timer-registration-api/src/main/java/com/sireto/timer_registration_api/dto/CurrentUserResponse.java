package com.sireto.timer_registration_api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CurrentUserResponse {

    private Long userId;
    private String fullName;
    private String email;
    private String role;
}
