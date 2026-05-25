package com.sireto.timer_registration_api.service;

// IMPORTS REQUIRED
import com.sireto.timer_registration_api.entity.AuditLog;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(User actorUser, String action, String entityType, Long entityId, String metaJson) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActorUser(actorUser);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setMetaJson(metaJson);

        auditLogRepository.save(auditLog);
    }
}