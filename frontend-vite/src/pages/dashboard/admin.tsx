import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { statsAPI, workflowsAPI } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { SectionLabel } from '@/components/ui/page-helpers';
import { BarChart, DonutChart, AreaChart, ScoreGauge } from '@/components/ui/charts';
import type { StatsOverview, ApprovalWorkflow } from '@/types';

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

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [pending, setPending] = useState<ApprovalWorkflow[]>([]);
  const [engagement, setEngagement] = useState<Record<string, number> | null>(null);
  const [typeDist, setTypeDist] = useState<Array<{ type: string; count: number }>>([]);
  const [trends, setTrends] = useState<Array<{ month: string; competitions: number; teams: number; awards: number }>>([]);
  const [progress, setProgress] = useState<Array<{ id: number; title: string; status: string; type: string; team_count: number; student_count: number; pre_plan_count: number; reviewed_count: number; approved_count: number; award_count: number; progress: number }>>([]);
  const [healthScore, setHealthScore] = useState<{ overall_score: number; level: string; dimensions: Array<{ name: string; score: number; weight: number; details: string }>; summary: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, wfRes, engRes, typeRes, trendsRes, progressRes, healthRes] = await Promise.all([
          statsAPI.overview(),
          workflowsAPI.list({ tab: 'pending' }),
          statsAPI.engagement().catch(() => null),
          statsAPI.typeDistribution().catch((): { types: Array<{ type: string; count: number }> } => ({ types: [] })),
          statsAPI.trends().catch((): { trends: Array<{ month: string; competitions: number; teams: number; awards: number }> } => ({ trends: [] })),
          statsAPI.progress().catch((): { competitions: Array<{ id: number; title: string; status: string; type: string; team_count: number; student_count: number; pre_plan_count: number; reviewed_count: number; approved_count: number; award_count: number; progress: number }> } => ({ competitions: [] })),
          statsAPI.healthScore().catch(() => null),
        ]);
        setStats(statsRes);
        setPending(wfRes.workflows || []);
        setEngagement(engRes);
        setTypeDist(typeRes.types || []);
        setTrends(trendsRes.trends || []);
        setProgress((progressRes.competitions || []).slice(0, 6));
        setHealthScore(healthRes);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* GSAP stagger + magnetic hover */
  useEffect(() => {
    if (loading) return;
    const el = gridRef.current;
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      const cards = el.querySelectorAll<HTMLElement>('[data-bento]');
      if (!cards.length) return;
      gsap.set(cards, { opacity: 0, y: 24, scale: 0.97 });
      gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', delay: 0.1 });
    });

    const handleMove = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.card-magnetic') as HTMLElement | null;
      if (!target || !el.contains(target)) return;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = (x - rect.width / 2) / (rect.width / 2);
      const dy = (y - rect.height / 2) / (rect.height / 2);
      target.style.setProperty('--mouse-x', `${x}px`);
      target.style.setProperty('--mouse-y', `${y}px`);
      gsap.to(target, { rotateY: dx * 3, rotateX: -dy * 3, x: dx * 6, y: dy * 6, duration: 0.4, ease: 'power2.out' });
    };
    const handleLeave = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.card-magnetic') as HTMLElement | null;
      if (!target) return;
      gsap.to(target, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave, true);

    return () => { cancelAnimationFrame(raf); el.removeEventListener('mousemove', handleMove); el.removeEventListener('mouseleave', handleLeave, true); };
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

  const statItems = [
    { label: '赛事总数', value: stats?.total_competitions || 0, icon: 'trophy', color: 'var(--amber)', sub: `${stats?.ongoing_competitions || 0} 个进行中` },
    { label: '参赛团队', value: stats?.total_teams || 0, icon: 'users', color: 'var(--teal)', sub: `${stats?.total_students || 0} 名学生` },
    { label: '待审批', value: pending.length, icon: 'check', color: 'var(--red)', sub: '需要你的处理' },
    { label: '已发奖项', value: stats?.total_awards || 0, icon: 'gift', color: 'var(--purple)', sub: '累计奖项' },
  ];

  return (
    <div className="forge-page">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ ADMIN CONSOLE
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          早上好，<span style={{ color: 'var(--amber)' }}>{user?.name || '管理员'}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>今日有 {pending.length} 个审批待处理</p>
      </div>

      {/* ── Bento Grid ─────────────────────────────────── */}
      <div ref={gridRef} className="bento-grid">
        {statItems.map((s) => (
          <div key={s.label} data-bento className="bento-item card card-magnetic" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                <Icon name={s.icon} size={15}/>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.sub}</span>
          </div>
        ))}

        {/* Pending Approvals — wide */}
        <div data-bento className="bento-item bento-wide card card-magnetic" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel label={`待审批 (${pending.length})`}/>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/approvals')}>查看全部</button>
          </div>
          <div>
            {pending.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无待办</div>
            ) : pending.slice(0, 4).map((a) => (
              <div key={a.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {a.submitter?.name || ''} · {new Date(a.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <StatusBadge status={a.type} />
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>处理</button>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Overview */}
        <div data-bento className="bento-item card card-magnetic" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel label="平台概览"/>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: '总用户', value: stats?.total_users || 0, color: 'var(--amber)' },
                { label: '教师', value: stats?.total_teachers || 0, color: 'var(--teal)' },
                { label: '学生', value: stats?.total_students || 0, color: 'var(--purple)' },
                { label: '赛事', value: stats?.total_competitions || 0, color: 'var(--green)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Section ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 24 }}>
        {/* User Distribution Donut */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="用户分布" />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <DonutChart
              segments={[
                { label: '学生', value: stats?.total_students || 0 },
                { label: '教师', value: stats?.total_teachers || 0 },
                { label: '管理员', value: Math.max(1, (stats?.total_users || 0) - (stats?.total_students || 0) - (stats?.total_teachers || 0)) },
              ].filter(s => s.value > 0).map(s => ({
                label: s.label,
                value: Math.round(s.value / Math.max(stats?.total_users || 1, 1) * 100),
              }))}
              size={140}
            />
          </div>
        </div>

        {/* Competition Type Distribution */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="赛事类型分布" />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            {typeDist.length > 0 ? (
              <DonutChart
                segments={typeDist.map(t => ({
                  label: TYPE_LABELS[t.type] || t.type,
                  value: t.count,
                }))}
                size={140}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>暂无数据</div>
            )}
          </div>
          {/* Legend */}
          {typeDist.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12, justifyContent: 'center' }}>
              {typeDist.map(t => (
                <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[t.type] || 'var(--text-3)' }} />
                  <span style={{ color: 'var(--text-2)' }}>{TYPE_LABELS[t.type] || t.type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontWeight: 600 }}>{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Bar Chart */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="平台数据" />
          <div style={{ marginTop: 16 }}>
            <BarChart
              data={[
                { label: '赛事', value: stats?.total_competitions || 0 },
                { label: '团队', value: stats?.total_teams || 0 },
                { label: '奖项', value: stats?.total_awards || 0 },
                { label: '预案', value: stats?.total_pre_plans || 0 },
                { label: '评价', value: stats?.total_evaluations || 0 },
              ]}
              color="var(--amber)"
              h={140}
            />
          </div>
        </div>
      </div>

      {/* ── Trends Chart ──────────────────────────────── */}
      {trends.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel label="月度趋势" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>赛事</div>
              <AreaChart data={trends.map(t => ({ label: t.month.slice(5), value: t.competitions }))} color="var(--amber)" h={80} />
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>团队</div>
              <AreaChart data={trends.map(t => ({ label: t.month.slice(5), value: t.teams }))} color="var(--teal)" h={80} />
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>奖项</div>
              <AreaChart data={trends.map(t => ({ label: t.month.slice(5), value: t.awards }))} color="var(--purple)" h={80} />
            </div>
          </div>
        </div>
      )}

      {/* ── Engagement Metrics ─────────────────────────── */}
      {engagement && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel label="参与度指标" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
            {[
              { label: '组队率', value: `${(engagement.team_formation_rate || 0).toFixed(1)}%`, desc: `${engagement.students_with_teams || 0}/${engagement.total_students || 0} 学生`, color: 'var(--teal)' },
              { label: 'AI 评审率', value: `${(engagement.ai_review_rate || 0).toFixed(1)}%`, desc: `${engagement.reviewed_pre_plans || 0}/${engagement.total_pre_plans || 0} 预案`, color: 'var(--purple)' },
              { label: '赛事完成率', value: `${(engagement.completion_rate || 0).toFixed(1)}%`, desc: `${engagement.published_competitions || 0} 已发布`, color: 'var(--amber)' },
              { label: '平均团队规模', value: (engagement.avg_team_size || 0).toFixed(1), desc: `${engagement.total_teams || 0} 个团队`, color: 'var(--green)' },
              { label: '平均预案评分', value: (engagement.avg_pre_plan_score || 0).toFixed(1), desc: 'AI 评审均分', color: 'var(--red)' },
              { label: '进行中赛事', value: String(engagement.active_competitions || 0), desc: `共 ${engagement.total_competitions || 0} 个`, color: 'var(--orange)' },
            ].map((item) => (
              <div key={item.label} className="card card-magnetic" style={{ padding: '16px 18px', borderLeft: `3px solid ${item.color}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Platform Health Score ─────────────────────────── */}
      {healthScore && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel label="平台健康评分" />
          <div className="card" style={{ padding: '24px', marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flexShrink: 0 }}>
                <ScoreGauge score={Math.round(healthScore.overall_score)} label={healthScore.level === 'excellent' ? '优秀' : healthScore.level === 'good' ? '良好' : healthScore.level === 'fair' ? '一般' : '需关注'} size={150} />
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>{healthScore.summary}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {healthScore.dimensions.map((dim) => (
                    <div key={dim.name} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{dim.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: dim.score >= 80 ? 'var(--green)' : dim.score >= 60 ? 'var(--amber)' : dim.score >= 40 ? 'var(--orange)' : 'var(--red)' }}>{dim.score.toFixed(0)}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: dim.score >= 80 ? 'var(--green)' : dim.score >= 60 ? 'var(--amber)' : dim.score >= 40 ? 'var(--orange)' : 'var(--red)', width: `${dim.score}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{dim.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Competition Lifecycle Progress ─────────────────── */}
      {progress.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel label="赛事生命周期进度" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginTop: 12 }}>
            {progress.map((p) => {
              const statusLabel = p.status === 'ongoing' ? '进行中' : p.status === 'published' ? '已发布' : p.status === 'completed' ? '已完成' : '草稿';
              const statusColor = p.status === 'ongoing' ? 'var(--green)' : p.status === 'published' ? 'var(--amber)' : p.status === 'completed' ? 'var(--teal)' : 'var(--text-3)';
              return (
                <div key={p.id} className="card card-magnetic" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{TYPE_LABELS[p.type] || p.type}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '2px 8px', borderRadius: 6, flexShrink: 0, marginLeft: 8 }}>{statusLabel}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`, width: `${p.progress}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)' }}>
                    <span>{p.progress}% 完成</span>
                    <span>{p.team_count} 团队 · {p.student_count} 学生 · {p.pre_plan_count} 预案 · {p.award_count} 奖项</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
        {[
          { label: '创建赛事', icon: 'trophy', path: '/competitions', color: 'var(--amber)' },
          { label: '查看排行榜', icon: 'chart', path: '/leaderboard', color: 'var(--teal)' },
          { label: '审批中心', icon: 'check', path: '/approvals', color: 'var(--red)' },
          { label: '数据导出', icon: 'download', path: '/stats', color: 'var(--purple)' },
          { label: '赛事日历', icon: 'calendar', path: '/calendar', color: 'var(--orange)' },
        ].map((action) => (
          <button key={action.label} className="card card-magnetic" onClick={() => navigate(action.path)}
            style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
              <Icon name={action.icon} size={16} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
