package com.sireto.timer_registration_api.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        String actorName,
        String actorEmail,
        String action,
        String entityType,
        Long entityId,
        String metaJson,
        LocalDateTime createdAt
) {
}
