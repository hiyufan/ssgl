import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { statsAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { SectionLabel } from '@/components/ui/page-helpers';

interface AnnualReport {
  generated_at: string;
  year: number;
  platform: {
    total_users: number;
    total_students: number;
    total_teachers: number;
    total_admins: number;
    total_competitions: number;
    total_teams: number;
    total_awards: number;
    total_pre_plans: number;
    total_evaluations: number;
    active_competitions: number;
    settled_awards: number;
    avg_team_size: number;
    student_participation: number;
  };
  competitions: {
    total: number;
    published: number;
    ongoing: number;
    completed: number;
    draft: number;
    by_type: Array<{ type: string; count: number }>;
    avg_teams_per_comp: number;
  };
  teams: {
    total: number;
    with_members: number;
    with_plans: number;
    avg_size: number;
    max_size: number;
  };
  students: {
    total: number;
    with_teams: number;
    with_awards: number;
    with_pre_plans: number;
    team_rate: number;
    award_rate: number;
    avg_competitions: number;
  };
  awards: {
    total: number;
    settled: number;
    pending: number;
    total_prize: number;
    avg_prize: number;
    top_rank_count: number;
  };
  ai_usage: {
    total_preplan_reviews: number;
    total_ai_analyses: number;
    total_rag_documents: number;
  };
  trends: Array<{
    month: string;
    competitions: number;
    teams: number;
    awards: number;
    pre_plans: number;
  }>;
  top_competitions: Array<{
    id: number;
    title: string;
    type: string;
    team_count: number;
    award_count: number;
    pre_plan_count: number;
  }>;
  top_teams: Array<{
    id: number;
    name: string;
    competition_id: number;
    comp_title: string;
    member_count: number;
    award_count: number;
    pre_plan_count: number;
  }>;
  highlights: Array<{
    type: string;
    title: string;
    details: string;
    icon: string;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  hackathon: '黑客松',
  innovation: '创新赛',
  research: '科研赛',
  business_plan: '商业计划',
  ai_innovation: 'AI创新',
  data_science: '数据科学',
};

const TYPE_COLORS: Record<string, string> = {
  hackathon: 'var(--amber)',
  innovation: 'var(--teal)',
  research: 'var(--purple)',
  business_plan: 'var(--green)',
  ai_innovation: 'var(--red)',
  data_science: 'var(--orange)',
};

function StatCard({ label, value, icon, color = 'var(--teal)', sub }: { label: string; value: string | number; icon: string; color?: string; sub?: string }) {
  return (
    <div data-bento className="card-magnetic" style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.05, transform: 'rotate(-15deg)' }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color = 'var(--teal)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: '100%', height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color = 'var(--teal)', maxBars = 8 }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string; color?: string; maxBars?: number }) {
  const items = data.slice(0, maxBars);
  const maxVal = Math.max(...items.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 100, fontSize: 13, color: 'var(--text-2)', textAlign: 'right', flexShrink: 0 }}>
            {TYPE_LABELS[String(d[labelKey])] || String(d[labelKey])}
          </div>
          <div style={{ flex: 1 }}>
            <ProgressBar value={Number(d[valueKey]) || 0} max={maxVal} color={TYPE_COLORS[String(d[labelKey])] || color} />
          </div>
          <div style={{ width: 40, fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{String(d[valueKey])}</div>
        </div>
      ))}
    </div>
  );
}

