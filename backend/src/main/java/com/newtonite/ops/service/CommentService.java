package com.newtonite.ops.service;

import com.newtonite.ops.dto.InteractionDtos.CommentResponse;
import com.newtonite.ops.dto.InteractionDtos.CreateCommentRequest;
import com.newtonite.ops.dto.PageResponse;
import com.newtonite.ops.dto.UserSummaryDto;
import com.newtonite.ops.exception.ResourceNotFoundException;
import com.newtonite.ops.model.*;
import com.newtonite.ops.repository.CommentRepository;
import com.newtonite.ops.repository.UserRepository;
import com.newtonite.ops.repository.WorkItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final WorkItemRepository workItemRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authService;
    private final ActivityService activityService;

    public CommentService(CommentRepository commentRepository,
                          WorkItemRepository workItemRepository,
                          UserRepository userRepository,
                          AuthorizationService authService,
                          ActivityService activityService) {
        this.commentRepository = commentRepository;
        this.workItemRepository = workItemRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.activityService = activityService;
    }

    @Transactional
    public CommentResponse addComment(Long workItemId, CreateCommentRequest request) {
        WorkItem item = workItemRepository.findById(workItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + workItemId));

        // Enforce team access: must have at least MEMBER role to comment
        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.MEMBER);

        User currentUser = userRepository.findById(authService.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Comment comment = new Comment(item, currentUser, request.content());
        Comment saved = commentRepository.save(comment);

        // Record comment in append-only activity history
        activityService.recordEvent(
                item,
                currentUser,
                ActionType.COMMENT_ADDED,
                null,
                null,
                currentUser.getFullName() + " added a comment"
        );

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long workItemId) {
        WorkItem item = workItemRepository.findById(workItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + workItemId));

        // Enforce team access: must have at least VIEWER role
        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.VIEWER);

        return commentRepository.findByWorkItemIdWithAuthor(workItemId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getCommentsPaged(Long workItemId, Pageable pageable) {
        WorkItem item = workItemRepository.findById(workItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + workItemId));

        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.VIEWER);

        Page<Comment> page = commentRepository.findByWorkItemIdWithAuthorPaged(workItemId, pageable);
        return PageResponse.of(page.map(this::mapToResponse));
    }

    private CommentResponse mapToResponse(Comment c) {
        UserSummaryDto authorDto = new UserSummaryDto(
                c.getAuthor().getId(),
                c.getAuthor().getUsername(),
                c.getAuthor().getEmail(),
                c.getAuthor().getFullName(),
                c.getAuthor().isGlobalAdmin()
        );
        return new CommentResponse(c.getId(), c.getWorkItem().getId(), authorDto, c.getContent(), c.getCreatedAt());
    }
}
