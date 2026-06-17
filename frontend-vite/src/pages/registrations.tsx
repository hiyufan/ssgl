import { useEffect, useState } from 'react';
import { registrationsAPI, competitionsAPI } from '@/services/api';
import { PageHeader } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Select, TextInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { CompetitionRegistration, Competition } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--amber)',
  approved: 'var(--green)',
  rejected: 'var(--red)',
  cancelled: 'var(--text-3)',
};

export function RegistrationsPage() {
  const [regs, setRegs] = useState<CompetitionRegistration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [compFilter, setCompFilter] = useState('');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), page_size: '20' };
      if (statusFilter) params.status = statusFilter;
      if (compFilter) params.competition_id = compFilter;
      const res = await registrationsAPI.list(params);
      setRegs(res.registrations || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    competitionsAPI.list({ page_size: '100' }).then(res => setCompetitions(res.competitions || [])).catch(() => {});
  }, []);

  useEffect(() => { load(1); }, [statusFilter, compFilter]);

  const handleApprove = async (id: number) => {
    try {
      await registrationsAPI.approve(id);
      toast.success('已通过报名');
      load();
    } catch { toast.error('操作失败'); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await registrationsAPI.reject(rejectModal.id, rejectModal.reason);
      toast.success('已驳回报名');
      setRejectModal(null);
      load();
    } catch { toast.error('操作失败'); }
  };

  const stats = {
    total,
    pending: regs.filter(r => r.status === 'pending').length,
    approved: regs.filter(r => r.status === 'approved').length,
    rejected: regs.filter(r => r.status === 'rejected').length,
  };

  return (
    <div>
      <PageHeader title="报名管理" subtitle={`共 ${total} 条报名记录`} />

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '总计', value: total, color: 'var(--teal)' },
          { label: '待审核', value: stats.pending, color: 'var(--amber)' },
          { label: '已通过', value: stats.approved, color: 'var(--green)' },
          { label: '已驳回', value: stats.rejected, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface-1)', borderRadius: 10, padding: '14px 16px',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 8, height: 32, borderRadius: 4, background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select value={statusFilter} onChange={setStatusFilter} placeholder="全部状态"
          options={[
            { value: '', label: '全部状态' },
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已驳回' },
          ]} />
        <Select value={compFilter} onChange={setCompFilter} placeholder="全部赛事"
          options={[
            { value: '', label: '全部赛事' },
            ...competitions.map(c => ({ value: String(c.id), label: c.title })),
          ]} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>加载中...</div>
      ) : regs.length === 0 ? (
        <EmptyState icon="file" title="暂无报名记录" desc="当学生报名赛事后，记录会显示在这里" />
      ) : (
        <div style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>ID</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>学生</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>赛事</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>状态</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>备注</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>时间</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-2)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {regs.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-3)' }}>#{r.id}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="users" size={14} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{r.user?.name || r.user?.username || `用户#${r.user_id}`}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{r.competition?.title || `赛事#${r.competition_id}`}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${STATUS_COLORS[r.status]}18`, color: STATUS_COLORS[r.status],
                    }}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.remark || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 13 }}>
                    {new Date(r.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="ghost" onClick={() => handleApprove(r.id)}>
                          <Icon name="check" size={14} /> 通过
                        </Button>
                        <Button variant="ghost" onClick={() => setRejectModal({ id: r.id, reason: '' })}>
                          <Icon name="x" size={14} /> 驳回
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
              <Button variant="ghost" disabled={page <= 1} onClick={() => load(page - 1)}>上一页</Button>
              <span style={{ lineHeight: '32px', color: 'var(--text-3)', fontSize: 13 }}>第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
              <Button variant="ghost" disabled={page * 20 >= total} onClick={() => load(page + 1)}>下一页</Button>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background: 'var(--surface-1)', borderRadius: 14, padding: 24, width: 400, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>驳回报名</h3>
            <TextInput value={rejectModal.reason} onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })} placeholder="驳回原因（可选）" />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setRejectModal(null)}>取消</Button>
              <Button onClick={handleReject}>确认驳回</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
