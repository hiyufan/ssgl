import { useEffect, useState } from 'react';
import { feedbackAPI, competitionsAPI } from '@/services/api';
import type { CompetitionFeedback, FeedbackSummary } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { Stars, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { toast } from '@/components/ui/toast';
import type { Competition } from '@/types';

// ── Rating Bar Chart ─────────────────────────────────────────
function RatingBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-gray-400 text-right">{label}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <span className="w-10 text-gray-300 font-mono">{value.toFixed(1)}</span>
    </div>
  );
}

// ── Rating Distribution ──────────────────────────────────────
function RatingDistribution({ dist }: { dist: Record<number, number> }) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((r) => {
        const count = dist[r] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={r} className="flex items-center gap-2 text-sm">
            <span className="text-yellow-400 w-12">{r} ★</span>
            <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 text-gray-400 text-right">{count} ({pct.toFixed(0)}%)</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Skill Tags ───────────────────────────────────────────────
function SkillTags({ skills }: { skills: Array<{ skill: string; count: number }> }) {
  if (!skills || skills.length === 0) return <span className="text-gray-500 text-sm">暂无技能标签</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s, i) => (
        <span
          key={i}
          className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
        >
          {s.skill} <span className="text-indigo-400">×{s.count}</span>
        </span>
      ))}
    </div>
  );
}

// ── Star Input ───────────────────────────────────────────────
function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 w-24">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="text-xl transition-transform hover:scale-125"
            style={{ color: star <= value ? '#f59e0b' : '#4b5563' }}
          >
            ★
          </button>
        ))}
      </div>
      {value > 0 && <span className="text-xs text-gray-500">{value}/5</span>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FeedbackPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<number | null>(null);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [feedbacks, setFeedbacks] = useState<CompetitionFeedback[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [overall, setOverall] = useState(0);
  const [content, setContent] = useState(0);
  const [org, setOrg] = useState(0);
  const [fairness, setFairness] = useState(0);
  const [learning, setLearning] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [skills, setSkills] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    competitionsAPI.list().then((r) => setCompetitions(r.competitions || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedComp) return;
    setLoading(true);
    Promise.all([
      feedbackAPI.summary(selectedComp),
      feedbackAPI.listByCompetition(selectedComp),
    ]).then(([s, f]) => {
      setSummary(s);
      setFeedbacks(f.feedbacks || []);
    }).catch(() => {
      toast.error('加载反馈数据失败');
    }).finally(() => setLoading(false));
  }, [selectedComp]);

  const submitFeedback = async () => {
    if (!selectedComp || !overall) {
      toast.error('请至少填写综合评分');
      return;
    }
    setSubmitting(true);
    try {
      await feedbackAPI.submit(selectedComp, {
        competition_id: selectedComp,
        overall_rating: overall,
        content_rating: content || undefined,
        org_rating: org || undefined,
        fairness_rating: fairness || undefined,
        learning_value: learning || undefined,
        comment: comment || undefined,
        anonymous,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      });
      toast.success('反馈提交成功！');
      setShowForm(false);
      setOverall(0); setContent(0); setOrg(0); setFairness(0); setLearning(0);
      setComment(''); setAnonymous(false); setSkills('');
      // Refresh
      if (selectedComp) {
        const [s, f] = await Promise.all([
          feedbackAPI.summary(selectedComp),
          feedbackAPI.listByCompetition(selectedComp),
        ]);
        setSummary(s);
        setFeedbacks(f.feedbacks || []);
      }
    } catch {
      toast.error('提交失败（可能已提交过反馈）');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="赛事反馈评价" subtitle="查看和提交赛事评价反馈" icon="📝" />

      {/* Competition Selector */}
      <div className="flex items-center gap-4">
        <SectionLabel value="选择赛事" />
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white min-w-[300px]"
          value={selectedComp || ''}
          onChange={(e) => setSelectedComp(Number(e.target.value) || null)}
        >
          <option value="">请选择赛事...</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {selectedComp && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm transition"
          >
            {showForm ? '取消' : '✨ 提交反馈'}
          </button>
        )}
      </div>

      {/* Feedback Form */}
      {showForm && selectedComp && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">📝 提交赛事反馈</h3>
          <StarInput label="综合评分*" value={overall} onChange={setOverall} />
          <StarInput label="赛事内容" value={content} onChange={setContent} />
          <StarInput label="组织安排" value={org} onChange={setOrg} />
          <StarInput label="公平性" value={fairness} onChange={setFairness} />
          <StarInput label="学习价值" value={learning} onChange={setLearning} />

          <div className="space-y-2">
            <label className="text-sm text-gray-400">评语</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white h-24 resize-none"
              placeholder="分享您的参赛体验..."
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400">获得技能（逗号分隔）</label>
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                placeholder="Go, PostgreSQL, 团队协作"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mt-5">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded"
              />
              匿名提交
            </label>
          </div>

          <button
            onClick={submitFeedback}
            disabled={submitting || !overall}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium transition"
          >
            {submitting ? '提交中...' : '提交反馈'}
          </button>
        </div>
      )}

      {/* Summary Dashboard */}
      {selectedComp && !loading && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Overview */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Icon name="chart" /> 反馈概览
            </h3>
            {summary.total_feedbacks === 0 ? (
              <p className="text-gray-500">暂无反馈数据</p>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-yellow-400">{summary.avg_overall.toFixed(1)}</div>
                  <div className="text-gray-400 text-sm mt-1">综合评分 ({summary.total_feedbacks} 份反馈)</div>
                  <div className="mt-2">
                    <Stars value={Math.round(summary.avg_overall)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <RatingBar label="赛事内容" value={summary.avg_content} />
                  <RatingBar label="组织安排" value={summary.avg_org} />
                  <RatingBar label="公平性" value={summary.avg_fairness} />
                  <RatingBar label="学习价值" value={summary.avg_learning_value} />
                </div>
              </>
            )}
          </div>

          {/* Rating Distribution + Skills */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">⭐ 评分分布</h3>
              <RatingDistribution dist={summary.rating_distribution || {}} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">🎯 热门技能</h3>
              <SkillTags skills={summary.top_skills || []} />
            </div>
          </div>

          {/* Recent Comments */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">💬 最近评语</h3>
            {(!summary.recent_comments || summary.recent_comments.length === 0) ? (
              <p className="text-gray-500">暂无评语</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.recent_comments.map((c, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <Stars value={c.rating} />
                      <span className="text-xs text-gray-500">{c.date}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{c.comment || '(无评语)'}</p>
                    {c.anonymous && <span className="text-xs text-gray-500 mt-2 block">匿名用户</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback List */}
      {selectedComp && feedbacks.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📋 全部反馈 ({feedbacks.length})</h3>
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700/50 flex items-start gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{fb.overall_rating}</div>
                  <div className="text-xs text-gray-500">综合</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">
                      {fb.anonymous ? '匿名用户' : (fb.student_name || `用户${fb.student_id}`)}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  {fb.comment && <p className="text-gray-300 text-sm">{fb.comment}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {fb.content_rating > 0 && <span>内容 {fb.content_rating}★</span>}
                    {fb.org_rating > 0 && <span>组织 {fb.org_rating}★</span>}
                    {fb.fairness_rating > 0 && <span>公平 {fb.fairness_rating}★</span>}
                    {fb.learning_value > 0 && <span>学习 {fb.learning_value}★</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedComp && !loading && feedbacks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">📭</p>
          <p>暂无反馈数据，成为第一个提交反馈的人吧！</p>
        </div>
      )}
    </div>
  );
}
