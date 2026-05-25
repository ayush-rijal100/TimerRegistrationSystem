package com.sireto.timer_registration_api.repository;

import com.sireto.timer_registration_api.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import com.sireto.timer_registration_api.dto.ProjectHoursReportResponse;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {
    List<TimeEntry> findByUser_IdAndEntryDateBetween(Long userId, LocalDate startDate, LocalDate endDate);

    boolean existsByUser_IdAndProject_IdAndEntryDate(Long userId, Long projectId, LocalDate entryDate);

    @Query("""
                SELECT new com.sireto.timer_registration_api.dto.ProjectHoursReportResponse(
                    p.id,
                    p.projectCode,
                    p.projectName,
                    COALESCE(SUM(t.hours), 0)
                )
                FROM TimeEntry t
                JOIN t.project p
                WHERE t.entryDate BETWEEN :startDate AND :endDate
                GROUP BY p.id, p.projectCode, p.projectName
                ORDER BY p.projectCode
            """)
    List<ProjectHoursReportResponse> getProjectHoursReport(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);


@Query("""
    SELECT u.id, u.fullName, COALESCE(SUM(t.hours), 0)
    FROM TimeEntry t
    JOIN t.user u
    WHERE t.entryDate BETWEEN :startDate AND :endDate
    GROUP BY u.id, u.fullName
    ORDER BY u.fullName
""")
List<Object[]> getUtilizationBaseReport(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
);

        }