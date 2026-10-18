package com.newtonite.ops.service;

import com.newtonite.ops.model.OutboxEvent;

public interface NotificationDispatcher {
    /**
     * Attempts dispatching an asynchronous notification event.
     * Throws an exception if the remote transport (webhook/email/Slack) fails.
     */
    void dispatch(OutboxEvent event) throws Exception;
}
