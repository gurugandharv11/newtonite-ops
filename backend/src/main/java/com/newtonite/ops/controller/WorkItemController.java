package com.newtonite.ops.controller;

import com.newtonite.ops.dto.InteractionDtos.ActivityEventResponse;
import com.newtonite.ops.dto.InteractionDtos.CommentResponse;
import com.newtonite.ops.dto.InteractionDtos.CreateCommentRequest;
import com.newtonite.ops.dto.PageResponse;
import com.newtonite.ops.dto.WorkItemDtos.*;
import com.newtonite.ops.model.Priority;
import com.newtonite.ops.model.WorkItemStatus;
import com.newtonite.ops.model.WorkItemType;
import com.newtonite.ops.service.ActivityService;
import com.newtonite.ops.service.CommentService;
import com.newtonite.ops.service.WorkItemService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class WorkItemController {

    private final WorkItemService workItemService;
    private final CommentService commentService;
    private final ActivityService activityService;

    public WorkItemController(WorkItemService workItemService,
                              CommentService commentService,
                              ActivityService activityService) {
        this.workItemService = workItemService;
        this.commentService = commentService;
        this.activityService = activityService;
    }

    @PostMapping
    public ResponseEntity<WorkItemResponse> createItem(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateWorkItemRequest request) {
        WorkItemResponse response = workItemService.createWorkItem(request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<WorkItemResponse>> getItems(
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) WorkItemStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) WorkItemType type,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) Boolean overdue,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        int boundedSize = Math.min(Math.max(size, 1), 100);
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, boundedSize, sort);

        PageResponse<WorkItemResponse> result = workItemService.searchWorkItems(
                teamId, status, priority, type, assigneeId, unassigned, overdue, search, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkItemResponse> getItemById(@PathVariable Long id) {
        return ResponseEntity.ok(workItemService.getWorkItemById(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<WorkItemResponse> updateItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkItemRequest request) {
        return ResponseEntity.ok(workItemService.updateWorkItem(id, request));
    }

    @PostMapping("/{id}/claim")
    public ResponseEntity<WorkItemResponse> claimItem(@PathVariable Long id) {
        return ResponseEntity.ok(workItemService.claimWorkItem(id));
    }

    @PostMapping("/{id}/transition")
    public ResponseEntity<WorkItemResponse> transitionItem(
            @PathVariable Long id,
            @Valid @RequestBody TransitionRequest request) {
        return ResponseEntity.ok(workItemService.transitionWorkItem(id, request));
    }

    @GetMapping("/{id}/activity")
    public ResponseEntity<PageResponse<ActivityEventResponse>> getActivity(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int boundedSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(page, boundedSize);
        return ResponseEntity.ok(activityService.getWorkItemActivityPaged(id, pageable));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.addComment(id, request));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.getComments(id));
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummary> getDashboardSummary() {
        return ResponseEntity.ok(workItemService.getDashboardSummary());
    }
}
