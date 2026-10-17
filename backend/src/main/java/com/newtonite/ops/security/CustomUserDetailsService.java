package com.newtonite.ops.security;

import com.newtonite.ops.model.TeamMembership;
import com.newtonite.ops.model.TeamRole;
import com.newtonite.ops.model.User;
import com.newtonite.ops.repository.TeamMembershipRepository;
import com.newtonite.ops.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final TeamMembershipRepository teamMembershipRepository;

    public CustomUserDetailsService(UserRepository userRepository, TeamMembershipRepository teamMembershipRepository) {
        this.userRepository = userRepository;
        this.teamMembershipRepository = teamMembershipRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserIdWithTeam(user.getId());
        Map<Long, TeamRole> teamRoles = new HashMap<>();
        for (TeamMembership tm : memberships) {
            teamRoles.put(tm.getTeam().getId(), tm.getRole());
        }

        return new UserPrincipal(user, teamRoles);
    }
}