function MiniTrend({ data, keys }: { data: Record<string, unknown>[]; keys: { key: string; label: string; color: string }[] }) {
  if (data.length < 2) return null;
  const allVals = data.flatMap(d => keys.map(k => Number(d[k.key]) || 0));
  const maxVal = Math.max(...allVals, 1);
  const w = 400;
  const h = 120;
  const padX = 40;
  const padY = 20;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;

  const getX = (i: number) => padX + (i / (data.length - 1)) * plotW;
  const getY = (v: number) => padY + plotH - (v / maxVal) * plotH;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(r => (
        <line key={r} x1={padX} y1={getY(r * maxVal)} x2={w - padX} y2={getY(r * maxVal)} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />
      ))}
      {/* Lines */}
      {keys.map(k => {
        const points = data.map((d, i) => `${getX(i)},${getY(Number(d[k.key]) || 0)}`).join(' ');
        return (
          <g key={k.key}>
            <polyline points={points} fill="none" stroke={k.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {data.map((d, i) => (
              <circle key={i} cx={getX(i)} cy={getY(Number(d[k.key]) || 0)} r={3} fill={k.color} stroke="var(--surface)" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
      {/* X labels */}
      {data.map((d, i) => (
        i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
          <text key={i} x={getX(i)} y={h - 2} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text-3)' }}>
            {String(d.month).slice(5)}
          </text>
        ) : null
      ))}
    </svg>
  );
}

export function AnnualReportPage() {
  const [data, setData] = useState<AnnualReport | null>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    statsAPI.annualReport()
      .then(d => setData(d as unknown as AnnualReport))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !gridRef.current) return;
    const raf = requestAnimationFrame(() => {
      const cards = gridRef.current?.querySelectorAll<HTMLElement>('[data-bento]');
      if (!cards?.length) return;
      gsap.set(cards, { opacity: 0, y: 24, scale: 0.97 });
      gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out', delay: 0.1 });
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, data]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5" />
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (!data) return null;

  const p = data.platform;
  const c = data.competitions;
  const t = data.teams;
  const s = data.students;
  const a = data.awards;

  return (
    <div className="forge-page" ref={gridRef}>
      {/* Header */}
      <div data-bento style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 36 }}>📊</span>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
              {data.year} 平台年度报告
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
              SSGL 竞赛知识库平台 · 生成于 {new Date(data.generated_at).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div data-bento style={{ marginBottom: 24 }}>
          <SectionLabel>🌟 亮点成就</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
            {data.highlights.map((h, i) => (
              <div key={i} style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: 28 }}>{h.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{h.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{h.details}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Overview */}
      <div data-bento style={{ marginBottom: 24 }}>
        <SectionLabel>🏗️ 平台概览</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
          <StatCard label="总用户数" value={p.total_users} icon="👥" color="var(--teal)" sub={`${p.total_students} 学生 / ${p.total_teachers} 教师`} />
          <StatCard label="赛事总数" value={p.total_competitions} icon="🏆" color="var(--amber)" sub={`${p.active_competitions} 进行中`} />
          <StatCard label="团队总数" value={p.total_teams} icon="🤝" color="var(--purple)" sub={`平均 ${p.avg_team_size.toFixed(1)} 人/队`} />
          <StatCard label="奖项总数" value={p.total_awards} icon="🥇" color="var(--green)" sub={`${p.settled_awards} 已结算`} />
          <StatCard label="预案总数" value={p.total_pre_plans} icon="📋" color="var(--amber)" />
          <StatCard label="学生参与率" value={`${p.student_participation.toFixed(1)}%`} icon="🎯" color="var(--teal)" />
        </div>
      </div>

      {/* Competition Breakdown */}
      <div data-bento style={{ marginBottom: 24 }}>
        <SectionLabel>🏆 赛事分析</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>按类型分布</div>
            <BarChart data={c.by_type as unknown as Record<string, unknown>[]} labelKey="type" valueKey="count" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>赛事状态</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{c.published}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>已发布</div>
              </div>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--amber)' }}>{c.ongoing}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>进行中</div>
              </div>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--teal)' }}>{c.completed}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>已完成</div>
              </div>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-3)' }}>{c.draft}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>草稿</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-2)' }}>
              平均每赛事 <strong>{c.avg_teams_per_comp.toFixed(1)}</strong> 支团队
            </div>
          </div>
        </div>
      </div>

      {/* Student Stats */}
      <div data-bento style={{ marginBottom: 24 }}>
        <SectionLabel>🎓 学生数据</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>组队率</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--teal)' }}>{s.team_rate.toFixed(1)}%</div>
            <ProgressBar value={s.team_rate} max={100} color="var(--teal)" />
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.with_teams} / {s.total} 学生</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>获奖率</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--amber)' }}>{s.award_rate.toFixed(1)}%</div>
            <ProgressBar value={s.award_rate} max={100} color="var(--amber)" />
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.with_awards} / {s.total} 学生</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>预案提交率</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--purple)' }}>
              {s.total > 0 ? ((s.with_pre_plans / s.total) * 100).toFixed(1) : 0}%
            </div>
            <ProgressBar value={s.with_pre_plans} max={s.total} color="var(--purple)" />
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.with_pre_plans} / {s.total} 学生</div>
          </div>
        </div>
      </div>

      {/* Awards */}
      <div data-bento style={{ marginBottom: 24 }}>
        <SectionLabel>🥇 奖项统计</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
          <StatCard label="奖项总数" value={a.total} icon="🏅" />
          <StatCard label="已结算" value={a.settled} icon="✅" color="var(--green)" />
          <StatCard label="待确认" value={a.pending} icon="⏳" color="var(--amber)" />
          <StatCard label="奖金总额" value={`¥${a.total_prize.toLocaleString()}`} icon="💰" color="var(--amber)" />
          <StatCard label="平均奖金" value={`¥${a.avg_prize.toLocaleString()}`} icon="📊" />
          <StatCard label="前三名" value={a.top_rank_count} icon="🏆" color="var(--amber)" />
        </div>
      </div>

      {/* Monthly Trends */}
      <div data-bento style={{ marginBottom: 24 }}>
        <SectionLabel>📈 月度趋势</SectionLabel>
        <div style={{ marginTop: 12, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            {[
              { key: 'competitions', label: '赛事', color: 'var(--amber)' },
              { key: 'teams', label: '团队', color: 'var(--teal)' },
              { key: 'awards', label: '奖项', color: 'var(--green)' },
            ].map(k => (
              <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                <div style={{ width: 12, height: 3, background: k.color, borderRadius: 2 }} />
                {k.label}
              </div>
            ))}
          </div>
          <MiniTrend
            data={data.trends as unknown as Record<string, unknown>[]}
            keys={[
              { key: 'competitions', label: '赛事', color: 'var(--amber)' },
              { key: 'teams', label: '团队', color: 'var(--teal)' },
              { key: 'awards', label: '奖项', color: 'var(--green)' },
            ]}
          />
        </div>
      </div>

      {/* Top Competitions */}
      {data.top_competitions.length > 0 && (
        <div data-bento style={{ marginBottom: 24 }}>
          <SectionLabel>🔥 热门赛事 TOP 10</SectionLabel>
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>赛事名称</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>类型</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>团队数</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>奖项数</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>预案数</th>
                </tr>
              </thead>
              <tbody>
                {data.top_competitions.map((comp, i) => (
                  <tr key={comp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: i < 3 ? 'var(--amber)' : 'var(--text-3)' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{comp.title}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `color-mix(in srgb, ${TYPE_COLORS[comp.type] || 'var(--teal)'} 15%, transparent)`,
                        color: TYPE_COLORS[comp.type] || 'var(--teal)',
                      }}>
                        {TYPE_LABELS[comp.type] || comp.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{comp.team_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{comp.award_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{comp.pre_plan_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Teams */}
      {data.top_teams.length > 0 && (
        <div data-bento style={{ marginBottom: 24 }}>
          <SectionLabel>⭐ 优秀团队 TOP 10</SectionLabel>
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>团队名称</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>参赛赛事</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>成员数</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>获奖数</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>预案数</th>
                </tr>
              </thead>
              <tbody>
                {data.top_teams.map((team, i) => (
                  <tr key={team.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: i < 3 ? 'var(--amber)' : 'var(--text-3)' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{team.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{team.comp_title}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{team.member_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: team.award_count > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                      {team.award_count}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{team.pre_plan_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
