package com.newtonite.ops.dto;

import java.time.Instant;

public record ApiErrorResponse(
    String code,
    String message,
    int status,
    Instant timestamp
) {
    public ApiErrorResponse(String code, String message, int status) {
        this(code, message, status, Instant.now());
    }
}
