package com.newtonite.ops.dto;

public record UserSummaryDto(
    Long id,
    String username,
    String email,
    String fullName,
    boolean isGlobalAdmin
) {}
