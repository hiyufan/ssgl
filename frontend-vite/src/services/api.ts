import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  User, Competition, Team, ApprovalWorkflow, PrePlan, Award,
  StudentEvaluation, StatsOverview, TeacherStat,
  LoginRequest, LoginResponse, TokenPair,
  AuditLog, AuditStats, RAGDocument, RAGStats,
  CalendarEvent, ShowcaseData,
  LeaderboardEntry, MatchResult, TeamInvite,
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

      // 403 Forbidden — 后端 RBAC 拒绝，全局 toast 提示
      if (error.response?.status === 403) {
        import('@/components/ui/toast').then(({ toast }) => {
          toast.error('权限不足');
        }).catch(() => {});
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

  recommend: async (): Promise<{ recommendations: Array<Competition & { match_score: number; match_tags: string[]; reason: string }> }> => {
    const response = await api.get('/competitions/recommend');
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

  update: async (id: number, data: { name?: string }): Promise<{ team: Team }> => {
    const response = await api.put<{ team: Team }>(`/teams/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },

  join: async (id: number): Promise<void> => {
    await api.post(`/teams/${id}/join`);
  },

  leave: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}/leave`);
  },

  match: async (competitionId: number, limit?: number): Promise<{ matches: MatchResult[]; total: number }> => {
    const params: Record<string, string> = { competition_id: String(competitionId) };
    if (limit) params.limit = String(limit);
    const response = await api.get('/teams/match', { params });
    return response.data;
  },

  // Team invite endpoints
  invite: async (teamId: number, userId: number): Promise<{ invitation: TeamInvite }> => {
    const response = await api.post<{ invitation: TeamInvite }>(`/teams/${teamId}/invite`, { user_id: userId });
    return response.data;
  },

  listInvites: async (teamId: number): Promise<{ invitations: TeamInvite[] }> => {
    const response = await api.get<{ invitations: TeamInvite[] }>(`/teams/${teamId}/invites`);
    return response.data;
  },

  myInvites: async (): Promise<{ invitations: TeamInvite[] }> => {
    const response = await api.get<{ invitations: TeamInvite[] }>('/teams/invites/me');
    return response.data;
  },

  acceptInvite: async (code: string): Promise<void> => {
    await api.post(`/teams/invite/${code}/accept`);
  },

  declineInvite: async (code: string): Promise<void> => {
    await api.post(`/teams/invite/${code}/decline`);
  },
};

// Workflows API
export const workflowsAPI = {
  list: async (params?: { tab?: string }): Promise<{ workflows: ApprovalWorkflow[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/workflows', { params });
    return response.data;
  },

  get: async (id: number): Promise<{ workflow: ApprovalWorkflow }> => {
    const response = await api.get(`/workflows/${id}`);
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

  update: async (id: number, data: Partial<PrePlan>): Promise<{ pre_plan: PrePlan }> => {
    const response = await api.put<{ pre_plan: PrePlan }>(`/pre-plans/${id}`, data);
    return response.data;
  },

  review: async (id: number): Promise<{ pre_plan: PrePlan; review: Record<string, unknown> }> => {
    const response = await api.post<{ pre_plan: PrePlan; review: Record<string, unknown> }>(`/pre-plans/${id}/review`);
    return response.data;
  },
};

// Awards API
export const awardsAPI = {
  list: async (params?: Record<string, string>): Promise<{ awards: Award[] }> => {
    const response = await api.get<{ awards: Award[] }>('/awards', { params });
    return response.data;
  },

  get: async (id: number): Promise<{ award: Award }> => {
    const response = await api.get<{ award: Award }>(`/awards/${id}`);
    return response.data;
  },

  create: async (data: Partial<Award>): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>('/awards', data);
    return response.data;
  },

  settle: async (id: number, prizeAmount?: number): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>(`/awards/${id}/settle`, {
      prize_amount: prizeAmount ?? 0,
    });
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

  leaderboard: async (): Promise<{ leaderboard: LeaderboardEntry[] }> => {
    const response = await api.get<{ leaderboard: LeaderboardEntry[] }>('/leaderboard');
    return response.data;
  },

  showcase: async (): Promise<ShowcaseData> => {
    const response = await api.get<ShowcaseData>('/showcase');
    return response.data;
  },

  exportOverview: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/overview', { responseType: 'blob' });
    return response.data;
  },

  exportCompetitions: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/competitions', { responseType: 'blob' });
    return response.data;
  },

  trends: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/stats/trends');
    return response.data;
  },

  students: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/stats/students');
    return response.data;
  },

  progress: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/stats/progress');
    return response.data;
  },

  typeDistribution: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/stats/type-distribution');
    return response.data;
  },

  recentActivity: async (limit?: number): Promise<Record<string, unknown>> => {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    const response = await api.get('/stats/recent-activity', { params });
    return response.data;
  },

  exportTeams: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/teams', { responseType: 'blob' });
    return response.data;
  },

  engagement: async (): Promise<{
    total_students: number;
    students_with_teams: number;
    team_formation_rate: number;
    total_pre_plans: number;
    reviewed_pre_plans: number;
    ai_review_rate: number;
    avg_pre_plan_score: number;
    total_competitions: number;
    published_competitions: number;
    completion_rate: number;
    total_teams: number;
    avg_team_size: number;
    active_competitions: number;
  }> => {
    const response = await api.get('/stats/engagement');
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

// Calendar API
export const calendarAPI = {
  list: async (month?: string): Promise<{ events: CalendarEvent[]; month: string; total: number }> => {
    const response = await api.get<{ events: CalendarEvent[]; month: string; total: number }>('/calendar', { params: month ? { month } : {} });
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

// AI Pitch Coach (模拟答辩) API
export interface CoachScores {
  innovation: number;
  feasibility: number;
  business: number;
  delivery: number;
  completeness: number;
}

export interface CoachQuestion {
  id: number;
  persona: 'tech' | 'business' | 'product';
  question: string;
  rationale: string;
}

export interface CoachStart {
  session_id: string;
  scores: CoachScores;
  overall: number;
  verdict: string;
  similar_projects: { id: number; preview: string; similarity: number }[];
  questions: CoachQuestion[];
}

export interface CoachFinal {
  scores: CoachScores;
  overall: number;
  highlights: string[];
  improvements: { priority: 'high' | 'medium'; content: string }[];
  closing: string;
}

export interface CoachStartPayload {
  role?: string;
  source: 'pre_plan' | 'text';
  pre_plan_id?: number;
  pitch_text?: string;
  num_questions?: number;
}

export const coachAPI = {
  start: async (payload: CoachStartPayload): Promise<CoachStart> => {
    const response = await aiApi.post<CoachStart>('/coach/start', payload);
    return response.data;
  },

  final: async (sessionId: string): Promise<CoachFinal> => {
    const response = await aiApi.post<CoachFinal>('/coach/final', { session_id: sessionId });
    return response.data;
  },

  // Streaming answer turn — manual SSE read (axios can't stream in-browser).
  answerStream: async (
    payload: { session_id: string; question_id: number; answer: string },
    handlers: {
      onChunk: (text: string) => void;
      onDone: () => void;
      onExpired: () => void;
      onError: (msg: string) => void;
    },
  ): Promise<void> => {
    const token = getToken();
    try {
      const res = await fetch(`${AI_BASE}/coach/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) {
        handlers.onError('AI 服务暂时不可用');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? ''; // keep incomplete trailing event
        for (const evt of events) {
          if (!evt.startsWith('data:')) continue;
          const data = evt.slice(5).replace(/^ /, ''); // strip "data:" + one optional space
          if (data === '[DONE]') { handlers.onDone(); return; }
          if (data === '[EXPIRED]') { handlers.onExpired(); return; }
          if (data === '[ERROR]') { handlers.onError('回答生成失败'); return; }
          try {
            handlers.onChunk(JSON.parse(data) as string);
          } catch {
            handlers.onChunk(data); // defensive fallback for non-JSON frames
          }
        }
      }
      handlers.onDone();
    } catch {
      handlers.onError('AI 服务暂时不可用，请确保已启动（端口 8000）');
    }
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

// Notifications API
export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const notificationsAPI = {
  list: async (params?: { unread?: boolean; page?: number; page_size?: number }): Promise<{ items: Notification[]; total: number; unread_count: number }> => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markRead: async (id: number): Promise<void> => {
    await api.post(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
};

export { api, aiApi };

// Profile API
export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  dept: string;
  student_id: string;
  phone: string;
  avatar: string;
  created_at: string;
  team_count: number;
  award_count: number;
  pre_plan_count: number;
  competition_count: number;
}

export interface UserSummary {
  id: number;
  username: string;
  name: string;
  role: string;
  dept: string;
  avatar: string;
}

export const profileAPI = {
  getMyProfile: async (): Promise<{ profile: UserProfile }> => {
    const response = await api.get<{ profile: UserProfile }>('/users/profile/me');
    return response.data;
  },

  getProfile: async (id: number): Promise<{ profile: UserProfile }> => {
    const response = await api.get<{ profile: UserProfile }>(`/users/profile/${id}`);
    return response.data;
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<{ message: string; user: Partial<UserProfile> }> => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  searchUsers: async (query?: string, role?: string): Promise<{ users: UserSummary[]; total: number }> => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (role) params.role = role;
    const response = await api.get('/users', { params });
    return response.data;
  },

  myActivity: async (limit?: number): Promise<{ activities: Array<{ id: number; type: string; title: string; detail: string; created_at: string }> }> => {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    const response = await api.get('/users/me/activity', { params });
    return response.data;
  },
};
