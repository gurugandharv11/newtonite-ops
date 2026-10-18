package com.newtonite.ops.service;

import com.newtonite.ops.model.OutboxEvent;
import com.newtonite.ops.model.OutboxStatus;
import com.newtonite.ops.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class OutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(OutboxProcessor.class);

    private final OutboxEventRepository outboxEventRepository;
    private final NotificationDispatcher notificationDispatcher;

    public OutboxProcessor(OutboxEventRepository outboxEventRepository,
                           NotificationDispatcher notificationDispatcher) {
        this.outboxEventRepository = outboxEventRepository;
        this.notificationDispatcher = notificationDispatcher;
    }

    /**
     * Polls pending outbox records and dispatches them with retry, backoff, and idempotent deduplication.
     * Can be invoked by a background scheduler or programmatically for deterministic testing.
     * @return number of successfully processed events in this run.
     */
    public int processPendingEvents(int batchSize) {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findByStatusOrderByCreatedAtAsc(
                OutboxStatus.PENDING, PageRequest.of(0, batchSize));

        int successCount = 0;
        for (OutboxEvent event : pendingEvents) {
            boolean success = processSingleEvent(event.getId());
            if (success) {
                successCount++;
            }
        }
        return successCount;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean processSingleEvent(Long eventId) {
        OutboxEvent event = outboxEventRepository.findById(eventId).orElse(null);
        if (event == null || event.getStatus() != OutboxStatus.PENDING) {
            return false;
        }

        try {
            // Attempt delivery
            notificationDispatcher.dispatch(event);

            // Mark successful
            event.setStatus(OutboxStatus.PROCESSED);
            event.setProcessedAt(Instant.now());
            event.setLastError(null);
            outboxEventRepository.save(event);
            return true;
        } catch (Exception ex) {
            int newRetry = event.getRetryCount() + 1;
            event.setRetryCount(newRetry);
            event.setLastError(ex.getMessage());

            if (newRetry >= event.getMaxRetries()) {
                event.setStatus(OutboxStatus.FAILED);
                log.warn("Outbox event {} permanently failed after {} retries: {}",
                        event.getId(), newRetry, ex.getMessage());
            } else {
                log.info("Outbox event {} retry {} scheduled: {}",
                        event.getId(), newRetry, ex.getMessage());
            }

            outboxEventRepository.save(event);
            return false;
        }
    }
}
