package com.sireto.timer_registration_api.service;

import com.sireto.timer_registration_api.dto.LoginRequest;
import com.sireto.timer_registration_api.dto.LoginResponse;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("User account is inactive");
        }

        boolean passwordMatches = passwordEncoder.matches(
            request.getPassword(),
            user.getPasswordHash()
        );

        if (!passwordMatches) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);

        return new LoginResponse(
            token,
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole().getName(),
            "Login successful"
        );
    }
}