package com.newtonite.ops.service;

import com.newtonite.ops.exception.ForbiddenException;
import com.newtonite.ops.exception.UnauthorizedException;
import com.newtonite.ops.model.TeamMembership;
import com.newtonite.ops.model.TeamRole;
import com.newtonite.ops.model.User;
import com.newtonite.ops.repository.TeamMembershipRepository;
import com.newtonite.ops.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthorizationService {

    private final TeamMembershipRepository teamMembershipRepository;

    public AuthorizationService(TeamMembershipRepository teamMembershipRepository) {
        this.teamMembershipRepository = teamMembershipRepository;
    }

    public UserPrincipal getCurrentUserPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new UnauthorizedException("User is not authenticated");
        }
        return (UserPrincipal) auth.getPrincipal();
    }

    public Long getCurrentUserId() {
        return getCurrentUserPrincipal().getId();
    }

    public boolean isGlobalAdmin() {
        return getCurrentUserPrincipal().isGlobalAdmin();
    }

    /**
     * Checks if current user has at least the required role in the specified team.
     * Role hierarchy: LEAD > MEMBER > VIEWER. Global Admin bypasses team checks.
     */
    public boolean hasRoleInTeam(Long teamId, TeamRole requiredRole) {
        UserPrincipal principal = getCurrentUserPrincipal();
        if (principal.isGlobalAdmin()) {
            return true;
        }

        TeamRole actualRole = principal.getTeamRoles().get(teamId);
        if (actualRole == null) {
            return false;
        }

        return switch (requiredRole) {
            case VIEWER -> true; // Any member is at least VIEWER
            case MEMBER -> actualRole == TeamRole.MEMBER || actualRole == TeamRole.LEAD;
            case LEAD -> actualRole == TeamRole.LEAD;
        };
    }

    public void checkRoleInTeam(Long teamId, TeamRole requiredRole) {
        if (!hasRoleInTeam(teamId, requiredRole)) {
            throw new ForbiddenException("Access denied: You do not have " + requiredRole + " permissions for team " + teamId);
        }
    }

    public List<Long> getAuthorizedTeamIds() {
        UserPrincipal principal = getCurrentUserPrincipal();
        if (principal.isGlobalAdmin()) {
            return null; // null represents all teams for global admin
        }
        return principal.getTeamRoles().keySet().stream().toList();
    }

    public boolean isUserMemberOfTeam(Long userId, Long teamId) {
        return teamMembershipRepository.existsByUserIdAndTeamId(userId, teamId);
    }
}
