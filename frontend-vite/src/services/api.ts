import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  User, Competition, Team, ApprovalWorkflow, PrePlan, Award,
  StudentEvaluation, StatsOverview, TeacherStat,
  LoginRequest, LoginResponse, TokenPair,
  AuditLog, AuditStats, RAGDocument, RAGStats,
} from '@/types';

// API Base URLs (configurable via Vite env; sensible dev defaults).
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const AI_BASE = import.meta.env.VITE_AI_BASE_URL || '/ai/api/v1';

// Token management
const getToken = (): string | null => localStorage.getItem('access_token');
const getRefreshToken = (): string | null => localStorage.getItem('refresh_token');
const setTokens = (tokens: TokenPair): void => {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
};
const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Create axios instance
const createApiInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearTokens();
          return Promise.reject(error);
        }

        try {
          const response = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          setTokens({ access_token, refresh_token, expires_in: 0 });

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return instance(originalRequest);
        } catch (refreshError) {
          clearTokens();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// API instances
const api = createApiInstance(API_BASE);
const aiApi = createApiInstance(AI_BASE);

// Auth API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    const data = response.data;
    if (data.tokens) {
      setTokens(data.tokens);
    }
    return data;
  },

  register: async (userData: Partial<User>): Promise<{ user: User }> => {
    const response = await api.post<{ user: User }>('/auth/register', userData);
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/users/me');
    return response.data;
  },

  logout: (): void => {
    clearTokens();
  },

  isAuthenticated: (): boolean => !!getToken(),
};

