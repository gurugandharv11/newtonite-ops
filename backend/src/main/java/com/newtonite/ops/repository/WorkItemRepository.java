package com.newtonite.ops.repository;

import com.newtonite.ops.model.WorkItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WorkItemRepository extends JpaRepository<WorkItem, Long>, JpaSpecificationExecutor<WorkItem> {

    @Query("SELECT w FROM WorkItem w " +
           "JOIN FETCH w.team " +
           "JOIN FETCH w.creator " +
           "LEFT JOIN FETCH w.assignee " +
           "WHERE w.id = :id")
    Optional<WorkItem> findByIdWithDetails(@Param("id") Long id);

    /**
     * Atomic claim operation:
     * Assigns the item to the new assignee ONLY IF the item currently has assignee_id IS NULL.
     * Increments the version atomically and updates the timestamp.
     * Returns 1 if successful, 0 if already claimed by someone else.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE WorkItem w SET w.assignee.id = :assigneeId, w.version = w.version + 1, w.updatedAt = :now " +
           "WHERE w.id = :itemId AND w.assignee IS NULL")
    int atomicClaim(@Param("itemId") Long itemId, @Param("assigneeId") Long assigneeId, @Param("now") java.time.Instant now);
}
