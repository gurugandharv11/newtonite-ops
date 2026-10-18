# Newtonite Operations Under Pressure — Work Management Platform

An operational work management platform for multi-team internal environments to triage, track, approve, and resolve incidents, problems, investigations, and compliance requests.

Detailed design rationale, alternatives, and trade-offs are documented in [ENGINEERING_DECISIONS.md](ENGINEERING_DECISIONS.md). Requirements audit is in [REQUIREMENTS_AUDIT.md](REQUIREMENTS_AUDIT.md).

---

## 1. System Architecture & Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / Lead
    participant Web as React Frontend (Vite)
    participant Sec as Spring Security & JWT Filter
    participant Svc as WorkItemService / WorkflowService
    participant DB as MySQL / H2 Database
    participant Box as OutboxProcessor

    User->>Web: Action (Create / Claim / Transition / Comment)
    Web->>Sec: HTTP Request + Bearer JWT + Idempotency-Key
    Sec->>Sec: Validate Token & Populate Team Roles
    Sec->>Svc: Execute Business Logic with Auth Context
    Svc->>Svc: Enforce Team Scoping, FSM Rules & OCC Version Check
    Svc->>DB: Atomic Update / Commit Item + Activity + Outbox Event (ACID)
    DB-->>Web: HTTP 200/201 (or 400/403/409 Error)
    Web-->>User: Update UI / Render Conflict Banner
    Box->>DB: Poll PENDING Outbox Events (Async)
    Box->>Box: Dispatch Notification (Retry up to 3 times)
    Box->>DB: Mark Event PROCESSED / FAILED
```

---

## 2. Setup & Execution Instructions

### Step 1: Database
- **Option A (Default Embedded H2)**: Embedded H2 file database in MySQL compatibility mode. No external service setup needed.
- **Option B (Docker MySQL 8)**: Run `docker compose up -d` (starts MySQL on port 3306; user: `root`, password: `root`).

### Step 2: Environment Configuration
Copy `.env.example` if overriding defaults. Key variables:
| Variable | Default | Purpose & Failure Behavior |
|---|---|---|
| `SERVER_PORT` | `8080` | Backend HTTP listening port. |
| `SPRING_PROFILES_ACTIVE` | `default` | Set to `mysql` when using Docker/MySQL. |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | H2 file / `sa` / `""` | Database connection credentials. |
| `JWT_SECRET` | 64-char hex string | HMAC-SHA signing secret. In `prod` profile, default secret throws `IllegalStateException`. |
| `JWT_EXPIRATION_HOURS` | `24` | Token lifespan. Expired tokens return HTTP 401. |
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Target API URL for frontend Vite proxy. |

### Step 3: Run Backend & Frontend
```bash
# Backend (Option 1: H2 default; Option 2: MySQL profile)
cd backend && mvn spring-boot:run
# Or with MySQL: mvn spring-boot:run -Dspring-boot.run.profiles=mysql

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```
Access UI at `http://localhost:5173`. Backend runs at `http://localhost:8080`.

### Step 4: Run Automated Tests
```bash
cd backend && mvn test       # 18/18 integration tests pass (verified)
cd frontend && npm test      # 14/14 Vitest component tests pass (verified)
```

---

## 3. Seed Demo Accounts & Roles

All demo accounts use password: `password123`

| Username | Full Name | Team & Role | Typical Access |
|---|---|---|---|
| `admin` | System Administrator | Global Administrator | Full cross-team visibility, lead approvals, closed item reopening |
| `sarah.lead` | Sarah Connor | Core Platform (`LEAD`) | Incident triage, lead approvals, item reassignment in Team 1 |
| `alex.member` | Alex Murphy | Core Platform (`MEMBER`) | Create, claim, and transition items, submit for approval in Team 1 |
| `elena.viewer` | Elena Rostova | Core Platform (`VIEWER`), Compliance (`MEMBER`) | Read-only in Team 1, contributor in Team 3 |
| `david.finlead` | David Miller | Payment & Risk (`LEAD`) | Lead approvals and reassignment in Team 2 |
| `maya.finmember` | Maya Patel | Payment & Risk (`MEMBER`) | Payment investigations contributor in Team 2 |

