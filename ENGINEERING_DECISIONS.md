# ENGINEERING DECISIONS & ARCHITECTURAL SPECIFICATIONS

## Project: Operations Under Pressure (Newtonite Work Management Platform)

This document provides a thorough analysis of the architectural decisions, concurrency models, failure modes, trade-offs, and scaling considerations implemented in this enterprise operational platform.

---

## 1. System Request-Flow Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Triage Operator / Lead
    participant Frontend as React (Vite + TanStack Query)
    participant Auth as Spring Security & JWT Filter
    participant Service as WorkItemService / WorkflowService
    participant OCC as Optimistic Locking & Atomic Query
    participant Database as MySQL / H2 Relational DB
    participant Outbox as Transactional Outbox Engine
    participant Dispatcher as Async Notification Worker

    Operator->>Frontend: Perform Action (Create / Claim / Transition / Update)
    Frontend->>Auth: HTTP Request + Bearer JWT + Idempotency-Key
    Auth->>Auth: Validate JWT & Populate UserPrincipal (Roles per Team)
    Auth->>Service: Dispatch Request with Authenticated Context
    Service->>Service: Enforce Team-Scoped Authorization & State Machine Rules
    alt Idempotent Creation
        Service->>Database: Query Idempotency Record (Scoped to User ID)
        Database-->>Service: Return Cached Response (if matching hash)
    else Atomic Claim / OCC Update
        Service->>OCC: Execute Atomic Update / Verify Version Match
        OCC->>Database: Atomic SQL Statement or JPA Flush
        Database-->>OCC: Check updated rows / version
    end
    Service->>Database: Commit Work Item + Activity Event + Outbox Event (Atomic ACID Transaction)
    Database-->>Frontend: HTTP 200 / 201 Response (or 409 Conflict)
    Frontend-->>Operator: Update UI State / Show Confirmation or Conflict Modal

    Note over Outbox,Dispatcher: Asynchronous Processing (Decoupled from User Latency)
    Outbox->>Database: Poll PENDING outbox events with batch limit
    Outbox->>Dispatcher: Dispatch notification (Webhook / Slack / Email)
    alt Success
        Dispatcher->>Database: Mark status = PROCESSED with timestamp
    else Transport Failure
        Dispatcher->>Database: Increment retry_count; schedule backoff; set FAILED after max retries
    end
