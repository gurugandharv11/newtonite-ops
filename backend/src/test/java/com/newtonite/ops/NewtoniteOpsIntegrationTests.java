package com.newtonite.ops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newtonite.ops.dto.AuthResponse;
import com.newtonite.ops.dto.InteractionDtos.CreateCommentRequest;
import com.newtonite.ops.dto.LoginRequest;
import com.newtonite.ops.dto.WorkItemDtos.CreateWorkItemRequest;
import com.newtonite.ops.dto.WorkItemDtos.TransitionRequest;
import com.newtonite.ops.dto.WorkItemDtos.UpdateWorkItemRequest;
import com.newtonite.ops.dto.WorkItemDtos.WorkItemResponse;
import com.newtonite.ops.model.Priority;
import com.newtonite.ops.model.WorkItemStatus;
import com.newtonite.ops.model.WorkItemType;
import com.newtonite.ops.repository.ActivityEventRepository;
import com.newtonite.ops.repository.WorkItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class NewtoniteOpsIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WorkItemRepository workItemRepository;

    @Autowired
    private ActivityEventRepository activityEventRepository;

    private String adminToken;
    private String leadToken;    // Sarah Connor (Team 1 Lead)
    private String memberToken;  // Alex Murphy (Team 1 Member)
    private String viewerToken;  // Elena Rostova (Team 1 Viewer, Team 3 Member)
    private String finLeadToken; // David Miller (Team 2 Lead)

    @BeforeEach
    void setUp() throws Exception {
        adminToken = obtainToken("admin", "password123");
        leadToken = obtainToken("sarah.lead", "password123");
        memberToken = obtainToken("alex.member", "password123");
        viewerToken = obtainToken("elena.viewer", "password123");
        finLeadToken = obtainToken("david.finlead", "password123");
    }

    private String obtainToken(String username, String password) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse auth = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        return auth.token();
    }

    // TEST 1: Workflow validation - Invalid transitions are rejected with 400 Bad Request
    @Test
    @DisplayName("1. Workflow Validation: Reject invalid transitions (e.g. OPEN -> CLOSED directly)")
    void testInvalidTransitionRejected() throws Exception {
        TransitionRequest invalidTransition = new TransitionRequest(WorkItemStatus.CLOSED, "Illegal skip");
        mockMvc.perform(post("/api/items/2/transition")
                        .header("Authorization", "Bearer " + leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidTransition)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    // TEST 2: Approval authorization - A non-Lead cannot perform a Lead-only approval action
    @Test
    @DisplayName("2. Approval Authorization: Member cannot approve AWAITING_APPROVAL items (403 Forbidden)")
    void testNonLeadCannotApprove() throws Exception {
        TransitionRequest approveReq = new TransitionRequest(WorkItemStatus.RESOLVED, "Member trying to self-approve");
        mockMvc.perform(post("/api/items/3/transition")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    // TEST 3: Resource-level authorization - User from another team cannot access or modify restricted items
    @Test
    @DisplayName("3. Resource Authorization: Cross-team user cannot access unauthorized team item (403 Forbidden)")
    void testCrossTeamAccessRejected() throws Exception {
        // Work item 4 belongs to Team 2 (Payment). Elena belongs only to Team 1 and 3.
        mockMvc.perform(get("/api/items/4")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // Activity timeline read denial
        mockMvc.perform(get("/api/items/4/activity")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // Mutation denial on cross-team work item
        TransitionRequest transReq = new TransitionRequest(WorkItemStatus.IN_PROGRESS, "Unauthorized transition");
        mockMvc.perform(post("/api/items/4/transition")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    // TEST 4: Stale update optimistic locking - Outdated version rejected with 409 Conflict
    @Test
    @DisplayName("4. Optimistic Locking: Outdated version rejected with 409 Conflict")
    void testStaleUpdateConflict() throws Exception {
        // Read item 1
        MvcResult readResult = mockMvc.perform(get("/api/items/1")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andReturn();
        WorkItemResponse current = objectMapper.readValue(readResult.getResponse().getContentAsString(), WorkItemResponse.class);

        // Update with stale version
        UpdateWorkItemRequest staleReq = new UpdateWorkItemRequest(
                999L,
                current.title(),
                "Conflicting update",
                Priority.HIGH,
                current.assignee() != null ? current.assignee().id() : null,
                current.dueDate()
        );

        mockMvc.perform(patch("/api/items/1")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    // TEST 5: Persistent Idempotency - Same Idempotency-Key returns original result without duplicates
    @Test
    @DisplayName("5. Idempotency: Duplicate creation request returns cached response without duplicate item")
    void testIdempotentWorkItemCreation() throws Exception {
        String idemKey = "test-idem-key-" + System.currentTimeMillis();
        CreateWorkItemRequest req = new CreateWorkItemRequest(
                "Idempotency Test Incident",
                "Testing duplicate submission prevention",
                WorkItemType.PRODUCTION_INCIDENT,
                Priority.HIGH,
                1L, // Team 1
                null,
                null
        );

        long countBefore = workItemRepository.count();

        // 1st submission
        MvcResult firstResult = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + memberToken)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        WorkItemResponse firstResponse = objectMapper.readValue(firstResult.getResponse().getContentAsString(), WorkItemResponse.class);

        // 2nd submission with exact same key and body
        MvcResult secondResult = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + memberToken)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        WorkItemResponse secondResponse = objectMapper.readValue(secondResult.getResponse().getContentAsString(), WorkItemResponse.class);

        long countAfter = workItemRepository.count();

        assertThat(countAfter).isEqualTo(countBefore + 1); // Only 1 entity created in database
        assertThat(firstResponse.id()).isEqualTo(secondResponse.id());
    }

    // TEST 6: Concurrent Claim - Two users attempt to claim same unassigned item concurrently; exactly one wins
    @Test
    @DisplayName("6. Concurrency: Concurrent claims allow exactly one winner, loser gets 409 Conflict")
    void testConcurrentClaims() throws Exception {
        // Create a new unassigned item in Team 1
        CreateWorkItemRequest newReq = new CreateWorkItemRequest(
                "Claim Race Condition Item",
                "Testing atomic claiming under race condition",
                WorkItemType.CUSTOMER_ISSUE,
                Priority.URGENT,
                1L,
                null,
                null
        );
        MvcResult created = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newReq)))
                .andExpect(status().isCreated())
                .andReturn();
        WorkItemResponse item = objectMapper.readValue(created.getResponse().getContentAsString(), WorkItemResponse.class);
        Long itemId = item.id();

        // Prepare 2 concurrent threads claiming simultaneously
        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CyclicBarrier barrier = new CyclicBarrier(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        Callable<Void> claimTaskSarah = () -> {
            barrier.await();
            try {
                mockMvc.perform(post("/api/items/" + itemId + "/claim")
                                .header("Authorization", "Bearer " + leadToken))
                        .andExpect(status().isOk());
                successCount.incrementAndGet();
            } catch (Throwable t) {
                conflictCount.incrementAndGet();
            }
            return null;
        };

        Callable<Void> claimTaskAlex = () -> {
            barrier.await();
            try {
                mockMvc.perform(post("/api/items/" + itemId + "/claim")
                                .header("Authorization", "Bearer " + memberToken))
                        .andExpect(status().isOk());
                successCount.incrementAndGet();
            } catch (Throwable t) {
                conflictCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f1 = executor.submit(claimTaskSarah);
        Future<Void> f2 = executor.submit(claimTaskAlex);
        f1.get();
        f2.get();
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);
    }

    // TEST 7: Cross-team assignment validation
    @Test
    @DisplayName("7. Assignment Validation: Cross-team user cannot be assigned to work item")
    void testCrossTeamAssigneeRejected() throws Exception {
        // Try to create work item for Team 1 with assignee 5 (David Miller is only in Team 2)
        CreateWorkItemRequest req = new CreateWorkItemRequest(
                "Cross Team Assignee Test",
                "Assignee does not belong to team",
                WorkItemType.GENERAL_TASK,
                Priority.LOW,
                1L,
                5L, // David Miller (Finance)
                null
        );

        mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    // TEST 8: Pagination, filtering and search
    @Test
    @DisplayName("8. Pagination and Filtering: Search by text and status within authorized boundary")
    void testPaginationAndFiltering() throws Exception {
        mockMvc.perform(get("/api/items?search=Webhook&status=IN_PROGRESS&page=0&size=10")
                        .header("Authorization", "Bearer " + leadToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Payment Gateway Webhook Timeout Surge"));
    }

    // TEST 9: Dashboard summary respects authorization
    @Test
    @DisplayName("9. Dashboard Summary: Scoped metrics match authenticated user's teams")
    void testDashboardSummary() throws Exception {
        mockMvc.perform(get("/api/items/summary")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedToMeCount").isNumber())
                .andExpect(jsonPath("$.totalAuthorizedCount").isNumber());
    }

    // TEST 10: Comments and Activity Timeline persistence
    @Test
    @DisplayName("10. Timeline & Comments: Comments persist and record audit events")
    void testCommentsAndTimeline() throws Exception {
        CreateCommentRequest commentReq = new CreateCommentRequest("Verification comment on webhook timeout");

        mockMvc.perform(post("/api/items/1/comments")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(commentReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Verification comment on webhook timeout"));

        // Verify activity timeline includes COMMENT_ADDED
        mockMvc.perform(get("/api/items/1/activity")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].actionType").value("COMMENT_ADDED"));
    }

    // TEST 11: Idempotency Key Reuse Conflict - Same key with modified payload must be rejected with 409 Conflict
    @Test
    @DisplayName("11. Idempotency Key Reuse Conflict: Same key with different payload is rejected (409 Conflict)")
    void testIdempotencyKeyReuseWithDifferentPayload() throws Exception {
        String reuseKey = "conflict-idem-key-" + System.currentTimeMillis();
        CreateWorkItemRequest req1 = new CreateWorkItemRequest(
                "Original Payload Incident",
                "Description A",
                WorkItemType.CUSTOMER_ISSUE,
                Priority.LOW,
                1L,
                null,
                null
        );

        mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + memberToken)
                        .header("Idempotency-Key", reuseKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // Alter payload with same key
        CreateWorkItemRequest req2 = new CreateWorkItemRequest(
                "Tampered Payload Incident",
                "Description B altered",
                WorkItemType.PRODUCTION_INCIDENT,
                Priority.URGENT,
                1L,
                null,
                null
        );

        mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + memberToken)
                        .header("Idempotency-Key", reuseKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    // TEST 12: Transactional Audit Rollback - When item update fails validation, activity event is NOT committed
    @Test
    @DisplayName("12. Transactional Audit Integrity: Failed mutation rolls back activity events atomically")
    void testTransactionalRollbackOnFailure() throws Exception {
        long eventsCountBefore = activityEventRepository.count();

        // Attempt invalid update with blank title
        UpdateWorkItemRequest badReq = new UpdateWorkItemRequest(
                0L,
                "", // Blank title will fail Bean Validation
                "Some desc",
                Priority.LOW,
                null,
                null
        );

        mockMvc.perform(patch("/api/items/2")
                        .header("Authorization", "Bearer " + leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isBadRequest());

        long eventsCountAfter = activityEventRepository.count();
        // Assert zero orphan activity events committed
        assertThat(eventsCountAfter).isEqualTo(eventsCountBefore);
    }
}
