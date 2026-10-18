package com.newtonite.ops.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newtonite.ops.dto.PageResponse;
import com.newtonite.ops.dto.UserSummaryDto;
import com.newtonite.ops.dto.WorkItemDtos.*;
import com.newtonite.ops.exception.BadRequestException;
import com.newtonite.ops.exception.ConflictException;
import com.newtonite.ops.exception.ForbiddenException;
import com.newtonite.ops.exception.ResourceNotFoundException;
import com.newtonite.ops.model.*;
import com.newtonite.ops.repository.TeamRepository;
import com.newtonite.ops.repository.UserRepository;
import com.newtonite.ops.repository.WorkItemRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class WorkItemService {

    private final WorkItemRepository workItemRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authService;
    private final WorkflowService workflowService;
    private final ActivityService activityService;
    private final IdempotencyService idempotencyService;
    private final com.newtonite.ops.repository.OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public WorkItemService(WorkItemRepository workItemRepository,
                           TeamRepository teamRepository,
                           UserRepository userRepository,
                           AuthorizationService authService,
                           WorkflowService workflowService,
                           ActivityService activityService,
                           IdempotencyService idempotencyService,
                           com.newtonite.ops.repository.OutboxEventRepository outboxEventRepository,
                           ObjectMapper objectMapper) {
        this.workItemRepository = workItemRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.workflowService = workflowService;
        this.activityService = activityService;
        this.idempotencyService = idempotencyService;
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a new work item with persistent idempotency checking.
     * Retries with identical idempotency key return the original response without duplicates.
     */
    @Transactional
    public WorkItemResponse createWorkItem(CreateWorkItemRequest request, String idempotencyKey) {
        String payloadHash = idempotencyService.computePayloadHash(request);
        Long currentUserId = authService.getCurrentUserId();
        String scopedKey = idempotencyService.buildScopedKey(currentUserId, idempotencyKey);

        // Check if an idempotency record exists for this authenticated user
        if (scopedKey != null) {
            Optional<IdempotencyRecord> existingRecord = idempotencyService.findRecord(scopedKey);
            if (existingRecord.isPresent()) {
                idempotencyService.validateReplay(existingRecord.get(), payloadHash);
                try {
                    return objectMapper.readValue(existingRecord.get().getResponseBody(), WorkItemResponse.class);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to deserialize idempotency response", e);
                }
            }
        }

        // Verify team authorization: must have at least MEMBER role in target team
        authService.checkRoleInTeam(request.teamId(), TeamRole.MEMBER);

        Team team = teamRepository.findById(request.teamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + request.teamId()));

        User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        User assignee = null;
        if (request.assigneeId() != null) {
            // Verify assignee belongs to the item's team
            if (!authService.isUserMemberOfTeam(request.assigneeId(), team.getId())) {
                throw new BadRequestException("Assignee user is not a member of team " + team.getName());
            }
            assignee = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: " + request.assigneeId()));
        }

        WorkItem item = new WorkItem();
        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setType(request.type());
        item.setPriority(request.priority());
        item.setStatus(WorkItemStatus.OPEN);
        item.setTeam(team);
        item.setCreator(creator);
        item.setAssignee(assignee);
        item.setDueDate(request.dueDate());
        item.setVersion(0L);

        WorkItem saved = workItemRepository.save(item);

        // Record CREATED event in activity history
        activityService.recordEvent(
                saved,
                creator,
                ActionType.CREATED,
                null,
                saved.getStatus().name(),
                "Work item created with priority " + saved.getPriority()
        );

        if (assignee != null) {
            activityService.recordEvent(
                    saved,
                    creator,
                    ActionType.ASSIGNED,
                    "UNASSIGNED",
                    assignee.getUsername(),
                    "Assigned to " + assignee.getFullName()
            );
        }

        // Record transactional outbox event for async notifications
        outboxEventRepository.save(new com.newtonite.ops.model.OutboxEvent(
                "WORK_ITEM", saved.getId(), "ITEM_CREATED",
                "Work item created: " + saved.getTitle()
        ));

        WorkItemResponse response = mapToResponse(saved);

        // Persist idempotency record in the same transaction
        if (scopedKey != null) {
            idempotencyService.saveRecord(scopedKey, payloadHash, 201, response);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public WorkItemResponse getWorkItemById(Long id) {
        WorkItem item = workItemRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + id));

        // Enforce team access: must have at least VIEWER role
        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.VIEWER);

        return mapToResponse(item);
    }

    /**
     * Updates an existing work item with Optimistic Concurrency Control (@Version).
     * Rejects stale updates with HTTP 409 Conflict.
     */
    @Transactional
    public WorkItemResponse updateWorkItem(Long id, UpdateWorkItemRequest request) {
        WorkItem item = workItemRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + id));

        // Enforce permission: at least MEMBER in team
        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.MEMBER);

        // Optimistic locking version check
        if (!Objects.equals(item.getVersion(), request.version())) {
            throw new ConflictException("Stale update conflict: The item has been modified by another transaction. " +
                    "Your version: " + request.version() + ", Current version: " + item.getVersion());
        }

        User currentUser = userRepository.findById(authService.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check for priority changes
        if (item.getPriority() != request.priority()) {
            activityService.recordEvent(
                    item,
                    currentUser,
                    ActionType.PRIORITY_CHANGED,
                    item.getPriority().name(),
                    request.priority().name(),
                    "Priority changed from " + item.getPriority() + " to " + request.priority()
            );
            item.setPriority(request.priority());
        }

        // Check for assignee changes
        Long oldAssigneeId = item.getAssignee() != null ? item.getAssignee().getId() : null;
        if (!Objects.equals(oldAssigneeId, request.assigneeId())) {
            // Only LEAD or ADMIN can reassign items from one user to another
            if (oldAssigneeId != null && !authService.hasRoleInTeam(item.getTeam().getId(), TeamRole.LEAD)) {
                throw new ForbiddenException("Only team Leads or Administrators can reassign work items.");
            }

            if (request.assigneeId() == null) {
                String oldAssigneeName = item.getAssignee() != null ? item.getAssignee().getUsername() : "NONE";
                item.setAssignee(null);
                activityService.recordEvent(item, currentUser, ActionType.UNASSIGNED, oldAssigneeName, "UNASSIGNED", "Item unassigned");
            } else {
                if (!authService.isUserMemberOfTeam(request.assigneeId(), item.getTeam().getId())) {
                    throw new BadRequestException("New assignee is not a member of team " + item.getTeam().getName());
                }
                User newAssignee = userRepository.findById(request.assigneeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: " + request.assigneeId()));

                String oldAssigneeName = item.getAssignee() != null ? item.getAssignee().getUsername() : "UNASSIGNED";
                item.setAssignee(newAssignee);
                activityService.recordEvent(
                        item,
                        currentUser,
                        oldAssigneeId == null ? ActionType.ASSIGNED : ActionType.REASSIGNED,
                        oldAssigneeName,
                        newAssignee.getUsername(),
                        "Assigned to " + newAssignee.getFullName()
                );
            }
        }

        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setDueDate(request.dueDate());

        WorkItem updated = workItemRepository.save(item);
        return mapToResponse(updated);
    }

    /**
     * Atomic claim: Claim an unassigned work item.
     * Prevents race conditions using an atomic single-statement UPDATE WHERE assignee_id IS NULL.
     */
    @Transactional
    public WorkItemResponse claimWorkItem(Long id) {
        WorkItem item = workItemRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + id));

        // Enforce team membership: must be MEMBER or LEAD in team
        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.MEMBER);

        Long currentUserId = authService.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (item.getAssignee() != null) {
            if (item.getAssignee().getId().equals(currentUserId)) {
                // Idempotent same-user claim retry: return existing state without duplicate activity logs
                return mapToResponse(item);
            }
            throw new ConflictException("Item is already assigned to " + item.getAssignee().getFullName());
        }

        // Execute atomic database query
        int updatedRows = workItemRepository.atomicClaim(id, currentUserId, Instant.now());
        if (updatedRows == 0) {
            // Check if current user won the claim race concurrently
            WorkItem current = workItemRepository.findByIdWithDetails(id).orElseThrow();
            if (current.getAssignee() != null && current.getAssignee().getId().equals(currentUserId)) {
                return mapToResponse(current);
            }
            throw new ConflictException("Claim conflict: Another team member claimed this work item concurrently.");
        }

        // Refresh and record activity event in same transaction
        WorkItem refreshed = workItemRepository.findByIdWithDetails(id).orElseThrow();
        refreshed.setAssignee(currentUser);
        activityService.recordEvent(
                refreshed,
                currentUser,
                ActionType.ASSIGNED,
                "UNASSIGNED",
                currentUser.getUsername(),
                currentUser.getFullName() + " claimed this work item"
        );

        // Record outbox event for asynchronous notification processing
        outboxEventRepository.save(new com.newtonite.ops.model.OutboxEvent(
                "WORK_ITEM", refreshed.getId(), "ITEM_CLAIMED",
                currentUser.getFullName() + " claimed work item: " + refreshed.getTitle()
        ));

        return mapToResponse(refreshed);
    }

    /**
     * State machine status transition with workflow rules, role authorization, and OCC version checks.
     */
    @Transactional
    public WorkItemResponse transitionWorkItem(Long id, TransitionRequest request) {
        WorkItem item = workItemRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work item not found: " + id));

        // Enforce team membership: at least MEMBER
        authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.MEMBER);

        // Optimistic locking check if version was provided by client
        if (request.version() != null && !Objects.equals(item.getVersion(), request.version())) {
            throw new ConflictException("Stale update conflict: The item has been modified by another transaction. " +
                    "Your version: " + request.version() + ", Current version: " + item.getVersion());
        }

        // Validate workflow transition rules and approval segregation
        workflowService.validateTransition(item, request.targetStatus());

        User currentUser = userRepository.findById(authService.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        WorkItemStatus oldStatus = item.getStatus();
        WorkItemStatus newStatus = request.targetStatus();
        item.setStatus(newStatus);

        ActionType actionType = switch (newStatus) {
            case AWAITING_APPROVAL -> ActionType.APPROVAL_REQUESTED;
            case RESOLVED -> ActionType.APPROVED;
            case CLOSED -> ActionType.CLOSED;
            case IN_PROGRESS -> oldStatus == WorkItemStatus.CLOSED ? ActionType.REOPENED : ActionType.STATUS_TRANSITIONED;
            default -> ActionType.STATUS_TRANSITIONED;
        };

        String msg = currentUser.getFullName() + " changed status to " + newStatus;
        if (request.comment() != null && !request.comment().isBlank()) {
            msg += ": " + request.comment();
        }

        activityService.recordEvent(item, currentUser, actionType, oldStatus.name(), newStatus.name(), msg);

        WorkItem updated = workItemRepository.save(item);

        // Record outbox event for asynchronous notification processing
        outboxEventRepository.save(new com.newtonite.ops.model.OutboxEvent(
                "WORK_ITEM", updated.getId(), actionType.name(),
                "Status transitioned from " + oldStatus + " to " + newStatus
        ));

        return mapToResponse(updated);
    }

    /**
     * Search and Filter Work Items with server-side pagination, authorization scoping, and indexing.
     */
    @Transactional(readOnly = true)
    public PageResponse<WorkItemResponse> searchWorkItems(
            Long teamId,
            WorkItemStatus status,
            Priority priority,
            WorkItemType type,
            Long assigneeId,
            Boolean unassigned,
            Boolean overdue,
            String search,
            Pageable pageable) {

        List<Long> authorizedTeamIds = authService.getAuthorizedTeamIds();

        Specification<WorkItem> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Scoping: If not global admin, restrict to authorized teams
            if (authorizedTeamIds != null) {
                if (authorizedTeamIds.isEmpty()) {
                    return cb.disjunction(); // No authorized teams = empty result
                }
                predicates.add(root.get("team").get("id").in(authorizedTeamIds));
            }

            if (teamId != null) {
                predicates.add(cb.equal(root.get("team").get("id"), teamId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (priority != null) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (Boolean.TRUE.equals(unassigned)) {
                predicates.add(cb.isNull(root.get("assignee")));
            } else if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            }
            if (Boolean.TRUE.equals(overdue)) {
                predicates.add(cb.isNotNull(root.get("dueDate")));
                predicates.add(cb.lessThan(root.get("dueDate"), Instant.now()));
                predicates.add(root.get("status").in(WorkItemStatus.OPEN, WorkItemStatus.IN_PROGRESS, WorkItemStatus.AWAITING_APPROVAL));
            }
            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), searchPattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), searchPattern);
                predicates.add(cb.or(titleMatch, descMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<WorkItem> page = workItemRepository.findAll(spec, pageable);
        return PageResponse.of(page.map(this::mapToResponse));
    }

    /**
     * Dashboard Summary Metrics scoped by user's authorized teams.
     */
    @Transactional(readOnly = true)
    public DashboardSummary getDashboardSummary() {
        Long currentUserId = authService.getCurrentUserId();
        List<Long> authorizedTeamIds = authService.getAuthorizedTeamIds();

        long assignedToMe = workItemRepository.count((root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("assignee").get("id"), currentUserId));
            preds.add(root.get("status").in(WorkItemStatus.OPEN, WorkItemStatus.IN_PROGRESS, WorkItemStatus.AWAITING_APPROVAL));
            return cb.and(preds.toArray(new Predicate[0]));
        });

        long unassignedUrgent = workItemRepository.count((root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (authorizedTeamIds != null) {
                preds.add(root.get("team").get("id").in(authorizedTeamIds));
            }
            preds.add(cb.isNull(root.get("assignee")));
            preds.add(cb.equal(root.get("priority"), Priority.URGENT));
            preds.add(root.get("status").in(WorkItemStatus.OPEN, WorkItemStatus.IN_PROGRESS));
            return cb.and(preds.toArray(new Predicate[0]));
        });

        long awaitingApproval = workItemRepository.count((root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (authorizedTeamIds != null) {
                preds.add(root.get("team").get("id").in(authorizedTeamIds));
            }
            preds.add(cb.equal(root.get("status"), WorkItemStatus.AWAITING_APPROVAL));
            return cb.and(preds.toArray(new Predicate[0]));
        });

        long totalAuthorized = workItemRepository.count((root, query, cb) -> {
            if (authorizedTeamIds != null) {
                return root.get("team").get("id").in(authorizedTeamIds);
            }
            return cb.conjunction();
        });

        long overdue = workItemRepository.count((root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (authorizedTeamIds != null) {
                preds.add(root.get("team").get("id").in(authorizedTeamIds));
            }
            preds.add(cb.isNotNull(root.get("dueDate")));
            preds.add(cb.lessThan(root.get("dueDate"), Instant.now()));
            preds.add(root.get("status").in(WorkItemStatus.OPEN, WorkItemStatus.IN_PROGRESS, WorkItemStatus.AWAITING_APPROVAL));
            return cb.and(preds.toArray(new Predicate[0]));
        });

        return new DashboardSummary(assignedToMe, unassignedUrgent, awaitingApproval, totalAuthorized, overdue);
    }

    public WorkItemResponse mapToResponse(WorkItem item) {
        UserSummaryDto creatorDto = new UserSummaryDto(
                item.getCreator().getId(),
                item.getCreator().getUsername(),
                item.getCreator().getEmail(),
                item.getCreator().getFullName(),
                item.getCreator().isGlobalAdmin()
        );

        UserSummaryDto assigneeDto = null;
        if (item.getAssignee() != null) {
            assigneeDto = new UserSummaryDto(
                    item.getAssignee().getId(),
                    item.getAssignee().getUsername(),
                    item.getAssignee().getEmail(),
                    item.getAssignee().getFullName(),
                    item.getAssignee().isGlobalAdmin()
            );
        }

        return new WorkItemResponse(
                item.getId(),
                item.getTitle(),
                item.getDescription(),
                item.getType(),
                item.getStatus(),
                item.getPriority(),
                item.getTeam().getId(),
                item.getTeam().getName(),
                creatorDto,
                assigneeDto,
                item.getDueDate(),
                item.getVersion(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
