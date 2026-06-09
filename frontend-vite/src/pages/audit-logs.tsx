import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Avatar, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';

const MOCK_LOGS = [
  { id: 1, user: '刘子燕', role: 'admin', action: 'APPROVAL_APPROVED', target: '银河战队报名申请', ip: '192.168.1.100', created_at: '2026-06-09T11:30:00Z' },
  { id: 2, user: '王家国', role: 'teacher', action: 'PREPLAN_REVIEWED', target: '极光科技预计划 #1', ip: '10.0.0.45', created_at: '2026-06-09T10:20:00Z' },
  { id: 3, user: '张明', role: 'student', action: 'TEAM_CREATED', target: '银河战队', ip: '172.16.0.23', created_at: '2026-06-08T16:45:00Z' },
  { id: 4, user: '刘子燕', role: 'admin', action: 'COMPETITION_PUBLISHED', target: '2026 AI创新挑战赛', ip: '192.168.1.100', created_at: '2026-06-08T14:00:00Z' },
  { id: 5, user: '陈芳', role: 'student', action: 'PREPLAN_SUBMITTED', target: '基于LLM的智能客服系统', ip: '10.0.0.87', created_at: '2026-06-07T15:30:00Z' },
  { id: 6, user: '张明', role: 'student', action: 'USER_LOGIN', target: '-', ip: '172.16.0.23', created_at: '2026-06-07T09:00:00Z' },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  APPROVAL_APPROVED: { label: '审批通过', color: 'var(--green)' },
  PREPLAN_REVIEWED: { label: '预计划审核', color: 'var(--teal)' },
  PREPLAN_SUBMITTED: { label: '提交预计划', color: 'var(--amber)' },
  TEAM_CREATED: { label: '创建团队', color: 'var(--purple)' },
  COMPETITION_PUBLISHED: { label: '发布赛事', color: 'var(--amber)' },
  USER_LOGIN: { label: '用户登录', color: 'var(--text-3)' },
};

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = MOCK_LOGS.filter(log => {
    if (roleFilter !== 'all' && log.role !== roleFilter) return false;
    if (search && !log.user.includes(search) && !log.action.includes(search) && !log.target.includes(search)) return false;
    return true;
  });

  return (
    <div className="forge-page">
      <PageHeader
        title="审计日志"
        subtitle="系统全量操作记录 · 不可篡改"
        actions={<button className="btn btn-outline btn-sm"><Icon name="download" size={12}/> 导出 CSV</button>}
      />

      <div className="anim-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: '今日操作', val: '24', color: 'var(--amber)' },
          { label: '本周总计', val: '187', color: 'var(--teal)' },
          { label: '活跃用户', val: '8', color: 'var(--purple)' },
          { label: '异常操作', val: '0', color: 'var(--green)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="anim-in d2" style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', flex: 1, maxWidth: 280 }}>
          <Icon name="search" size={13}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索用户、操作、对象…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', width: '100%' }}/>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {[
            { k: 'all', l: '全部' }, { k: 'admin', l: '管理员' }, { k: 'teacher', l: '教师' }, { k: 'student', l: '学生' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setRoleFilter(k)} style={{
              padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: roleFilter === k ? 'var(--surface)' : 'transparent',
              color: roleFilter === k ? 'var(--text)' : 'var(--text-3)',
              border: roleFilter === k ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card anim-in d3" style={{ overflow: 'hidden' }}>
        <table className="forge-table">
          <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>对象</th><th>IP 地址</th></tr></thead>
          <tbody>
            {filtered.map((log, i) => {
              const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-3)' };
              const roleColor = { admin: 'var(--amber)', teacher: 'var(--teal)', student: 'var(--purple)' }[log.role] || 'var(--text-3)';
              return (
                <tr key={log.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{new Date(log.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={log.user} size={24} index={i}/>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.user}</div>
                        <div style={{ fontSize: 10, color: roleColor, fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 1 }}>
                          {{ admin: 'ADMIN', teacher: 'TEACHER', student: 'STUDENT' }[log.role]}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: meta.color, padding: '3px 8px', borderRadius: 6, background: `${meta.color}14` }}>{meta.label}</span></td>
                  <td style={{ color: 'var(--text-2)', maxWidth: 200 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{log.target}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{log.ip}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="shield" title="暂无匹配的日志"/>}
      </div>
    </div>
  );
}
