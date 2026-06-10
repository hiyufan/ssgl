import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { teamsAPI, prePlansAPI, competitionsAPI } from '@/services/api';
import { SectionLabel } from '@/components/ui/page-helpers';
import { Avatar } from '@/components/ui/page-helpers';
import { DraggableGrid, GridDragHandle } from '@/components/ui/draggable-grid';
import type { Team, PrePlan, Competition } from '@/types';

/* Default layout — 4 columns */
const DEFAULT_LAYOUT = [
  { i: 'open-comps',   x: 0, y: 0, w: 1, h: 1 },
  { i: 'my-team',      x: 1, y: 0, w: 1, h: 1 },
  { i: 'preplan',      x: 2, y: 0, w: 1, h: 1 },
  { i: 'ai-score',     x: 3, y: 0, w: 1, h: 1 },
  { i: 'progress',     x: 0, y: 1, w: 2, h: 1 },
  { i: 'ai-helper',    x: 2, y: 1, w: 1, h: 1 },
  { i: 'preplan-detail', x: 3, y: 1, w: 1, h: 1 },
  { i: 'team-detail',  x: 0, y: 2, w: 2, h: 2 },
  { i: 'open-list',    x: 2, y: 2, w: 2, h: 2 },
];

export function StudentDashboard() {
  const { user } = useAuthStore();
  const { navigate } = useAppStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [preplans, setPreplans] = useState<PrePlan[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, planRes, compRes] = await Promise.all([
          teamsAPI.list(),
          prePlansAPI.list(),
          competitionsAPI.list(),
        ]);
        setTeams(teamRes.teams || []);
        setPreplans(planRes.pre_plans || []);
        setCompetitions(compRes.competitions || []);
      } catch (e) {
        console.error('Student dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const myTeam = teams[0];
  const myPlan = preplans[0];
  const openComps = competitions.filter(c => c.status === 'published' || c.status === 'ongoing');

  const steps = [
    { label: '注册', done: true },
    { label: '组队', done: !!myTeam },
    { label: '预计划', done: myPlan?.status === 'approved', active: !!myPlan && myPlan.status !== 'approved' && myPlan.status !== 'rejected' },
    { label: '执行', done: false },
    { label: '获奖', done: false },
  ];

  const cards: Record<string, React.ReactNode> = {
    /* ── Stat: 开放赛事 ── */
    'open-comps': (
      <div className="card card-magnetic" style={{ height: '100%', padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--amber)' }}>◈</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>开放赛事</span>
          </div>
          <GridDragHandle />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>{openComps.length}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>个赛事正在报名</div>
      </div>
    ),

    /* ── Stat: 我的团队 ── */
    'my-team': (
      <div className="card card-magnetic" style={{ height: '100%', padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--teal)' }}>◎</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>我的团队</span>
          </div>
          <GridDragHandle />
        </div>
        <div style={{ fontFamily: myTeam ? 'var(--font-body)' : 'var(--font-mono)', fontSize: myTeam ? 20 : 36, fontWeight: 700, color: 'var(--teal)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {myTeam ? myTeam.name : '—'}
        </div>
        {myTeam && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{myTeam.members?.length || 0} 名成员</div>}
      </div>
    ),

    /* ── Stat: 预计划 ── */
    'preplan': (
      <div className="card card-magnetic" style={{ height: '100%', padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--purple)' }}>◇</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>预计划</span>
          </div>
          <GridDragHandle />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--purple)', lineHeight: 1 }}>
          {myPlan ? (myPlan.status === 'approved' ? '✓' : (myPlan.status === 'submitted' || myPlan.status === 'under_review') ? '…' : '✎') : '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          {myPlan ? (myPlan.status === 'approved' ? '已通过' : (myPlan.status === 'submitted' || myPlan.status === 'under_review') ? '审核中' : '草稿') : '未创建'}
        </div>
      </div>
    ),

    /* ── Stat: AI 评分 ── */
    'ai-score': (
      <div className="card card-magnetic" style={{ height: '100%', padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--green)' }}>★</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>AI 评分</span>
          </div>
          <GridDragHandle />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>
          {myPlan?.ai_review_score ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{myPlan?.ai_review_score ? '预计划评分' : '暂无评分'}</div>
      </div>
    ),

    /* ── Competition Progress ── */
    'progress': (
      <div className="card card-magnetic" style={{ height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label="竞赛进度" />
          <GridDragHandle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '16px 0 12px', flex: 1 }}>
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <div key={i} style={{ display: 'contents' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.done ? 'var(--text)' : step.active ? 'var(--amber-bg)' : 'var(--surface-2)',
                  border: step.active ? '2px solid var(--amber)' : '1px solid var(--border)',
                  fontSize: 12, fontWeight: 700,
                  color: step.done ? 'var(--bg)' : step.active ? 'var(--amber)' : 'var(--text-3)',
                  flexShrink: 0,
                }}>
                  {step.done ? '✓' : i + 1}
                </div>
                {!isLast && (
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: step.done ? 'var(--text)' : 'var(--border)' }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {steps.map((step, i) => (
            <span key={i} style={{ fontSize: 10, color: step.done || step.active ? 'var(--text)' : 'var(--text-3)', fontWeight: step.active ? 600 : 400 }}>
              {step.label}
            </span>
          ))}
        </div>
      </div>
    ),

    /* ── AI Helper ── */
    'ai-helper': (
      <div className="card card-magnetic" style={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('aitools')}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label="AI 助手" />
          <GridDragHandle />
        </div>
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 6, color: 'var(--amber)' }}>✦</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>需要帮助？</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AI 助手随时为你服务</div>
        </div>
      </div>
    ),

    /* ── PrePlan Detail ── */
    'preplan-detail': (
      <div className="card card-magnetic" style={{ height: '100%', overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('preplans')}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label="预计划详情" />
          <GridDragHandle />
        </div>
        <div style={{ padding: '14px 16px' }}>
          {myPlan ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myPlan.title}</div>
              <span className={`badge ${myPlan.status === 'approved' ? 'badge-green' : (myPlan.status === 'submitted' || myPlan.status === 'under_review') ? 'badge-amber' : 'badge-muted'}`}>
                {myPlan.status === 'approved' ? '已通过' : (myPlan.status === 'submitted' || myPlan.status === 'under_review') ? '审核中' : '草稿'}
              </span>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: 13 }}>还没有预计划</div>
          )}
        </div>
      </div>
    ),

    /* ── Team Detail ── */
    'team-detail': (
      <div className="card" style={{ height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label="我的团队" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('teams')}>查看</button>
            <GridDragHandle />
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          {myTeam ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{myTeam.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>{myTeam.competition?.title || '—'}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(myTeam.members || []).map((m, i) => (
                  <Avatar key={i} name={m.user?.name || '?'} size={32} index={i} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>还没有加入团队</div>
          )}
        </div>
      </div>
    ),

    /* ── Open Competitions List ── */
    'open-list': (
      <div className="card" style={{ height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label={`开放赛事 (${openComps.length})`} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('competitions')}>查看全部</button>
            <GridDragHandle />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {openComps.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无开放赛事</div>
          ) : openComps.slice(0, 6).map((c) => (
            <div key={c.id} onClick={() => navigate('competitions')} style={{
              padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'ongoing' ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
              </div>
              <span className={`badge ${c.status === 'ongoing' ? 'badge-green' : 'badge-amber'}`}>
                {c.status === 'ongoing' ? '进行中' : '报名中'}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div className="forge-page">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ◆ STUDENT PORTAL
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          加油，<span style={{ color: 'var(--amber)' }}>{user?.name || '同学'}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {myTeam ? `团队：${myTeam.name}` : '还没有加入团队'} · {openComps.length} 个赛事正在进行
        </p>
      </div>

      {/* Draggable + Resizable Grid */}
      <DraggableGrid
        storageKey="student-dashboard"
        defaultLayout={DEFAULT_LAYOUT}
        cols={4}
        rowHeight={120}
        gap={16}
      >
        {cards}
      </DraggableGrid>
    </div>
  );
}
