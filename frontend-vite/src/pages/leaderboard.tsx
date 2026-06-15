import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { statsAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import type { LeaderboardEntry } from '@/types';

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    statsAPI.leaderboard()
      .then(data => setEntries(data.leaderboard || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !gridRef.current) return;
    const raf = requestAnimationFrame(() => {
      const rows = gridRef.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!rows?.length) return;
      gsap.set(rows, { opacity: 0, x: -20 });
      gsap.to(rows, { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out' });
    });
    return () => cancelAnimationFrame(raf);
  }, [loading]);

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

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="forge-page">
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ LEADERBOARD
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          团队<span style={{ color: 'var(--amber)' }}>排行榜</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          基于获奖数、参赛数和预案提交综合评分
        </p>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, justifyContent: 'center' }}>
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const height = rank === 1 ? 180 : rank === 2 ? 140 : 120;
            const colors = ['var(--teal)', 'var(--amber)', 'var(--purple)'];
            return (
              <div key={entry.team_id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                width: 160,
              }}>
                <span style={{ fontSize: 32 }}>{medals[rank - 1]}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
                  {entry.team_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {entry.leader_name}
                </div>
                <div style={{
                  width: '100%', height, borderRadius: '8px 8px 0 0',
                  background: `linear-gradient(180deg, ${colors[rank - 1]}33, ${colors[rank - 1]}11)`,
                  border: `1px solid ${colors[rank - 1]}44`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: colors[rank - 1] }}>
                    {entry.score}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>综合评分</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      <div ref={gridRef} className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            完整排名 ({entries.length} 支团队)
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>排名</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>团队</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>队长</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>参赛</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>获奖</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>预案</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>评分</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.team_id} data-row style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {entry.rank <= 3 ? (
                      <span style={{ fontSize: 18 }}>{medals[entry.rank - 1]}</span>
                    ) : (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                        color: entry.rank <= 10 ? 'var(--amber)' : 'var(--text-3)',
                        width: 28, textAlign: 'center',
                      }}>
                        {entry.rank}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>
                  {entry.team_name}
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>
                  {entry.leader_name || '—'}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>{entry.competition_count}</span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{entry.award_count}</span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple)' }}>{entry.pre_plan_count}</span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
                    color: entry.score > 0 ? 'var(--amber)' : 'var(--text-3)',
                  }}>
                    {entry.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon name="trophy" size={32} />
            <p style={{ marginTop: 12, fontSize: 13 }}>暂无团队数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
