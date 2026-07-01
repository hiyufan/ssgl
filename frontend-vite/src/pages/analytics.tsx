/**
 * Analytics Dashboard — interactive recharts-powered data visualization.
 * A showcase page with rich charts for the presentation demo.
 */
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart,
} from 'recharts';
import { statsAPI } from '@/services/api';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { Icon } from '@/components/ui/icon';

/* ── Colour palette ── */
const COLORS = {
  teal: '#14b8a6',
  amber: '#f59e0b',
  purple: '#a855f7',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  pink: '#ec4899',
  cyan: '#06b6d4',
};
const PIE_COLORS = [COLORS.teal, COLORS.amber, COLORS.purple, COLORS.green, COLORS.red, COLORS.blue, COLORS.pink, COLORS.cyan];

/* ── Types ── */
interface TrendPoint {
  month: string;
  competitions: number;
  teams: number;
  awards: number;
  pre_plans: number;
  prize_amount: number;
}

interface CompetitionStat {
  id: number;
  title: string;
  status: string;
  team_count: number;
  award_count: number;
  pre_plan_count: number;
}

interface PopularityComp {
  id: number;
  title: string;
  type: string;
  team_count: number;
  student_count: number;
  registration_count: number;
  preplan_count: number;
  award_count: number;
  popularity_score: number;
  rank: number;
}

interface TypeDist {
  type: string;
  count: number;
}

interface OverviewData {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_competitions: number;
  total_teams: number;
  ongoing_competitions: number;
  total_awards: number;
  total_pre_plans: number;
  total_evaluations: number;
  published_competitions: number;
  settled_awards: number;
}

interface EngagementData {
  team_formation_rate: number;
  ai_review_rate: number;
  completion_rate: number;
  avg_team_size: number;
  avg_pre_plan_score: number;
  active_competitions: number;
  total_competitions: number;
  total_teams: number;
  total_pre_plans: number;
  students_with_teams: number;
  total_students: number;
  reviewed_pre_plans: number;
  published_competitions: number;
}

