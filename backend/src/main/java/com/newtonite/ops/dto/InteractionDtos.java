package com.newtonite.ops.dto;

import com.newtonite.ops.model.ActionType;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public class InteractionDtos {

    public record CreateCommentRequest(
        @NotBlank(message = "Comment content cannot be blank")
        String content
    ) {}

    public record CommentResponse(
        Long id,
        Long workItemId,
        UserSummaryDto author,
        String content,
        Instant createdAt
    ) {}

    public record ActivityEventResponse(
        Long id,
        Long workItemId,
        UserSummaryDto actor,
        ActionType actionType,
        String oldValue,
        String newValue,
        String message,
        Instant createdAt
    ) {}
}
