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
import { AIToolsPage } from '@/pages/aitools';
import { KnowledgeBasePage } from '@/pages/knowledge-base';
import { AuditLogsPage } from '@/pages/audit-logs';

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/preplans" element={<PrePlansPage />} />
        <Route path="/awards" element={<AwardsPage />} />
        <Route path="/evaluations" element={<EvaluationsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/aitools" element={<AIToolsPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route
          path="/audit-logs"
          element={
            <RequireRole roles={['admin']}>
              <AuditLogsPage />
            </RequireRole>
          }
        />
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
