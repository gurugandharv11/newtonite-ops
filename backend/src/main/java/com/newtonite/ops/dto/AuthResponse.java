package com.newtonite.ops.dto;

import java.util.Map;

public record AuthResponse(
    String token,
    UserSummaryDto user,
    Map<Long, String> teamRoles
) {}
