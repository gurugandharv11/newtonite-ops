package com.newtonite.ops.service;

import com.newtonite.ops.model.OutboxEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Service
public class DefaultNotificationDispatcher implements NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(DefaultNotificationDispatcher.class);

    @Override
    public void dispatch(OutboxEvent event) throws Exception {
        log.info("Dispatched notification for outbox event {}: {} [aggregateId={}]",
                event.getId(), event.getEventType(), event.getAggregateId());
    }
}
