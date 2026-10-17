package com.newtonite.ops.dto;

public record TeamDto(
    Long id,
    String name,
    String description,
    String currentUserRole
) {}
