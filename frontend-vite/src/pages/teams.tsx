import { useEffect, useState } from 'react';
import { teamsAPI, competitionsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { useAuthStore } from '@/stores/auth';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Avatar, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormModal, Field, TextInput, Select } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import type { Team, Competition } from '@/types';

/** 建队表单。competitions 页「报名参加」会以 fixedCompetition 复用本组件。 */
export function TeamForm({ onClose, competitions, fixedCompetition, onCreated }: {
  onClose: () => void;
  competitions: Competition[];
  fixedCompetition?: Competition | null;
  onCreated: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [compId, setCompId] = useState<string>(() => fixedCompetition ? String(fixedCompetition.id) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = (fixedCompetition ? [fixedCompetition] : competitions.filter((c) => c.status !== 'cancelled'))
    .map((c) => ({ value: String(c.id), label: c.title }));

  const submit = async () => {
    if (!name.trim()) { setError('请填写团队名称'); return; }
    if (!compId) { setError('请选择参赛赛事'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await teamsAPI.create({ name: name.trim(), competition_id: Number(compId) });
      toast.success('团队已创建');
      onCreated(res.team);
      onClose();
    } catch (err) {
      setError(getApiError(err, '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title={fixedCompetition ? `报名：${fixedCompetition.title}` : '创建团队'} onSubmit={submit} submitting={submitting} error={error} submitLabel="创建">
      <Field label="团队名称" required><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="给你的队伍起个名字" /></Field>
      <Field label="参赛赛事" required>
        <Select value={compId} onChange={setCompId} options={options} placeholder="选择赛事" disabled={!!fixedCompetition} />
      </Field>
    </FormModal>
  );
}

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

  const currentUser = useAuthStore((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);

  const onCreated = (team: Team) => setTeams((prev) => [team, ...prev]);
  const onLeft = (teamId: number) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setDetailTeam(null);
  };

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
        actions={role === 'student' ? <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={() => setCreateOpen(true)}>创建团队</Button> : undefined}
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
                    <Button variant="outline" size="sm" full icon={<Icon name="users" size={12}/>} onClick={() => setDetailTeam(team)}>详情</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && <TeamForm onClose={() => setCreateOpen(false)} competitions={competitions} onCreated={onCreated} />}
      <TeamDetail team={detailTeam} currentUserId={currentUser?.id} onClose={() => setDetailTeam(null)} onLeft={onLeft} />
    </div>
  );
}

function TeamDetail({ team, currentUserId, onClose, onLeft }: {
  team: Team | null;
  currentUserId?: number;
  onClose: () => void;
  onLeft: (teamId: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  if (!team) return null;
  const myMembership = team.members?.find((m) => m.user_id === currentUserId);
  const canLeave = !!myMembership && myMembership.role !== 'leader';
  const canJoin = !myMembership && currentUserId;

  const leave = async () => {
    if (!confirm(`确认退出团队「${team.name}」？`)) return;
    setLeaving(true);
    try {
      await teamsAPI.leave(team.id);
      toast.success('已退出团队');
      onLeft(team.id);
    } catch (err) {
      toast.error(getApiError(err, '退出失败'));
    } finally {
      setLeaving(false);
    }
  };

  const join = async () => {
    setJoining(true);
    try {
      await teamsAPI.join(team.id);
      toast.success('已加入团队');
      // Reload page to reflect changes
      window.location.reload();
    } catch (err) {
      toast.error(getApiError(err, '加入失败'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal open={!!team} onClose={onClose} title={team.name} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={team.status} />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{team.competition?.title || '未关联赛事'}</span>
        </div>
        <div>
          <SectionLabel label={`成员 (${team.members?.length || 0})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(team.members || []).map((m, j) => (
              <div key={m.id ?? j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={m.user?.name || '?'} size={28} index={j} />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{m.user?.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: m.role === 'leader' ? 'var(--amber)' : 'var(--text-3)' }}>
                  {m.role === 'leader' ? '队长' : '队员'}
                </span>
              </div>
            ))}
          </div>
        </div>
        {canLeave && (
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Button variant="danger" size="sm" loading={leaving} onClick={leave}>退出团队</Button>
          </div>
        )}
        {canJoin && (
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Button variant="primary" size="sm" loading={joining} onClick={join}>加入团队</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
