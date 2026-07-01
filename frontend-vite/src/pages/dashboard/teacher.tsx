import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, workflowsAPI, statsAPI, competitionsAPI, prePlansAPI } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Avatar, SectionLabel, ProgressBar } from '@/components/ui/page-helpers';
import { ScoreGauge, BarChart } from '@/components/ui/charts';
import type { Team, ApprovalWorkflow, Competition, PrePlan } from '@/types';

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pending, setPending] = useState<ApprovalWorkflow[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [preplans, setPreplans] = useState<PrePlan[]>([]);
  const [evalData, setEvalData] = useState<{
    avg_teaching: number;
    avg_communication: number;
    avg_availability: number;
    avg_overall: number;
    evaluation_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, wfRes, statsRes, compRes, planRes] = await Promise.all([
          teamsAPI.list(),
          workflowsAPI.list({ tab: 'pending' }),
          statsAPI.teachers().catch(() => ({ teachers: [] })),
          competitionsAPI.list({ page_size: '100' }).catch(() => ({ competitions: [] })),
          prePlansAPI.list({ page_size: '100' }).catch(() => ({ pre_plans: [] })),
        ]);
        setTeams(teamRes.teams || []);
        setPending(wfRes.workflows || []);
        setCompetitions(compRes.competitions || []);
        setPreplans(planRes.pre_plans || []);
        // Find current teacher's evaluation data
        const teacher = (statsRes.teachers || []).find((t) => t.id === user?.id);
        if (teacher) {
          setEvalData({
            avg_teaching: teacher.avg_teaching || 0,
            avg_communication: teacher.avg_communication || 0,
            avg_availability: teacher.avg_availability || 0,
            avg_overall: teacher.avg_overall || 0,
            evaluation_count: teacher.evaluation_count || 0,
          });
        }
      } catch (e) {
        console.error('Teacher dashboard fetch error:', e);
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
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  const pendingPreplans = preplans.filter(p => p.status === 'submitted' || p.status === 'reviewed');
  const approvedPreplans = preplans.filter(p => p.status === 'approved');
  const ongoingComps = competitions.filter(c => c.status === 'ongoing' || c.status === 'published');

  const statItems = [
    { label: '指导团队', value: teams.length, icon: 'users', color: 'var(--teal)', sub: '跨赛事' },
    { label: '待审批', value: pending.length, icon: 'check', color: 'var(--amber)', sub: '需要处理' },
    { label: '赛事管理', value: competitions.length, icon: 'trophy', color: 'var(--green)', sub: `${ongoingComps.length} 个进行中` },
    { label: '学生评分', value: evalData?.avg_overall ? evalData.avg_overall.toFixed(1) : '—', icon: 'star', color: 'var(--purple)', sub: evalData?.evaluation_count ? `${evalData.evaluation_count} 条评价` : '暂无评价' },
  ];

  const evalDimensions = evalData ? [
    { label: '教学质量', value: evalData.avg_teaching },
    { label: '沟通交流', value: evalData.avg_communication },
    { label: '可及性', value: evalData.avg_availability },
    { label: '综合评分', value: evalData.avg_overall },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="forge-page">
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>◆ TEACHER PORTAL</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          你好，<span style={{ color: 'var(--teal)' }}>{user?.name || '教师'}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          指导 {teams.length} 支团队 · 管理 {competitions.length} 个赛事 · {pending.length} 个待审批
        </p>
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

        {/* Teams — wide */}
        <div data-bento className="bento-item bento-wide card card-magnetic" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel label="我的指导团队"/>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/teams')}>全部团队</button>
          </div>
          <div>
            {teams.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无团队</div>
            ) : teams.slice(0, 4).map((team, i) => (
              <div key={team.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ display: 'flex', marginRight: -4 }}>
                  {(team.members || []).slice(0, 3).map((m, j) => (
                    <div key={j} style={{ marginRight: -8, zIndex: 3 - j }}>
                      <Avatar name={m.user?.name || '?'} size={28} index={i * 3 + j}/>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{team.competition?.title || '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{team.members?.length || 0} 人</span>
                  <StatusBadge status={team.status}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending approvals */}
        <div data-bento className="bento-item card card-magnetic" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel label="待办审批"/>
          </div>
          {pending.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无待审批</div>
          ) : pending.slice(0, 3).map(a => (
            <div key={a.id} style={{ padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.type}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.submitter?.name}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>审核</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts Section ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Evaluation Score Gauge */}
        <div data-bento className="card card-magnetic" style={{ padding: '20px 24px' }}>
          <SectionLabel label="学生评价" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
            {evalData?.avg_overall ? (
              <ScoreGauge score={Math.round(evalData.avg_overall * 20)} size={120} />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                暂无数据
              </div>
            )}
            <div style={{ flex: 1 }}>
              {evalData?.avg_overall ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
                    基于 <strong>{evalData.evaluation_count}</strong> 条学生评价
                  </div>
                  {[
                    { label: '教学质量', val: evalData.avg_teaching },
                    { label: '沟通交流', val: evalData.avg_communication },
                    { label: '可及性', val: evalData.avg_availability },
                  ].map(d => (
                    <div key={d.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--teal)' }}>{d.val.toFixed(1)}</span>
                      </div>
                      <ProgressBar value={d.val} max={5} color="var(--teal)"/>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>暂无学生评价数据</div>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Dimensions Chart */}
        <div data-bento className="card card-magnetic" style={{ padding: '20px 24px' }}>
          <SectionLabel label="评价维度分布" />
          <div style={{ marginTop: 16 }}>
            {evalDimensions.length > 0 ? (
              <BarChart
                data={evalDimensions}
                color="var(--teal)"
                h={140}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
                暂无评价数据
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Competitions + Preplans ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Managed Competitions */}
        <div data-bento className="card card-magnetic" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel label={`赛事管理 (${competitions.length})`} />
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/competitions')}>查看全部</button>
          </div>
          <div>
            {competitions.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无赛事</div>
            ) : competitions.slice(0, 4).map(c => (
              <div key={c.id} onClick={() => navigate('/competitions')} style={{
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'ongoing' ? 'var(--green)' : c.status === 'published' ? 'var(--amber)' : 'var(--text-3)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{c.type} · {c.teams_count || 0} 队</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Preplan Reviews */}
        <div data-bento className="card card-magnetic" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel label={`预案审核 (${pendingPreplans.length} 待审)`} />
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/preplans')}>查看全部</button>
          </div>
          {preplans.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无预案</div>
          ) : (
            <>
              {/* Stats summary */}
              <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: '待审核', value: pendingPreplans.length, color: 'var(--amber)' },
                  { label: '已通过', value: approvedPreplans.length, color: 'var(--green)' },
                  { label: '总计', value: preplans.length, color: 'var(--teal)' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Recent preplans */}
              {preplans.slice(0, 3).map(p => (
                <div key={p.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: p.status === 'approved' ? 'var(--green-bg)' : p.status === 'rejected' ? 'var(--red-bg)' : 'var(--amber-bg)',
                    color: p.status === 'approved' ? 'var(--green)' : p.status === 'rejected' ? 'var(--red)' : 'var(--amber)',
                  }}>
                    {p.status === 'approved' ? '已通过' : p.status === 'rejected' ? '已拒绝' : p.status === 'submitted' ? '待审核' : p.status === 'reviewed' ? 'AI已审' : '草稿'}
                  </span>
                  {p.ai_review_score != null && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--purple)', fontWeight: 600 }}>{p.ai_review_score}分</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
        {[
          { label: '创建赛事', icon: 'trophy', path: '/competitions', color: 'var(--amber)' },
          { label: '审批中心', icon: 'check', path: '/approvals', color: 'var(--red)' },
          { label: '数据统计', icon: 'chart', path: '/stats', color: 'var(--teal)' },
          { label: '知识库', icon: 'db', path: '/knowledge-base', color: 'var(--purple)' },
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
