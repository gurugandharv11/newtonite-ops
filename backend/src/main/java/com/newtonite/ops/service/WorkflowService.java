package com.newtonite.ops.service;

import com.newtonite.ops.exception.BadRequestException;
import com.newtonite.ops.exception.ForbiddenException;
import com.newtonite.ops.model.TeamRole;
import com.newtonite.ops.model.WorkItem;
import com.newtonite.ops.model.WorkItemStatus;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

@Service
public class WorkflowService {

    private final AuthorizationService authService;

    // Allowed transition mapping: source -> target set
    private static final Map<WorkItemStatus, Set<WorkItemStatus>> ALLOWED_TRANSITIONS = Map.of(
            WorkItemStatus.OPEN, Set.of(WorkItemStatus.IN_PROGRESS),
            WorkItemStatus.IN_PROGRESS, Set.of(WorkItemStatus.OPEN, WorkItemStatus.AWAITING_APPROVAL),
            WorkItemStatus.AWAITING_APPROVAL, Set.of(WorkItemStatus.IN_PROGRESS, WorkItemStatus.RESOLVED),
            WorkItemStatus.RESOLVED, Set.of(WorkItemStatus.IN_PROGRESS, WorkItemStatus.CLOSED),
            WorkItemStatus.CLOSED, Collections.emptySet() // Terminal, except admin-only reopening
    );

    public WorkflowService(AuthorizationService authService) {
        this.authService = authService;
    }

    public void validateTransition(WorkItem item, WorkItemStatus targetStatus) {
        WorkItemStatus currentStatus = item.getStatus();

        if (currentStatus == targetStatus) {
            throw new BadRequestException("Work item is already in status " + targetStatus);
        }

        // Special case: Admin-only reopening from CLOSED
        if (currentStatus == WorkItemStatus.CLOSED) {
            if (targetStatus == WorkItemStatus.IN_PROGRESS && authService.isGlobalAdmin()) {
                return; // Admin permitted to reopen closed items
            }
            throw new BadRequestException("Closed items cannot transition to " + targetStatus + ". Closed state is terminal.");
        }

        Set<WorkItemStatus> allowedTargets = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Collections.emptySet());
        if (!allowedTargets.contains(targetStatus)) {
            throw new BadRequestException("Invalid transition from " + currentStatus + " to " + targetStatus +
                    ". Allowed transitions: " + allowedTargets);
        }

        // Approval authorization: AWAITING_APPROVAL -> RESOLVED requires LEAD or ADMIN
        if (currentStatus == WorkItemStatus.AWAITING_APPROVAL && targetStatus == WorkItemStatus.RESOLVED) {
            boolean isLeadOrAdmin = authService.hasRoleInTeam(item.getTeam().getId(), TeamRole.LEAD);
            if (!isLeadOrAdmin) {
                throw new ForbiddenException("Only team Leads or Administrators can approve and resolve items awaiting approval.");
            }

            // Self-approval restriction: A creator/assignee cannot approve their own work item unless Global Admin
            Long currentUserId = authService.getCurrentUserId();
            if (!authService.isGlobalAdmin() && item.getAssignee() != null && item.getAssignee().getId().equals(currentUserId)) {
                throw new ForbiddenException("Segregation of duties violation: An assignee cannot approve their own item.");
            }
        }

        // General resolution / closure checks
        if (targetStatus == WorkItemStatus.CLOSED) {
            // Resolving to CLOSED requires MEMBER or LEAD in the team
            authService.checkRoleInTeam(item.getTeam().getId(), TeamRole.MEMBER);
        }
    }
}
