import { useEffect, useState } from 'react';
import { statsAPI } from '@/services/api';
import { StatCard } from '@/components/ui/stat-card';
import { DonutChart } from '@/components/ui/charts';
import { Avatar, Stars, ProgressBar, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import type { StatsOverview, TeacherStat } from '@/types';

export function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([statsAPI.overview(), statsAPI.teachers()])
      .then(([o, t]) => { setOverview(o); setTeachers(t.teachers || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      <PageHeader title="统计分析" subtitle="平台数据全景 · 实时更新"/>

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
