import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { growthAPI } from '@/services/api';
import type { GrowthProfile } from '@/types';
import { SectionLabel, Spinner } from '@/components/ui/page-helpers';

const STATUS_LABELS: Record<string, string> = {
  published: '已发布', ongoing: '进行中', completed: '已结束', draft: '草稿', cancelled: '已取消',
};
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  published: { bg: 'var(--green-bg)', fg: 'var(--green)' },
  ongoing: { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
  completed: { bg: 'var(--teal-bg)', fg: 'var(--teal)' },
  draft: { bg: 'var(--surface-2)', fg: 'var(--text-3)' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', fg: 'var(--red)' },
};
const TIMELINE_ICONS: Record<string, string> = {
  competition: '🏆', team: '👥', preplan: '📋', award: '🥇', milestone: '📌',
};

type GrowthProfilePayload = Partial<Omit<GrowthProfile, 'summary' | 'competitions' | 'awards' | 'skills' | 'timeline' | 'recommendations'>> & {
  summary?: Partial<GrowthProfile['summary']> | null;
  competitions?: GrowthProfile['competitions'] | null;
  awards?: GrowthProfile['awards'] | null;
  skills?: GrowthProfile['skills'] | null;
  timeline?: GrowthProfile['timeline'] | null;
  recommendations?: GrowthProfile['recommendations'] | null;
};

const EMPTY_SUMMARY: GrowthProfile['summary'] = {
  total_competitions: 0,
  total_awards: 0,
  total_teams: 0,
  total_pre_plans: 0,
  award_rate: 0,
  participation_days: 0,
  top_competition_type: '',
};

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeGrowthProfile(data: GrowthProfilePayload): GrowthProfile {
  return {
    student_id: data.student_id ?? 0,
    student_name: data.student_name ?? '',
    generated_at: data.generated_at ?? new Date().toISOString(),
    summary: { ...EMPTY_SUMMARY, ...(data.summary ?? {}) },
    competitions: asArray(data.competitions),
    awards: asArray(data.awards),
    skills: asArray(data.skills),
    timeline: asArray(data.timeline),
    recommendations: asArray(data.recommendations),
  };
}

function RadarChart({ skills }: { skills: Array<{ name: string; score: number }> }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const n = skills.length;
  if (n < 3) return null;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, r: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map(r => (
        <polygon
          key={r}
          points={skills.map((_, i) => { const p = getPoint(i, r * maxR); return `${p.x},${p.y}`; }).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeWidth={r === 1 ? 1.5 : 0.5}
          opacity={r === 1 ? 0.6 : 0.3}
        />
      ))}
      {skills.map((_, i) => {
        const p = getPoint(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />;
      })}
      <polygon points={skills.map((s, i) => { const r = (s.score / 100) * maxR; const p = getPoint(i, r); return `${p.x},${p.y}`; }).join(' ')} fill="var(--amber)" fillOpacity={0.15} stroke="var(--amber)" strokeWidth={2} />
      {skills.map((s, i) => {
        const r = (s.score / 100) * maxR;
        const p = getPoint(i, r);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--amber)" stroke="var(--surface)" strokeWidth={2} />;
      })}
      {skills.map((s, i) => {
        const lp = getPoint(i, maxR + 16);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: 'var(--text-2)', fontWeight: 600 }}>
            {s.name}
          </text>
        );
      })}
    </svg>
  );
}

export function GrowthPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<GrowthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    growthAPI.getProfile(user.id)
      .then(data => setProfile(normalizeGrowthProfile(data)))
      .catch(e => setError(e?.response?.data?.error || '加载失败'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!gridRef.current || !profile) return;
    const raf = requestAnimationFrame(() => {
      const cards = gridRef.current!.querySelectorAll<HTMLElement>('[data-bento]');
      if (!cards.length) return;
      gsap.set(cards, { opacity: 0, y: 20, scale: 0.97 });
      gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', delay: 0.1 });
    });
    return () => cancelAnimationFrame(raf);
  }, [profile]);

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{error}</div>;
  if (!profile) return null;

  const { summary, skills, competitions, awards, timeline, recommendations } = profile;
  const skillDims = skills.length >= 3 ? skills : [
    { name: '创新', score: 60, count: 0 },
    { name: '技术', score: 50, count: 0 },
    { name: '商业', score: 40, count: 0 },
    { name: '协作', score: 70, count: 0 },
    { name: '表达', score: 55, count: 0 },
  ];

  return (
    <div className="forge-page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ GROWTH
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          成长档案 — <span style={{ color: 'var(--teal)' }}>{profile.student_name}</span>
        </h1>
      </div>

      {/* Stat cards */}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: '参赛次数', value: summary.total_competitions, icon: '🏆', color: 'var(--amber)', bg: 'var(--amber-bg)' },
          { label: '获奖次数', value: summary.total_awards, icon: '🥇', color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: '组队次数', value: summary.total_teams, icon: '👥', color: 'var(--teal)', bg: 'var(--teal-bg)' },
          { label: '获奖率', value: `${summary.award_rate.toFixed(0)}%`, icon: '📊', color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map((s, i) => (
          <div key={i} data-bento className="card card-magnetic" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{s.icon}</div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Radar + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div data-bento className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SectionLabel label="技能雷达图" />
          <div style={{ marginTop: 16 }}>
            <RadarChart skills={skillDims} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            {skillDims.map(s => (
              <div key={s.name} style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--amber)' }} />
                {s.name}: {s.score.toFixed(0)}分 ({s.count}次)
              </div>
            ))}
          </div>
        </div>

        <div data-bento className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="成长概览" />
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {[
              { label: '参赛天数', value: `${summary.participation_days} 天` },
              { label: '预案数', value: summary.total_pre_plans },
              { label: '擅长领域', value: summary.top_competition_type || '—' },
              { label: '生成时间', value: new Date(profile.generated_at).toLocaleDateString('zh-CN') },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitions + Awards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div data-bento className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="参赛记录" />
          <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
            {competitions.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无参赛记录</div>}
            {competitions.map(c => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
              return (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {c.type} · {c.level} {c.team_name ? `· ${c.team_name}` : ''} {c.role ? `· ${c.role}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.award_rank && <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>🏅 {c.award_rank}</span>}
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg }}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div data-bento className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="获奖记录" />
          <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
            {awards.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无获奖记录</div>}
            {awards.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.comp_title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.rank_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {a.prize_amount > 0 && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>¥{a.prize_amount.toLocaleString()}</div>}
                  <span style={{ fontSize: 10, color: a.status === 'settled' ? 'var(--green)' : 'var(--text-3)', fontWeight: 600 }}>
                    {a.status === 'settled' ? '已结算' : '待结算'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div data-bento className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <SectionLabel label="成长时间线" />
        <div style={{ marginTop: 16, position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          {timeline.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无时间线事件</div>}
          {timeline.slice(0, 20).map((e, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 16, paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--amber)', border: '2px solid var(--surface)' }} />
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {new Date(e.date).toLocaleDateString('zh-CN')}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                {TIMELINE_ICONS[e.type] || '📌'} {e.title}
              </div>
              {e.detail && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{e.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div data-bento className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="AI 成长建议" />
          <div style={{ marginTop: 12 }}>
            {recommendations.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < recommendations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--amber)', flexShrink: 0, fontWeight: 700 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{r}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
