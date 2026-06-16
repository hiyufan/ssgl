import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { notificationsAPI, workflowsAPI } from '@/services/api';

/* ─── Nav Config ──────────────────────────────────────── */
const NAV_CONFIG: Record<string, { id?: string; icon?: string; label?: string; section?: string; badgeKey?: string }[]> = {
  admin: [
    { id: 'dashboard', icon: 'home', label: '概览' },
    { section: '赛事运营' },
    { id: 'competitions', icon: 'trophy', label: '赛事管理' },
    { id: 'calendar', icon: 'calendar', label: '赛事日历' },
    { id: 'teams', icon: 'users', label: '团队管理' },
    { section: '流程审批' },
    { id: 'approvals', icon: 'check', label: '审批中心', badgeKey: 'pending' },
    { id: 'awards', icon: 'gift', label: '获奖管理' },
    { section: '数据洞察' },
    { id: 'evaluations', icon: 'star', label: '学生评价' },
    { id: 'stats', icon: 'chart', label: '统计分析' },
    { id: 'leaderboard', icon: 'trophy', label: '排行榜' },
    { id: 'showcase', icon: 'award', label: '成果展示' },
    { section: '智能助手' },
    { id: 'aitools', icon: 'sparkles', label: 'AI 工具箱' },
    { id: 'coach', icon: 'target', label: '赛事陪练' },
    { id: 'knowledge-base', icon: 'db', label: '知识库管理' },
    { section: '系统管理' },
    { id: 'audit-logs', icon: 'shield', label: '审计日志' },
    { id: 'diagnostics', icon: 'zap', label: '系统诊断' },
    { section: '账户' },
    { id: 'profile', icon: 'users', label: '个人中心' },
  ],
  teacher: [
    { id: 'dashboard', icon: 'home', label: '概览' },
    { section: '赛事运营' },
    { id: 'competitions', icon: 'trophy', label: '赛事列表' },
    { id: 'calendar', icon: 'calendar', label: '赛事日历' },
    { id: 'teams', icon: 'users', label: '指导团队' },
    { section: '流程审批' },
    { id: 'approvals', icon: 'check', label: '待办审批', badgeKey: 'pending' },
    { id: 'awards', icon: 'gift', label: '获奖确认' },
    { section: '数据洞察' },
    { id: 'evaluations', icon: 'star', label: '评价中心' },
    { id: 'stats', icon: 'chart', label: '统计分析' },
    { id: 'leaderboard', icon: 'trophy', label: '排行榜' },
    { id: 'showcase', icon: 'award', label: '成果展示' },
    { section: '智能助手' },
    { id: 'aitools', icon: 'sparkles', label: 'AI 工具箱' },
    { id: 'coach', icon: 'target', label: '赛事陪练' },
    { section: '账户' },
    { id: 'profile', icon: 'users', label: '个人中心' },
  ],
  student: [
    { id: 'dashboard', icon: 'home', label: '概览' },
    { section: '我的赛事' },
    { id: 'competitions', icon: 'trophy', label: '赛事大厅' },
    { id: 'calendar', icon: 'calendar', label: '赛事日历' },
    { id: 'teams', icon: 'users', label: '我的团队' },
    { id: 'leaderboard', icon: 'trophy', label: '排行榜' },
    { id: 'showcase', icon: 'award', label: '成果展示' },
    { section: '项目管理' },
    { id: 'preplans', icon: 'file', label: '预计划' },
    { section: '智能助手' },
    { id: 'aitools', icon: 'sparkles', label: 'AI 工具箱' },
    { id: 'coach', icon: 'target', label: '赛事陪练' },
    { section: '反馈' },
    { id: 'evaluations', icon: 'star', label: '评价导师' },
    { section: '账户' },
    { id: 'profile', icon: 'users', label: '个人中心' },
  ],
};

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:   { label: '管理员',   color: 'var(--amber)',  bg: 'var(--amber-bg)' },
  teacher: { label: '指导教师', color: 'var(--teal)',   bg: 'var(--teal-bg)' },
  student: { label: '参赛学生', color: 'var(--purple)', bg: 'var(--purple-bg)' },
};

