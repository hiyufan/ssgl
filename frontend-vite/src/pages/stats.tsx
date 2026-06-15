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
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([statsAPI.overview(), statsAPI.teachers(), statsAPI.competitions()])
      .then(([o, t, c]) => {
        setOverview(o);
        setTeachers(t.teachers || []);
        setCompetitions((c as Record<string, unknown>).competitions as CompetitionStat[] || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (type: 'overview' | 'competitions') => {
    setExporting(type);
    try {
      const blob = type === 'overview'
        ? await statsAPI.exportOverview()
        : await statsAPI.exportCompetitions();
      const filename = type === 'overview'
        ? `平台统计_${new Date().toISOString().slice(0, 10)}.csv`
        : `赛事明细_${new Date().toISOString().slice(0, 10)}.csv`;
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
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="anim-in d1"><StatCard label="赛事总数" value={overview?.total_competitions || 0} icon="trophy" color="var(--amber)"/></div>
        <div className="anim-in d2"><StatCard label="参赛团队" value={overview?.total_teams || 0} icon="users" color="var(--teal)"/></div>
        <div className="anim-in d3"><StatCard label="参赛人数" value={overview?.total_users || 0} icon="compass" color="var(--purple)"/></div>
        <div className="anim-in d4"><StatCard label="已发奖项" value={overview?.total_awards || 0} icon="gift" color="var(--green)"/></div>
        <div className="anim-in d5"><StatCard label="进行中" value={overview?.ongoing_competitions || 0} icon="sparkles" color="var(--teal)"/></div>
      </div>

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
