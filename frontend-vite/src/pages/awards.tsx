import { useEffect, useState } from 'react';
import { awardsAPI, competitionsAPI, teamsAPI } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import type { Award, Competition, Team } from '@/types';
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { FormModal, Field, NumberInput, TextInput, Select } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import { Icon } from '@/components/ui/icon';

function SettleAwardModal({ award, onClose, onSettled }: {
  award: Award;
  onClose: () => void;
  onSettled: (a: Award) => void;
}) {
  const [amount, setAmount] = useState<string>(() => String(Number(award.prize_amount || 0)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      const res = await awardsAPI.settle(award.id, Number(amount) || 0);
      toast.success('奖项已结算');
      onSettled(res.award);
      onClose();
    } catch (err) {
      setError(getApiError(err, '结算失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title={`结算奖项 · ${award.team?.name || ''}`} onSubmit={submit} submitting={submitting} error={error} submitLabel="确认结算" width={440}>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{award.competition?.title || ''} · {award.rank_name || `第 ${award.rank} 名`}</div>
      <Field label="结算奖金（元）"><NumberInput min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
    </FormModal>
  );
}

function CreateAwardModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (a: Award) => void;
}) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [compId, setCompId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [rank, setRank] = useState('1');
  const [rankName, setRankName] = useState('');
  const [prizeName, setPrizeName] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      competitionsAPI.list().catch(() => ({ competitions: [] })),
      teamsAPI.list().catch(() => ({ teams: [] })),
    ]).then(([compRes, teamRes]) => {
      setCompetitions(compRes.competitions || []);
      setTeams(teamRes.teams || []);
    });
  }, []);

  const submit = async () => {
    if (!compId || !teamId) { setError('请选择赛事和团队'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await awardsAPI.create({
        competition_id: Number(compId),
        team_id: Number(teamId),
        rank: Number(rank) || 1,
        rank_name: rankName || undefined,
        prize_name: prizeName || undefined,
        prize_amount: String(Number(prizeAmount) || 0),
      });
      toast.success('奖项创建成功');
      onCreated(res.award);
      onClose();
    } catch (err) {
      setError(getApiError(err, '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title="提名奖项" onSubmit={submit} submitting={submitting} error={error} submitLabel="创建奖项" width={500}>
      <Field label="赛事">
        <Select value={compId} onChange={setCompId} placeholder="请选择赛事"
          options={competitions.map(c => ({ value: String(c.id), label: c.title }))} />
      </Field>
      <Field label="团队">
        <Select value={teamId} onChange={setTeamId} placeholder="请选择团队"
          options={teams.map(t => ({ value: String(t.id), label: t.name }))} />
      </Field>
      <Field label="排名">
        <NumberInput min={1} value={rank} onChange={e => setRank(e.target.value)} />
      </Field>
      <Field label="奖项名称（可选）">
        <TextInput value={rankName} onChange={e => setRankName(e.target.value)} placeholder="如：一等奖" />
      </Field>
      <Field label="奖品名称（可选）">
        <TextInput value={prizeName} onChange={e => setPrizeName(e.target.value)} placeholder="如：最佳创新奖" />
      </Field>
      <Field label="奖金（元）">
        <NumberInput min={0} value={prizeAmount} onChange={e => setPrizeAmount(e.target.value)} />
      </Field>
    </FormModal>
  );
}

export function AwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    awardsAPI.list().then(res => setAwards(res.awards || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const role = useRole();
  const [settling, setSettling] = useState<Award | null>(null);
  const [creating, setCreating] = useState(false);
  const onSettled = (a: Award) => setAwards((prev) => prev.map((x) => (x.id === a.id ? a : x)));
  const onCreated = (a: Award) => setAwards((prev) => [a, ...prev]);

  const filtered = tab === 'all' ? awards : awards.filter(a => a.status === tab);
  const top3 = awards.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = [120, 160, 100];
  const podiumColors = ['var(--text-3)', 'var(--amber)', 'var(--orange)'];
  const podiumLabels = ['2nd', '1st', '3rd'];

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
        title="获奖管理"
        icon="award"
        subtitle={`${awards.length} 个获奖记录，其中 ${awards.filter(a => a.status === 'settled').length} 个已结算`}
        actions={
          (role === 'admin' || role === 'teacher') ? (
            <Button variant="primary" onClick={() => setCreating(true)}>提名奖项</Button>
          ) : undefined
        }
      />

      {/* Podium */}
      {podiumOrder.length > 0 && (
        <div className="card anim-in" style={{ padding: 32, marginBottom: 20, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--amber-bg) 0%, transparent 60%)', pointerEvents: 'none' }}/>
          <SectionLabel label="颁奖台" icon="trophy"/>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24, marginTop: 16, height: 220 }}>
            {podiumOrder.map((award, i) => {
              if (!award) return null;
              const height = podiumHeights[i];
              const color = podiumColors[i];
              const label = podiumLabels[i];
              return (
                <div key={award.id} className={`anim-in d${i + 1}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  {label === '1st' && <div style={{ color: 'var(--amber)', marginBottom: 8 }}><Icon name="trophy" size={32} /></div>}
                  <div style={{ textAlign: 'center', marginBottom: 10, padding: '8px 16px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{award.team?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{award.prize_name || award.rank_name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color, marginTop: 4 }}>¥{Number(award.prize_amount || 0).toLocaleString()}</div>
                  </div>
                  <div style={{
                    width: 110, height, borderRadius: '10px 10px 0 0',
                    background: i === 1 ? 'var(--amber)' : 'var(--surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4,
                    border: `1px solid ${i === 1 ? 'var(--amber)' : 'var(--border-2)'}`,
                    boxShadow: i === 1 ? '0 8px 24px var(--amber-border)' : 'none',
                    transition: 'height 0.8s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: i === 1 ? '#0F1523' : 'var(--text-3)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: i === 1 ? '#0F152380' : 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>#{award.rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card anim-in d3" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
          {[
            { k: 'all', l: '全部' }, { k: 'settled', l: '已结算' },
            { k: 'teacher_confirm', l: '教师确认' }, { k: 'pending', l: '待处理' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: tab === k ? 'var(--amber-bg)' : 'transparent',
              color: tab === k ? 'var(--amber)' : 'var(--text-3)',
              border: tab === k ? '1px solid var(--amber-border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
        <table className="forge-table">
          <thead><tr><th>排名</th><th>团队</th><th>赛事</th><th>奖项</th><th>奖金</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {filtered.map((award) => (
              <tr key={award.id}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: award.rank === 1 ? 'var(--amber)' : award.rank === 2 ? 'var(--text-2)' : award.rank === 3 ? 'var(--orange)' : 'var(--text-3)' }}>#{award.rank}</span></td>
                <td><div style={{ fontWeight: 600 }}>{award.team?.name || '—'}</div></td>
                <td style={{ color: 'var(--text-3)', maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{award.competition?.title || '—'}</div></td>
                <td><span style={{ fontWeight: 700, color: award.rank === 1 ? 'var(--amber)' : award.rank === 2 ? 'var(--text-2)' : 'var(--orange)' }}>{award.rank_name || '—'}</span></td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>¥{Number(award.prize_amount || 0).toLocaleString()}</span></td>
                <td><StatusBadge status={award.status}/></td>
                <td>
                  {role === 'admin' && award.status !== 'settled'
                    ? <Button variant="outline" size="sm" onClick={() => setSettling(award)}>结算</Button>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {settling && <SettleAwardModal award={settling} onClose={() => setSettling(null)} onSettled={onSettled} />}
      {creating && <CreateAwardModal onClose={() => setCreating(false)} onCreated={onCreated} />}
    </div>
  );
}
