package com.newtonite.ops.security;

import com.newtonite.ops.model.TeamRole;
import com.newtonite.ops.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;

public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final String password;
    private final String email;
    private final String fullName;
    private final boolean globalAdmin;
    private final Map<Long, TeamRole> teamRoles;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user, Map<Long, TeamRole> teamRoles) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.password = user.getPasswordHash();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.globalAdmin = user.isGlobalAdmin();
        this.teamRoles = teamRoles != null ? teamRoles : Collections.emptyMap();

        Set<GrantedAuthority> auths = new HashSet<>();
        if (user.isGlobalAdmin()) {
            auths.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        this.teamRoles.forEach((teamId, role) -> {
            auths.add(new SimpleGrantedAuthority("ROLE_TEAM_" + teamId + "_" + role.name()));
        });
        this.authorities = Collections.unmodifiableSet(auths);
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public boolean isGlobalAdmin() { return globalAdmin; }
    public Map<Long, TeamRole> getTeamRoles() { return teamRoles; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }

    @Override
    public String getPassword() { return password; }

    @Override
    public String getUsername() { return username; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
