import { useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useRole, type Role } from '@/hooks/use-role';
import { Spinner } from '@/components/ui/spinner';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoginPage } from '@/pages/login';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageTransition } from '@/components/layout/page-transition';
import { Dashboard } from '@/pages/dashboard';
import { CompetitionsPage } from '@/pages/competitions';
import { TeamsPage } from '@/pages/teams';
import { ApprovalsPage } from '@/pages/approvals';
import { PrePlansPage } from '@/pages/preplans';
import { AwardsPage } from '@/pages/awards';
import { EvaluationsPage } from '@/pages/evaluations';
import { StatsPage } from '@/pages/stats';
import { KanbanPage } from '@/pages/kanban';
import { AIToolsPage } from '@/pages/aitools';
import { CoachPage } from '@/pages/coach';
import { KnowledgeBasePage } from '@/pages/knowledge-base';
import { AuditLogsPage } from '@/pages/audit-logs';
import { RegistrationsPage } from '@/pages/registrations';
import { CalendarPage } from '@/pages/calendar';
import { LeaderboardPage } from '@/pages/leaderboard';
import { ShowcasePage } from '@/pages/showcase';
import { AchievementGalleryPage } from '@/pages/achievement-gallery';
import { ProfilePage } from '@/pages/profile';
import { DiagnosticsPage } from '@/pages/diagnostics';
import { NotificationsPage } from '@/pages/notifications';
import { InsightsPage } from '@/pages/insights';
import { PointsPage } from '@/pages/points';

/** Restricts a route to one or more roles; otherwise redirects to the dashboard. */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const role = useRole();
  if (!roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <PageTransition page={location.pathname}>
      <Routes location={location}>
        {/* 任意已登录角色 */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/evaluations" element={<EvaluationsPage />} />
        <Route path="/aitools" element={<AIToolsPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/showcase" element={<ShowcasePage />} />
        <Route path="/achievement-gallery" element={<AchievementGalleryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/points" element={<PointsPage />} />

        {/* teacher + admin */}
        <Route path="/approvals" element={<RequireRole roles={['teacher', 'admin']}><ApprovalsPage /></RequireRole>} />
        <Route path="/insights" element={<RequireRole roles={['teacher', 'admin']}><InsightsPage /></RequireRole>} />
        <Route path="/registrations" element={<RequireRole roles={['teacher', 'admin']}><RegistrationsPage /></RequireRole>} />
        <Route path="/awards" element={<RequireRole roles={['teacher', 'admin']}><AwardsPage /></RequireRole>} />
        <Route path="/stats" element={<RequireRole roles={['teacher', 'admin']}><StatsPage /></RequireRole>} />
        <Route path="/kanban" element={<RequireRole roles={['teacher', 'admin']}><KanbanPage /></RequireRole>} />
        <Route path="/knowledge-base" element={<RequireRole roles={['teacher', 'admin']}><KnowledgeBasePage /></RequireRole>} />

        {/* all roles — students manage, teachers review, admins oversee */}
        <Route path="/preplans" element={<PrePlansPage />} />

        {/* admin only */}
        <Route path="/audit-logs" element={<RequireRole roles={['admin']}><AuditLogsPage /></RequireRole>} />
        <Route path="/diagnostics" element={<RequireRole roles={['admin']}><DiagnosticsPage /></RequireRole>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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
