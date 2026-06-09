import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const PAGE_TITLES: Record<string, string> = {
  dashboard: '概览',
  competitions: '赛事大厅',
  teams: '我的团队',
  preplans: '预计划',
  aitools: 'AI 工具箱',
  evaluations: '评价导师',
};

export function StudentTopBar() {
  const { page, theme, toggleTheme } = useAppStore();
  const { user } = useAuthStore();
  const title = PAGE_TITLES[page] || page;

  return (
    <header style={{
      height: 56,
      minHeight: 56,
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      background: 'transparent',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Title */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 15, fontWeight: 700, color: 'var(--s-text-1)', whiteSpace: 'nowrap',
          fontFamily: 'var(--s-font-body)',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--s-text-3)', whiteSpace: 'nowrap', flexShrink: 0,
          fontFamily: 'var(--s-font-body)',
        }}>
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 32,
        padding: '0 12px', borderRadius: 10,
        background: 'var(--s-surface)',
        border: '1px solid var(--s-border)',
        width: 180, transition: 'border-color 0.2s',
      }}>
        <span style={{ fontSize: 13, color: 'var(--s-text-3)' }}>⌕</span>
        <input
          placeholder="搜索…"
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--s-text-1)', width: '100%',
          }}
        />
      </div>

      {/* Theme Toggle */}
      <button onClick={toggleTheme} style={{
        width: 32, height: 32, padding: 0, borderRadius: 8,
        background: 'var(--s-surface)', border: '1px solid var(--s-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--s-text-2)', cursor: 'pointer', fontSize: 14,
      }} title={theme === 'dark' ? '切换亮色' : '切换暗色'}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Notifications */}
      <button style={{
        width: 32, height: 32, padding: 0, borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.04)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--s-text-2)', cursor: 'pointer', position: 'relative', fontSize: 15,
      }}>
        🔔
        <span style={{
          position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%',
          background: '#F87171', border: '2px solid #0A0B14',
        }} />
      </button>

      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'rgba(167, 139, 250, 0.15)',
        border: '2px solid rgba(167, 139, 250, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#A78BFA',
      }}>
        {(user?.name || 'S')[0]}
      </div>
    </header>
  );
}
