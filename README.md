<<<<<<< HEAD
# Newtonite Operations Under Pressure — Work Management Platform

A high-reliability, full-stack enterprise work management platform built for the **Newtonite Software Engineering Assessment**. Designed for operational teams triaging high-stakes production incidents, engineering problems, customer escalations, payment investigations, and compliance requests.

---

## 1. System Architecture & Tech Stack

```
+-------------------------------------------------------------------------+
|                                FRONTEND                                 |
|   React (Vite + TypeScript) + Tailwind CSS + TanStack Query + Lucide   |
|   - Real-time Dashboard with KPI counters                               |
|   - Search, Filter, Sort & Server-Side Pagination                       |
|   - OCC-Aware Edit View with Conflict Detection (409 Reload)           |
|   - Finite State Machine Workflow Control & Lead Sign-Off Modal         |
|   - Activity Timeline & Comment Discussion Threads                      |
+-------------------------------------------------------------------------+
                                    | (JSON / REST over HTTP)
                                    v
+-------------------------------------------------------------------------+
|                                BACKEND                                  |
|   Spring Boot 3.3.4 (Java 21)                                           |
|   - Stateless JWT Authentication with BCrypt Password Hashing           |
|   - Centralized AuthorizationService (Team-Scoped Role Hierarchy)       |
|   - FSM WorkflowService (Segregation of Duties & Lead-Only Approvals)   |
|   - Atomic Claim Engine (Single-Statement UPDATE WHERE assignee IS NULL)|
|   - Optimistic Concurrency Control (@Version with HTTP 409 handling)    |
|   - Persistent Idempotency Engine (SHA-256 Request Hash Verification)   |
|   - Transactional Append-Only Activity Event Audit Trail                |
+-------------------------------------------------------------------------+
                                    | (JPA / Hibernate / JDBC)
                                    v
+-------------------------------------------------------------------------+
|                                DATABASE                                 |
|   MySQL 8.0 (Flyway Database Migrations)                                |
|   - V1__initial_schema.sql (Normalized schema, FKs, constraints, indexes)|
|   - V2__seed_demo_data.sql (Multi-team seed data, roles, items, history)|
+-------------------------------------------------------------------------+
```

---

## 2. Core Functional Features

1. **Dashboard & Triage KPIs**:
   - Live counters scoped to user permissions: *Assigned to Me*, *Unassigned Urgent*, *Awaiting My Approval*, *Overdue Work*, and *Total Authorized Work*.
   - Recently updated work items with direct access to item details.

2. **Work Item State Machine**:
   - Enforced finite state transitions:
     - `OPEN` &harr; `IN_PROGRESS`
     - `IN_PROGRESS` &harr; `AWAITING_APPROVAL`
     - `AWAITING_APPROVAL` &rarr; `RESOLVED` (*Lead/Admin only; segregation of duties prevents assignee self-approval*)
     - `RESOLVED` &rarr; `CLOSED` or `IN_PROGRESS`
     - `CLOSED` (*Terminal state; Admin-only reopening*)

3. **Atomic Claiming**:
   - Zero race conditions when multiple operators attempt to claim unassigned tickets simultaneously. Powered by single-statement atomic queries with version incrementation.

4. **Optimistic Concurrency Control (OCC)**:
   - Work items include a `version` field. Stale client updates are rejected with `HTTP 409 Conflict`. The UI detects conflict and offers a one-click server refresh without losing current inputs.

5. **Persistent Idempotency**:
   - Client sends `Idempotency-Key` header on creation.
   - Retries return cached responses without duplicate database insertions or duplicate activity events.
   - Reusing a key with a different request payload is safely rejected with `HTTP 409 Conflict`.

6. **Append-Only Activity Audit Ledger**:
   - Every creation, reassignment, priority adjustment, status transition, and comment generates an immutable audit record in the same database transaction.

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

## 4. Quick Start & Setup Instructions

### Prerequisites
- **Java 21 JDK**
- **Node.js 18+ & npm**
- **Maven 3.9+** (or using bundled wrapper)
- **MySQL 8.0** or **Docker Compose**

### Option A: Using Docker for MySQL
```bash
# Start MySQL container in background
docker compose up -d

# Verify MySQL is running on port 3306
docker compose ps
```

