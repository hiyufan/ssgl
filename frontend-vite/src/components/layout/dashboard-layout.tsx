import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { CustomCursor } from '../effects/custom-cursor';
import { useAppStore } from '@/stores/app';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { theme } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Apply theme on mount / change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      <CustomCursor />

      {/* Mobile overlay */}
      <div
        className={`forge-sidebar-overlay${sidebarOpen ? ' is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="forge-app">
        <Sidebar isOpen={sidebarOpen} />
        <div className="forge-main">
          <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="forge-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
