import { useEffect, useState } from 'react';
import { evaluationsAPI, statsAPI, competitionsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { Avatar, Stars, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { Button } from '@/components/ui/button';
import { FormModal, Field, Select, TextArea, RatingInput } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import type { Competition, StudentEvaluation, TeacherStat } from '@/types';

function EvaluationForm({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (ev: StudentEvaluation) => void;
}) {
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [comps, setComps] = useState<Competition[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [compId, setCompId] = useState('');
  const [scores, setScores] = useState({ teaching: 0, communication: 0, availability: 0, overall: 0 });
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 挂载时拉取下拉数据；.then 回调里的 setState 是异步的，不触发 set-state-in-effect。
  useEffect(() => {
    statsAPI.teachers().then((r) => setTeachers(r.teachers || [])).catch(() => {});
    competitionsAPI.list().then((r) => setComps(r.competitions || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!teacherId) { setError('请选择教师'); return; }
    if (!compId) { setError('请选择赛事'); return; }
    if (!scores.teaching || !scores.communication || !scores.availability || !scores.overall) {
      setError('请完成四项评分（各 1–5 星）'); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await evaluationsAPI.create({
        teacher_id: Number(teacherId),
        competition_id: Number(compId),
        ...scores,
        feedback,
      });
      toast.success('评价已提交');
      onCreated(res.evaluation);
      onClose();
    } catch (err) {
      setError(getApiError(err, '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title="提交评价" onSubmit={submit} submitting={submitting} error={error} submitLabel="提交" width={560}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="教师" required>
          <Select value={teacherId} onChange={setTeacherId} placeholder="选择教师"
            options={teachers.map((t) => ({ value: String(t.id), label: t.name }))} />
        </Field>
        <Field label="赛事" required>
          <Select value={compId} onChange={setCompId} placeholder="选择赛事"
            options={comps.map((c) => ({ value: String(c.id), label: c.title }))} />
        </Field>
      </div>
      {([
        { k: 'teaching', l: '教学' },
        { k: 'communication', l: '沟通' },
        { k: 'availability', l: '及时性' },
        { k: 'overall', l: '综合' },
      ] as const).map(({ k, l }) => (
        <Field key={k} label={l} required>
          <RatingInput value={scores[k]} onChange={(v) => setScores((s) => ({ ...s, [k]: v }))} />
        </Field>
      ))}
      <Field label="文字反馈"><TextArea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="可选：写下具体反馈" /></Field>
    </FormModal>
  );
}

export function EvaluationsPage() {
  const role = useRole();
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evaluationsAPI.list().then(res => setEvaluations(res.evaluations || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const onCreated = (ev: StudentEvaluation) => setEvaluations((prev) => [ev, ...prev]);

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
        title={role === 'student' ? '评价导师' : '学生评价'}
        subtitle="多维度匿名评价，促进教学质量提升"
      />

      {/* Evaluation list */}
      <div className="card anim-in d3" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label={`评价记录 (${evaluations.length})`}/>
          {role === 'student' && <Button variant="primary" size="sm" icon={<Icon name="plus" size={12}/>} onClick={() => setCreateOpen(true)}>提交评价</Button>}
        </div>
        <div>
          {evaluations.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无评价记录</div>
          ) : evaluations.map((ev, i) => (
            <div key={ev.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <Avatar name={ev.student?.name || '?'} size={32} index={i}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{ev.student?.name}</span>
                    <Icon name="right" size={12}/>
                    <span style={{ fontWeight: 600, color: 'var(--teal)' }}>{ev.teacher?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {ev.competition?.title || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    {[
                      { label: '教学', val: ev.teaching },
                      { label: '沟通', val: ev.communication },
                      { label: '及时性', val: ev.availability },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
                        <Stars value={val}/>
                      </div>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)', fontSize: 14 }}>{ev.overall}</span>
                      <Stars value={ev.overall}/>
                    </div>
                  </div>
                </div>
              </div>
              {ev.feedback && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginLeft: 44 }}>
                  {ev.feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {createOpen && <EvaluationForm onClose={() => setCreateOpen(false)} onCreated={onCreated} />}
    </div>
  );
}
