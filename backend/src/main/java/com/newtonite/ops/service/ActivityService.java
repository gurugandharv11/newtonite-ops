package com.newtonite.ops.service;

import com.newtonite.ops.dto.InteractionDtos.ActivityEventResponse;
import com.newtonite.ops.dto.PageResponse;
import com.newtonite.ops.dto.UserSummaryDto;
import com.newtonite.ops.model.ActionType;
import com.newtonite.ops.model.ActivityEvent;
import com.newtonite.ops.model.User;
import com.newtonite.ops.model.WorkItem;
import com.newtonite.ops.repository.ActivityEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ActivityService {

    private final ActivityEventRepository activityEventRepository;

    public ActivityService(ActivityEventRepository activityEventRepository) {
        this.activityEventRepository = activityEventRepository;
    }

    /**
     * Appends an immutable audit event in the caller's active database transaction.
     * If the business operation fails or rolls back, this event rolls back as well.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public ActivityEvent recordEvent(WorkItem workItem, User actor, ActionType actionType,
                                     String oldValue, String newValue, String message) {
        ActivityEvent event = new ActivityEvent(workItem, actor, actionType, oldValue, newValue, message);
        return activityEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityEventResponse> getWorkItemActivityPaged(Long workItemId, Pageable pageable) {
        Page<ActivityEvent> page = activityEventRepository.findByWorkItemIdWithActorPaged(workItemId, pageable);
        return PageResponse.of(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<ActivityEventResponse> getWorkItemActivity(Long workItemId) {
        return activityEventRepository.findByWorkItemIdWithActor(workItemId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private ActivityEventResponse mapToResponse(ActivityEvent e) {
        UserSummaryDto actorDto = null;
        if (e.getActor() != null) {
            actorDto = new UserSummaryDto(
                    e.getActor().getId(),
                    e.getActor().getUsername(),
                    e.getActor().getEmail(),
                    e.getActor().getFullName(),
                    e.getActor().isGlobalAdmin()
            );
        }
        return new ActivityEventResponse(
                e.getId(),
                e.getWorkItem().getId(),
                actorDto,
                e.getActionType(),
                e.getOldValue(),
                e.getNewValue(),
                e.getMessage(),
                e.getCreatedAt()
        );
    }
}
