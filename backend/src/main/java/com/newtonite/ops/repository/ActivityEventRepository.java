package com.newtonite.ops.repository;

import com.newtonite.ops.model.ActivityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityEventRepository extends JpaRepository<ActivityEvent, Long> {

    @Query("SELECT a FROM ActivityEvent a LEFT JOIN FETCH a.actor WHERE a.workItem.id = :workItemId ORDER BY a.createdAt DESC")
    List<ActivityEvent> findByWorkItemIdWithActor(@Param("workItemId") Long workItemId);

    @Query(value = "SELECT a FROM ActivityEvent a LEFT JOIN FETCH a.actor WHERE a.workItem.id = :workItemId ORDER BY a.createdAt DESC",
           countQuery = "SELECT count(a) FROM ActivityEvent a WHERE a.workItem.id = :workItemId")
    Page<ActivityEvent> findByWorkItemIdWithActorPaged(@Param("workItemId") Long workItemId, Pageable pageable);
}