interface SidebarProps {
  isOpen?: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const role = useRole();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.replace(/^\//, '') || 'dashboard';
  const nav = NAV_CONFIG[role] || [];
  const meta = ROLE_META[role];

  // Dynamic badges
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBadges = async () => {
      const newBadges: Record<string, number> = {};
      try {
        // Fetch pending workflows count
        const wfRes = await workflowsAPI.list({ tab: 'pending' });
        const pendingCount = (wfRes.workflows || []).length;
        if (pendingCount > 0) newBadges['pending'] = pendingCount;
      } catch { /* ignore */ }
      try {
        // Fetch unread notifications count
        const notifRes = await notificationsAPI.getUnreadCount();
        if (notifRes.unread_count > 0) newBadges['notifications'] = notifRes.unread_count;
      } catch { /* ignore */ }
      setBadges(newBadges);
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sliding indicator
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setBtnRef = useCallback((id: string) => (el: HTMLButtonElement | null) => {
    if (el) btnRefs.current.set(id, el);
    else btnRefs.current.delete(id);
  }, []);

  // Animate indicator to active item
  useEffect(() => {
    const activeBtn = btnRefs.current.get(activeId);
    const indicator = indicatorRef.current;
    const navEl = navRef.current;
    if (!activeBtn || !indicator || !navEl) return;

    const navRect = navEl.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const top = btnRect.top - navRect.top + navEl.scrollTop;
    const height = btnRect.height;

    gsap.to(indicator, {
      top,
      height,
      duration: 0.35,
      ease: 'power3.out',
    });
  }, [activeId]);

  // Hover effect on nav items
  const handleNavHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.03,
      x: 2,
      duration: 0.25,
      ease: 'back.out(2)',
    });
  };

  const handleNavLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      x: 0,
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)',
    });
  };

  return (
    <aside className={`forge-sidebar${isOpen ? ' is-open' : ''}`}>
      {/* Logo — Editorial */}
      <div style={{
        height: 'var(--topbar-h)', display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 18px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900, fontSize: 18,
          letterSpacing: '0.08em',
          color: 'var(--text)',
        }}>
          SSGL
        </div>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
          color: 'var(--text-3)', textTransform: 'uppercase', marginTop: 2,
        }}>
          竞赛管理
        </div>
      </div>

      {/* Nav */}
      <nav ref={navRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', position: 'relative' }}>
        {/* Sliding active indicator */}
        <div
          ref={indicatorRef}
          style={{
            position: 'absolute',
            left: 0,
            width: 2,
            background: 'var(--amber)',
            borderRadius: '0 1px 1px 0',
            zIndex: 1,
            pointerEvents: 'none',
            transition: 'none',
          }}
        />

        {nav.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section">{item.section}</div>;
          }
          const active = activeId === item.id;
          const badgeCount = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
          return (
            <button
              key={item.id}
              ref={setBtnRef(item.id!)}
              className={`nav-item${active ? ' active' : ''}`}
              onClick={() => navigate(`/${item.id}`)}
              onMouseEnter={handleNavHover}
              onMouseLeave={handleNavLeave}
            >
              <Icon name={item.icon!} size={15}/>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(184,134,11,0.2)' : 'var(--red)',
                  color: active ? 'var(--amber)' : '#fff',
                  fontSize: 10, fontWeight: 700, padding: '0 5px',
                }}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: 8, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
          borderRadius: 6, background: 'var(--surface-2)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4, background: meta.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: meta.color, flexShrink: 0,
          }}>
            {(user?.name || meta.label)[0]}
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || meta.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{meta.label}</div>
          </div>
          <button
            onClick={logout}
            title="退出登录"
            style={{
              width: 30, height: 30, borderRadius: 6, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-3)', cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export { NAV_CONFIG as NAV, ROLE_META };
