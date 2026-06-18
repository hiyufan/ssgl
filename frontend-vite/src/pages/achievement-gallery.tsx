import { useEffect, useState, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { statsAPI, awardsAPI } from '@/services/api';
import type { ShowcaseEntry, ShowcaseData, Award } from '@/types';

/* ─── Labels & Helpers ─────────────────────────────────── */
const typeLabels: Record<string, string> = {
  hackathon: '黑客松',
  innovation: '创新赛',
  research: '研究赛',
  business_plan: '商业计划赛',
  ai_innovation: 'AI创新赛',
  data_science: '数据科学赛',
};

const typeColors: Record<string, string> = {
  hackathon: 'var(--amber)',
  innovation: 'var(--teal)',
  research: 'var(--purple)',
  business_plan: 'var(--green)',
  ai_innovation: '#6366f1',
  data_science: '#f59e0b',
};

const rankEmoji = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const rankColor = (rank: number) => {
  if (rank === 1) return 'var(--amber)';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  return 'var(--text-3)';
};

const rankBg = (rank: number) => {
  if (rank === 1) return 'rgba(245,158,11,0.12)';
  if (rank === 2) return 'rgba(192,192,192,0.08)';
  if (rank === 3) return 'rgba(205,127,50,0.08)';
  return 'var(--surface-2)';
};

const rankFilterOptions = [
  { key: 'all', label: '全部名次', icon: '🏅' },
  { key: '1', label: '🥇 冠军', icon: '' },
  { key: '2', label: '🥈 亚军', icon: '' },
  { key: '3', label: '🥉 季军', icon: '' },
  { key: '4+', label: '其他名次', icon: '' },
];

const typeFilterOptions = [
  { key: 'all', label: '全部类型' },
  { key: 'hackathon', label: '黑客松' },
  { key: 'innovation', label: '创新赛' },
  { key: 'research', label: '研究赛' },
  { key: 'business_plan', label: '商业计划' },
  { key: 'ai_innovation', label: 'AI创新' },
  { key: 'data_science', label: '数据科学' },
];

/* ─── Component ─────────────────────────────────────────── */
export function AchievementGalleryPage() {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  /* ─── Data Fetching ─────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      statsAPI.showcase().catch(() => null),
      awardsAPI.list().catch(() => ({ awards: [] })),
    ])
      .then(([showcaseRes, awardsRes]) => {
        setData(showcaseRes);
        setAwards(awardsRes.awards || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ─── GSAP Animations ───────────────────────────────── */
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => {
      // Animate stats cards
      if (statsRef.current) {
        const statCards = statsRef.current.querySelectorAll<HTMLElement>('[data-stat]');
        if (statCards.length) {
          gsap.set(statCards, { opacity: 0, y: 20, scale: 0.9 });
          gsap.to(statCards, {
            opacity: 1, y: 0, scale: 1,
            duration: 0.5, stagger: 0.08, ease: 'back.out(1.4)',
            delay: 0.1,
          });
        }
      }
      // Animate grid cards
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll<HTMLElement>('[data-card]');
        if (cards.length) {
          gsap.set(cards, { opacity: 0, y: 30, scale: 0.95 });
          gsap.to(cards, {
            opacity: 1, y: 0, scale: 1,
            duration: 0.5, stagger: 0.04, ease: 'back.out(1.2)',
            delay: 0.3,
          });
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, data, typeFilter, rankFilter, searchQuery]);

  /* ─── Filtered Data ─────────────────────────────────── */
  const filteredEntries = useMemo(() => {
    if (!data) return [];
    let entries = [...data.entries];

    // Type filter
    if (typeFilter !== 'all') {
      entries = entries.filter(e => e.comp_type === typeFilter);
    }

    // Rank filter
    if (rankFilter === '1') entries = entries.filter(e => e.rank === 1);
    else if (rankFilter === '2') entries = entries.filter(e => e.rank === 2);
    else if (rankFilter === '3') entries = entries.filter(e => e.rank === 3);
    else if (rankFilter === '4+') entries = entries.filter(e => e.rank > 3);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(
        e =>
          e.team_name.toLowerCase().includes(q) ||
          e.competition_name.toLowerCase().includes(q) ||
          e.leader_name?.toLowerCase().includes(q) ||
          e.prize_name?.toLowerCase().includes(q)
      );
    }

    return entries;
  }, [data, typeFilter, rankFilter, searchQuery]);

  /* Group by competition */
  const groupedByComp = useMemo(() => {
    const map = new Map<number, ShowcaseEntry[]>();
    filteredEntries.forEach(e => {
      const arr = map.get(e.competition_id) || [];
      arr.push(e);
      map.set(e.competition_id, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // Sort by highest rank in each group
      const minA = Math.min(...a[1].map(x => x.rank));
      const minB = Math.min(...b[1].map(x => x.rank));
      return minA - minB;
    });
  }, [filteredEntries]);

  /* Top teams */
  const topTeams = useMemo(() => {
    if (!data?.top_teams) return [];
    return data.top_teams.slice(0, 6);
  }, [data]);

  /* Unique competition types present */
  const activeTypes = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.entries.map(e => e.comp_type))];
  }, [data]);

  /* ─── Loading State ─────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <svg width={40} height={40} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5" />
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>加载成就数据中…</span>
      </div>
    );
  }

  if (!data) return null;

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ── Hero Header ── */}
      <div style={{
        marginBottom: 32,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(99,102,241,0.06) 50%, rgba(16,185,129,0.06) 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        border: '1px solid var(--border-1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            ◆ ACHIEVEMENT GALLERY
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
          🏆 成就展示墙
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>
          浏览所有赛事获奖成就，搜索和筛选优秀团队与个人
        </p>
      </div>

      {/* ── Stats Summary Cards ── */}
      <div ref={statsRef} style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32,
      }}>
        {[
          { label: '获奖总数', value: data.total_awards, icon: '🏅', color: 'var(--amber)', gradient: 'rgba(245,158,11,0.08)' },
          { label: '奖金总额', value: `¥${data.total_prize.toLocaleString()}`, icon: '💰', color: '#10b981', gradient: 'rgba(16,185,129,0.08)' },
          { label: '获奖团队', value: data.total_teams, icon: '👥', color: 'var(--purple)', gradient: 'rgba(139,92,246,0.08)' },
          { label: '覆盖赛事', value: data.comp_count, icon: '🎯', color: 'var(--teal)', gradient: 'rgba(20,184,166,0.08)' },
          { label: '平均奖金', value: `¥${data.total_teams > 0 ? Math.round(data.total_prize / data.total_awards).toLocaleString() : 0}`, icon: '📊', color: '#f59e0b', gradient: 'rgba(245,158,11,0.06)' },
        ].map((s, i) => (
          <div key={i} data-stat style={{
            background: `linear-gradient(135deg, ${s.gradient}, transparent)`,
            border: '1px solid var(--border-1)',
            borderRadius: 14,
            padding: '20px 16px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -12, right: -12, width: 60, height: 60,
              background: `radial-gradient(circle, ${s.gradient}, transparent)`,
              borderRadius: '50%', pointerEvents: 'none',
            }} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Top Teams Highlight ── */}
      {topTeams.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          }}>
            <span style={{ fontSize: 18 }}>⭐</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              明星团队
            </h2>
            <span style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 12,
              background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', fontWeight: 600,
            }}>
              TOP {topTeams.length}
            </span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14,
          }}>
            {topTeams.map((team, idx) => (
              <div key={team.id} style={{
                background: idx === 0
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))'
                  : 'var(--surface-1)',
                border: `1px solid ${idx === 0 ? 'rgba(245,158,11,0.3)' : 'var(--border-1)'}`,
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: idx === 0 ? 'var(--amber)' : idx === 1 ? '#a0aec0' : idx === 2 ? '#cd7f32' : 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                  color: idx < 3 ? '#000' : 'var(--text-3)',
                  fontWeight: 700,
                }}>
                  {rankEmoji(idx + 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--text-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {team.team_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {team.leader_name && `${team.leader_name} · `}
                    {team.competition_name}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: rankColor(team.rank) }}>
                    {team.rank_name || `第${team.rank}名`}
                  </div>
                  {team.prize_amount > 0 && (
                    <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                      ¥{team.prize_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28,
      }}>
        {/* Search bar */}
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: 'var(--text-3)', pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="搜索团队名、赛事名、队长…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: 10,
              border: '1px solid var(--border-1)',
              background: 'var(--surface-1)',
              color: 'var(--text-1)',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-1)')}
          />
        </div>

        {/* Filter rows */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {/* Type filters */}
          {typeFilterOptions.filter(t => t.key === 'all' || activeTypes.includes(t.key)).map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid ' + (typeFilter === t.key ? 'var(--teal)' : 'var(--border-1)'),
                background: typeFilter === t.key ? 'rgba(20,184,166,0.12)' : 'var(--surface-1)',
                color: typeFilter === t.key ? 'var(--teal)' : 'var(--text-2)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: typeFilter === t.key ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Rank filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {rankFilterOptions.map(r => (
            <button
              key={r.key}
              onClick={() => setRankFilter(r.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid ' + (rankFilter === r.key ? 'var(--amber)' : 'var(--border-1)'),
                background: rankFilter === r.key ? 'rgba(245,158,11,0.12)' : 'var(--surface-1)',
                color: rankFilter === r.key ? 'var(--amber)' : 'var(--text-2)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: rankFilter === r.key ? 600 : 400,
              }}
            >
              {r.label}
            </button>
          ))}
          {/* Active filter count */}
          {(typeFilter !== 'all' || rankFilter !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => { setTypeFilter('all'); setRankFilter('all'); setSearchQuery(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ✕ 清除筛选
            </button>
          )}
        </div>
      </div>

      {/* ── Results Count ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
          共 <strong style={{ color: 'var(--text-1)' }}>{filteredEntries.length}</strong> 条获奖记录
        </span>
        <span style={{
          width: 4, height: 4, borderRadius: '50%', background: 'var(--text-3)', opacity: 0.4,
        }} />
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {groupedByComp.length} 项赛事
        </span>
      </div>

      {/* ── Achievement Grid ── */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20,
        }}
      >
        {groupedByComp.map(([compId, awards]) => {
          const comp = awards[0];
          const totalPrize = awards.reduce((sum, a) => sum + (a.prize_amount || 0), 0);
          const topRank = Math.min(...awards.map(a => a.rank));
          const typeColor = typeColors[comp.comp_type] || 'var(--teal)';

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
                position: 'relative',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Competition header bar */}
              <div style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--border-1)',
                background: `linear-gradient(135deg, ${typeColor}08, rgba(99,102,241,0.04))`,
                position: 'relative',
              }}>
                {/* Top rank indicator glow */}
                {topRank <= 3 && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: rankColor(topRank),
                    opacity: 0.6,
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10,
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: typeColor,
                    color: '#000',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {typeLabels[comp.comp_type] || comp.comp_type}
                  </span>
                  <span style={{
                    fontSize: 11, color: 'var(--text-3)',
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--surface-2)',
                  }}>
                    {awards.length} 个奖项
                  </span>
                </div>
                <h3 style={{
                  fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0,
                  lineHeight: 1.4,
                }}>
                  {comp.competition_name}
                </h3>
                {totalPrize > 0 && (
                  <div style={{
                    fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: 600,
                  }}>
                    💰 合计奖金 ¥{totalPrize.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Awards list */}
              <div style={{ padding: '8px 22px 14px' }}>
                {awards
                  .sort((a, b) => a.rank - b.rank)
                  .map(award => (
                    <div
                      key={award.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 10px',
                        marginTop: 4,
                        borderRadius: 10,
                        background: rankBg(award.rank),
                        borderLeft: `3px solid ${rankColor(award.rank)}`,
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{
                        fontSize: 22,
                        minWidth: 36,
                        textAlign: 'center',
                        lineHeight: 1,
                      }}>
                        {rankEmoji(award.rank)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--text-1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {award.team_name}
                        </div>
                        <div style={{
                          fontSize: 12, color: 'var(--text-3)', marginTop: 3,
                          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                        }}>
                          {award.leader_name && (
                            <span>👤 {award.leader_name}</span>
                          )}
                          {award.prize_name && (
                            <>
                              {award.leader_name && <span style={{ opacity: 0.3 }}>·</span>}
                              <span>🎁 {award.prize_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: rankColor(award.rank),
                          lineHeight: 1.3,
                        }}>
                          {award.rank_name || `第${award.rank}名`}
                        </div>
                        {Number(award.prize_amount) > 0 && (
                          <div style={{
                            fontSize: 13, color: '#10b981', marginTop: 3, fontWeight: 600,
                          }}>
                            ¥{Number(award.prize_amount).toLocaleString()}
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

      {/* ── Empty State ── */}
      {filteredEntries.length === 0 && !loading && (
        <div style={{
          textAlign: 'center', padding: '80px 0', color: 'var(--text-3)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {searchQuery || typeFilter !== 'all' || rankFilter !== 'all'
              ? '没有匹配的获奖记录'
              : '暂无获奖数据'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            {searchQuery || typeFilter !== 'all' || rankFilter !== 'all'
              ? '请尝试调整筛选条件'
              : '获奖信息将在赛事结算后展示'}
          </div>
        </div>
      )}
    </div>
  );
}
