import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { teamsAPI, prePlansAPI, competitionsAPI } from '@/services/api';
import { GlassCard } from '@/components/student-ui/glass-card';
import { BentoGrid } from '@/components/student-ui/bento-grid';
import { ScoreRing } from '@/components/student-ui/score-ring';
import { WaveProgress } from '@/components/student-ui/wave-progress';
import { MemberAvatar } from '@/components/student-ui/member-avatar';
import type { Team, PrePlan, Competition } from '@/types';

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
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 's-breathe 2s ease-in-out infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="url(#load-grad)" strokeWidth="2.5" strokeLinecap="round"/>
          <defs>
            <linearGradient id="load-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA"/>
              <stop offset="100%" stopColor="#F0A832"/>
            </linearGradient>
          </defs>
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
    { label: '预计划', done: myPlan?.status === 'approved', active: !!myPlan && myPlan.status !== 'approved' },
    { label: '执行', done: false },
    { label: '获奖', done: false },
  ];

  return (
    <div>
      <BentoGrid columns={3}>
        {/* Card 1: Greeting — spans 2 cols */}
        <GlassCard span={2} hoverable={false} className="s-card-enter s-card-enter-d1">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--s-font-hand)', fontSize: 28, fontWeight: 700,
                color: 'var(--s-text-1)', lineHeight: 1.1, marginBottom: 8,
              }}>
                加油，{user?.name || '同学'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--s-text-2)' }}>
                {myTeam ? `团队：${myTeam.name}` : '还没有加入团队'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--s-text-3)', marginTop: 4 }}>
                {openComps.length} 个赛事正在进行
              </div>
            </div>
            <ScoreRing score={myPlan?.ai_review_score || 0} size={100} label="AI 评分" />
          </div>
        </GlassCard>

        {/* Card 2: PrePlan Status */}
        <GlassCard className="s-card-enter s-card-enter-d2" onClick={() => navigate('preplans')}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)', marginBottom: 12 }}>
            预计划
          </div>
          {myPlan ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--s-text-1)', marginBottom: 8 }}>
                {myPlan.title}
              </div>
              <div style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                background: myPlan.status === 'approved' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(240, 168, 50, 0.1)',
                color: myPlan.status === 'approved' ? '#4ADE80' : '#F0A832',
                fontSize: 11, fontWeight: 600,
              }}>
                {myPlan.status === 'approved' ? '已通过' : myPlan.status === 'pending' ? '审核中' : '草稿'}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--s-text-3)', fontSize: 13 }}>还没有预计划</div>
          )}
        </GlassCard>

        {/* Card 3: My Team */}
        <GlassCard className="s-card-enter s-card-enter-d3" onClick={() => navigate('teams')}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)', marginBottom: 12 }}>
            我的团队
          </div>
          {myTeam ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--s-text-1)', marginBottom: 4 }}>
                {myTeam.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--s-text-3)', marginBottom: 12 }}>
                {myTeam.competition?.title || '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(myTeam.members || []).map((m, i) => (
                  <MemberAvatar key={i} name={m.user?.name || '?'} size={32} index={i} role={m.role === 'leader' ? '队长' : '队员'} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--s-text-3)', fontSize: 13 }}>还没有加入团队</div>
          )}
        </GlassCard>

        {/* Card 4: Competition Progress */}
        <GlassCard className="s-card-enter s-card-enter-d4" hoverable={false}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)', marginBottom: 16 }}>
            竞赛进度
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <div key={i} style={{ display: 'contents' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step.done
                      ? 'var(--s-text-1)'
                      : step.active
                        ? 'var(--amber-bg)'
                        : 'var(--s-surface-hover)',
                    border: step.active ? '1.5px solid var(--s-amber)' : '1px solid var(--s-border)',
                    fontSize: 11, fontWeight: 700,
                    color: step.done ? 'var(--s-bg)' : step.active ? 'var(--s-amber)' : 'var(--s-text-3)',
                    flexShrink: 0,
                  }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  {!isLast && (
                    <div style={{
                      flex: 1, height: 2, borderRadius: 2,
                      background: step.done ? 'var(--s-text-1)' : 'var(--s-border)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {steps.map((step, i) => (
              <span key={i} style={{
                fontSize: 10, color: step.done || step.active ? 'var(--s-text-1)' : 'var(--s-text-3)',
                fontWeight: step.active ? 600 : 400,
              }}>
                {step.label}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Card 5: AI Helper */}
        <GlassCard className="s-card-enter s-card-enter-d5" onClick={() => navigate('aitools')}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 12, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 36, animation: 's-breathe 3s ease-in-out infinite',
            }}>
              ✦
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--s-text-1)' }}>
              需要帮助？
            </div>
            <div style={{ fontSize: 12, color: 'var(--s-text-3)' }}>
              AI 助手随时为你服务
            </div>
          </div>
        </GlassCard>

        {/* Card 6: Open Competitions — spans 3 cols */}
        <GlassCard span={3} hoverable={false} className="s-card-enter s-card-enter-d6">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)' }}>
              开放赛事
            </div>
            <button onClick={() => navigate('competitions')} style={{
              padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: 'var(--s-text-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              查看全部
            </button>
          </div>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
          }}>
            {openComps.slice(0, 6).map((c) => (
              <div key={c.id} onClick={() => navigate('competitions')} style={{
                minWidth: 200, padding: '14px 16px', borderRadius: 12,
                background: 'var(--s-surface-hover)',
                border: '1px solid var(--s-border)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
                flexShrink: 0,
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--s-border-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--s-border)';
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--s-text-1)', marginBottom: 6 }}>
                  {c.title}
                </div>
                <div style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                  background: c.status === 'ongoing' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                  color: c.status === 'ongoing' ? '#4ADE80' : '#A78BFA',
                  fontSize: 10, fontWeight: 600,
                }}>
                  {c.status === 'ongoing' ? '进行中' : '报名中'}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </BentoGrid>
    </div>
  );
}
