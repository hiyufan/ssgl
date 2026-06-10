import { useEffect, useState } from 'react';
import { auditAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { Avatar, PageHeader } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { AuditLog, AuditStats } from '@/types';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: '登录', color: 'var(--amber)' },
  register: { label: '注册', color: 'var(--purple)' },
  create: { label: '创建', color: 'var(--green)' },
  read: { label: '查看', color: 'var(--text-3)' },
  update: { label: '更新', color: 'var(--teal)' },
  delete: { label: '删除', color: 'var(--red)' },
  approve: { label: '审批通过', color: 'var(--green)' },
  reject: { label: '驳回', color: 'var(--red)' },
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      auditAPI.list({ page, page_size: 20, action: actionFilter !== 'all' ? actionFilter : undefined }),
      auditAPI.stats(),
    ])
      .then(([logRes, statsRes]) => {
        setLogs(logRes.logs || []);
        setTotalPages(logRes.total_pages || 1);
        setStats(statsRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  const filtered = logs.filter(log => {
    if (search && !log.username.includes(search) && !log.action.includes(search) && !log.resource.includes(search)) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="forge-page">
      <PageHeader
        title="审计日志"
        subtitle="系统全量操作记录 · 不可篡改"
      />

      <div className="anim-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: '今日操作', val: stats?.today_logs ?? '-', color: 'var(--amber)' },
          { label: '总计日志', val: stats?.total_logs ?? '-', color: 'var(--teal)' },
          { label: '登录失败', val: stats?.failed_logins ?? '-', color: 'var(--red)' },
          { label: '操作类型', val: stats?.top_actions?.length ?? '-', color: 'var(--purple)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color }}>{String(val)}</div>
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
            { k: 'all', l: '全部' }, { k: 'login', l: '登录' }, { k: 'create', l: '创建' }, { k: 'approve', l: '审批' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => { setActionFilter(k); setPage(1); }} style={{
              padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: actionFilter === k ? 'var(--surface)' : 'transparent',
              color: actionFilter === k ? 'var(--text)' : 'var(--text-3)',
              border: actionFilter === k ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card anim-in d3" style={{ overflow: 'hidden' }}>
        <table className="forge-table">
          <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>资源</th><th>IP 地址</th></tr></thead>
          <tbody>
            {filtered.map((log, i) => {
              const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-3)' };
              return (
                <tr key={log.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{new Date(log.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={log.username} size={24} index={i}/>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{log.username || '-'}</div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: meta.color, padding: '3px 8px', borderRadius: 6, background: `${meta.color}14` }}>{meta.label}</span></td>
                  <td style={{ color: 'var(--text-2)', maxWidth: 200 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{log.resource || log.path}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{log.ip}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="shield" title="暂无匹配的日志"/>}
      </div>

      {totalPages > 1 && (
        <div className="anim-in d4" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 12px' }}>{page} / {totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}
