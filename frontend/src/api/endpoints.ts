import { apiClient } from './client';
import {
  AuthResponse,
  Team,
  TeamMember,
  WorkItem,
  PageResponse,
  DashboardSummary,
  Comment,
  ActivityEvent,
  CreateWorkItemRequest,
  UpdateWorkItemRequest,
  TransitionRequest,
} from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { username, password });
    return res.data;
  },
  getCurrentUser: async (): Promise<AuthResponse> => {
    const res = await apiClient.get<AuthResponse>('/auth/me');
    return res.data;
  },
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};

export const teamsApi = {
  getTeams: async (): Promise<Team[]> => {
    const res = await apiClient.get<Team[]>('/teams');
    return res.data;
  },
  getTeamMembers: async (teamId: number): Promise<TeamMember[]> => {
    const res = await apiClient.get<TeamMember[]>(`/teams/${teamId}/members`);
    return res.data;
  },
};

export const workItemsApi = {
  getItems: async (params?: Record<string, any>): Promise<PageResponse<WorkItem>> => {
    const res = await apiClient.get<PageResponse<WorkItem>>('/items', { params });
    return res.data;
  },
  getItemById: async (id: number): Promise<WorkItem> => {
    const res = await apiClient.get<WorkItem>(`/items/${id}`);
    return res.data;
  },
  createItem: async (data: CreateWorkItemRequest, idempotencyKey?: string): Promise<WorkItem> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<WorkItem>('/items', data, { headers });
    return res.data;
  },
  updateItem: async (id: number, data: UpdateWorkItemRequest): Promise<WorkItem> => {
    const res = await apiClient.patch<WorkItem>(`/items/${id}`, data);
    return res.data;
  },
  claimItem: async (id: number): Promise<WorkItem> => {
    const res = await apiClient.post<WorkItem>(`/items/${id}/claim`);
    return res.data;
  },
  transitionItem: async (id: number, data: TransitionRequest): Promise<WorkItem> => {
    const res = await apiClient.post<WorkItem>(`/items/${id}/transition`, data);
    return res.data;
  },
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<DashboardSummary>('/items/summary');
    return res.data;
  },
  getActivity: async (id: number, page = 0, size = 50): Promise<PageResponse<ActivityEvent>> => {
    const res = await apiClient.get<PageResponse<ActivityEvent>>(`/items/${id}/activity`, {
      params: { page, size },
    });
    return res.data;
  },
  getComments: async (id: number): Promise<Comment[]> => {
    const res = await apiClient.get<Comment[]>(`/items/${id}/comments`);
    return res.data;
  },
  addComment: async (id: number, content: string): Promise<Comment> => {
    const res = await apiClient.post<Comment>(`/items/${id}/comments`, { content });
    return res.data;
  },
};
