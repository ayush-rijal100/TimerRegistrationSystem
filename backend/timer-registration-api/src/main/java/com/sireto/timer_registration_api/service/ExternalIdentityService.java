package com.sireto.timer_registration_api.service;

import com.sireto.timer_registration_api.dto.CurrentUserResponse;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.entity.UserExternalIdentityLink;
import com.sireto.timer_registration_api.repository.UserExternalIdentityLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ExternalIdentityService {

    private final UserExternalIdentityLinkRepository externalIdentityLinkRepository;

    @Transactional(readOnly = true)
    public User resolveUserEntity(String provider, String providerUserId) {
        String normalizedProvider = provider.trim().toUpperCase();

        UserExternalIdentityLink link = externalIdentityLinkRepository
                .findByProviderAndProviderUserIdAndIsActiveTrue(normalizedProvider, providerUserId.trim())
                .orElseThrow(() -> new RuntimeException("No active TRS user mapping found for this external identity"));

        User user = link.getUser();

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("Mapped TRS user is inactive");
        }

        return user;
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse resolveUser(String provider, String providerUserId) {
        User user = resolveUserEntity(provider, providerUserId);

        return new CurrentUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().getName()
        );
    }
}