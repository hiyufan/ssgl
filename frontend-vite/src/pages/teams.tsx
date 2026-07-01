import { useCallback, useEffect, useState } from 'react';
import { teamsAPI, competitionsAPI, profileAPI } from '@/services/api';
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
import type { Team, Competition, MatchResult, TeamInvite, UserSummary, TeamAnalysis } from '@/types';

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

  const currentUser = useAuthStore((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchCompId, setMatchCompId] = useState<string>('');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);
  const [myInvites, setMyInvites] = useState<TeamInvite[]>([]);

  const loadTeams = useCallback(async () => {
    const [t, c] = await Promise.all([teamsAPI.list(), competitionsAPI.list()]);
    setTeams(t.teams || []);
    setCompetitions(c.competitions || []);
  }, []);

  useEffect(() => {
    // This page follows the app's existing client-side fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeams()
      .catch(console.error)
      .finally(() => setLoading(false));
    if (role === 'student') {
      teamsAPI.myInvites()
        .then(res => setMyInvites(res.invitations || []))
        .catch(() => {});
    }
  }, [loadTeams, role]);

  const onCreated = (team: Team) => setTeams((prev) => [team, ...prev]);
  const onLeft = (teamId: number) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setDetailTeam(null);
  };
  const onUpdated = (teamId: number, name: string) => {
    setTeams((prev) => prev.map((t) => t.id === teamId ? { ...t, name } : t));
    setDetailTeam((prev) => prev?.id === teamId ? { ...prev, name } : prev);
  };

  const doMatch = async (compId: string) => {
    if (!compId) return;
    setMatching(true);
    setMatches([]);
    try {
      const res = await teamsAPI.match(Number(compId));
      setMatches(res.matches || []);
    } catch (err) {
      toast.error(getApiError(err, '匹配失败'));
    } finally {
      setMatching(false);
    }
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
        actions={role === 'student' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" icon={<Icon name="search" size={13}/>} onClick={() => { setMatchOpen(true); setMatchCompId(''); setMatches([]); }}>找队友</Button>
            <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={() => setCreateOpen(true)}>创建团队</Button>
          </div>
        ) : undefined}
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

      {/* Pending Invites Banner */}
      {role === 'student' && myInvites.length > 0 && (
        <div className="card anim-in d1" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--amber)', background: 'var(--amber-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="gift" size={16} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>你有 {myInvites.length} 条团队邀请</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myInvites.map(inv => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <Icon name="users" size={16} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{inv.team?.name || `团队 #${inv.team_id}`}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>邀请人: {inv.inviter?.name || '未知'}</div>
                </div>
                <Button variant="primary" size="sm" onClick={async () => {
                  try {
                    await teamsAPI.acceptInvite(inv.code);
                    toast.success('已接受邀请');
                    setMyInvites(prev => prev.filter(i => i.id !== inv.id));
                    void loadTeams().catch(console.error);
                  } catch (err) { toast.error(getApiError(err, '接受失败')); }
                }}>接受</Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    await teamsAPI.declineInvite(inv.code);
                    toast.success('已拒绝邀请');
                    setMyInvites(prev => prev.filter(i => i.id !== inv.id));
                  } catch (err) { toast.error(getApiError(err, '拒绝失败')); }
                }}>拒绝</Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <TeamDetail
        key={detailTeam?.id ?? 'empty-team-detail'}
        team={detailTeam}
        currentUserId={currentUser?.id}
        onClose={() => setDetailTeam(null)}
        onLeft={onLeft}
        onUpdated={onUpdated}
        onJoined={loadTeams}
      />

      {/* Teammate Matching Modal */}
      <Modal open={matchOpen} onClose={() => setMatchOpen(false)} title="🤝 智能找队友" width={580}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              value={matchCompId}
              onChange={(v) => { setMatchCompId(v); if (v) doMatch(v); }}
              options={competitions.filter(c => c.status !== 'cancelled').map(c => ({ value: String(c.id), label: c.title }))}
              placeholder="选择赛事查看推荐队友"
            />
          </div>
          {matching && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', marginBottom: 8 }}>
                <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5"/>
                <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <div>正在匹配...</div>
            </div>
          )}
          {!matching && matches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>找到 {matches.length} 位推荐队友</div>
              {matches.map((m, i) => (
                <div key={m.user_id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={m.name || m.username} size={36} index={i} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.name || m.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {m.dept && `${m.dept} · `}{m.reason}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
                      {m.team_count > 0 && <span>🏅 {m.team_count} 次参赛</span>}
                      {m.award_count > 0 && <span>🏆 {m.award_count} 个奖项</span>}
                      {m.pre_plan_count > 0 && <span>📋 {m.pre_plan_count} 份预案</span>}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: m.match_score >= 50 ? 'var(--green-dim)' : m.match_score > 0 ? 'var(--amber-dim)' : 'var(--surface)',
                    color: m.match_score >= 50 ? 'var(--green)' : m.match_score > 0 ? 'var(--amber)' : 'var(--text-3)',
                  }}>
                    {Math.round(m.match_score)}分
                  </div>
                </div>
              ))}
            </div>
          )}
          {!matching && matchCompId && matches.length === 0 && (
            <EmptyState icon="users" title="暂无匹配" desc="该赛事下没有可匹配的空闲学生" />
          )}
        </div>
      </Modal>
    </div>
  );
}

