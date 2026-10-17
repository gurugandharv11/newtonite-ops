export type WorkItemType =
  | 'CUSTOMER_ISSUE'
  | 'ENGINEERING_PROBLEM'
  | 'PAYMENT_INVESTIGATION'
  | 'PRODUCTION_INCIDENT'
  | 'COMPLIANCE_REQUEST'
  | 'GENERAL_TASK';

export type WorkItemStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'RESOLVED'
  | 'CLOSED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TeamRole = 'VIEWER' | 'MEMBER' | 'LEAD' | 'ADMIN';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isGlobalAdmin: boolean;
}

export interface AuthResponse {
  token: string | null;
  user: UserSummary;
  teamRoles: Record<string, TeamRole>;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  currentUserRole: TeamRole;
}

export interface TeamMember {
  userId: number;
  username: string;
  fullName: string;
  role: TeamRole;
}

export interface WorkItem {
  id: number;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: Priority;
  teamId: number;
  teamName: string;
  creator: UserSummary;
  assignee: UserSummary | null;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface DashboardSummary {
  assignedToMeCount: number;
  unassignedUrgentCount: number;
  awaitingApprovalCount: number;
  totalAuthorizedCount: number;
  overdueCount: number;
}

export interface Comment {
  id: number;
  workItemId: number;
  author: UserSummary;
  content: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: number;
  workItemId: number;
  actor: UserSummary | null;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  message: string;
  createdAt: string;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string;
  type: WorkItemType;
  priority: Priority;
  teamId: number;
  assigneeId?: number | null;
  dueDate?: string | null;
}

export interface UpdateWorkItemRequest {
  version: number;
  title: string;
  description?: string;
  priority: Priority;
  assigneeId?: number | null;
  dueDate?: string | null;
}

export interface TransitionRequest {
  targetStatus: WorkItemStatus;
  comment?: string;
}
