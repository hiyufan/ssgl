import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { useAppStore } from '@/stores/app';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { theme } = useAppStore();

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="forge-app">
      <Sidebar />
      <div className="forge-main">
        <TopBar />
        <main className="forge-content">
          {children}
        </main>
      </div>
    </div>
  );
}
