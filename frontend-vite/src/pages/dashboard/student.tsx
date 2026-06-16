import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, prePlansAPI, competitionsAPI, notificationsAPI, type Notification } from '@/services/api';
import { SectionLabel } from '@/components/ui/page-helpers';
import { Avatar } from '@/components/ui/page-helpers';
import { Icon } from '@/components/ui/icon';
import type { Team, PrePlan, Competition } from '@/types';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [preplans, setPreplans] = useState<PrePlan[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, planRes, compRes, notifRes] = await Promise.all([
          teamsAPI.list(),
          prePlansAPI.list(),
          competitionsAPI.list(),
          notificationsAPI.list({ page: 1, page_size: 5 }).catch(() => ({ items: [], total: 0, unread_count: 0 })),
        ]);
        setTeams(teamRes.teams || []);
        setPreplans(planRes.pre_plans || []);
        setCompetitions(compRes.competitions || []);
        setNotifications(notifRes.items || []);
        setUnreadCount(notifRes.unread_count || 0);
      } catch (e) {
        console.error('Student dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* GSAP stagger entrance + magnetic hover */
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

      {/* Row 1: 4 stat cards */}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div data-bento className="card card-magnetic" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--amber)' }}>◈</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>开放赛事</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>{openComps.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>个赛事正在报名</div>
        </div>

        <div data-bento className="card card-magnetic" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--teal)' }}>◎</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>我的团队</span>
          </div>
          <div style={{ fontFamily: myTeam ? 'var(--font-body)' : 'var(--font-mono)', fontSize: myTeam ? 20 : 36, fontWeight: 700, color: 'var(--teal)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {myTeam ? myTeam.name : '—'}
          </div>
          {myTeam && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{myTeam.members?.length || 0} 名成员</div>}
        </div>

        <div data-bento className="card card-magnetic" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--purple)' }}>◇</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>预计划</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--purple)', lineHeight: 1 }}>
            {myPlan ? (myPlan.status === 'approved' ? '✓' : (myPlan.status === 'submitted' || myPlan.status === 'under_review') ? '…' : '✎') : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            {myPlan ? (myPlan.status === 'approved' ? '已通过' : (myPlan.status === 'submitted' || myPlan.status === 'under_review') ? '审核中' : '草稿') : '未创建'}
          </div>
        </div>

        <div data-bento className="card card-magnetic" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--green)' }}>★</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>AI 评分</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>
            {myPlan?.ai_review_score ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{myPlan?.ai_review_score ? '预计划评分' : '暂无评分'}</div>
        </div>
      </div>

      {/* Row 2: Progress + AI + PrePlan */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div data-bento className="card card-magnetic" style={{ padding: '20px 24px' }}>
          <SectionLabel label="竞赛进度" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '16px 0 12px' }}>
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

        <div data-bento className="card card-magnetic" style={{ cursor: 'pointer' }} onClick={() => navigate('/aitools')}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel label="AI 助手" />
          </div>
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6, color: 'var(--amber)' }}>✦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>需要帮助？</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AI 助手随时为你服务</div>
          </div>
        </div>

        <div data-bento className="card card-magnetic" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('/preplans')}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel label="预计划详情" />
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
      </div>

      {/* Row 3: Team detail + Open competitions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div data-bento className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel label="我的团队" />
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/teams')}>查看</button>
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

        <div data-bento className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel label={`开放赛事 (${openComps.length})`} />
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/competitions')}>查看全部</button>
          </div>
          <div>
            {openComps.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无开放赛事</div>
            ) : openComps.slice(0, 4).map((c) => (
              <div key={c.id} onClick={() => navigate('/competitions')} style={{
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
      </div>

      {/* Row 4: Quick Actions + Notifications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div data-bento className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="快捷操作" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
            {[
              { icon: 'trophy', label: '浏览赛事', desc: '查看可参加的赛事', color: 'var(--amber)', path: '/competitions' },
              { icon: 'users', label: '创建团队', desc: '组建你的竞赛团队', color: 'var(--teal)', path: '/teams' },
              { icon: 'sparkles', label: 'AI 工具箱', desc: '智能辅助工具', color: 'var(--purple)', path: '/aitools' },
              { icon: 'target', label: '模拟答辩', desc: 'AI 答辩教练陪练', color: 'var(--green)', path: '/coach' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', borderRadius: 10,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Icon name={action.icon} size={20} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div data-bento className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SectionLabel label="最新通知" />
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--red)',
                  background: 'var(--red-bg)', borderRadius: 10, padding: '2px 8px',
                }}>{unreadCount} 未读</span>
              )}
            </div>
          </div>
          <div>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无通知</div>
            ) : notifications.slice(0, 5).map((n) => (
              <div key={n.id} style={{
                padding: '12px 20px', display: 'flex', alignItems: 'flex-start', gap: 12,
                borderBottom: '1px solid var(--border)',
                background: n.read_at ? 'transparent' : 'var(--amber-bg)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                  background: n.read_at ? 'var(--border)' : 'var(--amber)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read_at ? 400 : 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
