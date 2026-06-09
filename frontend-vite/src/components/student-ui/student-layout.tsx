import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AuroraBg } from './aurora-bg';
import { StudentSidebar } from './student-sidebar';
import { StudentTopBar } from './student-topbar';
import { useAppStore } from '@/stores/app';
import '@/styles/student.css';

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { theme } = useAppStore();

  // Apply theme on mount (same as DashboardLayout)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="student-root" data-theme={theme} style={{
      display: 'flex',
      height: '100vh',
      background: theme === 'light' ? '#F8F7FF' : '#0A0B14',
      overflow: 'hidden',
      position: 'relative',
      transition: 'background 0.5s ease',
    }}>
      <AuroraBg />
      <StudentSidebar />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        <StudentTopBar />
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '28px 32px',
        }}>
          <div style={{ animation: 's-page-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
