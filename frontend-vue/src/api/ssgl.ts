import type {
  Competition, Team, ApprovalWorkflow, PrePlan, Award,
  StudentEvaluation, StatsOverview, TeacherStat, CompetitionStat,
  TrendPoint, TypeDistributionItem, ActivityItem, StudentStats,
  EngagementStats, CompetitionProgress, KanbanData, LeaderboardEntry,
  MatchResult, TeamInvite, Milestone, CompetitionRegistration,
  TeamAnalysis, CompetitionSubscription, CompareResponse,
  AuditLog, AuditStats, CalendarEvent, ShowcaseData,
  Notification, SearchResult, UserProfile, UserSummary,
  AchievementPoint, PointsSummary, PointsLeaderboardEntry,
  CompetitionFeedback, FeedbackSummary, RAGDocument, RAGStats
} from '@/types/ssgl'
import { api } from './http'

// Competitions API
export const competitionsAPI = {
  list: async (params?: Record<string, string>): Promise<{ competitions: Competition[] }> => {
    const response = await api.get<{ competitions: Competition[] }>('/competitions', { params })
    return response.data
  },
  get: async (id: number): Promise<{ competition: Competition; teams_count: number }> => {
    const response = await api.get<{ competition: Competition; teams_count: number }>(`/competitions/${id}`)
    return response.data
  },
  create: async (data: Partial<Competition>): Promise<{ competition: Competition }> => {
    const response = await api.post<{ competition: Competition }>('/competitions', data)
    return response.data
  },
  update: async (id: number, data: Partial<Competition>): Promise<{ competition: Competition }> => {
    const response = await api.put<{ competition: Competition }>(`/competitions/${id}`, data)
    return response.data
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/competitions/${id}`)
  },
  publish: async (id: number): Promise<{ competition: Competition }> => {
    const response = await api.post<{ competition: Competition }>(`/competitions/${id}/publish`)
    return response.data
  },
  recommend: async (): Promise<{ recommendations: Array<Competition & { match_score: number; match_tags: string[]; reason: string }> }> => {
    const response = await api.get('/competitions/recommend')
    return response.data
  },
  stats: async (id: number): Promise<Record<string, number | string>> => {
    const response = await api.get(`/competitions/${id}/stats`)
    return response.data
  },
  difficulty: async (id: number): Promise<{
    competition_id: number; title: string; overall_score: number; level: string;
    dimensions: Array<{ name: string; score: number; weight: number; details: string }>;
    summary: string; tips: string[]; recommended_team_size: number; estimated_prep_weeks: number;
  }> => {
    const response = await api.get(`/competitions/${id}/difficulty`)
    return response.data
  },
  batchImport: async (competitions: Array<Record<string, unknown>>): Promise<{ created_count: number; error_count: number; errors: Array<{ index: number; title: string; message: string }> }> => {
    const response = await api.post('/competitions/import', competitions)
    return response.data
  }
}

// Milestones API
export const milestonesAPI = {
  list: async (competitionId: number, params?: Record<string, string>): Promise<{ milestones: Milestone[]; total: number; completed: number; overdue: number; progress: number }> => {
    const response = await api.get(`/competitions/${competitionId}/milestones`, { params })
    return response.data
  },
  get: async (id: number): Promise<{ milestone: Milestone }> => {
    const response = await api.get<{ milestone: Milestone }>(`/milestones/${id}`)
    return response.data
  },
  create: async (data: { competition_id: number; title: string; type: string; due_date: string; sort_order?: number; description?: string; start_date?: string }): Promise<{ milestone: Milestone }> => {
    const response = await api.post<{ milestone: Milestone }>('/milestones', data)
    return response.data
  },
  update: async (id: number, data: Partial<{ title: string; type: string; status: string; due_date: string; start_date: string; description: string; sort_order: number }>): Promise<{ milestone: Milestone }> => {
    const response = await api.put<{ milestone: Milestone }>(`/milestones/${id}`, data)
    return response.data
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/milestones/${id}`)
  },
  batchCreate: async (competitionId: number, milestones: Array<{ title: string; type: string; due_date: string; sort_order?: number }>): Promise<{ milestones: Milestone[]; total: number }> => {
    const response = await api.post(`/competitions/${competitionId}/milestones/batch`, milestones)
    return response.data
  }
}

