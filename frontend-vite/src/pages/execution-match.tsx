import { useState, useEffect } from 'react';
import { executionMatchAPI, prePlansAPI } from '@/services/api';

/* ─── Types ─── */
interface MatchResult {
  match_score: number;
  dimension_scores: Record<string, number>;
  gaps: { area: string; severity: string; description: string }[];
  recommendations: string[];
  summary: string;
}

interface PrePlanItem {
  id: number;
  title: string;
  competition_title?: string;
  status: string;
}

/* ─── Styles ─── */
const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 10, padding: 24,
};
const scoreCircle = (score: number): React.CSSProperties => ({
  width: 120, height: 120, borderRadius: '50%',
  background: `conic-gradient(${score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)'} ${score * 3.6}deg, var(--surface-2) 0deg)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto',
});
const scoreInner: React.CSSProperties = {
  width: 96, height: 96, borderRadius: '50%', background: 'var(--surface)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column',
};
const dimBar = (pct: number, color: string): React.CSSProperties => ({
  height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden', flex: 1,
  position: 'relative',
});
const dimFill = (pct: number, color: string): React.CSSProperties => ({
  position: 'absolute', top: 0, left: 0, bottom: 0,
  width: `${pct}%`, background: color, borderRadius: 4,
  transition: 'width 0.6s ease',
});

/* ─── Component ─── */
export function ExecutionMatchPage() {
  const [plans, setPlans] = useState<PrePlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | ''>('');
  const [planText, setPlanText] = useState('');
  const [executionText, setExecutionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    prePlansAPI.list().then(r => {
      const items = (r.pre_plans || r.data || []).map((p: Record<string, unknown>) => ({
        id: p.id, title: p.title || p.name || `预案 #${p.id}`,
        competition_title: p.competition_title, status: p.status,
      }));
      setPlans(items);
    }).catch(() => {});
  }, []);

  const handleMatch = async () => {
    if (!executionText.trim()) { setError('请输入执行情况描述'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await executionMatchAPI.match({
        pre_plan_id: selectedPlan || undefined,
        execution_text: executionText,
        plan_text: planText || undefined,
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI 分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)';
  const severityColor = (s: string) => s === 'high' ? 'var(--red)' : s === 'medium' ? 'var(--amber)' : 'var(--teal)';
  const dimLabels: Record<string, string> = {
    scope_completion: '范围完成度', timeline_adherence: '时间遵循度',
    quality_standards: '质量标准', resource_efficiency: '资源效率',
    innovation_achieved: '创新达成', team_collaboration: '团队协作',
    milestone_tracking: '里程碑跟踪', risk_management: '风险管理',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          📊 执行匹配分析
        </h1>
        <p style={{ color: 'var(--text-3)', marginTop: 8, fontSize: 14 }}>
          AI 对比预案计划与实际执行情况，识别偏差并给出改进建议
        </p>
      </div>

      {/* Input Section */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: Plan selection */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, display: 'block' }}>
              选择预案（可选）
            </label>
            <select
              value={selectedPlan}
              onChange={e => { const v = e.target.value; setSelectedPlan(v ? Number(v) : ''); }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 14, outline: 'none',
              }}
            >
              <option value="">手动输入预案内容</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.title}{p.competition_title ? ` — ${p.competition_title}` : ''}</option>
              ))}
            </select>

            {!selectedPlan && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'block' }}>
                  预案内容
                </label>
                <textarea
                  value={planText} onChange={e => setPlanText(e.target.value)}
                  placeholder="粘贴原始预案计划内容..."
                  rows={8}
                  style={{
                    width: '100%', padding: 12, borderRadius: 8, resize: 'vertical',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: Execution text */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, display: 'block' }}>
              实际执行情况 <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              value={executionText} onChange={e => setExecutionText(e.target.value)}
              placeholder="描述项目的实际执行过程、成果、遇到的问题等..."
              rows={selectedPlan ? 18 : 8}
              style={{
                width: '100%', padding: 12, borderRadius: 8, resize: 'vertical',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleMatch}
            disabled={loading || !executionText.trim()}
            style={{
              padding: '10px 28px', borderRadius: 8, border: 'none',
              background: loading ? 'var(--surface-2)' : 'var(--amber)',
              color: loading ? 'var(--text-3)' : '#000',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳ AI 分析中...' : '🔍 开始匹配分析'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          {/* Left: Score */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, fontWeight: 600 }}>综合匹配度</div>
              <div style={scoreCircle(result.match_score)}>
                <div style={scoreInner}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: scoreColor(result.match_score) }}>
                    {result.match_score}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -2 }}>/ 100</span>
                </div>
              </div>
              <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {result.summary}
              </p>
            </div>

            {/* Dimension scores */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>维度评分</div>
              {Object.entries(result.dimension_scores).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{dimLabels[key] || key}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(val) }}>{val}</span>
                  </div>
                  <div style={dimBar(val, scoreColor(val))}>
                    <div style={dimFill(val, scoreColor(val))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Gaps + Recommendations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Gaps */}
            {result.gaps.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                  ⚠️ 偏差识别 ({result.gaps.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.gaps.map((gap, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 8,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{gap.area}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: severityColor(gap.severity), color: '#fff',
                        }}>{gap.severity === 'high' ? '高' : gap.severity === 'medium' ? '中' : '低'}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{gap.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                💡 改进建议 ({result.recommendations.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 8,
                    background: 'var(--surface-2)',
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--amber)', color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
