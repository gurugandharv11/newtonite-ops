package com.newtonite.ops.service;

import com.newtonite.ops.dto.TeamDto;
import com.newtonite.ops.dto.TeamMemberDto;
import com.newtonite.ops.exception.ResourceNotFoundException;
import com.newtonite.ops.model.Team;
import com.newtonite.ops.model.TeamMembership;
import com.newtonite.ops.model.TeamRole;
import com.newtonite.ops.repository.TeamMembershipRepository;
import com.newtonite.ops.repository.TeamRepository;
import com.newtonite.ops.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final AuthorizationService authService;

    public TeamService(TeamRepository teamRepository,
                       TeamMembershipRepository teamMembershipRepository,
                       AuthorizationService authService) {
        this.teamRepository = teamRepository;
        this.teamMembershipRepository = teamMembershipRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<TeamDto> getAuthorizedTeams() {
        UserPrincipal principal = authService.getCurrentUserPrincipal();
        Map<Long, TeamRole> roles = principal.getTeamRoles();

        if (principal.isGlobalAdmin()) {
            return teamRepository.findAll().stream()
                    .map(t -> new TeamDto(t.getId(), t.getName(), t.getDescription(), "ADMIN"))
                    .toList();
        }

        return teamRepository.findAllById(roles.keySet()).stream()
                .map(t -> new TeamDto(t.getId(), t.getName(), t.getDescription(), roles.get(t.getId()).name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamMemberDto> getTeamMembers(Long teamId) {
        // Enforce membership check
        authService.checkRoleInTeam(teamId, TeamRole.VIEWER);

        return teamMembershipRepository.findByTeamIdWithUser(teamId).stream()
                .map(tm -> new TeamMemberDto(
                        tm.getUser().getId(),
                        tm.getUser().getUsername(),
                        tm.getUser().getFullName(),
                        tm.getRole().name()
                ))
                .toList();
    }
}