// Teams API
export const teamsAPI = {
  list: async (params?: Record<string, string>): Promise<{ teams: Team[] }> => {
    const response = await api.get<{ teams: Team[] }>('/teams', { params })
    return response.data
  },
  get: async (id: number): Promise<{ team: Team }> => {
    const response = await api.get<{ team: Team }>(`/teams/${id}`)
    return response.data
  },
  create: async (data: { name: string; competition_id: number }): Promise<{ team: Team }> => {
    const response = await api.post<{ team: Team }>('/teams', data)
    return response.data
  },
  update: async (id: number, data: { name?: string }): Promise<{ team: Team }> => {
    const response = await api.put<{ team: Team }>(`/teams/${id}`, data)
    return response.data
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}`)
  },
  join: async (id: number): Promise<void> => {
    await api.post(`/teams/${id}/join`)
  },
  leave: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}/leave`)
  },
  match: async (competitionId: number, limit?: number): Promise<{ matches: MatchResult[]; total: number }> => {
    const params: Record<string, string> = { competition_id: String(competitionId) }
    if (limit) params.limit = String(limit)
    const response = await api.get('/teams/match', { params })
    return response.data
  },
  invite: async (teamId: number, userId: number): Promise<{ invitation: TeamInvite }> => {
    const response = await api.post<{ invitation: TeamInvite }>(`/teams/${teamId}/invite`, { user_id: userId })
    return response.data
  },
  listInvites: async (teamId: number): Promise<{ invitations: TeamInvite[] }> => {
    const response = await api.get<{ invitations: TeamInvite[] }>(`/teams/${teamId}/invites`)
    return response.data
  },
  myInvites: async (): Promise<{ invitations: TeamInvite[] }> => {
    const response = await api.get<{ invitations: TeamInvite[] }>('/teams/invites/me')
    return response.data
  },
  acceptInvite: async (code: string): Promise<void> => {
    await api.post(`/teams/invite/${code}/accept`)
  },
  declineInvite: async (code: string): Promise<void> => {
    await api.post(`/teams/invite/${code}/decline`)
  },
  analysis: async (teamId: number): Promise<TeamAnalysis> => {
    const response = await api.get<TeamAnalysis>(`/teams/${teamId}/analysis`)
    return response.data
  }
}

// Subscriptions API
export const subscriptionsAPI = {
  list: async (): Promise<{ subscriptions: CompetitionSubscription[]; total: number }> => {
    const response = await api.get('/subscriptions')
    return response.data
  },
  subscribe: async (compId: number, remindDaysBefore?: number): Promise<{ subscription: CompetitionSubscription }> => {
    const body = remindDaysBefore ? { remind_days_before: remindDaysBefore } : {}
    const response = await api.post<{ subscription: CompetitionSubscription }>(`/subscriptions/${compId}`, body)
    return response.data
  },
  unsubscribe: async (compId: number): Promise<void> => {
    await api.delete(`/subscriptions/${compId}`)
  },
  check: async (compId: number): Promise<{ subscribed: boolean; subscription: CompetitionSubscription | null }> => {
    const response = await api.get(`/subscriptions/${compId}/check`)
    return response.data
  },
  reminders: async (): Promise<{ reminders: Array<{ competition: Competition; subscription: CompetitionSubscription; days_until: number }>; total: number }> => {
    const response = await api.get('/subscriptions/reminders')
    return response.data
  },
  updateSettings: async (compId: number, remindDaysBefore: number): Promise<{ subscription: CompetitionSubscription }> => {
    const response = await api.put<{ subscription: CompetitionSubscription }>(`/subscriptions/${compId}`, { remind_days_before: remindDaysBefore })
    return response.data
  }
}

