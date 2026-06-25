import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useRole, type Role } from '@/hooks/use-role';
import { Spinner } from '@/components/ui/spinner';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoginPage } from '@/pages/login';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageTransition } from '@/components/layout/page-transition';

// Lazy-loaded pages — only downloaded when the user navigates to them
const Dashboard = lazy(() => import('@/pages/dashboard').then(m => ({ default: m.Dashboard })));
const CompetitionsPage = lazy(() => import('@/pages/competitions').then(m => ({ default: m.CompetitionsPage })));
const TeamsPage = lazy(() => import('@/pages/teams').then(m => ({ default: m.TeamsPage })));
const ApprovalsPage = lazy(() => import('@/pages/approvals').then(m => ({ default: m.ApprovalsPage })));
const PrePlansPage = lazy(() => import('@/pages/preplans').then(m => ({ default: m.PrePlansPage })));
const AwardsPage = lazy(() => import('@/pages/awards').then(m => ({ default: m.AwardsPage })));
const EvaluationsPage = lazy(() => import('@/pages/evaluations').then(m => ({ default: m.EvaluationsPage })));
const StatsPage = lazy(() => import('@/pages/stats').then(m => ({ default: m.StatsPage })));
const KanbanPage = lazy(() => import('@/pages/kanban').then(m => ({ default: m.KanbanPage })));
const AIToolsPage = lazy(() => import('@/pages/aitools').then(m => ({ default: m.AIToolsPage })));
const CoachPage = lazy(() => import('@/pages/coach').then(m => ({ default: m.CoachPage })));
const KnowledgeBasePage = lazy(() => import('@/pages/knowledge-base').then(m => ({ default: m.KnowledgeBasePage })));
const AuditLogsPage = lazy(() => import('@/pages/audit-logs').then(m => ({ default: m.AuditLogsPage })));
const RegistrationsPage = lazy(() => import('@/pages/registrations').then(m => ({ default: m.RegistrationsPage })));
const CalendarPage = lazy(() => import('@/pages/calendar').then(m => ({ default: m.CalendarPage })));
const LeaderboardPage = lazy(() => import('@/pages/leaderboard').then(m => ({ default: m.LeaderboardPage })));
const ShowcasePage = lazy(() => import('@/pages/showcase').then(m => ({ default: m.ShowcasePage })));
const AchievementGalleryPage = lazy(() => import('@/pages/achievement-gallery').then(m => ({ default: m.AchievementGalleryPage })));
const ProfilePage = lazy(() => import('@/pages/profile').then(m => ({ default: m.ProfilePage })));
const DiagnosticsPage = lazy(() => import('@/pages/diagnostics').then(m => ({ default: m.DiagnosticsPage })));
const NotificationsPage = lazy(() => import('@/pages/notifications').then(m => ({ default: m.NotificationsPage })));
const InsightsPage = lazy(() => import('@/pages/insights').then(m => ({ default: m.InsightsPage })));
const PointsPage = lazy(() => import('@/pages/points').then(m => ({ default: m.PointsPage })));
const ComparePage = lazy(() => import('@/pages/compare').then(m => ({ default: m.ComparePage })));
const GrowthPage = lazy(() => import('@/pages/growth').then(m => ({ default: m.GrowthPage })));
const LearningPathPage = lazy(() => import('@/pages/learning-path').then(m => ({ default: m.LearningPathPage })));
const AnnualReportPage = lazy(() => import('@/pages/annual-report').then(m => ({ default: m.AnnualReportPage })));
const AnalyticsPage = lazy(() => import('@/pages/analytics').then(m => ({ default: m.AnalyticsPage })));
const ExecutionMatchPage = lazy(() => import('@/pages/execution-match').then(m => ({ default: m.ExecutionMatchPage })));
const AssistantPage = lazy(() => import('@/pages/assistant').then(m => ({ default: m.AssistantPage })));
const FeedbackPage = lazy(() => import('@/pages/feedback').then(m => ({ default: m.default })));

/** Restricts a route to one or more roles; otherwise redirects to the dashboard. */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const role = useRole();
  if (!roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Spinner size={24} /></div>}>
      {children}
    </Suspense>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <PageTransition page={location.pathname}>
      <PageSuspense>
        <Routes location={location}>
          {/* 任意已登录角色 */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/competitions" element={<CompetitionsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/aitools" element={<AIToolsPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/showcase" element={<ShowcasePage />} />
          <Route path="/achievement-gallery" element={<AchievementGalleryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/growth" element={<GrowthPage />} />
          <Route path="/learning-path" element={<LearningPathPage />} />
          <Route path="/annual-report" element={<RequireRole roles={['teacher', 'admin']}><AnnualReportPage /></RequireRole>} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/execution-match" element={<ExecutionMatchPage />} />
          <Route path="/assistant" element={<AssistantPage />} />

          {/* teacher + admin */}
          <Route path="/approvals" element={<RequireRole roles={['teacher', 'admin']}><ApprovalsPage /></RequireRole>} />
          <Route path="/insights" element={<RequireRole roles={['teacher', 'admin']}><InsightsPage /></RequireRole>} />
          <Route path="/registrations" element={<RequireRole roles={['teacher', 'admin']}><RegistrationsPage /></RequireRole>} />
          <Route path="/awards" element={<RequireRole roles={['teacher', 'admin']}><AwardsPage /></RequireRole>} />
          <Route path="/stats" element={<RequireRole roles={['teacher', 'admin']}><StatsPage /></RequireRole>} />
          <Route path="/kanban" element={<RequireRole roles={['teacher', 'admin']}><KanbanPage /></RequireRole>} />
          <Route path="/knowledge-base" element={<RequireRole roles={['student', 'teacher', 'admin']}><KnowledgeBasePage /></RequireRole>} />

          {/* all roles — students manage, teachers review, admins oversee */}
          <Route path="/preplans" element={<PrePlansPage />} />

          {/* admin only */}
          <Route path="/audit-logs" element={<RequireRole roles={['admin']}><AuditLogsPage /></RequireRole>} />
          <Route path="/diagnostics" element={<RequireRole roles={['admin']}><DiagnosticsPage /></RequireRole>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </PageSuspense>
    </PageTransition>
  );
}

function App() {
  const { isAuthenticated, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </DashboardLayout>
  );
}

export default App;
