-- V2__seed_demo_data.sql: Realistic seed data for Newtonite Operations Under Pressure
-- All passwords are 'password123' hashed with BCrypt: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- 1. Seed Users
INSERT INTO users (id, username, email, password_hash, full_name, is_global_admin, created_at) VALUES
(1, 'admin', 'admin@newtonite.internal', '$2a$10$CPMuyDjFdgJFLdadV25.aOdfDbIYXk4hS8mLTLuRjg6TdL4kjbO8i', 'System Administrator', TRUE, CURRENT_TIMESTAMP),
(2, 'sarah.lead', 'sarah.lead@newtonite.internal', '$2a$10$CPMuyDjFdgJFLdadV25.aOdfDbIYXk4hS8mLTLuRjg6TdL4kjbO8i', 'Sarah Connor (Core Ops Lead)', FALSE, CURRENT_TIMESTAMP),
(3, 'alex.member', 'alex.member@newtonite.internal', '$2a$10$CPMuyDjFdgJFLdadV25.aOdfDbIYXk4hS8mLTLuRjg6TdL4kjbO8i', 'Alex Murphy (Core Ops Member)', FALSE, CURRENT_TIMESTAMP),
(4, 'elena.viewer', 'elena.viewer@newtonite.internal', '$2a$10$CPMuyDjFdgJFLdadV25.aOdfDbIYXk4hS8mLTLuRjg6TdL4kjbO8i', 'Elena Rostova (Compliance Viewer)', FALSE, CURRENT_TIMESTAMP),
(5, 'david.finlead', 'david.finlead@newtonite.internal', '$2a$10$CPMuyDjFdgJFLdadV25.aOdfDbIYXk4hS8mLTLuRjg6TdL4kjbO8i', 'David Miller (Finance Lead)', FALSE, CURRENT_TIMESTAMP),
(6, 'maya.finmember', 'maya.finmember@newtonite.internal', '$2a$10$CPMuyDjFdgJFLdadV25.aOdfDbIYXk4hS8mLTLuRjg6TdL4kjbO8i', 'Maya Patel (Finance Member)', FALSE, CURRENT_TIMESTAMP);

-- 2. Seed Teams
INSERT INTO teams (id, name, description, created_at) VALUES
(1, 'Core Platform & Production', 'Manages core cloud infrastructure, engineering incidents, and platform stability.', CURRENT_TIMESTAMP),
(2, 'Payment & Risk Investigations', 'Handles high-priority payment disputes, chargeback investigations, and merchant fraud.', CURRENT_TIMESTAMP),
(3, 'Regulatory Compliance & Audits', 'Manages regulatory audits, GDPR requests, and statutory compliance submissions.', CURRENT_TIMESTAMP);

-- 3. Seed Team Memberships
INSERT INTO team_memberships (id, user_id, team_id, role, created_at) VALUES
(1, 1, 1, 'LEAD', CURRENT_TIMESTAMP),
(2, 1, 2, 'LEAD', CURRENT_TIMESTAMP),
(3, 1, 3, 'LEAD', CURRENT_TIMESTAMP),
(4, 2, 1, 'LEAD', CURRENT_TIMESTAMP),
(5, 3, 1, 'MEMBER', CURRENT_TIMESTAMP),
(6, 4, 1, 'VIEWER', CURRENT_TIMESTAMP),
(7, 4, 3, 'MEMBER', CURRENT_TIMESTAMP),
(8, 5, 2, 'LEAD', CURRENT_TIMESTAMP),
(9, 6, 2, 'MEMBER', CURRENT_TIMESTAMP);