// Workflows API
export const workflowsAPI = {
  list: async (params?: { tab?: string }): Promise<{ workflows: ApprovalWorkflow[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/workflows', { params })
    return response.data
  },
  get: async (id: number): Promise<{ workflow: ApprovalWorkflow }> => {
    const response = await api.get(`/workflows/${id}`)
    return response.data
  },
  approve: async (id: number, comment?: string): Promise<void> => {
    await api.post(`/workflows/${id}/approve`, { comment })
  },
  reject: async (id: number, comment?: string): Promise<void> => {
    await api.post(`/workflows/${id}/reject`, { comment })
  }
}

// PrePlans API
export const prePlansAPI = {
  list: async (params?: Record<string, string>): Promise<{ pre_plans: PrePlan[] }> => {
    const response = await api.get<{ pre_plans: PrePlan[] }>('/pre-plans', { params })
    return response.data
  },
  get: async (id: number): Promise<{ pre_plan: PrePlan }> => {
    const response = await api.get<{ pre_plan: PrePlan }>(`/pre-plans/${id}`)
    return response.data
  },
  create: async (data: Partial<PrePlan>): Promise<{ pre_plan: PrePlan }> => {
    const response = await api.post<{ pre_plan: PrePlan }>('/pre-plans', data)
    return response.data
  },
  update: async (id: number, data: Partial<PrePlan>): Promise<{ pre_plan: PrePlan }> => {
    const response = await api.put<{ pre_plan: PrePlan }>(`/pre-plans/${id}`, data)
    return response.data
  },
  review: async (id: number): Promise<{ pre_plan: PrePlan; review: Record<string, unknown> }> => {
    const response = await api.post<{ pre_plan: PrePlan; review: Record<string, unknown> }>(`/pre-plans/${id}/review`)
    return response.data
  }
}

// Awards API
export const awardsAPI = {
  list: async (params?: Record<string, string>): Promise<{ awards: Award[] }> => {
    const response = await api.get<{ awards: Award[] }>('/awards', { params })
    return response.data
  },
  get: async (id: number): Promise<{ award: Award }> => {
    const response = await api.get<{ award: Award }>(`/awards/${id}`)
    return response.data
  },
  create: async (data: Partial<Award>): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>('/awards', data)
    return response.data
  },
  settle: async (id: number, prizeAmount?: number): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>(`/awards/${id}/settle`, { prize_amount: prizeAmount ?? 0 })
    return response.data
  }
}

// Evaluations API
export const evaluationsAPI = {
  list: async (params?: Record<string, string>): Promise<{ evaluations: StudentEvaluation[] }> => {
    const response = await api.get<{ evaluations: StudentEvaluation[] }>('/evaluations', { params })
    return response.data
  },
  create: async (data: Partial<StudentEvaluation>): Promise<{ evaluation: StudentEvaluation }> => {
    const response = await api.post<{ evaluation: StudentEvaluation }>('/evaluations', data)
    return response.data
  }
}

// Registrations API
export const registrationsAPI = {
  list: async (params?: Record<string, string>): Promise<{ registrations: CompetitionRegistration[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/registrations', { params })
    return response.data
  },
  get: async (id: number): Promise<{ registration: CompetitionRegistration }> => {
    const response = await api.get(`/registrations/${id}`)
    return response.data
  },
  approve: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/registrations/${id}/approve`)
    return response.data
  },
  reject: async (id: number, reason?: string): Promise<{ message: string }> => {
    const response = await api.post(`/registrations/${id}/reject`, { reason })
    return response.data
  },
  competitionRegistrations: async (compId: number, params?: Record<string, string>): Promise<{ registrations: CompetitionRegistration[]; total: number; stats: Record<string, number> }> => {
    const response = await api.get(`/competitions/${compId}/registrations`, { params })
    return response.data
  },
  register: async (compId: number, remark?: string): Promise<{ registration: CompetitionRegistration; message: string }> => {
    const response = await api.post(`/competitions/${compId}/register`, { remark })
    return response.data
  },
  deregister: async (compId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/competitions/${compId}/register`)
    return response.data
  },
  batchApprove: async (ids: number[]): Promise<{ message: string; approved: number; not_found: number[]; not_pending: number[]; total: number }> => {
    const response = await api.post('/registrations/batch-approve', { ids })
    return response.data
  },
  batchReject: async (ids: number[], reason?: string): Promise<{ message: string; rejected: number; not_found: number[]; not_pending: number[]; total: number }> => {
    const response = await api.post('/registrations/batch-reject', { ids, reason })
    return response.data
  }
}

