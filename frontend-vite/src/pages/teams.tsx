import { useEffect, useState } from 'react';
import { teamsAPI, competitionsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Avatar, PageHeader } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { Team, Competition } from '@/types';

export function TeamsPage() {
  const role = useRole();
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState('all');

  useEffect(() => {
    Promise.all([teamsAPI.list(), competitionsAPI.list()])
      .then(([t, c]) => { setTeams(t.teams || []); setCompetitions(c.competitions || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const comps = [{ id: 'all', title: '全部赛事' }, ...competitions.filter(c => c.status !== 'cancelled')];
  const filtered = selectedComp === 'all' ? teams : teams.filter(t => String(t.competition_id) === selectedComp);

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
      <PageHeader
        title={role === 'teacher' ? '指导团队' : role === 'student' ? '我的团队' : '团队管理'}
        subtitle={`${filtered.length} 支团队`}
        actions={role === 'student' ? <button className="btn btn-primary"><Icon name="plus" size={13}/>创建团队</button> : undefined}
      />

      <div className="anim-in" style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {comps.map(c => (
          <button key={c.id} onClick={() => setSelectedComp(String(c.id))} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            background: selectedComp === String(c.id) ? 'var(--amber)' : 'var(--surface)',
            color: selectedComp === String(c.id) ? '#0F1523' : 'var(--text-3)',
            border: `1px solid ${selectedComp === String(c.id) ? 'var(--amber)' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
          }}>{c.title}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="users" title="暂无团队"/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map((team, i) => {
            const comp = competitions.find(c => c.id === team.competition_id);
            return (
              <div key={team.id} className={`card anim-in d${Math.min(i + 1, 8)}`}
                style={{ padding: 0, overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ height: 3, background: `linear-gradient(90deg, ${['var(--amber)', 'var(--teal)', 'var(--purple)', 'var(--green)', 'var(--red)'][i % 5]}, transparent)` }}/>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{team.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{comp?.title || '未关联赛事'}</div>
                    </div>
                    <StatusBadge status={team.status}/>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                      成员 ({team.members?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(team.members || []).map((m, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={m.user?.name || '?'} size={26} index={i * 4 + j}/>
                          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{m.user?.name}</span>
                          <span style={{ fontSize: 11, color: m.role === 'leader' ? 'var(--amber)' : 'var(--text-3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                            {m.role === 'leader' ? '队长' : '队员'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }}><Icon name="users" size={12}/> 详情</button>
                    {role !== 'student' && <button className="btn btn-ghost btn-sm"><Icon name="edit" size={12}/></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