### Option B: Running the Backend
From the root directory:
```bash
cd backend

# Compile and run Spring Boot application
mvn spring-boot:run
```
*The backend starts at `http://localhost:8080`. Flyway automatically executes database migrations (`V1` and `V2`) on startup.*

### Option C: Running the Frontend
In a separate terminal window:
```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```
*Open your browser at `http://localhost:5173`. The Vite server proxies `/api` calls directly to `http://localhost:8080`.*

---

## 5. Running Automated Tests

A comprehensive suite of 10 automated integration tests verifies the entire system against concurrency, security, and idempotency edge cases:

```bash
cd backend
mvn test
```

### Executed Tests Summary:
1. `testInvalidTransitionRejected`: Verifies illegal FSM status skips (e.g. `OPEN` &rarr; `CLOSED`) return `400 Bad Request`.
2. `testNonLeadCannotApprove`: Verifies regular team members cannot approve items awaiting approval (`403 Forbidden`).
3. `testCrossTeamAccessRejected`: Verifies users from other teams cannot view or mutate restricted items (`403 Forbidden`).
4. `testStaleUpdateConflict`: Verifies outdated entity versions return `409 Conflict`.
5. `testIdempotentWorkItemCreation`: Verifies submitting duplicate requests with an `Idempotency-Key` creates only 1 database item and replays the response.
6. `testConcurrentClaims`: Verifies concurrent threads attempting to claim the same unassigned item produce exactly 1 winner and 1 loser (`409 Conflict`).
7. `testCrossTeamAssigneeRejected`: Verifies assignees outside the item's team cannot be assigned (`400 Bad Request`).
8. `testPaginationAndFiltering`: Verifies server-side search, status filters, and page boundaries.
9. `testDashboardSummary`: Verifies dashboard counts are correctly scoped to user permissions.
10. `testCommentsAndTimeline`: Verifies comments and audit events are appended and ordered chronologically.

---

## 6. REST API Overview

| Method | Endpoint | Description | Auth Scope |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user and receive JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user details & team roles | Authenticated |
| `POST` | `/api/auth/logout` | Invalidate session | Authenticated |
| `GET` | `/api/teams` | List authorized teams for user | Authenticated |
| `GET` | `/api/teams/{id}/members` | List members and roles for team | Team VIEWER |
| `POST` | `/api/items` | Create work item (accepts `Idempotency-Key`) | Team MEMBER |
| `GET` | `/api/items` | Paginated search and filtering of items | Scoped to user teams |
| `GET` | `/api/items/{id}` | Get item details by ID | Team VIEWER |
| `PATCH` | `/api/items/{id}` | Update item (checks OCC `version`) | Team MEMBER |
| `POST` | `/api/items/{id}/claim` | Atomic claim of unassigned item | Team MEMBER |
| `POST` | `/api/items/{id}/transition` | State transition with approval rules | Team MEMBER / LEAD |
| `GET` | `/api/items/{id}/activity` | Paginated audit timeline | Team VIEWER |
| `GET` | `/api/items/{id}/comments` | Get comment discussion thread | Team VIEWER |
| `POST` | `/api/items/{id}/comments` | Add comment to item | Team MEMBER |
| `GET` | `/api/items/summary` | Dashboard KPI summary counts | Scoped to user teams |

---

## 7. Known Limitations & Production Enhancements

1. **Activity Log Archival**:
   - The current append-only activity ledger stores all historical actions in relational MySQL. In extreme enterprise scales (100M+ events), older completed items should be archived to columnar storage (ClickHouse or AWS Athena/S3).
2. **WebSocket Live Updates**:
   - Changes are currently propagated via TanStack Query invalidation and polling. In a live command center with hundreds of concurrent triage operators, a STOMP/WebSocket or SSE channel could be added to broadcast state transitions in real time.
3. **Idempotency Key TTL**:
   - Currently, idempotency records are stored permanently in MySQL. In production, a scheduled cron or partitioning scheme can prune keys older than 30 days.
=======
# newtonite-ops
>>>>>>> aea3874f3b4dd7c10008ed754bfba4b45721af76