// Stats API
export const statsAPI = {
  overview: async (): Promise<StatsOverview> => {
    const response = await api.get<StatsOverview>('/stats/overview')
    return response.data
  },
  competitions: async (): Promise<{ competitions: CompetitionStat[] }> => {
    const response = await api.get<{ competitions: CompetitionStat[] }>('/stats/competitions')
    return response.data
  },
  teachers: async (): Promise<{ teachers: TeacherStat[] }> => {
    const response = await api.get<{ teachers: TeacherStat[] }>('/stats/teachers')
    return response.data
  },
  leaderboard: async (): Promise<{ leaderboard: LeaderboardEntry[] }> => {
    const response = await api.get<{ leaderboard: LeaderboardEntry[] }>('/leaderboard')
    return response.data
  },
  showcase: async (): Promise<ShowcaseData> => {
    const response = await api.get<ShowcaseData>('/showcase')
    return response.data
  },
  exportOverview: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/overview', { responseType: 'blob' })
    return response.data
  },
  exportCompetitions: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/competitions', { responseType: 'blob' })
    return response.data
  },
  trends: async (): Promise<{ trends: TrendPoint[]; total: number }> => {
    const response = await api.get<{ trends: TrendPoint[]; total: number }>('/stats/trends')
    return response.data
  },
  students: async (): Promise<StudentStats> => {
    const response = await api.get<StudentStats>('/stats/students')
    return response.data
  },
  progress: async (): Promise<{ competitions: CompetitionProgress[] }> => {
    const response = await api.get<{ competitions: CompetitionProgress[] }>('/stats/progress')
    return response.data
  },
  typeDistribution: async (): Promise<{ types: TypeDistributionItem[] }> => {
    const response = await api.get<{ types: TypeDistributionItem[] }>('/stats/type-distribution')
    return response.data
  },
  recentActivity: async (limit?: number): Promise<{ activities: ActivityItem[]; total: number }> => {
    const params: Record<string, string> = {}
    if (limit) params.limit = String(limit)
    const response = await api.get<{ activities: ActivityItem[]; total: number }>('/stats/recent-activity', { params })
    return response.data
  },
  exportTeams: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/teams', { responseType: 'blob' })
    return response.data
  },
  engagement: async (): Promise<EngagementStats> => {
    const response = await api.get<EngagementStats>('/stats/engagement')
    return response.data
  },
  kanban: async (): Promise<KanbanData> => {
    const response = await api.get<KanbanData>('/stats/kanban')
    return response.data
  },
  exportFull: async (): Promise<Blob> => {
    const response = await api.get('/stats/export/full', { responseType: 'blob' })
    return response.data
  },
  healthScore: async (): Promise<{
    overall_score: number; level: string;
    dimensions: Array<{ name: string; score: number; weight: number; details: string }>;
    summary: string; timestamp: string;
  }> => {
    const response = await api.get('/stats/health-score')
    return response.data
  },
  popularity: async (limit?: number): Promise<{
    competitions: Array<{
      id: number; title: string; type: string; status: string;
      team_count: number; student_count: number; registration_count: number;
      preplan_count: number; award_count: number; popularity_score: number; rank: number;
    }>; total: number; formula: string;
  }> => {
    const params: Record<string, string> = {}
    if (limit) params.limit = String(limit)
    const response = await api.get('/stats/popularity', { params })
    return response.data
  },
  insights: async (): Promise<{
    summary: string; overall_health: string;
    insights: Array<{ category: string; title: string; description: string; severity: string; metric?: number; action?: string }>;
    trend_analysis: { competitions_growth: number; teams_growth: number; awards_growth: number; active_competitions: number; completion_rate: number; ai_audit_rate: number };
    risk_matrix: Array<{ factor: string; impact: string; likelihood: string; score: number; mitigation: string }>;
    recommendations: Array<{ category: string; title: string; description: string; severity: string; action?: string }>;
    activity_bursts: Array<{ period: string; count: number; competitions: string[] }>;
    generated_at: string;
  }> => {
    const response = await api.get('/stats/insights')
    return response.data
  },
  annualReport: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/report/annual')
    return response.data
  }
}

// System Diagnostics API
export const systemAPI = {
  diagnostics: async (): Promise<{
    status: string; uptime_seconds: number; uptime_human: string; go_version: string;
    num_cpu: number; num_goroutine: number;
    db_pool_stats: { open_connections: number; in_use: number; idle: number; wait_count: number; wait_duration: string; max_open_conns: number };
    memory_stats: { alloc_mb: number; total_alloc_mb: number; sys_mb: number; num_gc: number; heap_alloc_mb: number; heap_sys_mb: number; heap_idle_mb: number; heap_inuse_mb: number };
    timestamp: string;
  }> => {
    const response = await api.get('/system/diagnostics')
    return response.data
  }
}

