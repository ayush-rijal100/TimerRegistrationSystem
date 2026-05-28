package com.sireto.timer_registration_api.repository;

import com.sireto.timer_registration_api.entity.UserProject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserProjectRepository extends JpaRepository<UserProject, Long> {
    boolean existsByUser_IdAndProject_Id(Long userId, Long projectId);
    List<UserProject> findByUser_Id(Long userId);
    List<UserProject> findAllByOrderByUser_FullNameAscProject_ProjectCodeAsc();
} 