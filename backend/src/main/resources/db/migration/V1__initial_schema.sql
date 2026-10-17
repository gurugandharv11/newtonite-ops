-- V1__initial_schema.sql: Core schema for Newtonite Operations Under Pressure

-- 1. Users Table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_global_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Teams Table
CREATE TABLE teams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Team Memberships Table
-- Role types: VIEWER, MEMBER, LEAD
CREATE TABLE team_memberships (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_user UNIQUE (user_id, team_id),
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
);

-- 4. Work Items Table
-- Types: CUSTOMER_ISSUE, ENGINEERING_PROBLEM, PAYMENT_INVESTIGATION, PRODUCTION_INCIDENT, COMPLIANCE_REQUEST, GENERAL_TASK
-- Statuses: OPEN, IN_PROGRESS, AWAITING_APPROVAL, RESOLVED, CLOSED
-- Priorities: LOW, MEDIUM, HIGH, URGENT
CREATE TABLE work_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    team_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    assignee_id BIGINT NULL,
    due_date TIMESTAMP NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wi_team FOREIGN KEY (team_id) REFERENCES teams (id),
    CONSTRAINT fk_wi_creator FOREIGN KEY (creator_id) REFERENCES users (id),
    CONSTRAINT fk_wi_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL
);

-- Indexes for work item queries (Status, Priority, Assignee, Team, Due Date, Updated Date)
CREATE INDEX idx_wi_team_status ON work_items (team_id, status);
CREATE INDEX idx_wi_assignee_status ON work_items (assignee_id, status);
CREATE INDEX idx_wi_priority ON work_items (priority);
CREATE INDEX idx_wi_due_date ON work_items (due_date);
CREATE INDEX idx_wi_updated_at ON work_items (updated_at);

-- 5. Comments Table
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_item_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_wi FOREIGN KEY (work_item_id) REFERENCES work_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users (id)
);

CREATE INDEX idx_comments_wi ON comments (work_item_id, created_at);

-- 6. Activity Events (Append-only audit history)
-- Action types: CREATED, ASSIGNED, REASSIGNED, UNASSIGNED, PRIORITY_CHANGED, STATUS_TRANSITIONED, APPROVAL_REQUESTED, APPROVED, REJECTED, RESOLVED, CLOSED, REOPENED, COMMENT_ADDED
CREATE TABLE activity_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_item_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    action_type VARCHAR(50) NOT NULL,
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_wi FOREIGN KEY (work_item_id) REFERENCES work_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_wi ON activity_events (work_item_id, created_at DESC);

-- 7. Idempotency Records
CREATE TABLE idempotency_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT NOT NULL,
    response_body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_idempotency_key UNIQUE (idempotency_key)
);
