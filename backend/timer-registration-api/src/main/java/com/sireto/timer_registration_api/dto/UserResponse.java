package com.sireto.timer_registration_api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;


//response when admin views users so does not include password or token
@Getter
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String role;
    private Boolean active;
}

