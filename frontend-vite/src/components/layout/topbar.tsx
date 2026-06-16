import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { ROLE_META } from './sidebar';
import { notificationsAPI, type Notification } from '@/services/api';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const meta = ROLE_META[role] || {};
  const pageKey = location.pathname.replace(/^\//, '') || 'dashboard';
  const title = PAGE_TITLES[pageKey] || pageKey;

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getUnreadCount();
        setUnreadCount(res.unread_count || 0);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!notifOpen) return;
    const fetchNotifs = async () => {
      try {
        const res = await notificationsAPI.list({ page_size: 5 });
        setNotifications(res.items || []);
      } catch { /* ignore */ }
    };
    fetchNotifs();
  }, [notifOpen]);

  // Close notification dropdown on route change
  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch { /* ignore */ }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch { /* ignore */ }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  const typeColors: Record<string, string> = {
    system: 'var(--amber)',
    award: 'var(--green)',
    team: 'var(--teal)',
    competition: 'var(--purple)',
    team_invite: 'var(--teal)',
    workflow: 'var(--amber)',
  };

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
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8,
              background: 'var(--red)', border: '2px solid var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', padding: '0 4px',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div onClick={() => setNotifOpen(false)}
            className="card anim-scale"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340,
              padding: 0, overflow: 'hidden', zIndex: 100, boxShadow: 'var(--shadow-lg)',
              maxHeight: 400, overflowY: 'auto',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>通知</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {unreadCount > 0 && <span className="badge badge-amber">{unreadCount} 未读</span>}
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
                    style={{ fontSize: 11, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    全部已读
                  </button>
                )}
              </div>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                暂无通知
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id}
                  style={{
                    padding: '12px 16px', display: 'flex', gap: 12, borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', opacity: n.read_at ? 0.6 : 1,
                  }}
                  onClick={(e) => { e.stopPropagation(); if (!n.read_at) handleMarkRead(n.id); }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: n.read_at ? 'var(--text-3)' : (typeColors[n.type] || 'var(--amber)'),
                    marginTop: 4, flexShrink: 0,
                  }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.title}</div>
                    {n.message && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatTime(n.created_at)}</span>
                </div>
              ))
            )}
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