/* ── Chart wrapper ── */
function ChartCard({ title, subtitle, children, span = 1 }: {
  title: string; subtitle?: string; children: React.ReactNode; span?: number;
}) {
  return (
    <div className="card anim-in" style={{
      padding: 20, gridColumn: span === 2 ? 'span 2' : undefined,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionLabel label={title} />
        {subtitle && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--text-2)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ── */
export function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionStat[]>([]);
  const [popularity, setPopularity] = useState<PopularityComp[]>([]);
  const [typeDist, setTypeDist] = useState<TypeDist[]>([]);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsAPI.overview(),
      statsAPI.trends(),
      statsAPI.competitions(),
      statsAPI.popularity(10).catch(() => ({ competitions: [] })),
      statsAPI.typeDistribution().catch(() => ({ types: [] })),
      statsAPI.engagement().catch(() => null),
    ])
      .then(([o, tr, c, pop, td, eg]) => {
        setOverview(o as OverviewData);
        setTrends((tr as Record<string, unknown>).trends as TrendPoint[] || []);
        setCompetitions((c as Record<string, unknown>).competitions as CompetitionStat[] || []);
        setPopularity((pop as Record<string, unknown>).competitions as PopularityComp[] || []);
        setTypeDist((td as { types: TypeDist[] }).types || []);
        setEngagement(eg as EngagementData | null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5" />
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  /* ── Derived data ── */
  const statusData = [
    { name: '草稿', value: (overview?.total_competitions || 0) - (overview?.published_competitions || 0) - (overview?.ongoing_competitions || 0), color: COLORS.blue },
    { name: '已发布', value: overview?.published_competitions || 0, color: COLORS.teal },
    { name: '进行中', value: overview?.ongoing_competitions || 0, color: COLORS.green },
    { name: '已结束', value: (overview?.total_competitions || 0) - (overview?.ongoing_competitions || 0) - (overview?.published_competitions || 0), color: COLORS.amber },
  ].filter(s => s.value > 0);

  const awardData = [
    { name: '已发放', value: overview?.total_awards || 0, color: COLORS.amber },
    { name: '已结算', value: overview?.settled_awards || 0, color: COLORS.green },
  ];

  const userDistData = [
    { name: '学生', value: overview?.total_students || 0, color: COLORS.purple },
    { name: '教师', value: overview?.total_teachers || 0, color: COLORS.teal },
  ];

  // Competition performance data for bar chart
  const compPerfData = competitions.slice(0, 12).map(c => ({
    name: c.title.length > 10 ? c.title.slice(0, 10) + '…' : c.title,
    团队: c.team_count,
    预案: c.pre_plan_count,
    奖项: c.award_count,
  }));

  // Engagement radar data
  const radarData = engagement ? [
    { metric: '组队率', value: engagement.team_formation_rate || 0, fullMark: 100 },
    { metric: 'AI评审率', value: engagement.ai_review_rate || 0, fullMark: 100 },
    { metric: '完成率', value: engagement.completion_rate || 0, fullMark: 100 },
    { metric: '团队规模', value: Math.min((engagement.avg_team_size || 0) * 20, 100), fullMark: 100 },
    { metric: '预案评分', value: Math.min((engagement.avg_pre_plan_score || 0) * 10, 100), fullMark: 100 },
    { metric: '活跃度', value: Math.min(((engagement.active_competitions || 0) / Math.max(engagement.total_competitions || 1, 1)) * 100, 100), fullMark: 100 },
  ] : [];

  return (
    <div className="forge-page">
      <PageHeader title="数据分析中心" subtitle="交互式图表 · 实时数据 · 多维洞察" />

      {/* ── Row 1: Key Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: '赛事总数', value: overview?.total_competitions || 0, icon: 'trophy', color: COLORS.amber },
          { label: '参赛团队', value: overview?.total_teams || 0, icon: 'users', color: COLORS.teal },
          { label: '注册用户', value: overview?.total_users || 0, icon: 'compass', color: COLORS.purple },
          { label: '已发奖项', value: overview?.total_awards || 0, icon: 'gift', color: COLORS.green },
        ].map((m, i) => (
          <div key={m.label} className={`card anim-in d${i + 1}`} style={{
            padding: 18, display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: `3px solid ${m.color}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${m.color}15`, color: m.color,
            }}>
              <Icon name={m.icon as any} size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                {m.value.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Trends + Status Pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="平台增长趋势" subtitle={`${trends.length} 个月`} span={1}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="gradTeams" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.amber} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAwards" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="teams" name="团队" stroke={COLORS.teal} fill="url(#gradTeams)" strokeWidth={2} />
              <Area type="monotone" dataKey="competitions" name="赛事" stroke={COLORS.amber} fill="url(#gradComp)" strokeWidth={2} />
              <Area type="monotone" dataKey="awards" name="奖项" stroke={COLORS.green} fill="url(#gradAwards)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="赛事状态分布">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                paddingAngle={3} strokeWidth={0}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Competition Performance + Popularity Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="赛事参与度对比" subtitle={`${compPerfData.length} 个赛事`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={compPerfData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="团队" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
              <Bar dataKey="预案" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
              <Bar dataKey="奖项" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="赛事热度排行" subtitle={`Top ${popularity.length}`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularity.slice(0, 8).map(p => ({
              name: p.title.length > 12 ? p.title.slice(0, 12) + '…' : p.title,
              热度: p.popularity_score,
            }))} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="热度" radius={[0, 6, 6, 0]}>
                {popularity.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 4: Type Distribution + Radar + Awards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="赛事类型分布">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={typeDist.map(t => ({
                  name: { hackathon: '黑客松', innovation: '创新创业', research: '科研竞赛', business_plan: '商业计划', ai_innovation: 'AI创新', data_science: '数据科学' }[t.type] || t.type,
                  value: t.count,
                }))}
                dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} strokeWidth={0}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {typeDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="平台健康度雷达">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} domain={[0, 100]} />
              <Radar name="平台指标" dataKey="value" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.25} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="奖项概况">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { name: '总奖项', 数量: overview?.total_awards || 0 },
              { name: '已结算', 数量: overview?.settled_awards || 0 },
              { name: '总预案', 数量: overview?.total_pre_plans || 0 },
              { name: '总评价', 数量: overview?.total_evaluations || 0 },
            ]} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="数量" radius={[6, 6, 0, 0]}>
                {[COLORS.amber, COLORS.green, COLORS.purple, COLORS.cyan].map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 5: Composite trend (teams + pre_plans overlay) ── */}
      {trends.length > 0 && (
        <ChartCard title="团队 vs 预案增长对比" subtitle="组合图">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="teams" name="团队" fill={COLORS.teal} opacity={0.7} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="pre_plans" name="预案" stroke={COLORS.purple} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="awards" name="奖项" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
