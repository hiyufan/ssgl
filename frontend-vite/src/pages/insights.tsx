import { useEffect, useState } from 'react';
import { statsAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';

interface InsightItem {
  category: string;
  title: string;
  description: string;
  severity: string;
  metric?: number;
  action?: string;
}

interface RiskItem {
  factor: string;
  impact: string;
  likelihood: string;
  score: number;
  mitigation: string;
}

interface PlatformInsights {
  summary: string;
  overall_health: string;
  insights: InsightItem[];
  trend_analysis: {
    competitions_growth: number;
    teams_growth: number;
    awards_growth: number;
    active_competitions: number;
    completion_rate: number;
    ai_audit_rate: number;
  };
  risk_matrix: RiskItem[];
  recommendations: InsightItem[];
  activity_bursts: Array<{
    period: string;
    count: number;
    competitions: string[];
  }>;
  generated_at: string;
}

const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
  trend:        { icon: 'trend', color: 'var(--teal)',   label: '趋势' },
  risk:         { icon: 'alert', color: 'var(--red)',    label: '风险' },
  opportunity:  { icon: 'lightbulb', color: 'var(--amber)',  label: '机会' },
  recommendation: { icon: 'target', color: 'var(--purple)', label: '建议' },
};

const severityConfig: Record<string, { bg: string; border: string }> = {
  info:     { bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.3)' },
  warning:  { bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.3)' },
  critical: { bg: 'rgba(239, 68, 68, 0.08)',  border: 'rgba(239, 68, 68, 0.3)' },
};

const healthConfig: Record<string, { label: string; color: string; icon: string }> = {
  excellent:        { label: '优秀', color: 'var(--teal)', icon: 'circle' },
  good:             { label: '良好', color: 'var(--green)', icon: 'circle' },
  fair:             { label: '一般', color: 'var(--amber)', icon: 'circle' },
  needs_attention:  { label: '需关注', color: 'var(--red)', icon: 'circle' },
};

const impactConfig: Record<string, { color: string; label: string }> = {
  low:    { color: 'var(--teal)',  label: '低' },
  medium: { color: 'var(--amber)', label: '中' },
  high:   { color: 'var(--red)',   label: '高' },
};

export function InsightsPage() {
  const [data, setData] = useState<PlatformInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    statsAPI.insights()
      .then(setData)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
        <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>AI 正在分析平台数据...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={16} />{error || '无法加载洞察数据'}</p>
      </div>
    );
  }

  const health = healthConfig[data.overall_health] || healthConfig.good;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Icon name="brain" size={28} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            AI 数据洞察引擎
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          基于平台全量数据的智能分析，发现趋势、风险与机会
        </p>
      </div>

      {/* Summary Card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: health.color }}><Icon name={health.icon} size={20} /></span>
            <span style={{ fontSize: 16, fontWeight: 600, color: health.color }}>
              平台健康状态：{health.label}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {new Date(data.generated_at).toLocaleString('zh-CN')}
          </span>
        </div>
        <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.7, fontSize: 15 }}>
          {data.summary}
        </p>
      </div>

      {/* Trend Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: '赛事增长', value: data.trend_analysis.competitions_growth, suffix: '%', icon: 'chart' },
          { label: '团队增长', value: data.trend_analysis.teams_growth, suffix: '%', icon: 'users' },
          { label: '奖项增长', value: data.trend_analysis.awards_growth, suffix: '%', icon: 'trophy' },
          { label: '进行中赛事', value: data.trend_analysis.active_competitions, suffix: '场', icon: 'zap' },
          { label: '赛事完成率', value: data.trend_analysis.completion_rate, suffix: '%', icon: 'circle-check' },
          { label: 'AI 评审率', value: data.trend_analysis.ai_audit_rate, suffix: '%', icon: 'bot' },
        ].map((m) => (
          <div key={m.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
            textAlign: 'center',
          }}>
            <Icon name={m.icon} size={24} />
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
              {typeof m.value === 'number' ? (m.value % 1 === 0 ? m.value : m.value.toFixed(1)) : m.value}
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>{m.suffix}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout: Insights + Risks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Insights */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="lightbulb" size={18} /> 洞察发现 ({data.insights.length})
          </h2>
          {data.insights.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="sparkles" size={14} />暂无异常洞察，平台运行正常</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.insights.map((item, i) => {
                const cat = categoryConfig[item.category] || categoryConfig.trend;
                const sev = severityConfig[item.severity] || severityConfig.info;
                return (
                  <div key={i} style={{
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    borderRadius: 10,
                    padding: '14px 18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: cat.color }}><Icon name={cat.icon} size={15} /></span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{item.title}</span>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: `${cat.color}22`,
                        color: cat.color,
                        fontWeight: 500,
                      }}>{cat.label}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                    {item.action && (
                      <p style={{ margin: '8px 0 0', color: 'var(--teal)', fontSize: 13, fontStyle: 'italic' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="lightbulb" size={13} />建议：{item.action}</span>
                      </p>
                    )}
                    {item.metric !== undefined && item.metric !== 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'inline-block' }}>
                        指标值：{item.metric.toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Risk Matrix */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" size={18} /> 风险矩阵 ({data.risk_matrix.length})
          </h2>
          {data.risk_matrix.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="circle-check" size={14} />未发现显著风险</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.risk_matrix.map((risk, i) => {
                const impact = impactConfig[risk.impact] || impactConfig.medium;
                const likelihood = impactConfig[risk.likelihood] || impactConfig.medium;
                return (
                  <div key={i} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{risk.factor}</span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: risk.score >= 6 ? 'var(--red)' : risk.score >= 3 ? 'var(--amber)' : 'var(--teal)',
                      }}>
                        风险分：{risk.score.toFixed(1)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 13 }}>
                      <span>影响：<span style={{ color: impact.color, fontWeight: 600 }}>{impact.label}</span></span>
                      <span>概率：<span style={{ color: likelihood.color, fontWeight: 600 }}>{likelihood.label}</span></span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="shield-check" size={13} />缓解措施：{risk.mitigation}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="target" size={18} /> 优化建议 ({data.recommendations.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {data.recommendations.map((rec, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 18px',
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15, marginBottom: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="target" size={15} />{rec.title}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                {rec.description}
              </p>
              {rec.action && (
                <p style={{ margin: '8px 0 0', color: 'var(--purple)', fontSize: 13 }}>
                  → {rec.action}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity Bursts */}
      {data.activity_bursts.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="zap" size={18} /> 活跃高峰
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {data.activity_bursts.map((burst, i) => (
              <div key={i} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={14} />{burst.period}</span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--teal)',
                    background: 'rgba(56, 189, 248, 0.1)',
                    padding: '2px 10px',
                    borderRadius: 99,
                  }}>
                    {burst.count} 场赛事
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {burst.competitions.map((name, j) => (
                    <div key={j} style={{ padding: '2px 0' }}>• {name}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
