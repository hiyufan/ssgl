import { useEffect, useState } from 'react';
import { workflowsAPI } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import type { ApprovalWorkflow } from '@/types';

/* ─── Workflow Step Visualizer ────────────────────────── */
function WorkflowViz({ steps, type }: { steps: ApprovalWorkflow['steps']; type: string }) {
  const stepLabels: Record<string, string[]> = {
    registration: ['提交申请', '管理员审批'],
    pre_plan: ['提交预计划', '教师初审', '管理员终审'],
    reward: ['管理员提名', '教师确认', '最终核定'],
  };
  const labels = stepLabels[type] || [];

  const nodes = [
    { label: labels[0] || '提交申请', action: 'approved' as const, done: true, approver: null, comment: null, acted_at: null },
    ...(steps || []).map((s, i) => ({
      label: labels[i + 1] || `审批 ${i + 1}`,
      action: s.action,
      done: s.action === 'approved' || s.action === 'rejected',
      approver: s.approver,
      comment: s.comment,
      acted_at: s.acted_at,
    })),
  ];

  return (
    <div style={{ padding: '20px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          const isDone = node.done;
          const isActive = !isDone && node.action === 'pending';
          const isRejected = node.action === 'rejected';

          const dotColor = isRejected ? 'var(--red)' : isDone ? 'var(--green)' : isActive ? 'var(--amber)' : 'var(--surface-3)';

          return (
            <div key={i} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100, maxWidth: 140, flexShrink: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: dotColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 0 6px var(--amber-bg)' : 'none', transition: 'all 0.3s', flexShrink: 0,
                }}>
                  {isRejected ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  ) : isDone ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : isActive ? (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0F1523' }}/>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-2)' }}/>
                  )}
                </div>
                <div style={{ textAlign: 'center', marginTop: 8, padding: '0 4px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDone || isActive ? 'var(--text)' : 'var(--text-3)' }}>{node.label}</div>
                  {node.approver && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{node.approver.name}</div>}
                  {node.acted_at && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{new Date(node.acted_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</div>}
                  {isActive && <span className="badge badge-amber" style={{ marginTop: 4 }}>等待中</span>}
                  {isRejected && <span className="badge badge-red" style={{ marginTop: 4 }}>已驳回</span>}
                </div>
                {node.comment && (
                  <div style={{ marginTop: 6, padding: '5px 8px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', textAlign: 'center', maxWidth: 110 }}>
                    "{node.comment.slice(0, 30)}{node.comment.length > 30 ? '…' : ''}"
                  </div>
                )}
              </div>
              {!isLast && (
                <div style={{ flex: 1, height: 2, marginTop: 22, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', minWidth: 24 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: isDone ? 'var(--green)' : 'transparent', width: isDone ? '100%' : '0%', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s' }}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    workflowsAPI.list().then(res => setApprovals(res.workflows || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = approvals.filter(a => filter === 'all' || a.status === filter);
  const detail = selected ? approvals.find(a => a.id === selected) : null;

  const handleApprove = async () => {
    if (!detail) return;
    try {
      await workflowsAPI.approve(detail.id, comment);
      setApprovals(prev => prev.map(a => a.id === detail.id ? { ...a, status: 'approved' } : a));
      setComment('');
    } catch (e) { console.error(e); }
  };

  const handleReject = async () => {
    if (!detail) return;
    try {
      await workflowsAPI.reject(detail.id, comment);
      setApprovals(prev => prev.map(a => a.id === detail.id ? { ...a, status: 'rejected' } : a));
      setComment('');
    } catch (e) { console.error(e); }
  };

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
      <PageHeader title="审批中心" subtitle="多步骤工作流可视化 · AI 辅助评审"/>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
        <div className="card anim-in" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
            {[
              { k: 'pending', l: '待处理', count: approvals.filter(a => a.status === 'pending').length },
              { k: 'approved', l: '已通过' },
              { k: 'rejected', l: '已驳回' },
              { k: 'all', l: '全部' },
            ].map(({ k, l, count }) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: filter === k ? 'var(--amber-bg)' : 'transparent',
                color: filter === k ? 'var(--amber)' : 'var(--text-3)',
                border: filter === k ? '1px solid var(--amber-border)' : '1px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {l}
                {count !== undefined && count > 0 && <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>}
              </button>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? <EmptyState icon="check" title="暂无审批记录"/> : filtered.map((a) => {
              const isActive = selected === a.id;
              const typeColors: Record<string, string> = { registration: 'var(--amber)', pre_plan: 'var(--teal)', reward: 'var(--purple)' };
              return (
                <div key={a.id} onClick={() => setSelected(isActive ? null : a.id)} style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: isActive ? 'var(--amber-bg)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColors[a.type] || 'var(--amber)', marginTop: 4, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.type}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusBadge status={a.status}/>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>by {a.submitter?.name || ''}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                          步骤 {a.current_step + 1}/{a.total_steps + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card anim-in d2" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!detail ? (
            <EmptyState icon="check" title="选择一项审批查看详情" desc="点击左侧列表中的审批项目"/>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <StatusBadge status={detail.status}/>
                  <span className={`badge ${{ registration: 'badge-amber', pre_plan: 'badge-teal', reward: 'badge-purple' }[detail.type] || 'badge-muted'}`}>
                    {{ registration: '报名申请', pre_plan: '预计划审批', reward: '获奖确认' }[detail.type] || detail.type}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: 6 }}>{detail.title || detail.type}</h3>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
                  <span>提交人：{detail.submitter?.name || ''}</span>
                  <span>提交时间：{new Date(detail.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>

              <div style={{ marginBottom: 24, padding: 20, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <SectionLabel label="审批流程"/>
                <WorkflowViz steps={detail.steps} type={detail.type}/>
              </div>

              {detail.status === 'pending' && (
                <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>审批意见</div>
                  <textarea className="forge-input" rows={3} placeholder="填写审批意见（可选）" value={comment} onChange={e => setComment(e.target.value)} style={{ marginBottom: 10, resize: 'none' }}/>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApprove}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      通过
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject}>
                      <Icon name="x" size={14}/> 驳回
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
