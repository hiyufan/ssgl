import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { statsAPI, workflowsAPI } from '@/services/api';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/page-helpers';
import { SectionLabel } from '@/components/ui/page-helpers';
import type { StatsOverview, ApprovalWorkflow } from '@/types';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const { navigate } = useAppStore();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [pending, setPending] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, wfRes] = await Promise.all([
          statsAPI.overview(),
          workflowsAPI.list({ tab: 'pending' }),
        ]);
        setStats(statsRes);
        setPending(wfRes.approvals || []);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      {/* Greeting */}
      <div className="anim-in" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ ADMIN CONSOLE
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          早上好，<span style={{ color: 'var(--amber)' }}>{user?.name || '管理员'}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>今日有 {pending.length} 个审批待处理</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <div className="anim-in d1"><StatCard label="赛事总数" value={stats?.total_competitions || 0} icon="trophy" color="var(--amber)" sub={`${stats?.ongoing_competitions || 0} 个进行中`} /></div>
        <div className="anim-in d2"><StatCard label="参赛团队" value={stats?.total_teams || 0} icon="users" color="var(--teal)" sub={`${stats?.total_students || 0} 名学生`} /></div>
        <div className="anim-in d3"><StatCard label="待审批" value={pending.length} icon="check" color="var(--red)" sub="需要你的处理" /></div>
        <div className="anim-in d4"><StatCard label="已发奖项" value={stats?.total_awards || 0} icon="gift" color="var(--purple)" sub="累计奖项" /></div>
      </div>

      {/* Bottom: Pending + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pending Approvals */}
        <div className="card anim-in d5" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel label={`待审批 (${pending.length})`}/>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('approvals')}>查看全部</button>
          </div>
          <div>
            {pending.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无待办</div>
            ) : pending.slice(0, 4).map((a) => (
              <div key={a.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {a.submitter?.name || ''} · {new Date(a.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <StatusBadge status={a.type} />
                <button className="btn btn-primary btn-sm" onClick={() => navigate('approvals')}>处理</button>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="card anim-in d6" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel label="平台概览"/>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '总用户数', value: stats?.total_users || 0, color: 'var(--amber)' },
                { label: '教师数', value: stats?.total_teachers || 0, color: 'var(--teal)' },
                { label: '学生数', value: stats?.total_students || 0, color: 'var(--purple)' },
                { label: '赛事数', value: stats?.total_competitions || 0, color: 'var(--green)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
