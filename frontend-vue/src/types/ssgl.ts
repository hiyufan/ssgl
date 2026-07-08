// SSGL Business Types - migrated from frontend-vite/src/types/index.ts

// User types
export interface User {
  id: number
  username: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  name: string
  avatar?: string
  dept?: string
  student_id?: string
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

// Competition types
export interface Competition {
  id: number
  title: string
  description?: string
  type: 'hackathon' | 'innovation' | 'research' | 'business_plan' | 'ai_innovation' | 'data_science'
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'
  max_team_size: number
  min_team_size: number
  registration_deadline: string
  start_date: string
  end_date: string
  location?: string
  organizer_id: number
  prize?: string
  tags?: string
  created_at: string
  updated_at: string
  organizer?: User
  teams_count?: number
}

// Team types
export interface TeamMember {
  id: number
  team_id: number
  user_id: number
  role: 'leader' | 'member'
  joined_at: string
  user?: User
}

export interface UserSummary {
  id: number
  username: string
  name: string
  dept?: string
  role?: string
  avatar?: string
}

export interface Team {
  id: number
  name: string
  competition_id: number
  leader_id: number
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
  competition?: Competition
  leader?: User
  members?: TeamMember[]
}

// Workflow types
export interface ApprovalStep {
  id: number
  workflow_id: number
  step_order: number
  approver_id: number
  action: 'pending' | 'approved' | 'rejected' | 'waiting'
  comment?: string
  acted_at?: string
  approver?: User
}

export interface ApprovalWorkflow {
  id: number
  type: 'registration' | 'pre_plan' | 'reward'
  target_id: number
  current_step: number
  total_steps: number
  status: 'pending' | 'approved' | 'rejected'
  submitter_id: number
  created_at: string
  updated_at: string
  submitter?: User
  steps?: ApprovalStep[]
  title?: string
}

// PrePlan types
export interface PrePlan {
  id: number
  competition_id: number
  team_id: number
  title: string
  tech_stack?: string
  target_audience?: string
  market_analysis?: string
  innovation?: string
  expected_outcome?: string
  timeline?: string
  ai_review_score?: number
  ai_review_notes?: string
  ai_dimensions?: { label: string; score: number }[]
  status: 'draft' | 'submitted' | 'under_review' | 'reviewed' | 'approved' | 'rejected'
  submitted_at?: string
  created_at: string
  updated_at: string
  competition?: Competition
  team?: Team
}

// Award types
export interface Award {
  id: number
  competition_id: number
  team_id: number
  rank: number
  rank_name?: string
  prize_name?: string
  prize_amount?: string
  status: 'pending' | 'teacher_confirm' | 'settled'
  nominated_at: string
  settled_at?: string
  settled_by?: number
  created_at: string
  updated_at: string
  competition?: Competition
  team?: Team
}

// Evaluation types
export interface StudentEvaluation {
  id: number
  student_id: number
  teacher_id: number
  competition_id: number
  teaching: number
  communication: number
  availability: number
  overall: number
  feedback?: string
  submitted_at: string
  status: 'pending' | 'submitted'
  student?: User
  teacher?: User
  competition?: Competition
}

export interface CompetitionRegistration {
  id: number
  competition_id: number
  user_id: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  remark?: string
  created_at: string
  updated_at: string
  competition?: Competition
  user?: User
}

// Stats types
export interface StatsOverview {
  total_competitions: number
  ongoing_competitions: number
  total_teams: number
  total_users: number
  total_students: number
  total_teachers: number
  total_awards: number
  total_pre_plans?: number
  total_evaluations?: number
  published_competitions?: number
  settled_awards?: number
}

export interface TeacherStat {
  id: number
  name: string
  evaluation_count: number
  avg_teaching: number
  avg_communication: number
  avg_availability: number
  avg_overall: number
}

export interface CompetitionStat {
  id: number
  title: string
  status: string
  team_count: number
  award_count: number
  pre_plan_count: number
}

export interface TrendPoint {
  month: string
  competitions: number
  teams: number
  awards: number
  pre_plans: number
  prize_amount: number
}

export interface TypeDistributionItem {
  type: string
  count: number
}

export interface ActivityItem {
  id: number
  type: string
  title: string
  detail: string
  user_id?: number
  user_name?: string
  created_at: string
}

export interface StudentStats {
  total_students: number
  students_with_teams: number
  students_with_awards: number
  avg_team_size: number
  top_students?: Array<{
    id: number
    name: string
    team_count: number
    award_count: number
    pre_plan_count: number
  }>
}

export interface EngagementStats {
  total_students: number
  students_with_teams: number
  team_formation_rate: number
  total_pre_plans: number
  reviewed_pre_plans: number
  ai_review_rate: number
  avg_pre_plan_score: number
  total_competitions: number
  published_competitions: number
  completion_rate: number
  total_teams: number
  avg_team_size: number
  active_competitions: number
}

export interface CompetitionProgress {
  id: number
  title: string
  status: string
  type: string
  start_date: string
  end_date: string
  team_count: number
  student_count: number
  pre_plan_count: number
  reviewed_count: number
  approved_count: number
  award_count: number
  settled_count: number
  total_prize: number
  progress: number
}

export interface KanbanCompetition {
  id: number
  title: string
  type: string
  team_count: number
  student_count: number
  preplan_count: number
  award_count: number
  progress: number
  start_date: string
  end_date: string
  days_remaining: number
}

export interface KanbanColumn {
  status: string
  label: string
  count: number
  competitions: KanbanCompetition[]
}

export interface KanbanData {
  columns: KanbanColumn[]
}

export interface LeaderboardEntry {
  rank: number
  team_id: number
  team_name: string
  leader_name: string
  competition_count: number
  award_count: number
  pre_plan_count: number
  score: number
}

// Audit Log types
export interface AuditLog {
  id: number
  user_id: number
  username: string
  action: string
  resource: string
  method: string
  path: string
  ip: string
  user_agent: string
  request_id: string
  status: number
  duration: number
  body: string
  created_at: string
}

export interface AuditStats {
  total_logs: number
  today_logs: number
  failed_logins: number
  top_actions: { action: string; count: number }[]
}

// RAG types
export interface RAGDocument {
  filename: string
  chunk_count: number
  created_at: string
}

export interface RAGStats {
  total_chunks: number
  total_documents: number
  recent_documents: RAGDocument[]
}

// Calendar types
export interface CalendarEvent {
  id: number
  title: string
  type: 'hackathon' | 'innovation' | 'research' | 'business_plan' | 'ai_innovation' | 'data_science'
  status: string
  start_date: string
  end_date: string
  location?: string
  tags?: string
}

// Team Invite types
export interface TeamInvite {
  id: number
  team_id: number
  inviter_id: number
  invitee_id: number
  code: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  team?: Team
  inviter?: User
  invitee?: User
}

// Teammate Matching types
export interface MatchResult {
  user_id: number
  username: string
  name: string
  dept: string
  avatar: string
  team_count: number
  award_count: number
  pre_plan_count: number
  match_score: number
  reason: string
}

export interface TeamMemberAnalysis {
  user_id: number
  name: string
  dept: string
  role: string
  team_count: number
  award_count: number
  pre_plan_count: number
  eval_score: number
  experience: string
}

export interface TeamAnalysis {
  team_id: number
  team_name: string
  competition_id: number
  comp_title: string
  member_count: number
  avg_experience: number
  dept_diversity: number
  dept_breakdown: Record<string, number>
  experience_dist: Record<string, number>
  strengths: string[]
  gaps: string[]
  recommendations: string[]
  members: TeamMemberAnalysis[]
  overall_score: number
}

export interface ShowcaseEntry {
  id: number
  competition_id: number
  competition_name: string
  comp_type: string
  team_id: number
  team_name: string
  leader_name: string
  rank: number
  rank_name: string
  prize_name: string
  prize_amount: number
  settled_at: string
}

export interface ShowcaseData {
  entries: ShowcaseEntry[]
  total_awards: number
  total_prize: number
  total_teams: number
  comp_count: number
  top_teams: ShowcaseEntry[]
}

// Milestone types
export interface Milestone {
  id: number
  competition_id: number
  title: string
  description?: string
  type: 'registration' | 'submission' | 'review' | 'defense' | 'award' | 'custom'
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  start_date?: string
  due_date: string
  completed_at?: string
  sort_order: number
  created_at: string
  updated_at: string
  competition?: Competition
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

// Auth types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  tokens: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  user: User
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface CompetitionSubscription {
  id: number
  user_id: number
  competition_id: number
  remind_days_before: number
  is_active: boolean
  created_at: string
  competition?: Competition
}

// Competition Comparison types
export interface CompetitionComparison {
  id: number
  title: string
  type: string
  status: string
  level: string
  location: string
  tags: string
  max_team_size: number
  min_team_size: number
  team_count: number
  student_count: number
  preplan_count: number
  award_count: number
  avg_team_size: number
  registration_pct: number
  days_until_start: number
  duration_days: number
}

export interface ComparisonSummary {
  most_popular: string
  most_popular_id: number
  best_team_size: string
  best_team_size_id: number
  avg_teams_overall: number
  total_teams: number
  total_students: number
}

export interface CompareResponse {
  competitions: CompetitionComparison[]
  summary: ComparisonSummary
}

// Growth Profile types
export interface GrowthProfile {
  student_id: number
  student_name: string
  generated_at: string
  summary: {
    total_competitions: number
    total_awards: number
    total_teams: number
    total_pre_plans: number
    award_rate: number
    participation_days: number
    top_competition_type: string
  }
  competitions: Array<{
    id: number
    title: string
    type: string
    level: string
    status: string
    team_name?: string
    role?: string
    award_rank?: string
  }>
  awards: Array<{
    id: number
    competition_id: number
    comp_title: string
    rank_name: string
    prize_amount: number
    status: string
    settled_at?: string
  }>
  skills: Array<{ name: string; score: number; count: number }>
  timeline: Array<{ date: string; type: string; title: string; detail?: string }>
  recommendations: string[]
}

// Learning Path types
export interface LearningPath {
  student_id: number
  student_name: string
  generated_at: string
  overall_level: string
  total_points: number
  current_phase: string
  phases: PathPhase[]
  skill_radar: SkillDimension[]
  goals: LearningGoal[]
  resources: LearningResource[]
}

export interface PathPhase {
  id: number
  title: string
  description: string
  status: 'completed' | 'current' | 'upcoming'
  progress: number
  tasks: PathTask[]
  est_duration: string
}

export interface PathTask {
  id: number
  title: string
  type: 'competition' | 'skill' | 'project' | 'study'
  status: 'done' | 'in_progress' | 'pending'
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface SkillDimension {
  name: string
  current: number
  target: number
  level: string
}

export interface LearningGoal {
  id: number
  title: string
  category: string
  target_date: string
  progress: number
  description: string
}

export interface LearningResource {
  id: number
  title: string
  type: 'article' | 'video' | 'course' | 'tool'
  category: string
  url?: string
  duration: string
}

// Notification types
export interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
}

// Search types
export interface SearchResult {
  type: 'competition' | 'team' | 'user'
  id: number
  title: string
  desc: string
}

// Profile types
export interface UserProfile {
  id: number
  username: string
  name: string
  email: string
  role: string
  dept: string
  student_id: string
  phone: string
  avatar: string
  created_at: string
  team_count: number
  award_count: number
  pre_plan_count: number
  competition_count: number
}

// Points types
export interface AchievementPoint {
  id: number
  user_id: number
  points: number
  reason: string
  source: string
  source_id: number
  created_at: string
}

export interface PointsSummary {
  total_points: number
  rank: number
  breakdown: Array<{ reason: string; total: number; count: number }>
}

export interface PointsLeaderboardEntry {
  user_id: number
  name: string
  username: string
  total_points: number
  rank: number
}

// Feedback types
export interface CompetitionFeedback {
  id: number
  competition_id: number
  student_id: number
  overall_rating: number
  content_rating: number
  org_rating: number
  fairness_rating: number
  learning_value: number
  comment: string
  anonymous: boolean
  skills: string
  created_at: string
  student_name?: string
}

export interface FeedbackSummary {
  competition_id: number
  total_feedbacks: number
  avg_overall: number
  avg_content: number
  avg_org: number
  avg_fairness: number
  avg_learning_value: number
  top_skills: Array<{ skill: string; count: number }>
  recent_comments: Array<{ rating: number; comment: string; date: string; anonymous: boolean }>
  rating_distribution: Record<number, number>
}

// AI types
export interface AssistantReply {
  reply: string
  suggestions?: string[]
  tool_calls?: { call: string }[]
  data?: unknown
}

export interface CoachScores {
  innovation: number
  feasibility: number
  business: number
  delivery: number
  completeness: number
}

export interface CoachQuestion {
  id: number
  persona: 'tech' | 'business' | 'product'
  question: string
  rationale: string
}

export interface CoachStart {
  session_id: string
  scores: CoachScores
  overall: number
  verdict: string
  similar_projects: { id: number; preview: string; similarity: number }[]
  questions: CoachQuestion[]
}

export interface CoachFinal {
  scores: CoachScores
  overall: number
  highlights: string[]
  improvements: { priority: 'high' | 'medium'; content: string }[]
  closing: string
}

export interface CoachStartPayload {
  role?: string
  source: 'pre_plan' | 'text'
  pre_plan_id?: number
  pitch_text?: string
  num_questions?: number
}
