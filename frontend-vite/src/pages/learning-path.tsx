import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { learningPathAPI } from '@/services/api';
import type { LearningPath, PathPhase, SkillDimension } from '@/types';
import { SectionLabel, Spinner } from '@/components/ui/page-helpers';

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  beginner:     { label: '入门', color: 'var(--teal)', bg: 'var(--teal-bg)', icon: '🌱' },
  intermediate: { label: '进阶', color: 'var(--amber)', bg: 'var(--amber-bg)', icon: '🔥' },
  advanced:     { label: '熟练', color: 'var(--purple)', bg: 'var(--purple-bg)', icon: '⚡' },
  expert:       { label: '精通', color: 'var(--green)', bg: 'var(--green-bg)', icon: '🏆' },
};

const PHASE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  completed: { color: 'var(--green)', bg: 'var(--green-bg)', icon: '✅' },
  current:   { color: 'var(--amber)', bg: 'var(--amber-bg)', icon: '📍' },
  upcoming:  { color: 'var(--text-3)', bg: 'var(--surface-2)', icon: '⏳' },
};

const TASK_ICONS: Record<string, string> = {
  competition: '🏆', skill: '📚', project: '📋', study: '📖',
};

const TASK_STATUS: Record<string, { color: string; label: string }> = {
  done:        { color: 'var(--green)', label: '已完成' },
  in_progress: { color: 'var(--amber)', label: '进行中' },
  pending:     { color: 'var(--text-3)', label: '待完成' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--red)', medium: 'var(--amber)', low: 'var(--text-3)',
};

const RESOURCE_ICONS: Record<string, string> = {
  article: '📄', video: '🎬', course: '🎓', tool: '🔧',
};

function SkillRadar({ skills }: { skills: SkillDimension[] }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 100;
  const n = skills.length;
  if (n < 3) return null;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, r: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const currentPath = skills
    .map((s, i) => {
      const r = (s.current / 100) * maxR;
      const p = getPoint(i, r);
      return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
    })
    .join(' ') + 'Z';
  const targetPath = skills
    .map((s, i) => {
      const r = (s.target / 100) * maxR;
      const p = getPoint(i, r);
      return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
    })
    .join(' ') + 'Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ margin: '0 auto', display: 'block' }}>
      {rings.map(r => (
        <polygon
          key={r}
          points={skills.map((_, i) => { const p = getPoint(i, r * maxR); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth={r === 1 ? 1.5 : 0.5} opacity={r === 1 ? 0.6 : 0.3}
        />
      ))}
      {skills.map((_, i) => {
        const p = getPoint(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />;
      })}
      <path d={targetPath} fill="rgba(139,92,246,0.08)" stroke="var(--purple)" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} />
      <path d={currentPath} fill="rgba(20,184,166,0.15)" stroke="var(--teal)" strokeWidth={2} />
      {skills.map((s, i) => {
        const r = (s.current / 100) * maxR;
        const p = getPoint(i, r);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--teal)" stroke="var(--surface)" strokeWidth={2} />;
      })}
      {skills.map((s, i) => {
        const p = getPoint(i, maxR + 20);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-2)" fontSize={11} fontWeight={500}>
            {s.name}
          </text>
        );
      })}
    </svg>
  );
}

