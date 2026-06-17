import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { statsAPI } from '@/services/api';
import type { ShowcaseEntry, ShowcaseData } from '@/types';

const typeLabels: Record<string, string> = {
  hackathon: '黑客松',
  innovation: '创新赛',
  research: '研究赛',
  business_plan: '商业计划赛',
  ai_innovation: 'AI创新赛',
  data_science: '数据科学赛',
};

const rankEmoji = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const rankColor = (rank: number) => {
  if (rank === 1) return 'var(--amber)';
  if (rank === 2) return '#a0aec0';
  if (rank === 3) return '#cd7f32';
  return 'var(--text-3)';
};

export function ShowcasePage() {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    statsAPI.showcase()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !gridRef.current) return;
    const raf = requestAnimationFrame(() => {
      const cards = gridRef.current?.querySelectorAll<HTMLElement>('[data-card]');
      if (!cards?.length) return;
      gsap.set(cards, { opacity: 0, y: 30, scale: 0.95 });
      gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.2)' });
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, data, filter]);

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

  if (!data) return null;

  const filtered = filter === 'all'
    ? data.entries
    : data.entries.filter(e => e.comp_type === filter);

  // Group by competition
  const byComp = new Map<number, ShowcaseEntry[]>();
  filtered.forEach(e => {
    const arr = byComp.get(e.competition_id) || [];
    arr.push(e);
    byComp.set(e.competition_id, arr);
  });

  return (
    <div className="forge-page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ SHOWCASE
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          🏆 成果展示墙
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 6 }}>
          赛事获奖团队与优秀成果展示
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: '获奖总数', value: data.total_awards, icon: '🏅', color: 'var(--amber)' },
          { label: '奖金总额', value: `¥${data.total_prize.toLocaleString()}`, icon: '💰', color: '#10b981' },
          { label: '获奖团队', value: data.total_teams, icon: '👥', color: '#6366f1' },
          { label: '覆盖赛事', value: data.comp_count, icon: '🎯', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-1)',
            borderRadius: 12,
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'all', label: '全部' },
          { key: 'hackathon', label: '黑客松' },
          { key: 'innovation', label: '创新赛' },
          { key: 'research', label: '研究赛' },
          { key: 'business_plan', label: '商业计划' },
          { key: 'ai_innovation', label: 'AI创新' },
          { key: 'data_science', label: '数据科学' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid ' + (filter === t.key ? 'var(--amber)' : 'var(--border-1)'),
              background: filter === t.key ? 'rgba(245,158,11,0.1)' : 'var(--surface-1)',
              color: filter === t.key ? 'var(--amber)' : 'var(--text-2)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Showcase grid */}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {Array.from(byComp.entries()).map(([compId, awards]) => {
          const comp = awards[0];
          return (
            <div
              key={compId}
              data-card
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-1)',
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Competition header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-1)',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(99,102,241,0.05))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--amber)',
                    color: '#000',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    {typeLabels[comp.comp_type] || comp.comp_type}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {awards.length} 个奖项
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
                  {comp.competition_name}
                </h3>
              </div>

              {/* Awards list */}
              <div style={{ padding: '12px 20px' }}>
                {awards
                  .sort((a, b) => a.rank - b.rank)
                  .map(award => (
                    <div
                      key={award.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border-1)',
                      }}
                    >
                      <span style={{ fontSize: 22, minWidth: 32, textAlign: 'center' }}>
                        {rankEmoji(award.rank)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {award.team_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                          {award.leader_name && `队长: ${award.leader_name}`}
                          {award.prize_name && ` · ${award.prize_name}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: rankColor(award.rank) }}>
                          {award.rank_name || `第${award.rank}名`}
                        </div>
                        {award.prize_amount > 0 && (
                          <div style={{ fontSize: 12, color: '#10b981', marginTop: 2 }}>
                            ¥{award.prize_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
          <div>暂无获奖数据</div>
        </div>
      )}
    </div>
  );
}