-- 4. Seed Work Items
-- Compatible with MySQL and H2 standard SQL
INSERT INTO work_items (id, title, description, type, status, priority, team_id, creator_id, assignee_id, due_date, version, created_at, updated_at) VALUES
(1, 'Payment Gateway Webhook Timeout Surge', 'Stripe and Adyen webhooks are timing out on 504 gateway errors during peak traffic surges.', 'PRODUCTION_INCIDENT', 'IN_PROGRESS', 'URGENT', 1, 2, 3, TIMESTAMPADD(DAY, 1, CURRENT_TIMESTAMP), 1, TIMESTAMPADD(DAY, -2, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP),
(2, 'Postgres Connection Pool Exhaustion in Checkout Service', 'HikariCP maximum pool size was hit 12 times in the last 4 hours during automated stress tests.', 'ENGINEERING_PROBLEM', 'OPEN', 'HIGH', 1, 3, NULL, TIMESTAMPADD(DAY, 3, CURRENT_TIMESTAMP), 0, TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP),
(3, 'Hotfix Release: Invalidate Stale Session Tokens', 'Security hotfix ready to deploy. Requires operational lead review before deployment to EU cluster.', 'ENGINEERING_PROBLEM', 'AWAITING_APPROVAL', 'URGENT', 1, 3, 3, TIMESTAMPADD(DAY, 1, CURRENT_TIMESTAMP), 2, TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP),
(4, 'Customer Refund Dispute: Corporate Account #9482', 'Customer claims double charge for enterprise subscription invoice INV-2026-8812 totaling $14,500.', 'PAYMENT_INVESTIGATION', 'OPEN', 'URGENT', 2, 5, NULL, TIMESTAMPADD(DAY, 2, CURRENT_TIMESTAMP), 0, TIMESTAMPADD(HOUR, -12, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP),
(5, 'Quarterly SOX Compliance Access Audit', 'Verify all production database access grants and IAM temporary credentials for Q3 audit.', 'COMPLIANCE_REQUEST', 'IN_PROGRESS', 'MEDIUM', 3, 1, 4, TIMESTAMPADD(DAY, 7, CURRENT_TIMESTAMP), 1, TIMESTAMPADD(DAY, -3, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP),
(6, 'Legacy Redis Cache Decommissioning Task', 'Verify zero traffic against redis-legacy cluster before terminating AWS ElastiCache instances.', 'GENERAL_TASK', 'RESOLVED', 'LOW', 1, 2, 2, TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP), 3, TIMESTAMPADD(DAY, -5, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP);

-- 5. Seed Activity Events
INSERT INTO activity_events (id, work_item_id, actor_id, action_type, old_value, new_value, message, created_at) VALUES
(1, 1, 2, 'CREATED', NULL, 'OPEN', 'Work item created with priority URGENT', TIMESTAMPADD(DAY, -2, CURRENT_TIMESTAMP)),
(2, 1, 2, 'ASSIGNED', 'UNASSIGNED', 'alex.member', 'Assigned to Alex Murphy', TIMESTAMPADD(DAY, -2, CURRENT_TIMESTAMP)),
(3, 1, 3, 'STATUS_TRANSITIONED', 'OPEN', 'IN_PROGRESS', 'Alex Murphy started investigating webhook response times', TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP)),
(4, 2, 3, 'CREATED', NULL, 'OPEN', 'Work item created with priority HIGH', TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP)),
(5, 3, 3, 'CREATED', NULL, 'OPEN', 'Hotfix item created', TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP)),
(6, 3, 3, 'ASSIGNED', 'UNASSIGNED', 'alex.member', 'Assigned to Alex Murphy', TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP)),
(7, 3, 3, 'STATUS_TRANSITIONED', 'OPEN', 'IN_PROGRESS', 'Work started on hotfix patch', TIMESTAMPADD(HOUR, -18, CURRENT_TIMESTAMP)),
(8, 3, 3, 'STATUS_TRANSITIONED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'Alex Murphy submitted hotfix for Lead approval', TIMESTAMPADD(HOUR, -4, CURRENT_TIMESTAMP)),
(9, 4, 5, 'CREATED', NULL, 'OPEN', 'Refund dispute flagged by merchant portal', TIMESTAMPADD(HOUR, -12, CURRENT_TIMESTAMP)),
(10, 6, 2, 'STATUS_TRANSITIONED', 'AWAITING_APPROVAL', 'RESOLVED', 'Sarah Connor approved decommission after zero metric traffic confirmed', TIMESTAMPADD(HOUR, -2, CURRENT_TIMESTAMP));

-- 6. Seed Comments
INSERT INTO comments (id, work_item_id, author_id, content, created_at) VALUES
(1, 1, 3, 'Reproduced 504 on EU-West gateway endpoint. Increasing keep-alive timeout from 30s to 60s.', TIMESTAMPADD(HOUR, -18, CURRENT_TIMESTAMP)),
(2, 1, 2, 'Keep monitoring latency charts after restarting the gateway pods.', TIMESTAMPADD(HOUR, -16, CURRENT_TIMESTAMP)),
(3, 3, 3, 'Unit and integration tests pass with 100% coverage on session invalidation logic. Requesting Sarah for sign-off.', TIMESTAMPADD(HOUR, -4, CURRENT_TIMESTAMP)),
(4, 4, 5, 'Bank confirmation logs received. Ready for claim and ledger cross-referencing.', TIMESTAMPADD(HOUR, -10, CURRENT_TIMESTAMP));
