import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { competitionsAPI, comparisonAPI } from '@/services/api';
import type { Competition, CompetitionComparison, ComparisonSummary } from '@/types';
import { SectionLabel, Spinner } from '@/components/ui/page-helpers';

const COMPARE_METRICS: { key: keyof CompetitionComparison; label: string; format?: (v: number) => string }[] = [
  { key: 'team_count', label: '团队数' },
  { key: 'student_count', label: '学生数' },
  { key: 'preplan_count', label: '预案数' },
  { key: 'award_count', label: '奖项数' },
  { key: 'avg_team_size', label: '平均团队规模', format: v => v.toFixed(1) },
  { key: 'registration_pct', label: '报名率%', format: v => v.toFixed(0) + '%' },
  { key: 'duration_days', label: '持续天数' },
  { key: 'days_until_start', label: '距开始天数' },
];

const COLORS = ['var(--amber)', 'var(--teal)', 'var(--purple)', 'var(--green)', 'var(--red)'];
const BG_COLORS = ['var(--amber-bg)', 'var(--teal-bg)', 'var(--purple-bg)', 'var(--green-bg)', 'rgba(239,68,68,0.1)'];

export function ComparePage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [compareData, setCompareData] = useState<{ comparisons: CompetitionComparison[]; summary: ComparisonSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    competitionsAPI.list()
      .then(res => setCompetitions(res.competitions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!gridRef.current || !compareData) return;
    const raf = requestAnimationFrame(() => {
      const cards = gridRef.current!.querySelectorAll<HTMLElement>('[data-bento]');
      if (!cards.length) return;
      gsap.set(cards, { opacity: 0, y: 20 });
      gsap.to(cards, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out' });
    });
    return () => cancelAnimationFrame(raf);
  }, [compareData]);

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const doCompare = async () => {
    if (selected.length < 2) return;
    setComparing(true);
    try {
      const data = await comparisonAPI.compare(selected);
      setCompareData(data);
    } catch {
      setCompareData(null);
    } finally {
      setComparing(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  const maxValues: Record<string, number> = {};
  if (compareData) {
    for (const m of COMPARE_METRICS) {
      maxValues[m.key] = Math.max(...compareData.comparisons.map(c => (c[m.key] as number) || 0), 1);
    }
  }

  return (
    <div className="forge-page">
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ COMPARE
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          赛事对比分析
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          选择 2-5 个赛事进行多维度对比分析
        </p>
      </div>

      {/* Selection */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <SectionLabel label="选择赛事" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {competitions.map(comp => {
            const isSelected = selected.includes(comp.id);
            return (
              <button
                key={comp.id}
                onClick={() => toggleSelect(comp.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--amber-bg)' : 'var(--surface-2)',
                  color: isSelected ? 'var(--amber)' : 'var(--text-2)',
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {comp.title}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button
            onClick={doCompare}
            disabled={selected.length < 2 || comparing}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: selected.length >= 2 ? 'var(--amber)' : 'var(--border)',
              color: selected.length >= 2 ? '#000' : 'var(--text-3)',
              fontSize: 13,
              fontWeight: 700,
              cursor: selected.length >= 2 ? 'pointer' : 'not-allowed',
            }}
          >
            {comparing ? '分析中...' : `对比 ${selected.length} 个赛事`}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            已选 {selected.length}/5
          </span>
        </div>
      </div>

      {/* Results */}
      {compareData && (
        <>
          {/* Summary cards */}
          <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div data-bento className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                🔥 最受欢迎
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>
                {compareData.summary.most_popular || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {compareData.summary.total_teams} 支团队总计
              </div>
            </div>
            <div data-bento className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                👥 最佳团队规模
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal)' }}>
                {compareData.summary.best_team_size || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                平均 {compareData.summary.avg_teams_overall.toFixed(1)} 支/赛事
              </div>
            </div>
            <div data-bento className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                📊 参与总人数
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--purple)' }}>
                {compareData.summary.total_students}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {compareData.comparisons.length} 个赛事参与
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24, overflowX: 'auto' }}>
            <SectionLabel label="多维度对比" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    指标
                  </th>
                  {compareData.comparisons.map((c, i) => (
                    <th key={c.id} style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: COLORS[i % COLORS.length], fontWeight: 700, fontSize: 12 }}>
                      {c.title.length > 12 ? c.title.slice(0, 12) + '…' : c.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontWeight: 600 }}>类型</td>
                  {compareData.comparisons.map(c => (
                    <td key={c.id} style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text)' }}>{c.type}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontWeight: 600 }}>级别</td>
                  {compareData.comparisons.map(c => (
                    <td key={c.id} style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text)' }}>{c.level}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontWeight: 600 }}>状态</td>
                  {compareData.comparisons.map(c => (
                    <td key={c.id} style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: c.status === 'published' ? 'var(--green-bg)' : c.status === 'ongoing' ? 'var(--amber-bg)' : 'var(--surface-2)',
                        color: c.status === 'published' ? 'var(--green)' : c.status === 'ongoing' ? 'var(--amber)' : 'var(--text-3)',
                      }}>
                        {c.status === 'published' ? '已发布' : c.status === 'ongoing' ? '进行中' : c.status === 'completed' ? '已结束' : c.status}
                      </span>
                    </td>
                  ))}
                </tr>
                {COMPARE_METRICS.map(m => (
                  <tr key={m.key}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontWeight: 600 }}>{m.label}</td>
                    {compareData.comparisons.map((c, i) => {
                      const val = (c[m.key] as number) || 0;
                      const max = maxValues[m.key];
                      const pct = max > 0 ? (val / max) * 100 : 0;
                      return (
                        <td key={c.id} style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text)' }}>
                            {m.format ? m.format(val) : val}
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: COLORS[i % COLORS.length], transition: 'width 0.6s ease' }} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual bar chart */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <SectionLabel label="可视化柱状图" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 16 }}>
              {COMPARE_METRICS.slice(0, 4).map(m => (
                <div key={m.key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textAlign: 'center' }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: 100 }}>
                    {compareData.comparisons.map((c, i) => {
                      const val = (c[m.key] as number) || 0;
                      const max = maxValues[m.key];
                      const h = max > 0 ? Math.max((val / max) * 80, 4) : 4;
                      return (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{val}</span>
                          <div style={{ width: 20, height: h, borderRadius: 4, background: COLORS[i % COLORS.length], opacity: 0.8, transition: 'height 0.6s ease' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              {compareData.comparisons.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                  {c.title.length > 15 ? c.title.slice(0, 15) + '…' : c.title}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!compareData && !comparing && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>⚖️</div>
          <div style={{ fontSize: 14 }}>选择赛事后点击对比，查看多维度分析</div>
        </div>
      )}
    </div>
  );
}
