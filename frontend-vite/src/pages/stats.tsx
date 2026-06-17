import { useEffect, useState } from 'react';
import { statsAPI } from '@/services/api';
import { StatCard } from '@/components/ui/stat-card';
import { DonutChart } from '@/components/ui/charts';
import { Avatar, Stars, ProgressBar, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { Icon } from '@/components/ui/icon';
import type { StatsOverview, TeacherStat } from '@/types';

interface CompetitionStat {
  id: number;
  title: string;
  status: string;
  team_count: number;
  award_count: number;
  pre_plan_count: number;
}

interface TrendPoint {
  month: string;
  competitions: number;
  teams: number;
  awards: number;
  pre_plans: number;
  prize_amount: number;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'var(--text-3)', bg: 'var(--surface-2)' },
  published: { label: '已发布', color: 'var(--teal)', bg: 'var(--teal-bg)' },
  ongoing: { label: '进行中', color: 'var(--green)', bg: 'var(--green-bg)' },
  ended: { label: '已结束', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  cancelled: { label: '已取消', color: 'var(--red)', bg: 'var(--red-bg)' },
};

export function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionStat[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<{ types: { type: string; count: number }[] }>({ types: [] });
  const [recentActivity, setRecentActivity] = useState<{ activities: { action: string; description: string; time: string; icon: string }[] }>({ activities: [] });
  const [studentStats, setStudentStats] = useState<{ total_students: number; students_with_teams: number; students_with_awards: number; avg_team_size: number; top_students: { id: number; name: string; team_count: number; award_count: number; pre_plan_count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      statsAPI.overview(), statsAPI.teachers(), statsAPI.competitions(), statsAPI.trends(),
      statsAPI.typeDistribution(), statsAPI.recentActivity(10), statsAPI.students(),
    ])
      .then(([o, t, c, tr, td, ra, ss]) => {
        setOverview(o);
        setTeachers(t.teachers || []);
        setCompetitions((c as Record<string, unknown>).competitions as CompetitionStat[] || []);
        setTrends((tr as Record<string, unknown>).trends as TrendPoint[] || []);
        setTypeDistribution(td as { types: { type: string; count: number }[] });
        setRecentActivity(ra as { activities: { action: string; description: string; time: string; icon: string }[] });
        setStudentStats(ss as typeof studentStats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (type: 'overview' | 'competitions' | 'teams') => {
    setExporting(type);
    try {
      let blob: Blob;
      let filename: string;
      if (type === 'overview') {
        blob = await statsAPI.exportOverview();
        filename = `平台统计_${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (type === 'competitions') {
        blob = await statsAPI.exportCompetitions();
        filename = `赛事明细_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        blob = await statsAPI.exportTeams();
        filename = `团队数据_${new Date().toISOString().slice(0, 10)}.csv`;
      }
      downloadBlob(blob, filename);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(null);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <PageHeader title="统计分析" subtitle="平台数据全景 · 实时更新"/>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => handleExport('overview')} disabled={exporting === 'overview'}>
            <Icon name="download" size={14}/> {exporting === 'overview' ? '导出中…' : '导出总览'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleExport('competitions')} disabled={exporting === 'competitions'}>
            <Icon name="download" size={14}/> {exporting === 'competitions' ? '导出中…' : '导出赛事明细'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleExport('teams')} disabled={exporting === 'teams'}>
            <Icon name="download" size={14}/> {exporting === 'teams' ? '导出中…' : '导出团队数据'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="anim-in d1"><StatCard label="赛事总数" value={overview?.total_competitions || 0} icon="trophy" color="var(--amber)"/></div>
        <div className="anim-in d2"><StatCard label="参赛团队" value={overview?.total_teams || 0} icon="users" color="var(--teal)"/></div>
        <div className="anim-in d3"><StatCard label="参赛人数" value={overview?.total_users || 0} icon="compass" color="var(--purple)"/></div>
        <div className="anim-in d4"><StatCard label="已发奖项" value={overview?.total_awards || 0} icon="gift" color="var(--green)"/></div>
        <div className="anim-in d5"><StatCard label="进行中" value={overview?.ongoing_competitions || 0} icon="sparkles" color="var(--teal)"/></div>
      </div>

      {/* Trends Area Chart */}
      {trends.length > 0 && (
        <div className="card anim-in d2" style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel label="平台增长趋势"/>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{trends.length} 个月</span>
          </div>
          <TrendChart data={trends} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card anim-in d2" style={{ padding: 22 }}>
          <SectionLabel label="赛事概览"/>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>{overview?.total_competitions || 0}</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>个赛事</span>
          </div>
          <DonutChart segments={[
            { label: '进行中', value: overview?.ongoing_competitions || 0 },
            { label: '总团队', value: overview?.total_teams || 0 },
            { label: '总用户', value: overview?.total_users || 0 },
          ]}/>
        </div>

        <div className="card anim-in d3" style={{ padding: 22 }}>
          <SectionLabel label="用户分布"/>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{overview?.total_users || 0}</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>总用户</span>
          </div>
          {[
            { label: '学生', value: overview?.total_students || 0, color: 'var(--purple)' },
            { label: '教师', value: overview?.total_teachers || 0, color: 'var(--teal)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color }}>{value}</span>
              </div>
              <ProgressBar value={value} max={overview?.total_users || 1} color={color} height={7}/>
            </div>
          ))}
        </div>
      </div>

      {/* Competition detail timeline */}
      {competitions.length > 0 && (
        <div className="card anim-in d4" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SectionLabel label="赛事生命周期"/>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{competitions.length} 个赛事</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {competitions.map((comp, i) => {
              const st = STATUS_LABELS[comp.status] || STATUS_LABELS.draft;
              const totalActivity = comp.team_count + comp.pre_plan_count + comp.award_count;
              return (
                <div key={comp.id} className={`anim-in d${Math.min(i + 1, 5)}`} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 80px', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10, background: 'var(--surface)',
                  border: '1px solid var(--border)', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      color: st.color, background: st.bg,
                    }}>{st.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{comp.title}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>{comp.team_count}</span>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>团队</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--purple)' }}>{comp.pre_plan_count}</span>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>预案</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>{comp.award_count}</span>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>奖项</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <ProgressBar value={totalActivity} max={Math.max(...competitions.map(c => c.team_count + c.pre_plan_count + c.award_count), 1)} color="var(--green)" height={4}/>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', minWidth: 30, textAlign: 'right' }}>{totalActivity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Type Distribution + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Type Distribution */}
        {typeDistribution.types.length > 0 && (
          <div className="card anim-in d5" style={{ padding: 22 }}>
            <SectionLabel label="赛事类型分布"/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {typeDistribution.types.map((t, i) => {
                const maxCount = Math.max(...typeDistribution.types.map(x => x.count), 1);
                const typeLabels: Record<string, { label: string; color: string }> = {
                  hackathon: { label: '黑客松', color: 'var(--teal)' },
                  innovation: { label: '创新创业', color: 'var(--amber)' },
                  research: { label: '科研竞赛', color: 'var(--purple)' },
                  business_plan: { label: '商业计划', color: 'var(--green)' },
                  ai_innovation: { label: 'AI创新', color: 'var(--blue)' },
                  data_science: { label: '数据科学', color: 'var(--red)' },
                };
                const info = typeLabels[t.type] || { label: t.type, color: 'var(--text-3)' };
                return (
                  <div key={t.type} className={`anim-in d${Math.min(i + 1, 3)}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{info.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: info.color }}>{t.count}</span>
                    </div>
                    <ProgressBar value={t.count} max={maxCount} color={info.color} height={8}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.activities.length > 0 && (
          <div className="card anim-in d5" style={{ padding: 22 }}>
            <SectionLabel label="最近动态"/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {recentActivity.activities.slice(0, 8).map((a, i) => (
                <div key={i} className={`anim-in d${Math.min(i + 1, 5)}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--surface)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ fontSize: 14 }}>{a.icon || '📌'}</span>
                  <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500 }}>{a.description}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Students */}
      {studentStats && studentStats.top_students && studentStats.top_students.length > 0 && (
        <div className="card anim-in d5" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel label="学生排行榜 Top 10"/>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
              <span>总学生: <strong style={{ color: 'var(--text)' }}>{studentStats.total_students}</strong></span>
              <span>已组队: <strong style={{ color: 'var(--teal)' }}>{studentStats.students_with_teams}</strong></span>
              <span>已获奖: <strong style={{ color: 'var(--amber)' }}>{studentStats.students_with_awards}</strong></span>
            </div>
          </div>
          <table className="forge-table">
            <thead><tr><th>排名</th><th>学生</th><th>团队数</th><th>获奖数</th><th>预案数</th><th>综合分</th></tr></thead>
            <tbody>
              {studentStats.top_students.map((s, i) => {
                const score = s.award_count * 10 + s.team_count * 3 + s.pre_plan_count;
                return (
                  <tr key={s.id}>
                    <td><span style={{ width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'var(--amber-bg)' : i === 1 ? 'var(--surface-2)' : i === 2 ? 'var(--teal-bg)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--amber)' : i === 1 ? 'var(--text-2)' : i === 2 ? 'var(--teal)' : 'var(--text-3)' }}>{i + 1}</span></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={s.name} size={26} index={i}/><span style={{ fontWeight: 600 }}>{s.name}</span></div></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--teal)' }}>{s.team_count}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)' }}>{s.award_count}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--purple)' }}>{s.pre_plan_count}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>{score}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Teacher leaderboard */}
      {teachers.length > 0 && (
        <div className="card anim-in d6" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel label="教师指导排行"/>
          </div>
          <table className="forge-table">
            <thead><tr><th>排名</th><th>教师</th><th>所属院系</th><th>指导数</th><th>获奖率</th><th>学生评分</th></tr></thead>
            <tbody>
              {teachers.sort((a, b) => b.avg_rating - a.avg_rating).map((t, i) => (
                <tr key={t.id}>
                  <td><span style={{ width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'var(--amber-bg)' : i === 1 ? 'var(--surface-2)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--amber)' : i === 1 ? 'var(--text-2)' : 'var(--text-3)' }}>{i + 1}</span></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={t.name} size={26} index={i}/><span style={{ fontWeight: 600 }}>{t.name}</span></div></td>
                  <td style={{ color: 'var(--text-3)' }}>{t.dept}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--teal)' }}>{t.guided}</span><span style={{ fontSize: 11, color: 'var(--text-3)' }}> 队</span></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ProgressBar value={t.win_rate * 100} max={100} color="var(--green)" height={5}/><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>{(t.win_rate * 100).toFixed(0)}%</span></div></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Stars value={t.avg_rating}/><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>{t.avg_rating}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Simple SVG area chart for trends data */
function TrendChart({ data }: { data: TrendPoint[] }) {
  const W = 700, H = 200, PAD = 40;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  // Data series config
  const series = [
    { key: 'teams' as const, label: '团队', color: 'var(--teal)' },
    { key: 'competitions' as const, label: '赛事', color: 'var(--amber)' },
    { key: 'awards' as const, label: '奖项', color: 'var(--green)' },
  ];

  const maxVal = Math.max(1, ...data.flatMap(d => series.map(s => d[s.key])));

  const toX = (i: number) => PAD + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => PAD + chartH - (v / maxVal) * chartH;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = PAD + chartH * (1 - pct);
          const val = Math.round(maxVal * pct);
          return (
            <g key={pct}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth={0.5} />
              <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-3)" fontFamily="var(--font-mono)">{val}</text>
            </g>
          );
        })}

        {/* X axis labels */}
        {data.map((d, i) => (
          i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
            <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--text-3)" fontFamily="var(--font-mono)">
              {d.month.slice(5)}
            </text>
          )
        ))}

        {/* Area fills + lines */}
        {series.map(s => {
          const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d[s.key])}`).join(' ');
          const areaPath = `${linePath} L ${toX(data.length - 1)} ${PAD + chartH} L ${PAD} ${PAD + chartH} Z`;
          return (
            <g key={s.key}>
              <path d={areaPath} fill={s.color} opacity={0.08} />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {/* Dots */}
              {data.map((d, i) => (
                <circle key={i} cx={toX(i)} cy={toY(d[s.key])} r={2.5} fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
        {series.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 3, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