```

---

## 2. Core Architectural Decisions & Trade-Offs

### Decision 1: Relational Data Model & Append-Only Activity Audit Ledger
- **Context & Problem**: In mission-critical incident response, accountability requires knowing who touched an item, when, why, and what fields changed.
- **Alternatives Evaluated**:
  1. *Event Sourcing (CQRS/ES)*: High complexity, complicates ad-hoc search across multiple relational filters.
  2. *In-place updates without audit*: Violates compliance and operational traceability.
  3. *Relational tables with synchronous append-only activity ledger*: Normalized core entities (`users`, `teams`, `work_items`, `comments`) with an append-only `activity_events` table written in the same transaction.
- **Chosen Approach**: Option 3. Mutating operations record structured events (`CREATED`, `ASSIGNED`, `REASSIGNED`, `STATUS_TRANSITIONED`, `APPROVAL_REQUESTED`, `APPROVED`, `COMMENT_ADDED`) in the exact same database commit.
- **Trade-offs**: Activity table grows monotonically. At 10x scale, older closed incident logs should be archived to columnar storage (e.g. Parquet on S3 / ClickHouse).

---

### Decision 2: Hybrid Concurrency Control: Optimistic Locking + Single-Statement Atomic Claiming
- **Context & Problem**: Multiple triage engineers viewing unassigned urgent incidents may attempt to claim or edit them simultaneously.
- **Mechanisms Implemented**:
  1. **Optimistic Concurrency Control (OCC)**: Work items contain a `@Version Long version` attribute. Clients pass the known `version` on updates and transitions. Mismatches abort immediately with `409 Conflict`, accompanied by the current entity version so the client can reconcile state.
  2. **Single-Statement Atomic Claim**: To prevent race conditions during claim bursts, claiming executes a single database statement:
     ```sql
     UPDATE work_items 
     SET assignee_id = :userId, version = version + 1, updated_at = :now 
     WHERE id = :itemId AND assignee_id IS NULL;
     ```
     The row lock is held at the database engine level only for the microsecond duration of this statement. If zero rows are modified, a concurrent operator claimed it first, returning an explicit `409 Conflict`.
  3. **Same-User Claim Idempotency**: If the same user retries claiming an item they already hold, the system detects this and returns the current state with `200 OK` without recording duplicate activity events.

---

### Decision 3: Multi-Tenant Team-Scoped Authorization & Segregation of Duties
- **Context & Problem**: Users participate in multiple teams with varying responsibilities (e.g., Lead in Core Ops, Viewer in Compliance). Segregation of duties mandates that an engineer cannot approve their own change requests.
- **Mechanisms Implemented**:
  1. **Role Hierarchy**: `VIEWER` (read-only) &lt; `MEMBER` (create, claim, edit, transition to review) &lt; `LEAD` (approve, reassign) &lt; `ADMIN` (global cross-team visibility, closed item reopening).
  2. **Centralized Policy Service**: `AuthorizationService` encapsulates all permission evaluation, eliminating duplicated `@PreAuthorize` annotations across controllers.
  3. **Strict Segregation of Duties**: In `WorkflowService`, approving an item transitioning from `AWAITING_APPROVAL` to `RESOLVED` requires `LEAD` role, and explicitly forbids approval if the user is either the **current assignee** or the **original creator**, unless acting as Global Administrator.

---

### Decision 4: Persistent Idempotency Engine Scoped by Authenticated User
- **Context & Problem**: Flaky mobile networks or operator retries can lead to duplicate incident tickets or chargeback investigations.
- **Mechanisms Implemented**:
  1. The client supplies an `Idempotency-Key` header.
  2. The server scopes the key to the authenticated user namespace: `u:{userId}:{rawKey}`. This prevents malicious or accidental key collision between different users.
  3. The request payload is hashed using SHA-256.
  4. If the key exists:
     - Matching hash: replays the original response with identical status and headers.
     - Mismatched hash: returns `409 Conflict` (key reuse with mutated payload).
  5. The idempotency record is persisted using `saveAndFlush` within the same transaction. Race attempts with identical keys fail on unique constraint and return `409 Conflict` rather than an unhandled 500 error.

---

### Decision 5: Synchronous vs. Asynchronous Processing & Transactional Outbox Pattern
- **Context & Problem**: Sending email, Slack, or webhook notifications synchronously in the HTTP request thread introduces external latency, risks distributed partial failures, and could roll back a successful database write if the external notifier times out.
- **Trade-off Analysis**:
  - *Direct Synchronous Notification*: Adds 200ms–2000ms latency to user request; external outage causes user operation to fail.
  - *In-Memory `@Async`*: If the JVM restarts before dispatch, notification events are lost forever.
  - *Full Message Broker (Kafka/RabbitMQ)*: High operational overhead, violates assessment guidance to avoid unnecessary infrastructure.
- **Chosen Approach**: **Transactional Outbox Pattern**.
  - In the same database transaction that updates the work item and activity log, an `outbox_events` record is written with status `PENDING`.
  - An asynchronous `OutboxProcessor` polls pending events, delegates dispatch to `NotificationDispatcher`, updates status to `PROCESSED`, and handles retries with backoff up to `maxRetries` (3) before marking `FAILED`.
  - Guarantees at-least-once delivery with zero risk of database/event inconsistency.

---

## 3. Comprehensive Failure Scenarios & Recovery Matrix

| Failure Scenario | Trigger | Detection Mechanism | System Behavior & Recovery | Client Impact |
|---|---|---|---|---|
| **Duplicate Request (Same Payload)** | Network timeout causing client retry with same `Idempotency-Key` | User-scoped lookup in `idempotency_records` matches SHA-256 hash | Replays cached response body without duplicate database insert or activity event | Clean `201 Created` / `200 OK`; idempotent |
| **Idempotency Key Reuse (Different Payload)** | Erroneous client reusing key for distinct operation | Hash mismatch against stored `request_hash` | Transaction aborted; no database mutation | `409 Conflict` with clear error description |
| **Concurrent Same-Key Race** | Two threads submit identical key simultaneously | Database unique constraint on `idempotency_key` | First thread succeeds; second caught by `GlobalExceptionHandler` | Thread 1 gets `201 Created`; Thread 2 receives `409 Conflict` |
| **Concurrent Item Claim Race** | Multiple operators click "Claim" simultaneously | Single-statement `atomicClaim` checks `assignee IS NULL` | Exactly 1 winner updates 1 row; loser updates 0 rows and aborts | Winner gets `200 OK` + assigned item; Loser receives `409 Conflict` ("Claim conflict") |
| **Same-User Claim Double-Click** | Operator double-clicks claim button | `WorkItemService` detects item is already assigned to current user | Short-circuits without error or duplicate activity event | Returns current item with `200 OK` |
| **Stale Update (Lost Update Problem)** | Operator A submits edit while Operator B saved in interim | Version comparison `item.getVersion() != request.version()` | Transaction aborted; no fields overwritten | `409 Conflict` returned; UI displays conflict banner with one-click reload |
| **Cross-Team Access Attempt** | User attempts to read or mutate another team's private item | `AuthorizationService.checkRoleInTeam` fails | Blocked before query execution or mutation | `403 Forbidden` with "Access denied" |
| **Prohibited Self-Approval** | Assignee or Creator attempts to approve own request | `WorkflowService` evaluates `assigneeId == userId \|\| creatorId == userId` | Blocked by state machine validation | `403 Forbidden` ("Segregation of duties violation") |
| **External Notification Outage** | Email / Webhook service unavailable or timing out | `NotificationDispatcher` throws exception | `OutboxProcessor` catches error, increments `retry_count`, leaves `PENDING` | Zero user disruption; background retry up to 3 times before marking `FAILED` |
| **Unauthenticated Request** | Expired or missing Bearer JWT | `JwtAuthenticationFilter` validates signature & expiry | Security filter chain rejects request | `401 Unauthorized` |

---

## 4. Assumptions & Explicit Non-Goals

### Assumptions
1. **User Identity Provisioning**: Demo accounts are provisioned via database seed migrations. Public self-registration is intentionally omitted as this is an internal enterprise platform.
2. **Clock Synchronization**: Nodes are assumed to run synchronized system clocks (via NTP) for token expiration and OCC timestamp validity.
3. **Database Capabilities**: Relational database supports atomic single-row updates and transactions (MySQL 8.0 InnoDB or H2 in MySQL mode).

### Explicit Non-Goals
1. **No External Message Brokers**: RabbitMQ, Kafka, or Redis were intentionally omitted to avoid operational infrastructure bloat, satisfying requirements using relational ACID transactions and the Transactional Outbox Pattern.
2. **Stateless Token Blacklisting**: JWT tokens are stateless. Client-side logout discards the stored token. Complete server-side token revocation prior to expiry without a distributed cache is an explicit non-goal for this phase.

---

## 5. Scaling Roadmap: One More Week & 10x Scale

### What I Would Improve With One More Week
1. **WebSocket / SSE Live Updates**: Implement Server-Sent Events to push item transitions and new comments to active operator browser tabs in real time.
2. **Distributed Token Revocation**: Add a low-latency Redis cache for instantaneous JWT token blacklisting upon logout or password reset.
3. **Draft Work Items**: Introduce draft saving with local storage backup so operators do not lose detailed incident investigation notes during network dropouts.
4. **Rich SLA Deadlines**: Add automated escalation warnings when urgent incidents remain unassigned for more than 15 minutes.

### Architectural Evolution at 10x Scale (100,000+ Daily Incidents)
1. **Read/Write Replica Splitting**: Direct dashboard aggregation queries and list filtering to MySQL read replicas using Spring Data RoutingDataSource, reserving the primary instance for mutations.
2. **Activity Ledger Partitioning**: Partition `activity_events` and `outbox_events` tables by year/month, archiving closed items older than 90 days to AWS S3 / Parquet queried via Athena or ClickHouse.
3. **Dedicated Outbox Worker Pods**: Decouple `OutboxProcessor` into a dedicated background worker container using Kubernetes Horizontal Pod Autoscalers to handle notification bursts without consuming web tier memory.
