package com.newtonite.ops.repository;

import com.newtonite.ops.model.OutboxEvent;
import com.newtonite.ops.model.OutboxStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    List<OutboxEvent> findByStatusOrderByCreatedAtAsc(OutboxStatus status, Pageable pageable);

    boolean existsByAggregateTypeAndAggregateIdAndEventTypeAndStatus(
            String aggregateType, Long aggregateId, String eventType, OutboxStatus status);
}
