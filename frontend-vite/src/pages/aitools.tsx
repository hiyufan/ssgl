import { useState, useRef } from 'react';
import { aiToolsAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';

const TOOLS = [
  { id: 'business-plan', name: '商业计划书生成', desc: '输入项目信息，自动生成结构完整的商业计划书草稿', tags: ['文档生成', 'GPT-4'], color: 'teal' },
  { id: 'market-analysis', name: '市场分析报告', desc: '深度分析目标市场规模、竞争格局与切入机会点', tags: ['市场分析', 'RAG'], color: 'amber' },
  { id: 'improvement', name: '项目改进建议', desc: '结合往届优秀项目 AI 对比，给出针对性改进方向', tags: ['AI 建议', '历史对比'], color: 'purple' },
  { id: 'tech-route', name: '技术路线规划', desc: '根据功能需求和团队能力生成技术架构建议', tags: ['技术规划', 'RAG'], color: 'green' },
  { id: 'resource-match', name: '资源整合建议', desc: '分析团队技能差距并推荐补充资源与合作方向', tags: ['资源匹配', 'AI'], color: 'amber' },
  { id: 'pitch-deck', name: '路演PPT大纲', desc: '根据项目信息和答辩时长，生成结构化路演PPT大纲与时间分配', tags: ['路演', '答辩教练'], color: 'purple' },
  { id: 'advisor', name: '赛事顾问', desc: '实时回答赛事规则、评审标准与参赛策略问题', tags: ['问答', 'RAG + LLM'], color: 'teal' },
  { id: 'swot-analysis', name: 'SWOT 分析', desc: '对项目进行优势/劣势/机会/威胁全面分析，含交叉策略矩阵', tags: ['战略分析', 'RAG'], color: 'green' },
  { id: 'competition-report', name: '赛事分析报告', desc: '深度分析赛事评审标准、参赛建议、时间规划与往届优秀项目特征', tags: ['赛事分析', 'RAG'], color: 'teal' },
  { id: 'study-plan', name: '备赛计划生成', desc: '根据赛事特点和团队情况，量身定制周密的备赛计划和学习路径', tags: ['备赛', '个性化'], color: 'green' },
];

const colorMap: Record<string, { accent: string; bg: string; border: string }> = {
  teal:   { accent: 'var(--teal)',   bg: 'var(--teal-bg)',   border: 'var(--teal-border)' },
  amber:  { accent: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  purple: { accent: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--border)' },
  green:  { accent: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--border)' },
};

export function AIToolsPage() {
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [extra, setExtra] = useState('');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!active || generating) return;
    setGenerating(true);
    setStreaming(true);
    setOutput('');

    // Use SSE streaming for real-time output
    await aiToolsAPI.callStream(active, input, extra || undefined, {
      onChunk: (text: string) => {
        setOutput(prev => prev + text);
        if (outputRef.current) {
          requestAnimationFrame(() => {
            if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
          });
        }
      },
      onDone: () => {
        setGenerating(false);
        setStreaming(false);
      },
      onError: (msg: string) => {
        setOutput(msg);
        setGenerating(false);
        setStreaming(false);
      },
    });
  };

  const activeTool = active ? TOOLS.find(t => t.id === active) : null;
  const activeColors = activeTool ? (colorMap[activeTool.color] || colorMap.teal) : colorMap.teal;
  const showExtra = active === 'market-analysis' || active === 'tech-route' || active === 'resource-match'
    || active === 'pitch-deck' || active === 'swot-analysis' || active === 'advisor' || active === 'study-plan';
  const extraLabels: Record<string, string> = {
    'market-analysis': '目标市场（选填）',
    'tech-route': '团队技术栈（选填）',
    'resource-match': '项目需求（选填）',
    'pitch-deck': '答辩时长，如 10分钟（选填）',
    'swot-analysis': '竞争对手信息（选填）',
    'advisor': '剩余时间（选填）',
    'study-plan': '团队情况描述（选填）',
  };

  return (
    <div className="forge-page" style={{ paddingBottom: 0, height: 'calc(100vh - var(--topbar-h))', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
            <Icon name="sparkles" size={16}/>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>AI 工具箱</h1>
          <span className="badge badge-teal">RAG + LLM</span>
          {streaming && <span className="badge badge-green" style={{ animation: 'forge-spin 1.5s ease-in-out infinite' }}>⚡ 流式输出中</span>}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{TOOLS.length} 个智能助手 · 基于往届项目知识库 · 实时流式生成</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {TOOLS.map((tool, i) => {
            const colors = colorMap[tool.color] || colorMap.teal;
            const isActive = active === tool.id;
            return (
              <button key={tool.id} className={`anim-in d${i + 1}`} onClick={() => { setActive(tool.id); setOutput(''); setInput(''); setExtra(''); }} style={{
                padding: 16, borderRadius: 12, border: `1px solid ${isActive ? colors.border : 'var(--border)'}`,
                background: isActive ? colors.bg : 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                boxShadow: isActive ? `0 0 0 1px ${colors.border}` : 'none',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.background = 'var(--surface-2)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? colors.accent : 'var(--text)' }}>{tool.name}</span>
                  {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: colors.accent }}/>}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>{tool.desc}</p>
                <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                  {tool.tags.map(t => (
                    <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${colors.accent}18`, color: colors.accent, border: `1px solid ${colors.border}`, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!activeTool ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
                <Icon name="sparkles" size={28}/>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>选择一个 AI 工具</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>从左侧选择工具，输入信息后点击生成</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{activeTool.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{activeTool.desc}</div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setActive(null); setOutput(''); }}>
                  <Icon name="x" size={14}/>
                </button>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <textarea className="forge-input" rows={3} placeholder={`描述你的项目，${activeTool.name} 将为你生成专属内容…`} value={input} onChange={e => setInput(e.target.value)} style={{ resize: 'none', marginBottom: showExtra ? 8 : 10 }}/>
                  {showExtra && (
                    <input className="forge-input" placeholder={extraLabels[active] || '附加信息（选填）'} value={extra} onChange={e => setExtra(e.target.value)} style={{ marginBottom: 10 }}/>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={generate} disabled={generating}
                      style={{ background: generating ? 'var(--surface-3)' : activeColors.accent, color: generating ? 'var(--text-3)' : '#0F1523', borderColor: 'transparent' }}>
                      {generating ? <><Spinner size={14} color="var(--text-3)"/> 生成中…</> : <><Icon name="sparkles" size={14}/> 立即生成</>}
                    </button>
                    {streaming && <span style={{ fontSize: 11, color: activeColors.accent, fontFamily: 'var(--font-mono)' }}>⚡ SSE 流式响应</span>}
                    {!streaming && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{activeTool.tags.join(' · ')}</span>}
                  </div>
                </div>
                <div ref={outputRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  {!output && !generating ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
                      <Icon name="send" size={24}/>
                      <span style={{ fontSize: 13 }}>点击「立即生成」开始</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8, color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {output}
                      {streaming && <span style={{ display: 'inline-block', width: 8, height: 14, background: activeColors.accent, marginLeft: 2, verticalAlign: 'middle', borderRadius: 1, animation: 'forge-spin 1s step-end infinite' }}/>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
