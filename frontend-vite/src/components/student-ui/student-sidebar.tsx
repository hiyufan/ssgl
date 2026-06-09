import { useState } from 'react';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const NAV = [
  { id: 'dashboard', icon: '◉', label: '概览' },
  { section: '我的赛事' },
  { id: 'competitions', icon: '◈', label: '赛事大厅' },
  { id: 'teams', icon: '◎', label: '我的团队' },
  { section: '项目管理' },
  { id: 'preplans', icon: '◇', label: '预计划' },
  { section: '智能助手' },
  { id: 'aitools', icon: '✦', label: 'AI 工具箱' },
  { section: '反馈' },
  { id: 'evaluations', icon: '✧', label: '评价导师' },
];

export function StudentSidebar() {
  const { page, navigate } = useAppStore();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      minWidth: collapsed ? 64 : 220,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--s-surface)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--s-border)',
      overflow: 'hidden',
      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.5s ease, border-color 0.5s ease',
    }}>
      {/* Logo */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', borderBottom: '1px solid var(--s-border)',
        flexShrink: 0, cursor: 'pointer',
      }} onClick={() => setCollapsed(!collapsed)}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #A78BFA, #F0A832)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="7" width="4" height="6" fill="#0F1523" rx="1"/>
            <rect x="5" y="4" width="4" height="9" fill="#0F1523" rx="1"/>
            <rect x="9" y="1" width="4" height="12" fill="#0F1523" rx="1"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'var(--s-font-body)', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.04em', color: 'var(--s-text-1)',
            }}>
              FORGE
            </div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
              color: 'var(--s-text-3)', textTransform: 'uppercase', marginTop: 1,
            }}>
              竞赛管理平台
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {NAV.map((item, i) => {
          if (item.section) {
            if (collapsed) return <div key={i} style={{ height: 8 }} />;
            return (
              <div key={i} style={{
                padding: '16px 12px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--s-text-3)',
              }}>
                {item.section}
              </div>
            );
          }
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => navigate(item.id!)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: collapsed ? '10px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
              color: active ? '#A78BFA' : 'var(--s-text-2)',
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              transition: 'background 0.15s, color 0.15s',
              position: 'relative',
            }}>
              {active && !collapsed && (
                <div style={{
                  position: 'absolute', left: 0, top: '25%', height: '50%',
                  width: 3, borderRadius: '0 2px 2px 0',
                  background: 'linear-gradient(180deg, #A78BFA, #F0A832)',
                }} />
              )}
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{
        padding: 8, borderTop: '1px solid var(--s-border)', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
          borderRadius: 10, background: 'var(--s-surface)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--s-purple-bg, rgba(167, 139, 250, 0.15))',
            border: '2px solid var(--s-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--s-purple)', flexShrink: 0,
          }}>
            {(user?.name || 'S')[0]}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--s-text-1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name || '学生'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--s-text-3)', marginTop: 1 }}>参赛学生</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
