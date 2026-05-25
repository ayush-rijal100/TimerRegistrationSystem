package com.sireto.timer_registration_api.repository;

import com.sireto.timer_registration_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByIsActiveTrueAndRole_Name(String roleName);
    boolean existsByEmail(String email);
}
