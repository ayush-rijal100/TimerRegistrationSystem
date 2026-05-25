package com.sireto.timer_registration_api.controller;

import com.sireto.timer_registration_api.dto.LoginRequest;
import com.sireto.timer_registration_api.dto.LoginResponse;
import com.sireto.timer_registration_api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}