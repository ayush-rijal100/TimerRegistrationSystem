package com.sireto.timer_registration_api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_external_identity_links",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_external_identity_provider_user", columnNames = {"provider", "provider_user_id"}),
                @UniqueConstraint(name = "uk_external_identity_user_provider", columnNames = {"user_id", "provider"})
        }
)
@Getter
@Setter
public class UserExternalIdentityLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 40)
    private String provider;

    @Column(name = "provider_user_id", nullable = false, length = 120)
    private String providerUserId;

    @Column(name = "provider_username", length = 120)
    private String providerUsername;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "linked_at", nullable = false)
    private LocalDateTime linkedAt;

    @PrePersist
    public void onCreate() {
        if (this.linkedAt == null) {
            this.linkedAt = LocalDateTime.now();
        }
    }
}