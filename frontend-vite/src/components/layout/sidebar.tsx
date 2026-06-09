import { useState } from 'react';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { Icon } from '@/components/ui/icon';

/* ─── Nav Config ──────────────────────────────────────── */
const NAV: Record<string, { id?: string; icon?: string; label?: string; section?: string; badge?: number }[]> = {
  admin: [
    { id: 'dashboard', icon: 'home', label: '概览' },
    { section: '赛事运营' },
    { id: 'competitions', icon: 'trophy', label: '赛事管理' },
    { id: 'teams', icon: 'users', label: '团队管理' },
    { section: '流程审批' },
    { id: 'approvals', icon: 'check', label: '审批中心', badge: 3 },
    { id: 'awards', icon: 'gift', label: '获奖管理' },
    { section: '数据洞察' },
    { id: 'evaluations', icon: 'star', label: '学生评价' },
    { id: 'stats', icon: 'chart', label: '统计分析' },
    { section: '智能助手' },
    { id: 'aitools', icon: 'sparkles', label: 'AI 工具箱' },
    { id: 'knowledge-base', icon: 'db', label: '知识库管理' },
    { section: '系统管理' },
    { id: 'audit-logs', icon: 'shield', label: '审计日志' },
  ],
  teacher: [
    { id: 'dashboard', icon: 'home', label: '概览' },
    { section: '赛事运营' },
    { id: 'competitions', icon: 'trophy', label: '赛事列表' },
    { id: 'teams', icon: 'users', label: '指导团队' },
    { section: '流程审批' },
    { id: 'approvals', icon: 'check', label: '待办审批', badge: 2 },
    { id: 'awards', icon: 'gift', label: '获奖确认' },
    { section: '数据洞察' },
    { id: 'evaluations', icon: 'star', label: '评价中心' },
    { id: 'stats', icon: 'chart', label: '统计分析' },
    { section: '智能助手' },
    { id: 'aitools', icon: 'sparkles', label: 'AI 工具箱' },
  ],
  student: [
    { id: 'dashboard', icon: 'home', label: '概览' },
    { section: '我的赛事' },
    { id: 'competitions', icon: 'trophy', label: '赛事大厅' },
    { id: 'teams', icon: 'users', label: '我的团队' },
    { section: '项目管理' },
    { id: 'preplans', icon: 'file', label: '预计划' },
    { section: '智能助手' },
    { id: 'aitools', icon: 'sparkles', label: 'AI 工具箱' },
    { section: '反馈' },
    { id: 'evaluations', icon: 'star', label: '评价导师' },
  ],
};

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:   { label: '管理员',   color: 'var(--amber)',  bg: 'var(--amber-bg)' },
  teacher: { label: '指导教师', color: 'var(--teal)',   bg: 'var(--teal-bg)' },
  student: { label: '参赛学生', color: 'var(--purple)', bg: 'var(--purple-bg)' },
};

export function Sidebar() {
  const { role, setRole, page, navigate } = useAppStore();
  const { user } = useAuthStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const nav = NAV[role] || [];
  const meta = ROLE_META[role];

  return (
    <aside className="forge-sidebar">
      {/* Logo */}
      <div style={{
        height: 'var(--topbar-h)', display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 18px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: 'var(--amber)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="7" width="4" height="6" fill="#0F1523" rx="1"/>
            <rect x="5" y="4" width="4" height="9" fill="#0F1523" rx="1"/>
            <rect x="9" y="1" width="4" height="12" fill="#0F1523" rx="1"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', color: 'var(--text)' }}>
            FORGE
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: 1 }}>
            竞赛管理平台
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {nav.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section">{item.section}</div>;
          }
          const active = page === item.id;
          return (
            <button key={item.id} className={`nav-item${active ? ' active' : ''}`}
              onClick={() => navigate(item.id!)}
            >
              <Icon name={item.icon!} size={15}/>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(255,255,255,0.2)' : 'var(--red)',
                  color: active ? 'var(--amber)' : '#fff',
                  fontSize: 10, fontWeight: 700, padding: '0 5px',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role Switcher */}
      <div style={{ padding: 8, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {pickerOpen && (
          <div className="card anim-in" style={{ marginBottom: 6, overflow: 'hidden', padding: 4 }}>
            {(['admin', 'teacher', 'student'] as const).map((r) => {
              const m = ROLE_META[r];
              const isActive = r === role;
              return (
                <button key={r} onClick={() => { setRole(r); setPickerOpen(false); navigate('dashboard'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
                    borderRadius: 8, background: isActive ? 'var(--amber-bg)' : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: m.color }}>
                    {r === 'admin' ? 'A' : r === 'teacher' ? 'T' : 'S'}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--amber)' : 'var(--text-2)', flex: 1, textAlign: 'left' }}>
                    {m.label}
                  </span>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <button onClick={() => setPickerOpen(!pickerOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px',
            borderRadius: 10, background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: meta.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: meta.color, flexShrink: 0,
          }}>
            {(user?.name || role)[0]}
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || meta.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{meta.label}</div>
          </div>
          <Icon name={pickerOpen ? 'up' : 'down'} size={13}/>
        </button>
      </div>
    </aside>
  );
}

export { NAV, ROLE_META };
