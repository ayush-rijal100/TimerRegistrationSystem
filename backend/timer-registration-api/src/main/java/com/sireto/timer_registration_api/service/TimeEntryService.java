package com.sireto.timer_registration_api.service;

import com.sireto.timer_registration_api.dto.TimeEntryRequest;
import com.sireto.timer_registration_api.dto.TimeEntryResponse;
import com.sireto.timer_registration_api.entity.Project;
import com.sireto.timer_registration_api.entity.TimeEntry;
import com.sireto.timer_registration_api.entity.User;
import com.sireto.timer_registration_api.repository.ProjectRepository;
import com.sireto.timer_registration_api.repository.TimeEntryRepository;
import com.sireto.timer_registration_api.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimeEntryService {

    private final TimeEntryRepository timeEntryRepository;
    private final ProjectRepository projectRepository;
    private final UserProjectRepository userProjectRepository;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    @Transactional
    public TimeEntryResponse createTimeEntry(TimeEntryRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        return createTimeEntryForUser(currentUser, request);
    }

    @Transactional
    public TimeEntryResponse createTimeEntryForUser(User currentUser, TimeEntryRequest request) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!Boolean.TRUE.equals(project.getIsActive())) {
            throw new RuntimeException("Project is inactive");
        }

        boolean assigned = userProjectRepository.existsByUser_IdAndProject_Id(
                currentUser.getId(),
                project.getId());

        if (!assigned) {
            throw new RuntimeException("User is not assigned to selected project");
        }

        boolean duplicate = timeEntryRepository.existsByUser_IdAndProject_IdAndEntryDate(
                currentUser.getId(),
                project.getId(),
                request.getEntryDate());

        if (duplicate) {
            throw new RuntimeException("Duplicate time entry for same user, project, and date is not allowed");
        }

        TimeEntry timeEntry = new TimeEntry();
        timeEntry.setUser(currentUser);
        timeEntry.setProject(project);
        timeEntry.setEntryDate(request.getEntryDate());
        timeEntry.setHours(request.getHours());
        timeEntry.setNotes(request.getNotes());
        timeEntry.setStatus("SUBMITTED");

        TimeEntry saved = timeEntryRepository.save(timeEntry);

        String metaJson = "{\"projectId\":" + project.getId()
                + ",\"entryDate\":\"" + request.getEntryDate()
                + "\",\"hours\":" + request.getHours()
                + "}";

        auditLogService.log(
                currentUser,
                "CREATE_TIME_ENTRY",
                "TIME_ENTRY",
                saved.getId(),
                metaJson);

        return toResponse(saved);
    }

    private TimeEntryResponse toResponse(TimeEntry timeEntry) {
        Project project = timeEntry.getProject();

        return new TimeEntryResponse(
                timeEntry.getId(),
                project.getId(),
                project.getProjectCode(),
                project.getProjectName(),
                timeEntry.getEntryDate(),
                timeEntry.getHours(),
                timeEntry.getNotes(),
                timeEntry.getStatus());
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getMyTimeEntries(LocalDate startDate, LocalDate endDate) {
        User currentUser = currentUserService.getCurrentUser();

        return getTimeEntriesForUser(currentUser, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getTimeEntriesForUser(User user, LocalDate startDate, LocalDate endDate) {
        return timeEntryRepository.findByUser_IdAndEntryDateBetween(
                user.getId(),
                startDate,
                endDate)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TimeEntryResponse updateTimeEntry(Long id, TimeEntryRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        return updateTimeEntryForUser(currentUser, id, request);
    }

    @Transactional
    public TimeEntryResponse updateTimeEntryForUser(User currentUser, Long id, TimeEntryRequest request) {
        TimeEntry timeEntry = timeEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Time entry not found"));

        if (!timeEntry.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("User can update only own time entry");
        }

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!Boolean.TRUE.equals(project.getIsActive())) {
            throw new RuntimeException("Project is inactive");
        }

        boolean assigned = userProjectRepository.existsByUser_IdAndProject_Id(
                currentUser.getId(),
                project.getId());

        if (!assigned) {
            throw new RuntimeException("User is not assigned to selected project");
        }

        boolean changingUniqueFields = !timeEntry.getProject().getId().equals(project.getId())
                || !timeEntry.getEntryDate().equals(request.getEntryDate());

        if (changingUniqueFields) {
            boolean duplicate = timeEntryRepository.existsByUser_IdAndProject_IdAndEntryDate(
                    currentUser.getId(),
                    project.getId(),
                    request.getEntryDate());

            if (duplicate) {
                throw new RuntimeException("Duplicate time entry for same user, project, and date is not allowed");
            }
        }

        timeEntry.setProject(project);
        timeEntry.setEntryDate(request.getEntryDate());
        timeEntry.setHours(request.getHours());
        timeEntry.setNotes(request.getNotes());

        TimeEntry saved = timeEntryRepository.save(timeEntry);

        String metaJson = "{\"projectId\":" + project.getId()
                + ",\"entryDate\":\"" + request.getEntryDate()
                + "\",\"hours\":" + request.getHours()
                + "}";

        auditLogService.log(
                currentUser,
                "UPDATE_TIME_ENTRY",
                "TIME_ENTRY",
                saved.getId(),
                metaJson);

        return toResponse(saved);
    }


    @Transactional
    public TimeEntryResponse cancelTimeEntryForUser(User currentUser, Long id) {
        TimeEntry timeEntry = timeEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Time entry not found"));

        if (!timeEntry.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("User can cancel only own time entry");
        }

        if ("CANCELLED".equals(timeEntry.getStatus())) {
            throw new RuntimeException("Time entry is already cancelled");
        }

        timeEntry.setStatus("CANCELLED");

        TimeEntry saved = timeEntryRepository.save(timeEntry);

        String metaJson = "{\"timeEntryId\":" + saved.getId()
                + ",\"status\":\"CANCELLED\"}";

        auditLogService.log(
                currentUser,
                "CANCEL_TIME_ENTRY",
                "TIME_ENTRY",
                saved.getId(),
                metaJson);

        return toResponse(saved);
    }
}