// Competitions API
export const competitionsAPI = {
  list: async (params?: Record<string, string>): Promise<{ competitions: Competition[] }> => {
    const response = await api.get<{ competitions: Competition[] }>('/competitions', { params });
    return response.data;
  },

  get: async (id: number): Promise<{ competition: Competition; teams_count: number }> => {
    const response = await api.get<{ competition: Competition; teams_count: number }>(`/competitions/${id}`);
    return response.data;
  },

  create: async (data: Partial<Competition>): Promise<{ competition: Competition }> => {
    const response = await api.post<{ competition: Competition }>('/competitions', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Competition>): Promise<{ competition: Competition }> => {
    const response = await api.put<{ competition: Competition }>(`/competitions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/competitions/${id}`);
  },

  publish: async (id: number): Promise<{ competition: Competition }> => {
    const response = await api.post<{ competition: Competition }>(`/competitions/${id}/publish`);
    return response.data;
  },
};

// Teams API
export const teamsAPI = {
  list: async (params?: Record<string, string>): Promise<{ teams: Team[] }> => {
    const response = await api.get<{ teams: Team[] }>('/teams', { params });
    return response.data;
  },

  get: async (id: number): Promise<{ team: Team }> => {
    const response = await api.get<{ team: Team }>(`/teams/${id}`);
    return response.data;
  },

  create: async (data: { name: string; competition_id: number }): Promise<{ team: Team }> => {
    const response = await api.post<{ team: Team }>('/teams', data);
    return response.data;
  },

  join: async (id: number): Promise<void> => {
    await api.post(`/teams/${id}/join`);
  },

  leave: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}/leave`);
  },
};

// Workflows API
export const workflowsAPI = {
  list: async (params?: { tab?: string }): Promise<{ approvals: ApprovalWorkflow[] }> => {
    const response = await api.get<{ approvals: ApprovalWorkflow[] }>('/workflows', { params });
    return response.data;
  },

  get: async (id: number): Promise<{ approval: ApprovalWorkflow }> => {
    const response = await api.get<{ approval: ApprovalWorkflow }>(`/workflows/${id}`);
    return response.data;
  },

  approve: async (id: number, comment?: string): Promise<void> => {
    await api.post(`/workflows/${id}/approve`, { comment });
  },

  reject: async (id: number, comment?: string): Promise<void> => {
    await api.post(`/workflows/${id}/reject`, { comment });
  },
};

// PrePlans API
export const prePlansAPI = {
  list: async (params?: Record<string, string>): Promise<{ pre_plans: PrePlan[] }> => {
    const response = await api.get<{ pre_plans: PrePlan[] }>('/pre-plans', { params });
    return response.data;
  },

  get: async (id: number): Promise<{ pre_plan: PrePlan }> => {
    const response = await api.get<{ pre_plan: PrePlan }>(`/pre-plans/${id}`);
    return response.data;
  },

  create: async (data: Partial<PrePlan>): Promise<{ pre_plan: PrePlan }> => {
    const response = await api.post<{ pre_plan: PrePlan }>('/pre-plans', data);
    return response.data;
  },
};

// Awards API
export const awardsAPI = {
  list: async (params?: Record<string, string>): Promise<{ awards: Award[] }> => {
    const response = await api.get<{ awards: Award[] }>('/awards', { params });
    return response.data;
  },

  settle: async (id: number): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>(`/awards/${id}/settle`);
    return response.data;
  },
};

// Evaluations API
export const evaluationsAPI = {
  list: async (params?: Record<string, string>): Promise<{ evaluations: StudentEvaluation[] }> => {
    const response = await api.get<{ evaluations: StudentEvaluation[] }>('/evaluations', { params });
    return response.data;
  },

  create: async (data: Partial<StudentEvaluation>): Promise<{ evaluation: StudentEvaluation }> => {
    const response = await api.post<{ evaluation: StudentEvaluation }>('/evaluations', data);
    return response.data;
  },
};

// Stats API
export const statsAPI = {
  overview: async (): Promise<StatsOverview> => {
    const response = await api.get<StatsOverview>('/stats/overview');
    return response.data;
  },

  competitions: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/stats/competitions');
    return response.data;
  },

  teachers: async (): Promise<{ teachers: TeacherStat[] }> => {
    const response = await api.get<{ teachers: TeacherStat[] }>('/stats/teachers');
    return response.data;
  },
};

// Audit Logs API
export const auditAPI = {
  list: async (params?: { page?: number; page_size?: number; action?: string; user_id?: number }): Promise<{ logs: AuditLog[]; total: number; page: number; page_size: number; total_pages: number }> => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },

  stats: async (): Promise<AuditStats> => {
    const response = await api.get<AuditStats>('/audit-logs/stats');
    return response.data;
  },
};

// AI Tools API
export const aiToolsAPI = {
  call: async (tool: string, input: string, extra?: string): Promise<{ result: string }> => {
    const response = await aiApi.post<{ result: string }>(`/tools/${tool}`, { input, extra });
    return response.data;
  },
};

// AI Assistant API — routed through the authenticated aiApi instance so the
// Bearer token is attached automatically (the AI service validates it).
export interface AssistantReply {
  reply: string;
  suggestions?: string[];
  tool_calls?: { call: string }[];
  data?: unknown;
}

export const assistantAPI = {
  chat: async (payload: {
    message: string;
    role?: string;
    context?: string;
    page?: string;
  }): Promise<AssistantReply> => {
    const response = await aiApi.post<AssistantReply>('/assistant/chat', payload);
    return response.data;
  },
};

// RAG API
export const ragAPI = {
  query: async (question: string, topK?: number): Promise<{ answer: string; sources: unknown[] }> => {
    const response = await aiApi.post<{ answer: string; sources: unknown[] }>('/rag/query', {
      question,
      top_k: topK || 5,
    });
    return response.data;
  },

  ingest: async (content: string, metadata?: Record<string, unknown>): Promise<{ id: number }> => {
    const response = await aiApi.post<{ id: number }>('/rag/ingest', { content, metadata });
    return response.data;
  },

  search: async (question: string, topK?: number): Promise<{ results: unknown[] }> => {
    const response = await aiApi.post<{ results: unknown[] }>('/rag/search', {
      question,
      top_k: topK || 5,
    });
    return response.data;
  },

  listDocuments: async (limit?: number, offset?: number): Promise<{ documents: RAGDocument[]; total_chunks: number; total_documents: number }> => {
    const response = await aiApi.get('/rag/documents', { params: { limit, offset } });
    return response.data;
  },

  deleteDocument: async (filename: string): Promise<{ message: string; chunks_deleted: number }> => {
    const response = await aiApi.delete(`/rag/documents/${encodeURIComponent(filename)}`);
    return response.data;
  },

  getStats: async (): Promise<RAGStats> => {
    const response = await aiApi.get<RAGStats>('/rag/stats');
    return response.data;
  },

  uploadFile: async (file: File): Promise<{ message: string; filename: string; chunk_count: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await aiApi.post('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export { api, aiApi };