---

## 4. Engineering Assumptions and Non-Goals

- **Role Scoping**: Roles (`VIEWER` < `MEMBER` < `LEAD`) are scoped per team. `ADMIN` has global cross-team audit and reopen rights.
- **JWT & Logout**: JWTs expire after 24 hours. Logout discards the token client-side; no server-side revocation list exists.
- **Synchronous vs Asynchronous**: User mutations (item, activity history, outbox record) execute synchronously in an ACID transaction. Notification dispatch is handled asynchronously by `OutboxProcessor`.
- **Explicit Non-Goals**: No public user registration, no external broker (Kafka/RabbitMQ) infrastructure, and no distributed cache.

---

## 5. Failure Handling Matrix

| Scenario | System Behaviour | Supporting File / Test | Status |
|---|---|---|---|
| **Duplicate create (same key & payload)** | Replays cached response without duplicate row or audit log | `testIdempotentWorkItemCreation` | Verified |
| **Idempotency key reuse (mutated payload)** | Rejects with HTTP 409 Conflict | `testIdempotencyKeyReuseWithDifferentPayload` | Verified |
| **Concurrent duplicate keys (same user)** | Database unique constraint caught by `saveAndFlush`; yields 409 | `GlobalExceptionHandler.java` | Verified |
| **Lost response & client retry on create** | User-scoped key lookup returns original response body | `testIdempotentWorkItemCreation` | Verified |
| **Lost response & client retry on claim** | Same-user retry returns current item with 200 OK without duplicate event | `testSameUserClaimRetryIsIdempotent` | Verified |
| **Lost response & client retry on transition** | Retrying same status rejected with 400; version mismatch yields 409 | `testDuplicateTransitionRejected` | Verified |
| **Concurrent claim race (2 operators)** | Atomic single SQL update allows exactly 1 winner; loser gets 409 Conflict | `testConcurrentClaims` | Verified |
| **Stale update (PATCH with old version)** | Optimistic Concurrency Control rejects with 409 Conflict | `testStaleUpdateConflict` | Verified |
| **Disallowed / skip workflow transition** | State machine blocks invalid transition with 400 Bad Request | `testInvalidTransitionRejected` | Verified |
| **Cross-team read or mutation attempt** | Denied with 403 Forbidden based on team membership check | `testCrossTeamAccessRejected` | Verified |
| **Prohibited self-approval (assignee/creator)**| Workflow rules prevent self-approval with 403 Forbidden | `testCreatorCannotSelfApprove` | Verified |
| **Database transaction failure** | Failed update rolls back item mutation and activity log atomically | `testTransactionalRollbackOnFailure` | Verified |
| **Notification transport failure** | OutboxProcessor logs error, retries up to 3 times, marks FAILED | `testTransactionalOutboxNotificationFlow` | Verified |

---

## 6. HTTP Error Semantics

Standard error body: `{"code": "STRING", "message": "STRING", "status": NUMBER}`

| HTTP Status | Condition in this API | Example Message / Behavior |
|---|---|---|
| **400 Bad Request** | Bean Validation failure, illegal state transition, duplicate transition | `"Invalid transition from OPEN to CLOSED"` |
| **401 Unauthorized** | Missing, expired, or invalid JWT; bad credentials on login | `"Invalid username or password"` |
| **403 Forbidden** | Insufficient role, cross-team access attempt, or prohibited self-approval | `"Access denied: You are not an active member of team"` |
| **404 Not Found** | Work item or team ID does not exist in database | `"Work item not found: 999"` |
| **409 Conflict** | Stale OCC version, concurrent claim lost, or duplicate idempotency key | `"Stale update conflict: The item has been modified"` |

---

## 7. Reviewer Demo Walkthrough