// Audit Logs API
export const auditAPI = {
  list: async (params?: { page?: number; page_size?: number; action?: string; user_id?: number }): Promise<{ logs: AuditLog[]; total: number; page: number; page_size: number; total_pages: number }> => {
    const response = await api.get('/audit-logs', { params })
    return response.data
  },
  stats: async (): Promise<AuditStats> => {
    const response = await api.get<AuditStats>('/audit-logs/stats')
    return response.data
  }
}

// Calendar API
export const calendarAPI = {
  list: async (month?: string): Promise<{ events: CalendarEvent[]; month: string; total: number }> => {
    const response = await api.get<{ events: CalendarEvent[]; month: string; total: number }>('/calendar', { params: month ? { month } : {} })
    return response.data
  },
  exportICS: async (): Promise<Blob> => {
    const response = await api.get('/calendar/export', { responseType: 'blob' })
    return response.data
  }
}

// Notifications API
export const notificationsAPI = {
  list: async (params?: { unread?: boolean; page?: number; page_size?: number }): Promise<{ items: Notification[]; total: number; unread_count: number }> => {
    const response = await api.get('/notifications', { params })
    return response.data
  },
  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get('/notifications/unread-count')
    return response.data
  },
  markRead: async (id: number): Promise<void> => {
    await api.post(`/notifications/${id}/read`)
  },
  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/read-all')
  },
  create: async (data: { user_id: number; type: string; title: string; message?: string }): Promise<{ notification: Notification }> => {
    const response = await api.post<{ notification: Notification }>('/notifications', data)
    return response.data
  }
}

// Global Search API
export const searchAPI = {
  search: async (query: string): Promise<{ results: SearchResult[]; total: number; query: string }> => {
    const response = await api.get<{ results: SearchResult[]; total: number; query: string }>('/search', { params: { q: query } })
    return response.data
  }
}

// Profile API
export const profileAPI = {
  getMyProfile: async (): Promise<{ profile: UserProfile }> => {
    const response = await api.get<{ profile: UserProfile }>('/users/profile/me')
    return response.data
  },
  getProfile: async (id: number): Promise<{ profile: UserProfile }> => {
    const response = await api.get<{ profile: UserProfile }>(`/users/profile/${id}`)
    return response.data
  },
  updateProfile: async (data: Partial<UserProfile>): Promise<{ message: string; user: Partial<UserProfile> }> => {
    const response = await api.put('/users/profile', data)
    return response.data
  },
  searchUsers: async (query?: string, role?: string): Promise<{ users: UserSummary[]; total: number }> => {
    const params: Record<string, string> = {}
    if (query) params.q = query
    if (role) params.role = role
    const response = await api.get('/users', { params })
    return response.data
  },
  myActivity: async (limit?: number): Promise<{ activities: Array<{ id: number; type: string; title: string; detail: string; created_at: string }> }> => {
    const params: Record<string, string> = {}
    if (limit) params.limit = String(limit)
    const response = await api.get('/users/me/activity', { params })
    return response.data
  }
}

// Achievement Points API
export const pointsAPI = {
  list: async (): Promise<{ points: AchievementPoint[]; total: number; count: number }> => {
    const response = await api.get('/points')
    return response.data
  },
  me: async (): Promise<PointsSummary> => {
    const response = await api.get<PointsSummary>('/points/me')
    return response.data
  },
  leaderboard: async (limit?: number): Promise<{ leaderboard: PointsLeaderboardEntry[]; count: number }> => {
    const params: Record<string, string> = {}
    if (limit) params.limit = String(limit)
    const response = await api.get('/points/leaderboard', { params })
    return response.data
  },
  history: async (userId: number): Promise<{ points: AchievementPoint[]; total: number }> => {
    const response = await api.get(`/points/history/${userId}`)
    return response.data
  },
  award: async (data: { user_id: number; points: number; reason: string; source?: string; source_id?: number }): Promise<AchievementPoint> => {
    const response = await api.post('/points/award', data)
    return response.data
  }
}

// Competition comparison
export const comparisonAPI = {
  compare: async (ids: number[]): Promise<CompareResponse> => {
    const response = await api.get<CompareResponse>(`/competitions/compare?ids=${ids.join(',')}`)
    return response.data
  }
}

