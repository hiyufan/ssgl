import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { Spinner } from '@/components/ui/spinner';
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

function App() {
  const { isAuthenticated, loading, checkAuth } = useAuthStore();
  const { page } = useAppStore();

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

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard />;
      case 'competitions':  return <CompetitionsPage />;
      case 'teams':         return <TeamsPage />;
      case 'approvals':     return <ApprovalsPage />;
      case 'preplans':      return <PrePlansPage />;
      case 'awards':        return <AwardsPage />;
      case 'evaluations':   return <EvaluationsPage />;
      case 'stats':         return <StatsPage />;
      case 'aitools':       return <AIToolsPage />;
      case 'knowledge-base':return <KnowledgeBasePage />;
      case 'audit-logs':    return <AuditLogsPage />;
      default:              return <Dashboard />;
    }
  };

  return (
    <DashboardLayout>
      <PageTransition page={page}>
        {renderPage()}
      </PageTransition>
    </DashboardLayout>
  );
}

export default App;