export function LearningPathPage() {
  const user = useAuthStore((s) => s.user);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    learningPathAPI.getPath(user.id)
      .then((data: LearningPath) => { setPath(data); setLoading(false); })
      .catch(() => { setError('加载学习路径失败'); setLoading(false); });
  }, [user?.id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><Spinner /></div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>{error}</div>;
  if (!path) return null;

  const levelCfg = LEVEL_CONFIG[path.overall_level] || LEVEL_CONFIG.beginner;

  return (
    <div className="forge-page" ref={scrollRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{levelCfg.icon}</span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
              {path.student_name}的学习路径
            </h1>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13, color: 'var(--text-2)' }}>
              <span style={{ padding: '2px 10px', borderRadius: 20, background: levelCfg.bg, color: levelCfg.color, fontWeight: 600 }}>
                {levelCfg.label}
              </span>
              <span>当前阶段: <strong style={{ color: 'var(--text-1)' }}>{path.current_phase}</strong></span>
              <span>积分: <strong style={{ color: 'var(--amber)' }}>{path.total_points}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Skill Radar */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <SectionLabel>技能雷达</SectionLabel>
          <SkillRadar skills={path.skill_radar} />
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
            <span style={{ color: 'var(--teal)' }}>━ 当前</span>
            <span style={{ margin: '0 12px', color: 'var(--purple)' }}>╌╌ 目标</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {path.skill_radar.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 60, color: 'var(--text-2)', flexShrink: 0 }}>{s.name}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.current}%`, background: 'var(--teal)', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <span style={{ width: 28, textAlign: 'right', color: 'var(--text-3)', fontSize: 11 }}>{Math.round(s.current)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Phases & Goals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Learning Phases */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <SectionLabel>学习阶段</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {path.phases.map((phase, idx) => {
                const cfg = PHASE_CONFIG[phase.status];
                return (
                  <div key={phase.id} style={{ display: 'flex', gap: 16 }}>
                    {/* Timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: cfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        border: phase.status === 'current' ? `2px solid ${cfg.color}` : 'none',
                      }}>
                        {cfg.icon}
                      </div>
                      {idx < path.phases.length - 1 && (
                        <div style={{
                          width: 2, flex: 1, minHeight: 20,
                          background: phase.status === 'completed' ? 'var(--green)' : 'var(--border)',
                        }} />
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, paddingBottom: idx < path.phases.length - 1 ? 16 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: phase.status === 'upcoming' ? 'var(--text-3)' : 'var(--text-1)' }}>
                          {phase.title}
                        </span>
                        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{phase.est_duration}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {phase.description}
                      </p>
                      {phase.status === 'current' && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>
                            <span>进度</span>
                            <span>{Math.round(phase.progress)}%</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${phase.progress}%`, background: 'var(--amber)', borderRadius: 2, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      )}
                      {/* Tasks */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {phase.tasks.map(task => {
                          const ts = TASK_STATUS[task.status];
                          return (
                            <div key={task.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                              padding: '4px 8px', borderRadius: 6, background: task.status === 'done' ? 'var(--green-bg)' : 'transparent',
                            }}>
                              <span>{TASK_ICONS[task.type]}</span>
                              <span style={{
                                flex: 1, color: task.status === 'done' ? 'var(--text-3)' : 'var(--text-1)',
                                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                              }}>
                                {task.title}
                              </span>
                              <span style={{ color: PRIORITY_COLORS[task.priority], fontSize: 10 }}>
                                {task.priority === 'high' ? '●' : task.priority === 'medium' ? '◐' : '○'}
                              </span>
                              <span style={{ color: ts.color, fontSize: 11 }}>{ts.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goals */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <SectionLabel>学习目标</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {path.goals.map(goal => (
                <div key={goal.id} style={{
                  padding: 14, borderRadius: 8, background: 'var(--surface-2)',
                  border: goal.progress >= 100 ? '1px solid var(--green)' : '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: 'var(--teal-bg)', color: 'var(--teal)' }}>
                      {goal.category}
                    </span>
                    {goal.progress >= 100 && <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', marginBottom: 4 }}>{goal.title}</div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 8px', lineHeight: 1.4 }}>{goal.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>
                    <span>目标: {goal.target_date}</span>
                    <span>{Math.round(goal.progress)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.min(100, goal.progress)}%`,
                      background: goal.progress >= 100 ? 'var(--green)' : 'var(--teal)',
                      borderRadius: 2, transition: 'width 0.5s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <SectionLabel>推荐学习资源</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {path.resources.map(res => (
                <div key={res.id} style={{
                  padding: 12, borderRadius: 8, background: 'var(--surface-2)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{RESOURCE_ICONS[res.type]}</div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)', marginBottom: 4 }}>{res.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                    <span>{res.category}</span>
                    <span>{res.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
