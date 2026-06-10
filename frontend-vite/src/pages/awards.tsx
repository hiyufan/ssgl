import { useEffect, useState } from 'react';
import { awardsAPI } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import type { Award } from '@/types';

export function AwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    awardsAPI.list().then(res => setAwards(res.awards || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

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
        subtitle={`${awards.length} 个获奖记录，其中 ${awards.filter(a => a.status === 'settled').length} 个已结算`}
      />

      {/* Podium */}
      {podiumOrder.length > 0 && (
        <div className="card anim-in" style={{ padding: 32, marginBottom: 20, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--amber-bg) 0%, transparent 60%)', pointerEvents: 'none' }}/>
          <SectionLabel label="颁奖台"/>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24, marginTop: 16, height: 220 }}>
            {podiumOrder.map((award, i) => {
              if (!award) return null;
              const height = podiumHeights[i];
              const color = podiumColors[i];
              const label = podiumLabels[i];
              return (
                <div key={award.id} className={`anim-in d${i + 1}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  {label === '1st' && <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>}
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
          <thead><tr><th>排名</th><th>团队</th><th>赛事</th><th>奖项</th><th>奖金</th><th>状态</th></tr></thead>
          <tbody>
            {filtered.map((award) => (
              <tr key={award.id}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: award.rank === 1 ? 'var(--amber)' : award.rank === 2 ? 'var(--text-2)' : award.rank === 3 ? 'var(--orange)' : 'var(--text-3)' }}>#{award.rank}</span></td>
                <td><div style={{ fontWeight: 600 }}>{award.team?.name || '—'}</div></td>
                <td style={{ color: 'var(--text-3)', maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{award.competition?.title || '—'}</div></td>
                <td><span style={{ fontWeight: 700, color: award.rank === 1 ? 'var(--amber)' : award.rank === 2 ? 'var(--text-2)' : 'var(--orange)' }}>{award.rank_name || '—'}</span></td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>¥{Number(award.prize_amount || 0).toLocaleString()}</span></td>
                <td><StatusBadge status={award.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
