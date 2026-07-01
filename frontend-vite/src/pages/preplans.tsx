import { useEffect, useState } from 'react';
import { prePlansAPI, teamsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { StatusBadge } from '@/components/ui/badge';
import { ScoreGauge } from '@/components/ui/charts';
import { Icon } from '@/components/ui/icon';
import { ProgressBar, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { Button } from '@/components/ui/button';
import { FormModal, Field, TextInput, TextArea, Select } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import type { PrePlan, Team } from '@/types';

function AIReviewPanel({ plan, onRefresh }: { plan: PrePlan; onRefresh?: () => void }) {
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const fullText = plan.ai_review_notes || '';

  useEffect(() => {
    if (!fullText) return;
    let i = 0;
    setTyping(true);
    setText('');
    const interval = setInterval(() => {
      i++;
      setText(fullText.slice(0, i));
      if (i >= fullText.length) { clearInterval(interval); setTyping(false); }
    }, 14);
    return () => clearInterval(interval);
  }, [plan.id]);

  const triggerReview = async () => {
    setReviewing(true);
    try {
      await prePlansAPI.review(plan.id);
      toast.success('AI 评审完成');
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(getApiError(e, 'AI 评审失败'));
    } finally {
      setReviewing(false);
    }
  };

  if (!plan.ai_review_score) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
          <Icon name="sparkles" size={22}/>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', textAlign: 'center' }}>
          {reviewing ? 'AI 正在评审中，请稍候…' : '点击下方按钮，获取 AI 智能评审报告'}
        </div>
        <Button
          onClick={triggerReview}
          disabled={reviewing}
          variant="primary"
          style={{ marginTop: 8 }}
        >
          {reviewing ? '评审中…' : <><Icon name="sparkles" size={14} /> 请求 AI 评审</>}
        </Button>
      </div>
    );
  }

  const dimensions = plan.ai_dimensions;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'var(--teal-bg)', border: '1px solid var(--teal-border)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="sparkles" size={15}/>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.06em' }}>AI REVIEW · RAG + LLM</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>基于往届项目综合评估</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <ScoreGauge score={plan.ai_review_score} size={160}/>
      </div>

      {dimensions && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel label="分项评分"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dimensions.map(({ label, score }) => {
              const color = score >= 80 ? 'var(--green)' : score >= 65 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color }}>{score}/100</span>
                  </div>
                  <ProgressBar value={score} max={100} color={color} height={7}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <SectionLabel label="AI 综合意见"/>
        <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, minHeight: 80 }}>
          {text}
          {typing && <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--teal)', marginLeft: 2, animation: 'forge-spin 1s step-end infinite', verticalAlign: 'middle' }}/>}
        </div>
      </div>
    </div>
  );
}

type PrePlanFormState = {
  team_id: string; title: string; tech_stack: string; target_audience: string;
  market_analysis: string; innovation: string; expected_outcome: string; timeline: string;
};
function emptyPrePlanForm(): PrePlanFormState {
  return { team_id: '', title: '', tech_stack: '', target_audience: '', market_analysis: '', innovation: '', expected_outcome: '', timeline: '' };
}

