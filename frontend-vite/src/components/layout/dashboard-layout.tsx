import type { ReactNode } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { CustomCursor } from '../effects/custom-cursor';
import { useAppStore } from '@/stores/app';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, page } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Smooth theme toggle — no page reload
  const handleToggleTheme = useCallback(() => {
    const html = document.documentElement;
    html.classList.add('theme-transitioning');
    toggleTheme();
    setTimeout(() => html.classList.remove('theme-transitioning'), 600);
  }, [toggleTheme]);

  // Close sidebar on page change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [page]);

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
