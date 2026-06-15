import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, workflowsAPI, statsAPI } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Avatar, SectionLabel, ProgressBar } from '@/components/ui/page-helpers';
import type { Team, ApprovalWorkflow } from '@/types';

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pending, setPending] = useState<ApprovalWorkflow[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, wfRes, statsRes] = await Promise.all([
          teamsAPI.list(),
          workflowsAPI.list({ tab: 'pending' }),
          statsAPI.teachers().catch(() => ({ teachers: [] })),
        ]);
        setTeams(teamRes.teams || []);
        setPending(wfRes.workflows || []);
        // Find current teacher's avg evaluation score
        const teacher = (statsRes.teachers || []).find((t: any) => t.teacher_id === user?.id || t.id === user?.id);
        if (teacher) {
          setAvgScore(teacher.avg_overall || teacher.avg_score || null);
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

  const statItems = [
    { label: '指导团队', value: teams.length, icon: 'users', color: 'var(--teal)', sub: '跨赛事' },
    { label: '待审批', value: pending.length, icon: 'check', color: 'var(--amber)', sub: '需要处理' },
    { label: '获奖率', value: '—', icon: 'trophy', color: 'var(--green)', sub: '待数据积累' },
    { label: '学生评分', value: avgScore ? avgScore.toFixed(1) : '—', icon: 'star', color: 'var(--purple)', sub: avgScore ? '评价汇总' : '暂无评价' },
  ];

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
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>指导 {teams.length} 支团队 · {pending.length} 个待审批</p>
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
          ) : pending.slice(0, 2).map(a => (
            <div key={a.id} style={{ padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.type}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.submitter?.name}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>审核</button>
            </div>
          ))}
        </div>

        {/* Student evaluation */}
        <div data-bento className="bento-item card card-magnetic" style={{ padding: 20 }}>
          <SectionLabel label="学生评价汇总"/>
          <div style={{ marginTop: 12 }}>
            {avgScore ? (
              [
                { dim: '综合评分', val: avgScore },
              ].map(({ dim, val }) => (
                <div key={dim} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{dim}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>{val.toFixed(1)}</span>
                  </div>
                  <ProgressBar value={val} max={5} color="var(--amber)"/>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '12px 0' }}>
                暂无学生评价数据
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
