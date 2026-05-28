package com.sireto.timer_registration_api.repository;

import com.sireto.timer_registration_api.entity.UserExternalIdentityLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserExternalIdentityLinkRepository extends JpaRepository<UserExternalIdentityLink, Long> {
    Optional<UserExternalIdentityLink> findByProviderAndProviderUserIdAndIsActiveTrue(String provider, String providerUserId);
}