function TeamDetail({ team, currentUserId, onClose, onLeft, onUpdated, onJoined }: {
  team: Team | null;
  currentUserId?: number;
  onClose: () => void;
  onLeft: (teamId: number) => void;
  onUpdated: (teamId: number, name: string) => void;
  onJoined: () => Promise<void>;
}) {
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(team?.name || '');
  const [deleting, setDeleting] = useState(false);

  if (!team) return null;
  const myMembership = team.members?.find((m) => m.user_id === currentUserId);
  const canLeave = !!myMembership && myMembership.role !== 'leader';
  const canJoin = !myMembership && currentUserId;
  const isLeader = myMembership?.role === 'leader';

  const saveName = async () => {
    if (!newName.trim()) { toast.error('名称不能为空'); return; }
    try {
      await teamsAPI.update(team.id, { name: newName.trim() });
      onUpdated(team.id, newName.trim());
      setEditingName(false);
      toast.success('团队名称已更新');
    } catch (err) { toast.error(getApiError(err, '更新失败')); }
  };

  const deleteTeam = async () => {
    if (!confirm(`确认删除团队「${team.name}」？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      await teamsAPI.delete(team.id);
      toast.success('团队已删除');
      onLeft(team.id);
    } catch (err) {
      toast.error(getApiError(err, '删除失败'));
    } finally { setDeleting(false); }
  };

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
      await onJoined().catch(console.error);
      onClose();
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

        {/* Team name edit */}
        {isLeader && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>团队名称</div>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
                <Button variant="primary" size="sm" onClick={saveName}>保存</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingName(false); setNewName(team?.name || ''); }}>取消</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{team.name}</span>
                <Button variant="outline" size="sm" icon={<Icon name="edit" size={12}/>} onClick={() => setEditingName(true)}>编辑</Button>
              </div>
            )}
          </div>
        )}

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
        {/* Pending Invites (visible to leader) */}
        {isLeader && teamInvites.length > 0 && (
          <div>
            <SectionLabel label={`待处理邀请 (${teamInvites.length})`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teamInvites.filter(i => i.status === 'pending').map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: 12 }}>
                  <Icon name="gift" size={14} />
                  <span style={{ color: 'var(--text)' }}>{inv.invitee?.name || `用户 #${inv.invitee_id}`}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 11 }}>{inv.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" icon={<Icon name="sparkles" size={12}/>} loading={analysisLoading} onClick={loadAnalysis}>能力分析</Button>
          {isLeader && (
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={12}/>} onClick={() => { setInviteOpen(true); loadInvites(); }}>邀请成员</Button>
          )}
          {isLeader && (
            <Button variant="danger" size="sm" loading={deleting} icon={<Icon name="trash" size={12}/>} onClick={deleteTeam}>删除团队</Button>
          )}
          {canLeave && (
            <Button variant="danger" size="sm" loading={leaving} onClick={leave}>退出团队</Button>
          )}
          {canJoin && (
            <Button variant="primary" size="sm" loading={joining} onClick={join}>加入团队</Button>
          )}
        </div>
        {/* Team Analysis Display */}
        {showAnalysis && analysis && (
          <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>📊 团队能力分析</div>
              <button onClick={() => setShowAnalysis(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }}>×</button>
            </div>

            {/* Overall Score */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: analysis.overall_score >= 70 ? 'var(--green)' : analysis.overall_score >= 50 ? 'var(--amber)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(analysis.overall_score)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>综合评分</div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              <div style={{ textAlign: 'center', padding: 8, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>{analysis.member_count}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>成员</div>
              </div>
              <div style={{ textAlign: 'center', padding: 8, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>{analysis.dept_diversity}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>学科</div>
              </div>
              <div style={{ textAlign: 'center', padding: 8, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{analysis.avg_experience.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>经验值</div>
              </div>
            </div>

            {/* Strengths */}
            {analysis.strengths?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', marginBottom: 6 }}>✅ 优势</div>
                {analysis.strengths.map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '4px 0', paddingLeft: 12 }}>{s}</div>
                ))}
              </div>
            )}

            {/* Gaps */}
            {analysis.gaps?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', marginBottom: 6 }}>⚠️ 短板</div>
                {analysis.gaps.map((g: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '4px 0', paddingLeft: 12 }}>{g}</div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 6 }}>💡 建议</div>
                {analysis.recommendations.map((r: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '4px 0', paddingLeft: 12 }}>{r}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {inviteOpen && (
        <InviteModal
          teamId={team.id}
          onClose={() => setInviteOpen(false)}
          onInvited={() => loadInvites()}
        />
      )}
    </Modal>
  );

  function loadInvites() {
    if (!team) return;
    teamsAPI.listInvites(team.id).then(res => setTeamInvites(res.invitations || [])).catch(() => {});
  }

  async function loadAnalysis() {
    if (!team) return;
    setAnalysisLoading(true);
    try {
      const res = await teamsAPI.analysis(team.id);
      setAnalysis(res);
      setShowAnalysis(true);
    } catch {
      toast.error('分析加载失败');
    } finally {
      setAnalysisLoading(false);
    }
  }
}

/** 邀请成员弹窗 — 搜索用户并发送邀请 */
function InviteModal({ teamId, onClose, onInvited }: {
  teamId: number;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<number | null>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await profileAPI.searchUsers(q, 'student');
      setResults(res.users || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const invite = async (userId: number) => {
    setInviting(userId);
    try {
      await teamsAPI.invite(teamId, userId);
      toast.success('邀请已发送');
      onInvited();
    } catch (err) {
      toast.error(getApiError(err, '邀请失败'));
    } finally { setInviting(null); }
  };

  return (
    <Modal open={true} onClose={onClose} title="邀请成员" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextInput
          value={query}
          onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
          placeholder="搜索学生姓名或用户名…"
        />
        {searching && <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: 12 }}>搜索中...</div>}
        {!searching && results.length === 0 && query.trim() && (
          <EmptyState icon="users" title="未找到" desc="没有匹配的学生" />
        )}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {results.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <Avatar name={u.name} size={32} index={u.id} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.dept || u.username}</div>
                </div>
                <Button variant="primary" size="sm" loading={inviting === u.id} onClick={() => invite(u.id)}>邀请</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