1. **Login**: `POST /api/auth/login` with `{"username": "alex.member", "password": "password123"}` &rarr; Receive JWT.
2. **Create Item**: `POST /api/items` with header `Idempotency-Key: demo-1` and payload for Team 1 &rarr; Item created with status `OPEN` (version `0`).
3. **Transition to Review**: Call `POST /api/items/{id}/transition` to `IN_PROGRESS`, then to `AWAITING_APPROVAL`.
4. **Verify Self-Approval Guard**: Login as `sarah.lead`. If Sarah created the item, `POST /api/items/{id}/transition` to `RESOLVED` returns `403 Forbidden` ("Segregation of duties violation"). Login as `admin` to approve &rarr; Returns `200 OK`.
5. **Verify Concurrent Claim**: Execute two simultaneous curl claim requests with different user tokens (`alex.member` vs `sarah.lead`). One returns `200 OK` (assigned); the second returns `409 Conflict`. Same-user retry returns `200 OK` without creating duplicate activity records.

---

## 8. Test Coverage Summary

- **Backend (`NewtoniteOpsIntegrationTests.java`)**: 18 integration tests covering workflow FSM, Lead-only approval, cross-team security, stale updates (OCC), idempotency replay/mutation/scoping, concurrent claim races, and transactional outbox.
- **Frontend (`components.test.tsx`)**: 14 Vitest tests covering badges, role-based visibility logic, OCC 409 conflict banners, 403 error boundaries, and empty search states.
- **What is NOT covered**: Browser-level end-to-end tests (Cypress/Playwright), multi-node network partition simulations, and load/stress benchmarks.

---

## 9. Known Limitations & Production Enhancements

### Current Limitations (Verified in Implementation)
1. **Asynchronous Processing**: Background outbox worker polls within the Spring Boot process; no distributed worker queue exists.
2. **Idempotency Header Scope**: Header-based persistent idempotency is implemented on `POST /api/items`. Updates and claims rely on OCC versioning and atomic conditional SQL rather than dedicated idempotency headers.
3. **Stateless JWT Revocation**: Logout is client-side. Tokens remain cryptographically valid until 24-hour expiration unless an external blacklist is added.
4. **Search Implementation**: Search queries use SQL `LIKE %query%` on title and description; no full-text search engine is integrated.
5. **Pagination**: Offset-based pagination bounded to 100 items per request; keyset cursor pagination is not implemented.
6. **Directory API**: Team and member endpoints are read-only directories; team provisioning is managed via Flyway migrations.

### Future Enhancements
- **With One More Week**: WebSocket/SSE push updates to replace polling, Redis token blacklist for instant logout revocation, and draft autosave.
- **At 10x Scale**: Database read-replica routing for dashboard counts, table partitioning on `activity_events` and `outbox_events` by date, and dedicated background worker pods.

---

## 10. REST API Overview

| Method | Endpoint | Description | Auth Scope |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user and receive JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & team roles | Authenticated |
| `POST` | `/api/auth/logout` | Discard session (stateless JWT client-side) | Authenticated |
| `GET` | `/api/teams` | List authorized teams for user | Authenticated |
| `GET` | `/api/teams/{id}/members` | List members and roles for team | Team VIEWER |
| `POST` | `/api/items` | Create work item (accepts `Idempotency-Key`) | Team MEMBER |
| `GET` | `/api/items` | Paginated search, filter, and sort | Scoped to user teams |
| `GET` | `/api/items/{id}` | Get work item details by ID | Team VIEWER |
| `PATCH` | `/api/items/{id}` | Update item fields (enforces OCC `version`) | Team MEMBER |
| `POST` | `/api/items/{id}/claim` | Atomic claim of unassigned item | Team MEMBER |
| `POST` | `/api/items/{id}/transition` | State transition with approval & OCC rules | Team MEMBER / LEAD |
| `GET` | `/api/items/{id}/activity` | Paginated activity audit ledger | Team VIEWER |
| `GET` | `/api/items/{id}/comments` | Get comment discussion thread | Team VIEWER |
| `POST` | `/api/items/{id}/comments` | Add comment to item | Team MEMBER |
| `GET` | `/api/items/summary` | Dashboard KPI summary counts | Scoped to user teams |
