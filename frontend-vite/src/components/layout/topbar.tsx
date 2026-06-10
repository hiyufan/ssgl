import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { ROLE_META } from './sidebar';

const PAGE_TITLES: Record<string, string> = {
  dashboard: '概览', competitions: '赛事管理', teams: '团队管理',
  approvals: '审批中心', awards: '获奖管理', evaluations: '评价中心',
  stats: '统计分析', aitools: 'AI 工具箱', coach: '赛事陪练', 'knowledge-base': '知识库管理',
  'audit-logs': '审计日志', preplans: '预计划',
};

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { theme, toggleTheme } = useAppStore();
  const { user } = useAuthStore();
  const role = useRole();
  const location = useLocation();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const meta = ROLE_META[role] || {};
  const pageKey = location.pathname.replace(/^\//, '') || 'dashboard';
  const title = PAGE_TITLES[pageKey] || pageKey;

  // Close notification dropdown on route change
  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname]);

  return (
    <header className="forge-topbar glass">
      {/* Mobile menu button */}
      <button className="mobile-menu-btn" onClick={onToggleSidebar}>
        <Icon name="filter" size={15}/>
      </button>

      {/* Title */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          / {new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 32,
        padding: '0 12px', borderRadius: 8,
        background: searchFocused ? 'var(--surface)' : 'var(--surface-2)',
        border: `1px solid ${searchFocused ? 'var(--amber)' : 'var(--border)'}`,
        boxShadow: searchFocused ? '0 0 0 3px var(--amber-bg)' : 'none',
        transition: 'all 0.15s', width: 200,
      }}>
        <Icon name="search" size={13}/>
        <input
          placeholder="搜索…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', width: '100%' }}
        />
      </div>

      {/* Theme Toggle */}
      <button className="btn btn-ghost btn-sm" onClick={toggleTheme}
        style={{ width: 32, height: 32, padding: 0, borderRadius: 8, position: 'relative' }}
        title={theme === 'dark' ? '切换亮色' : '切换暗色'}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15}/>
      </button>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setNotifOpen(!notifOpen)}
          style={{ width: 32, height: 32, padding: 0, borderRadius: 8, position: 'relative' }}
        >
          <Icon name="bell" size={15}/>
          <span style={{
            position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%',
            background: 'var(--red)', border: '2px solid var(--surface)',
          }}/>
        </button>
        {notifOpen && (
          <div onClick={() => setNotifOpen(false)}
            className="card anim-scale"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300,
              padding: 0, overflow: 'hidden', zIndex: 100, boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>通知</span>
              <span className="badge badge-amber">3 未读</span>
            </div>
            {[
              { t: '新审批待处理', s: '银河战队 报名 AI 创新挑战赛', time: '10 分钟前', dot: 'var(--amber)' },
              { t: '预计划审核通过', s: '极光科技预计划已通过初审', time: '2 小时前', dot: 'var(--green)' },
              { t: '新学生加入团队', s: '量子跃迁新增成员 吴雯', time: '昨天', dot: 'var(--teal)' },
            ].map((n, i) => (
              <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.dot, marginTop: 4, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{n.s}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          color: meta.color,
        }}>
          {(user?.name || 'U')[0]}
        </div>
      </div>
    </header>
  );
}
