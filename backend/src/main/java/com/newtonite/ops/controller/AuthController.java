package com.newtonite.ops.controller;

import com.newtonite.ops.dto.AuthResponse;
import com.newtonite.ops.dto.LoginRequest;
import com.newtonite.ops.dto.UserSummaryDto;
import com.newtonite.ops.model.TeamRole;
import com.newtonite.ops.model.User;
import com.newtonite.ops.repository.UserRepository;
import com.newtonite.ops.security.JwtService;
import com.newtonite.ops.security.UserPrincipal;
import com.newtonite.ops.service.AuthorizationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuthorizationService authService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          AuthorizationService authService,
                          UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();

        Map<String, Object> extra = new HashMap<>();
        String token = jwtService.generateToken(principal.getId(), principal.getUsername(), principal.isGlobalAdmin(), extra);

        UserSummaryDto userDto = new UserSummaryDto(
                principal.getId(),
                principal.getUsername(),
                principal.getEmail(),
                principal.getFullName(),
                principal.isGlobalAdmin()
        );

        Map<Long, String> rolesMap = new HashMap<>();
        principal.getTeamRoles().forEach((teamId, role) -> rolesMap.put(teamId, role.name()));

        return ResponseEntity.ok(new AuthResponse(token, userDto, rolesMap));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser() {
        UserPrincipal principal = authService.getCurrentUserPrincipal();
        User user = userRepository.findById(principal.getId()).orElseThrow();

        UserSummaryDto userDto = new UserSummaryDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.isGlobalAdmin()
        );

        Map<Long, String> rolesMap = new HashMap<>();
        principal.getTeamRoles().forEach((teamId, role) -> rolesMap.put(teamId, role.name()));

        return ResponseEntity.ok(new AuthResponse(null, userDto, rolesMap));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
