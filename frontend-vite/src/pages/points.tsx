import { useEffect, useState } from 'react';
import { pointsAPI, type AchievementPoint, type PointsSummary, type PointsLeaderboardEntry } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { useRole } from '@/hooks/use-role';

const reasonLabels: Record<string, { label: string; icon: string; color: string }> = {
  competition_register: { label: '赛事报名', icon: 'edit', color: 'var(--teal)' },
  team_join: { label: '加入团队', icon: 'users', color: 'var(--purple)' },
  preplan_submit: { label: '提交预案', icon: 'file-text', color: 'var(--amber)' },
  award_received: { label: '获得奖项', icon: 'trophy', color: '#f59e0b' },
  evaluation_given: { label: '评价导师', icon: 'star', color: 'var(--green)' },
  ai_review: { label: 'AI 评审', icon: 'bot', color: '#6366f1' },
  milestone_complete: { label: '里程碑完成', icon: 'target', color: 'var(--teal)' },
  manual_award: { label: '管理员奖励', icon: 'gift', color: 'var(--amber)' },
  competition_win: { label: '赛事获奖', icon: 'award', color: '#f59e0b' },
  test: { label: '测试', icon: 'test', color: 'var(--text-3)' },
};

export function PointsPage() {
  const role = useRole();
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [history, setHistory] = useState<AchievementPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<PointsLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'history' | 'leaderboard'>('overview');

  useEffect(() => {
    Promise.all([
      pointsAPI.me().catch(() => ({ total_points: 0, rank: 0, breakdown: [] })),
      pointsAPI.list().catch(() => ({ points: [], total: 0, count: 0 })),
      pointsAPI.leaderboard(20).catch(() => ({ leaderboard: [], count: 0 })),
    ]).then(([sumRes, histRes, lbRes]) => {
      setSummary(sumRes);
      setHistory(histRes.points || []);
      setLeaderboard(lbRes.leaderboard || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Spinner size={28} />
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>加载积分数据…</span>
      </div>
    );
  }

  return (
    <div className="forge-page">
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
            <Icon name="star" size={16} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>积分成就</h1>
          <span className="badge badge-amber">Achievement Points</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>参与赛事活动获取积分，查看排行榜和积分历史</p>
      </header>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card anim-in d1" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>总积分</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--amber)' }}>{summary.total_points}</div>
          </div>
          <div className="card anim-in d2" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>当前排名</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--purple)' }}>#{summary.rank}</div>
          </div>
          <div className="card anim-in d3" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>积分来源</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--teal)' }}>{summary.breakdown?.length ?? 0}</div>
          </div>
        </div>
      )}

      {/* Breakdown */}
      {summary && summary.breakdown && summary.breakdown.length > 0 && (
        <div className="card anim-in d4" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>积分构成</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {summary.breakdown.map((b, i) => {
              const meta = reasonLabels[b.reason] || { label: b.reason, icon: 'pin', color: 'var(--text-3)' };
              const maxTotal = Math.max(...summary.breakdown.map(x => x.total), 1);
              const pct = (b.total / maxTotal) * 100;
              return (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: meta.color }}><Icon name={meta.icon} size={16} /></span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{meta.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: meta.color }}>+{b.total}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: meta.color, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{b.count} 次</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['overview', '积分总览'], ['history', '积分明细'], ['leaderboard', '排行榜']] as const).map(([key, label]) => (
          <button key={key} className={`btn ${tab === key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(key as typeof tab)}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && summary && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>积分规则</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {[
              { action: '赛事报名', points: 25, icon: 'edit' },
              { action: '加入团队', points: 10, icon: 'users' },
              { action: '提交预案', points: 30, icon: 'file-text' },
              { action: 'AI 评审通过', points: 20, icon: 'bot' },
              { action: '获得奖项', points: 50, icon: 'trophy' },
              { action: '评价导师', points: 5, icon: 'star' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Icon name={r.icon} size={20} />
                <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{r.action}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>+{r.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card" style={{ padding: 20 }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon name="chart" size={32} /></div>
              <div>暂无积分记录</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((p) => {
                const meta = reasonLabels[p.reason] || { label: p.reason, icon: 'pin', color: 'var(--text-3)' };
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <span style={{ color: meta.color }}><Icon name={meta.icon} size={20} /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{meta.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleString('zh-CN')}</div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>+{p.points}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="card" style={{ padding: 20 }}>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon name="trophy" size={32} /></div>
              <div>暂无排行数据</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leaderboard.map((entry, idx) => {
                const isTop3 = idx < 3;
                return (
                  <div key={entry.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10,
                    background: isTop3 ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
                    border: `1px solid ${isTop3 ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isTop3 ? 'var(--amber-bg)' : 'var(--surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isTop3 ? 18 : 13, fontWeight: 700,
                      color: isTop3 ? 'var(--amber)' : 'var(--text-3)',
                    }}>
                      {isTop3 ? <Icon name="medal" size={18} /> : `#${idx + 1}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{entry.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>@{entry.username}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                      {entry.total_points}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>分</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
