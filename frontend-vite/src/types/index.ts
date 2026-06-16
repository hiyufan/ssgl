// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  avatar?: string;
  dept?: string;
  student_id?: string;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

// Competition types
export interface Competition {
  id: number;
  title: string;
  description?: string;
  type: 'hackathon' | 'innovation' | 'research';
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  max_team_size: number;
  min_team_size: number;
  registration_deadline: string;
  start_date: string;
  end_date: string;
  location?: string;
  organizer_id: number;
  prize?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
  organizer?: User;
  teams_count?: number;
}

// Team types
export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: 'leader' | 'member';
  joined_at: string;
  user?: User;
}

export interface Team {
  id: number;
  name: string;
  competition_id: number;
  leader_id: number;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
  competition?: Competition;
  leader?: User;
  members?: TeamMember[];
}

// Workflow types
export interface ApprovalStep {
  id: number;
  workflow_id: number;
  step_order: number;
  approver_id: number;
  action: 'pending' | 'approved' | 'rejected' | 'waiting';
  comment?: string;
  acted_at?: string;
  approver?: User;
}

export interface ApprovalWorkflow {
  id: number;
  type: 'registration' | 'pre_plan' | 'reward';
  target_id: number;
  current_step: number;
  total_steps: number;
  status: 'pending' | 'approved' | 'rejected';
  submitter_id: number;
  created_at: string;
  updated_at: string;
  submitter?: User;
  steps?: ApprovalStep[];
  title?: string;
}

// PrePlan types
export interface PrePlan {
  id: number;
  competition_id: number;
  team_id: number;
  title: string;
  tech_stack?: string;
  target_audience?: string;
  market_analysis?: string;
  innovation?: string;
  expected_outcome?: string;
  timeline?: string;
  ai_review_score?: number;
  ai_review_notes?: string;
  ai_dimensions?: { label: string; score: number }[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  competition?: Competition;
  team?: Team;
}

// Award types
export interface Award {
  id: number;
  competition_id: number;
  team_id: number;
  rank: number;
  rank_name?: string;
  prize_name?: string;
  prize_amount?: string;
  status: 'pending' | 'teacher_confirm' | 'settled';
  nominated_at: string;
  settled_at?: string;
  settled_by?: number;
  created_at: string;
  updated_at: string;
  competition?: Competition;
  team?: Team;
}

// Evaluation types
export interface StudentEvaluation {
  id: number;
  student_id: number;
  teacher_id: number;
  competition_id: number;
  teaching: number;
  communication: number;
  availability: number;
  overall: number;
  feedback?: string;
  submitted_at: string;
  status: 'pending' | 'submitted';
  student?: User;
  teacher?: User;
  competition?: Competition;
}

// Stats types
export interface StatsOverview {
  total_competitions: number;
  ongoing_competitions: number;
  total_teams: number;
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_awards: number;
  total_pre_plans?: number;
  total_evaluations?: number;
  published_competitions?: number;
  settled_awards?: number;
}

export interface TeacherStat {
  id: number;
  teacher_id?: number;
  name: string;
  dept: string;
  guided: number;
  win_rate: number;
  avg_rating: number;
  avg_overall?: number;
  avg_score?: number;
  eval_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  team_id: number;
  team_name: string;
  leader_name: string;
  competition_count: number;
  award_count: number;
  pre_plan_count: number;
  score: number;
}

// Audit Log types
export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  user_agent: string;
  request_id: string;
  status: number;
  duration: number;
  body: string;
  created_at: string;
}

export interface AuditStats {
  total_logs: number;
  today_logs: number;
  failed_logins: number;
  top_actions: { action: string; count: number }[];
}

// RAG types
export interface RAGDocument {
  filename: string;
  chunk_count: number;
  created_at: string;
}

export interface RAGStats {
  total_chunks: number;
  total_documents: number;
  recent_documents: RAGDocument[];
}

// Calendar types
export interface CalendarEvent {
  id: number;
  title: string;
  type: 'hackathon' | 'innovation' | 'research';
  status: string;
  start_date: string;
  end_date: string;
  location?: string;
  tags?: string;
}

// Team Invite types
export interface TeamInvite {
  id: number;
  team_id: number;
  inviter_id: number;
  invitee_id: number;
  code: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  team?: Team;
  inviter?: User;
  invitee?: User;
}

// Teammate Matching types
export interface MatchResult {
  user_id: number;
  username: string;
  name: string;
  dept: string;
  avatar: string;
  team_count: number;
  award_count: number;
  pre_plan_count: number;
  match_score: number;
  reason: string;
}

export interface ShowcaseEntry {
  id: number;
  competition_id: number;
  competition_name: string;
  comp_type: string;
  team_id: number;
  team_name: string;
  leader_name: string;
  rank: number;
  rank_name: string;
  prize_name: string;
  prize_amount: number;
  settled_at: string;
}

export interface ShowcaseData {
  entries: ShowcaseEntry[];
  total_awards: number;
  total_prize: number;
  total_teams: number;
  comp_count: number;
  top_teams: ShowcaseEntry[];
}

// Milestone types
export interface Milestone {
  id: number;
  competition_id: number;
  title: string;
  description?: string;
  type: 'registration' | 'submission' | 'review' | 'defense' | 'award' | 'custom';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  start_date?: string;
  due_date: string;
  completed_at?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  competition?: Competition;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  user: User;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
