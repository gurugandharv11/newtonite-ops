package com.newtonite.ops.dto;

import com.newtonite.ops.model.Priority;
import com.newtonite.ops.model.WorkItemStatus;
import com.newtonite.ops.model.WorkItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class WorkItemDtos {

    public record CreateWorkItemRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title cannot exceed 200 characters")
        String title,

        String description,

        @NotNull(message = "Work item type is required")
        WorkItemType type,

        @NotNull(message = "Priority is required")
        Priority priority,

        @NotNull(message = "Team ID is required")
        Long teamId,

        Long assigneeId,

        Instant dueDate
    ) {}

    public record UpdateWorkItemRequest(
        @NotNull(message = "Version is required for optimistic locking")
        Long version,

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title cannot exceed 200 characters")
        String title,

        String description,

        @NotNull(message = "Priority is required")
        Priority priority,

        Long assigneeId,

        Instant dueDate
    ) {}

    public record TransitionRequest(
        @NotNull(message = "Target status is required")
        WorkItemStatus targetStatus,

        String comment
    ) {}

    public record WorkItemResponse(
        Long id,
        String title,
        String description,
        WorkItemType type,
        WorkItemStatus status,
        Priority priority,
        Long teamId,
        String teamName,
        UserSummaryDto creator,
        UserSummaryDto assignee,
        Instant dueDate,
        Long version,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record DashboardSummary(
        long assignedToMeCount,
        long unassignedUrgentCount,
        long awaitingApprovalCount,
        long totalAuthorizedCount,
        long overdueCount
    ) {}
}
