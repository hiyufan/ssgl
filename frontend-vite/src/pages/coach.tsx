import { useEffect, useRef, useState } from 'react';
import { coachAPI, prePlansAPI, type CoachStart, type CoachFinal, type CoachQuestion } from '@/services/api';
import type { PrePlan } from '@/types';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Radar } from '@/components/ai/radar';
import { toast } from '@/components/ui/toast';

const DIMS: { key: keyof CoachStart['scores']; label: string }[] = [
  { key: 'innovation', label: '创新性' },
  { key: 'feasibility', label: '可行性' },
  { key: 'business', label: '商业价值' },
  { key: 'delivery', label: '表达力' },
  { key: 'completeness', label: '完整度' },
];

const PERSONA: Record<string, { label: string; color: string; bg: string }> = {
  tech: { label: '技术评委', color: 'var(--purple)', bg: 'var(--purple-bg)' },
  business: { label: '商业评委', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  product: { label: '产品评委', color: 'var(--teal)', bg: 'var(--teal-bg)' },
};

type Stage = 'setup' | 'opening' | 'qa' | 'final';
type TranscriptItem = { type: 'q' | 'a' | 'reaction'; persona?: string; text: string };

const scoresToDims = (s: CoachStart['scores']) => DIMS.map((d) => ({ label: d.label, value: s[d.key] ?? 0 }));

export function CoachPage() {
  const role = useRole();
  const [stage, setStage] = useState<Stage>('setup');

  // setup
  const [source, setSource] = useState<'pre_plan' | 'text'>('pre_plan');
  const [prePlans, setPrePlans] = useState<PrePlan[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [pitchText, setPitchText] = useState('');
  const [numQuestions, setNumQuestions] = useState(4);
  const [starting, setStarting] = useState(false);

  // opening / qa
  const [openingData, setOpeningData] = useState<CoachStart | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [reaction, setReaction] = useState('');
  const [followup, setFollowup] = useState<string | null>(null);
  const followupCount = useRef<Record<number, number>>({});

  // final
  const [finalData, setFinalData] = useState<CoachFinal | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (source === 'pre_plan') {
      prePlansAPI.list().then((r) => setPrePlans(r.pre_plans || [])).catch(() => setPrePlans([]));
    }
  }, [source]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript, reaction]);

  const currentQuestion: CoachQuestion | undefined = openingData?.questions[qIndex];

  const start = async () => {
    if (starting) return;
    if (source === 'pre_plan' && !planId) { toast.error('请选择一份预计划'); return; }
    if (source === 'text' && !pitchText.trim()) { toast.error('请粘贴你的 Pitch'); return; }
    setStarting(true);
    try {
      const data = await coachAPI.start({
        role,
        source,
        pre_plan_id: source === 'pre_plan' ? planId! : undefined,
        pitch_text: source === 'text' ? pitchText : undefined,
        num_questions: numQuestions,
      });
      if (!data.questions || data.questions.length === 0) {
        toast.error('AI 未能生成答辩问题，请重试');
        return;
      }
      setOpeningData(data);
      setQIndex(0);
      setTranscript([]);
      followupCount.current = {};
      setStage('opening');
    } catch (e) {
      toast.error(extractErr(e));
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = () => {
    if (!openingData || !currentQuestion || streaming || !answer.trim()) return;
    const qid = currentQuestion.id;
    const qText = followup ?? currentQuestion.question;
    const myAnswer = answer.trim();
    setTranscript((t) => [
      ...t,
      { type: 'q', persona: currentQuestion.persona, text: qText },
      { type: 'a', text: myAnswer },
    ]);
    setAnswer('');
    setReaction('');
    setStreaming(true);
    let collected = '';
    coachAPI.answerStream(
      { session_id: openingData.session_id, question_id: qid, answer: myAnswer },
      {
        onChunk: (c) => { collected += c; setReaction(collected); },
        onDone: () => {
          setStreaming(false);
          setTranscript((t) => [...t, { type: 'reaction', persona: currentQuestion.persona, text: collected }]);
          setReaction('');
          handleFollowup(qid, collected);
        },
        onExpired: () => { setStreaming(false); toast.error('答辩会话已过期，请重新开始'); resetToSetup(); },
        onError: (msg) => {
          setStreaming(false);
          setTranscript((t) => [...t, { type: 'reaction', persona: currentQuestion.persona, text: `⚠️ ${msg}` }]);
          setReaction('');
        },
      },
    );
  };

  // Follow-up detection mirrors the backend in-band protocol: the judge's
  // reaction may end with a line starting with 「追问：」 (see coach_service /
  // COACH_TURN_SYSTEM). Keep this prefix in sync with the backend.
  const handleFollowup = (qid: number, reactionText: string) => {
    const m = reactionText.split('\n').map((l) => l.trim()).find((l) => l.startsWith('追问：'));
    const used = followupCount.current[qid] ?? 0;
    if (m && used < 1) {
      followupCount.current[qid] = used + 1;
      setFollowup(m.slice('追问：'.length).trim());
    } else {
      setFollowup(null);
    }
  };

  const nextQuestion = () => {
    setFollowup(null);
    if (!openingData) return;
    if (qIndex < openingData.questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      finalize();
    }
  };

  const finalize = async () => {
    if (!openingData || finalizing) return;
    setFinalizing(true);
    setStage('final');
    try {
      const data = await coachAPI.final(openingData.session_id);
      setFinalData(data);
    } catch (e) {
      toast.error(extractErr(e));
    } finally {
      setFinalizing(false);
    }
  };

  const resetToSetup = () => {
    setStage('setup');
    setOpeningData(null);
    setFinalData(null);
    setTranscript([]);
    setReaction('');
    setFollowup(null);
    setAnswer('');
  };

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="forge-page">
      <header style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
            <Icon name="target" size={16} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>赛事陪练</h1>
          <span className="badge badge-purple">AI 模拟答辩</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>三人 AI 评委席 · 读取真实预计划 + 往届项目 · 连珠炮追问</p>
      </header>

      {stage === 'setup' && (
        <SetupView
          source={source} setSource={setSource}
          prePlans={prePlans} planId={planId} setPlanId={setPlanId}
          pitchText={pitchText} setPitchText={setPitchText}
          numQuestions={numQuestions} setNumQuestions={setNumQuestions}
          starting={starting} onStart={start}
        />
      )}

      {stage === 'opening' && openingData && (
        <OpeningView data={openingData} onEnter={() => setStage('qa')} />
      )}

      {stage === 'qa' && openingData && currentQuestion && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h) - 120px)' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>答辩进行中</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>第 {qIndex + 1} / {openingData.questions.length} 问</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finalize}>结束答辩</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {transcript.map((it, i) => <Bubble key={i} item={it} />)}
            {streaming && (
              <Bubble item={{ type: 'reaction', persona: currentQuestion.persona, text: reaction || '评委思考中…' }} />
            )}
            {!streaming && (
              <div style={{ padding: 14, borderRadius: 10, background: PERSONA[currentQuestion.persona]?.bg, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: PERSONA[currentQuestion.persona]?.color, background: 'var(--surface)' }}>
                    {PERSONA[currentQuestion.persona]?.label}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{followup ?? currentQuestion.question}</div>
              </div>
            )}
          </div>

          <div style={{ padding: 14, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <textarea className="forge-input" rows={3} placeholder="作答…（Ctrl+Enter 提交）" value={answer}
              disabled={streaming}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitAnswer(); }}
              style={{ resize: 'none', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={submitAnswer} disabled={streaming || !answer.trim()}>
                {streaming ? <><Spinner size={14} /> 评委点评中…</> : <><Icon name="send" size={14} /> 提交回答</>}
              </button>
              {!streaming && transcript.length > 0 && (
                <button className="btn btn-ghost" onClick={nextQuestion}>
                  {qIndex < openingData.questions.length - 1 ? '下一问 →' : '出终评 →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {stage === 'final' && (
        <FinalView data={finalData} loading={finalizing} opening={openingData} onRestart={resetToSetup} />
      )}
    </div>
  );
}

/* ─── Sub-views ──────────────────────────────────────── */

function SetupView(props: {
  source: 'pre_plan' | 'text'; setSource: (s: 'pre_plan' | 'text') => void;
  prePlans: PrePlan[]; planId: number | null; setPlanId: (n: number) => void;
  pitchText: string; setPitchText: (s: string) => void;
  numQuestions: number; setNumQuestions: (n: number) => void;
  starting: boolean; onStart: () => void;
}) {
  const { source, setSource, prePlans, planId, setPlanId, pitchText, setPitchText, numQuestions, setNumQuestions, starting, onStart } = props;
  return (
    <div className="card" style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['pre_plan', 'text'] as const).map((s) => (
          <button key={s} className={`btn ${source === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSource(s)}>
            {s === 'pre_plan' ? '选择我的预计划' : '自由粘贴 Pitch'}
          </button>
        ))}
      </div>

      {source === 'pre_plan' ? (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>预计划</label>
          <select className="forge-input" value={planId ?? ''} onChange={(e) => setPlanId(Number(e.target.value))}>
            <option value="" disabled>选择一份预计划…</option>
            {prePlans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {prePlans.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>暂无预计划，可改用「自由粘贴 Pitch」。</p>}
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>你的 Pitch</label>
          <textarea className="forge-input" rows={5} placeholder="用几句话描述你的项目：解决什么问题、给谁用、怎么做、创新点…" value={pitchText} onChange={(e) => setPitchText(e.target.value)} style={{ resize: 'none' }} />
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>答辩题量：{numQuestions}</label>
        <input type="range" min={3} max={6} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} style={{ width: 200 }} />
      </div>

      <button className="btn btn-primary" onClick={onStart} disabled={starting}>
        {starting ? <><Spinner size={14} /> 评委入场中…</> : <><Icon name="target" size={14} /> 开始答辩</>}
      </button>
    </div>
  );
}

function OpeningView({ data, onEnter }: { data: CoachStart; onEnter: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Radar dims={scoresToDims(data.scores)} />
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--purple)', marginTop: 8 }}>{data.overall}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>开场综合分</div>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>评委开场定调</div>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>{data.verdict}</p>
        {data.similar_projects.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>往届相似项目</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.similar_projects.map((s, i) => (
                <span key={i} title={s.preview} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  相似度 {(s.similarity * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>共 {data.questions.length} 个追问，三位评委轮流发问。</div>
        <button className="btn btn-primary" onClick={onEnter}><Icon name="right" size={14} /> 进入答辩</button>
      </div>
    </div>
  );
}

function Bubble({ item }: { item: TranscriptItem }) {
  if (item.type === 'a') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: '10px 14px', borderRadius: 12, background: 'var(--purple)', color: '#fff', fontSize: 14, lineHeight: 1.6 }}>
        {item.text}
      </div>
    );
  }
  const meta = PERSONA[item.persona || ''] || { label: '评委', color: 'var(--text)', bg: 'var(--surface-2)' };
  const isQuestion = item.type === 'q';
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginBottom: 3 }}>{meta.label}{isQuestion ? ' · 提问' : ' · 点评'}</div>
      <div style={{ padding: '10px 14px', borderRadius: 12, background: isQuestion ? meta.bg : 'var(--surface-2)', color: 'var(--text)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
        {item.text}
      </div>
    </div>
  );
}

function FinalView({ data, loading, opening, onRestart }: { data: CoachFinal | null; loading: boolean; opening: CoachStart | null; onRestart: () => void }) {
  if (loading || !data) {
    return <div className="card" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Spinner size={18} /> 评委合议中…</div>;
  }
  const openingValues = opening ? DIMS.map((d) => opening.scores[d.key] ?? 0) : undefined;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Radar dims={scoresToDims(data.scores)} compare={openingValues} />
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--purple)', marginTop: 8 }}>{data.overall}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>答辩终评分</div>
        {openingValues && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>虚线 = 开场分</div>}
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, marginBottom: 16, fontWeight: 600 }}>{data.closing}</p>
        <Section title="答辩亮点">
          {data.highlights.map((h, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{h}</li>)}
        </Section>
        <Section title="改进清单">
          {data.improvements.map((im, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, marginRight: 6, color: im.priority === 'high' ? 'var(--red)' : 'var(--amber)', background: 'var(--surface-2)' }}>
                {im.priority === 'high' ? '高' : '中'}
              </span>
              {im.content}
            </li>
          ))}
        </Section>
        <button className="btn btn-ghost" onClick={onRestart} style={{ marginTop: 8 }}><Icon name="target" size={14} /> 再来一次</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</ul>
    </div>
  );
}

function extractErr(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string; error?: string } } };
  return err?.response?.data?.detail || err?.response?.data?.error || 'AI 服务暂时不可用，请确保已启动（端口 8000）';
}