function PrePlanForm({ onClose, teams, onCreated }: {
  onClose: () => void;
  teams: Team[];
  onCreated: (plan: PrePlan) => void;
}) {
  const [form, setForm] = useState<PrePlanFormState>(emptyPrePlanForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof PrePlanFormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const teamOptions = teams.map((t) => ({ value: String(t.id), label: t.competition?.title ? `${t.name} · ${t.competition.title}` : t.name }));

  const submit = async () => {
    if (!form.team_id) { setError('请选择团队'); return; }
    if (!form.title.trim()) { setError('请填写方案标题'); return; }
    const team = teams.find((t) => String(t.id) === form.team_id);
    if (!team) { setError('团队无效'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await prePlansAPI.create({
        competition_id: team.competition_id,
        team_id: team.id,
        title: form.title.trim(),
        tech_stack: form.tech_stack,
        target_audience: form.target_audience,
        market_analysis: form.market_analysis,
        innovation: form.innovation,
        expected_outcome: form.expected_outcome,
        timeline: form.timeline,
      });
      toast.success('预计划已提交');
      onCreated(res.pre_plan);
      onClose();
    } catch (err) {
      setError(getApiError(err, '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title="新建预计划" onSubmit={submit} submitting={submitting} error={error} submitLabel="提交" width={640}>
      {teams.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>你还没有团队，请先到「团队管理」创建团队。</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="团队" required><Select value={form.team_id} onChange={set('team_id')} options={teamOptions} placeholder="选择团队" /></Field>
            <Field label="方案标题" required><TextInput value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="项目名称" /></Field>
          </div>
          <Field label="技术栈"><TextArea value={form.tech_stack} onChange={(e) => set('tech_stack')(e.target.value)} /></Field>
          <Field label="目标用户"><TextArea value={form.target_audience} onChange={(e) => set('target_audience')(e.target.value)} /></Field>
          <Field label="市场分析"><TextArea value={form.market_analysis} onChange={(e) => set('market_analysis')(e.target.value)} /></Field>
          <Field label="创新点"><TextArea value={form.innovation} onChange={(e) => set('innovation')(e.target.value)} /></Field>
          <Field label="预期成果"><TextArea value={form.expected_outcome} onChange={(e) => set('expected_outcome')(e.target.value)} /></Field>
          <Field label="时间规划"><TextArea value={form.timeline} onChange={(e) => set('timeline')(e.target.value)} /></Field>
        </>
      )}
    </FormModal>
  );
}

export function PrePlansPage() {
  const role = useRole();
  const [preplans, setPreplans] = useState<PrePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PrePlan | null>(null);
  const [tab, setTab] = useState('detail');

  useEffect(() => {
    prePlansAPI.list().then(res => {
      const plans = res.pre_plans || [];
      setPreplans(plans);
      if (plans.length > 0) setSelected(plans[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => { teamsAPI.list().then((r) => setMyTeams(r.teams || [])).catch(() => {}); }, []);

  const onCreated = (plan: PrePlan) => {
    setPreplans((prev) => [plan, ...prev]);
    setSelected(plan);
    setTab('detail');
  };

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const res = await prePlansAPI.get(selected.id);
      const updated = res.pre_plan;
      setPreplans(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelected(updated);
    } catch { /* ignore */ }
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
      <PageHeader
        title="预计划管理"
        subtitle="提交预计划，获取 AI 智能评审报告"
        actions={role === 'student' ? <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={() => setCreateOpen(true)}>新建预计划</Button> : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
        <div className="card anim-in" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            预计划列表 ({preplans.length})
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {preplans.map((plan) => (
              <div key={plan.id} onClick={() => { setSelected(plan); setTab('detail'); }} style={{
                padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: selected?.id === plan.id ? 'var(--amber-bg)' : 'transparent',
                borderLeft: selected?.id === plan.id ? '3px solid var(--amber)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (selected?.id !== plan.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (selected?.id !== plan.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>{plan.title}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={plan.status}/>
                  {plan.team?.name && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{plan.team.name}</span>}
                  {plan.ai_review_score && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>AI {plan.ai_review_score}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="card anim-in d2" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 20px', flexShrink: 0 }}>
              {[
                { k: 'detail', l: '方案详情' },
                { k: 'ai', l: 'AI 评审报告', highlight: !!selected.ai_review_score },
              ].map(({ k, l, highlight }) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  padding: '14px 16px', fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent',
                  color: tab === k ? (highlight ? 'var(--teal)' : 'var(--amber)') : 'var(--text-3)',
                  borderBottom: tab === k ? `2px solid ${highlight ? 'var(--teal)' : 'var(--amber)'}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {highlight && k === 'ai' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)' }}/>}
                  {l}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {tab === 'detail' ? (
                <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{selected.title}</h3>
                    <StatusBadge status={selected.status}/>
                    {role === 'student' && (selected.status === 'draft' || selected.status === 'reviewed') && (
                      <Button variant="outline" size="sm" icon={<Icon name="edit" size={12}/>} onClick={() => setEditOpen(true)}>编辑</Button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: '团队', value: selected.team?.name || '—' },
                      { label: '提交时间', value: selected.submitted_at ? new Date(selected.submitted_at).toLocaleDateString('zh-CN') : '未提交' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {[
                    { label: '技术栈', value: selected.tech_stack },
                    { label: '目标用户', value: selected.target_audience },
                    { label: '市场分析', value: selected.market_analysis },
                    { label: '创新点', value: selected.innovation },
                    { label: '预期成果', value: selected.expected_outcome },
                  ].filter(f => f.value).map(({ label, value }) => (
                    <div key={label} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <AIReviewPanel plan={selected} onRefresh={refreshSelected}/>
              )}
            </div>
          </div>
        )}
      </div>
      {createOpen && <PrePlanForm onClose={() => setCreateOpen(false)} teams={myTeams} onCreated={onCreated} />}
      {editOpen && selected && (
        <PrePlanEditForm
          plan={selected}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setPreplans(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelected(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** 编辑预计划表单 */
function PrePlanEditForm({ plan, onClose, onSaved }: {
  plan: PrePlan;
  onClose: () => void;
  onSaved: (plan: PrePlan) => void;
}) {
  const [form, setForm] = useState({
    title: plan.title || '',
    tech_stack: plan.tech_stack || '',
    target_audience: plan.target_audience || '',
    market_analysis: plan.market_analysis || '',
    innovation: plan.innovation || '',
    expected_outcome: plan.expected_outcome || '',
    timeline: plan.timeline || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.title.trim()) { setError('请填写方案标题'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await prePlansAPI.update(plan.id, {
        title: form.title.trim(),
        tech_stack: form.tech_stack,
        target_audience: form.target_audience,
        market_analysis: form.market_analysis,
        innovation: form.innovation,
        expected_outcome: form.expected_outcome,
        timeline: form.timeline,
      });
      toast.success('预计划已更新');
      onSaved(res.pre_plan);
    } catch (err) {
      setError(getApiError(err, '更新失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title="编辑预计划" onSubmit={submit} submitting={submitting} error={error} submitLabel="保存" width={640}>
      <Field label="方案标题" required><TextInput value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="项目名称" /></Field>
      <Field label="技术栈"><TextArea value={form.tech_stack} onChange={(e) => set('tech_stack')(e.target.value)} /></Field>
      <Field label="目标用户"><TextArea value={form.target_audience} onChange={(e) => set('target_audience')(e.target.value)} /></Field>
      <Field label="市场分析"><TextArea value={form.market_analysis} onChange={(e) => set('market_analysis')(e.target.value)} /></Field>
      <Field label="创新点"><TextArea value={form.innovation} onChange={(e) => set('innovation')(e.target.value)} /></Field>
      <Field label="预期成果"><TextArea value={form.expected_outcome} onChange={(e) => set('expected_outcome')(e.target.value)} /></Field>
      <Field label="时间规划"><TextArea value={form.timeline} onChange={(e) => set('timeline')(e.target.value)} /></Field>
    </FormModal>
  );
}