// Student growth profile
export const growthAPI = {
  getProfile: async (userId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/students/${userId}/growth`)
    return response.data
  }
}

// Personalized learning path
export const learningPathAPI = {
  getPath: async (userId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/students/${userId}/learning-path`)
    return response.data
  }
}

// Competition notes
export const notesAPI = {
  listByCompetition: async (compId: number, page = 1, pageSize = 20): Promise<Record<string, unknown>> => {
    const response = await api.get(`/competitions/${compId}/notes`, { params: { page, page_size: pageSize } })
    return response.data
  },
  listMy: async (page = 1, pageSize = 20): Promise<Record<string, unknown>> => {
    const response = await api.get('/notes', { params: { page, page_size: pageSize } })
    return response.data
  },
  get: async (noteId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/notes/${noteId}`)
    return response.data
  },
  create: async (compId: number, data: { title: string; content: string; color?: string; pinned?: boolean }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/competitions/${compId}/notes`, data)
    return response.data
  },
  update: async (noteId: number, data: { title?: string; content?: string; color?: string; pinned?: boolean }): Promise<Record<string, unknown>> => {
    const response = await api.put(`/notes/${noteId}`, data)
    return response.data
  },
  delete: async (noteId: number): Promise<Record<string, unknown>> => {
    const response = await api.delete(`/notes/${noteId}`)
    return response.data
  }
}

// Competition Feedback API
export const feedbackAPI = {
  submit: async (compId: number, data: {
    competition_id: number; overall_rating: number; content_rating?: number;
    org_rating?: number; fairness_rating?: number; learning_value?: number;
    comment?: string; anonymous?: boolean; skills?: string[];
  }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/competitions/${compId}/feedback`, data)
    return response.data
  },
  listByCompetition: async (compId: number, page = 1, pageSize = 20): Promise<Record<string, unknown>> => {
    const response = await api.get(`/competitions/${compId}/feedback`, { params: { page, page_size: pageSize } })
    return response.data
  },
  summary: async (compId: number): Promise<FeedbackSummary> => {
    const response = await api.get<FeedbackSummary>(`/competitions/${compId}/feedback/summary`)
    return response.data
  },
  myFeedback: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/feedback/me')
    return response.data
  },
  delete: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.delete(`/feedback/${id}`)
    return response.data
  }
}

// RAG API (via backend proxy to AI service)
export const ragAPI = {
  query: async (question: string, topK?: number): Promise<{ answer: string; sources: unknown[] }> => {
    const response = await api.post<{ answer: string; sources: unknown[] }>('/rag/query', { question, top_k: topK || 5 })
    return response.data
  },
  ingest: async (content: string, metadata?: Record<string, unknown>): Promise<{ id: number }> => {
    const response = await api.post<{ id: number }>('/rag/ingest', { content, metadata })
    return response.data
  },
  search: async (question: string, topK?: number): Promise<{ results: unknown[] }> => {
    const response = await api.post<{ results: unknown[] }>('/rag/search', { question, top_k: topK || 5 })
    return response.data
  },
  listDocuments: async (limit?: number, offset?: number): Promise<{ documents: RAGDocument[]; total_chunks: number; total_documents: number }> => {
    const response = await api.get('/rag/documents', { params: { limit, offset } })
    return response.data
  },
  deleteDocument: async (filename: string): Promise<{ message: string; chunks_deleted: number }> => {
    const response = await api.delete(`/rag/documents/${encodeURIComponent(filename)}`)
    return response.data
  },
  getStats: async (): Promise<RAGStats> => {
    const response = await api.get<RAGStats>('/rag/stats')
    return response.data
  },
  uploadFile: async (file: File): Promise<{ message: string; filename: string; chunk_count: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/rag/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    return response.data
  },
  getDocumentChunks: async (filename: string): Promise<{ filename: string; chunks: { id: number; content: string; metadata: unknown; similarity?: number }[]; total: number }> => {
    const response = await api.get(`/rag/documents/${encodeURIComponent(filename)}/chunks`)
    return response.data
  },
  batchIngest: async (items: { content: string; metadata?: Record<string, unknown> }[]): Promise<{ ingested: number; errors: number }> => {
    const response = await api.post('/rag/ingest/batch', { items })
    return response.data
  },
  batchUpload: async (files: File[]): Promise<{ uploaded: number; errors: number; details: { filename: string; chunks: number }[] }> => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const response = await api.post('/rag/upload/batch', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    return response.data
  }
}
