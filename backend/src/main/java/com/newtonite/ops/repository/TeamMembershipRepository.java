package com.newtonite.ops.repository;

import com.newtonite.ops.model.TeamMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamMembershipRepository extends JpaRepository<TeamMembership, Long> {
    
    Optional<TeamMembership> findByUserIdAndTeamId(Long userId, Long teamId);
    
    @Query("SELECT tm FROM TeamMembership tm JOIN FETCH tm.team WHERE tm.user.id = :userId")
    List<TeamMembership> findByUserIdWithTeam(@Param("userId") Long userId);
    
    @Query("SELECT tm FROM TeamMembership tm JOIN FETCH tm.user WHERE tm.team.id = :teamId")
    List<TeamMembership> findByTeamIdWithUser(@Param("teamId") Long teamId);
    
    boolean existsByUserIdAndTeamId(Long userId, Long teamId);
}
