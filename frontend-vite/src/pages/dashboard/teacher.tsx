import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { teamsAPI, workflowsAPI } from '@/services/api';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar, SectionLabel, ProgressBar } from '@/components/ui/page-helpers';
import type { Team, ApprovalWorkflow } from '@/types';

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const { navigate } = useAppStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pending, setPending] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, wfRes] = await Promise.all([
          teamsAPI.list(),
          workflowsAPI.list({ tab: 'pending' }),
        ]);
        setTeams(teamRes.teams || []);
        setPending(wfRes.approvals || []);
      } catch (e) {
        console.error('Teacher dashboard fetch error:', e);
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
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="forge-page">
      <div className="anim-in" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>◆ TEACHER PORTAL</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          你好，<span style={{ color: 'var(--teal)' }}>{user?.name || '教师'}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>指导 {teams.length} 支团队 · {pending.length} 个待审批</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <div className="anim-in d1"><StatCard label="指导团队" value={teams.length} icon="users" color="var(--teal)" sub="跨赛事" /></div>
        <div className="anim-in d2"><StatCard label="待审批" value={pending.length} icon="check" color="var(--amber)" sub="需要处理" /></div>
        <div className="anim-in d3"><StatCard label="获奖率" value="75%" icon="trophy" color="var(--green)" sub="历史数据" mono={false} /></div>
        <div className="anim-in d4"><StatCard label="学生评分" value="4.5" icon="star" color="var(--purple)" sub="评价汇总" mono={false} /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card anim-in d3" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel label="我的指导团队"/>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('teams')}>全部团队</button>
          </div>
          <div>
            {teams.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无团队</div>
            ) : teams.slice(0, 4).map((team, i) => (
              <div key={team.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ display: 'flex', marginRight: -4 }}>
                  {(team.members || []).slice(0, 3).map((m, j) => (
                    <div key={j} style={{ marginRight: -8, zIndex: 3 - j }}>
                      <Avatar name={m.user?.name || '?'} size={28} index={i * 3 + j}/>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{team.competition?.title || '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{team.members?.length || 0} 人</span>
                  <StatusBadge status={team.status}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card anim-in d4" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <SectionLabel label="待办审批"/>
            </div>
            {pending.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无待审批</div>
            ) : pending.slice(0, 2).map(a => (
              <div key={a.id} style={{ padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.submitter?.name}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('approvals')}>审核</button>
              </div>
            ))}
          </div>

          <div className="card anim-in d5" style={{ padding: 20 }}>
            <SectionLabel label="学生评价汇总"/>
            {[
              { dim: '教学质量', val: 4.5 },
              { dim: '沟通效率', val: 4.3 },
              { dim: '响应及时', val: 4.2 },
            ].map(({ dim, val }) => (
              <div key={dim} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{dim}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>{val}</span>
                </div>
                <ProgressBar value={val} max={5} color="var(--amber)"/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
