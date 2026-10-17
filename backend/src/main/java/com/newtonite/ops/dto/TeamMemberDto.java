package com.newtonite.ops.dto;

public record TeamMemberDto(
    Long userId,
    String username,
    String fullName,
    String role
) {}
