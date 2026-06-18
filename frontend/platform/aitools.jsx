// AI Tools — 10 tools with real SSE streaming response

const TOOLS = [
  { id:'biz',        icon:'zap',     color:'#3370FF', bg:'#EEF3FF',
    title:'商业计划书助手',    desc:'基于项目信息和往届优秀案例，AI 辅助生成结构化商业计划书框架，支持分章节生成和编辑。',
    placeholder:'请描述你的项目：项目名称、核心功能、目标市场、团队背景...',
    sample:'请帮我生成一份关于「AI驱动智慧校园服务平台」的商业计划书框架，目标市场是国内高校，核心功能包括智能问答、课程推荐和场地预订。',
    streamId:'business-plan' },

  { id:'market',     icon:'trend',   color:'#00B42A', bg:'#E8FFED',
    title:'市场分析报告',     desc:'基于行业和目标市场，AI 实时生成市场分析报告，包含市场规模、竞品分析和用户画像。',
    placeholder:'请输入：行业类型、目标市场范围、目标用户群体、产品核心功能...',
    sample:'请分析智慧校园SaaS市场，目标客户为国内双一流高校，产品为AI校园服务平台。',
    streamId:'market-analysis' },

  { id:'improve',    icon:'activity', color:'#FF7D00', bg:'#FFF7E8',
    title:'项目改进建议',     desc:'基于往届获奖项目库，AI 对比分析当前项目与优秀案例的差距，生成优先级排序的改进建议。',
    placeholder:'请描述当前项目的核心功能、技术方案、进展状态和主要挑战...',
    sample:'我的项目是「碳中和校园能源管理系统」，目前完成了IoT数据采集和能耗预测模型，但评委反馈商业化路径不清晰，请给出改进建议。',
    streamId:'improvement' },

  { id:'tech',       icon:'cpu',     color:'#7C3AED', bg:'#F5F0FF',
    title:'技术路线建议',     desc:'基于项目需求，AI 推荐技术栈选型和系统架构方案，并提供风险评估和学习路线。',
    placeholder:'请描述：项目功能需求、性能指标、团队技术背景、时间约束...',
    sample:'我需要开发一个支持5000日活的校园AI问答平台，团队有3人，2人会Python，1人会前端React，时间8周。',
    streamId:'tech-route' },

  { id:'resource',   icon:'users',   color:'#0891B2', bg:'#E0F7FA',
    title:'跨学科资源整合',   desc:'基于团队技能和项目需求，AI 分析技能缺口，推荐跨学科协作资源和团队分工方案。',
    placeholder:'请描述：团队成员技能、专业背景、项目需求、当前遇到的瓶颈...',
    sample:'我们团队3人都是CS专业，做碳中和能源项目，但缺乏能源工程和商业分析背景，如何补充？',
    streamId:'resource-match' },

  { id:'advisor',    icon:'sparkle', color:'#E11D48', bg:'#FFF1F2',
    title:'AI 赛事顾问',      desc:'综合分析你的项目状态、团队情况和比赛要求，给出可执行的下一步行动建议。',
    placeholder:'请描述：当前项目进度、遇到的挑战、距离比赛截止的时间...',
    sample:'距离华为ICT大赛提交还有6周，我们的智慧校园平台完成了60%，核心功能可跑通，但Demo还没做，商业计划书还没写，请给出优先级建议。',
    streamId:'advisor' },

  { id:'pitchdeck', icon:'send',     color:'#0891B2', bg:'#E0F7FA',
    title:'路演 PPT 生成',     desc:'基于项目信息，AI 生成结构化的路演 PPT 大纲和内容框架，助力答辩展示。',
    placeholder:'请描述项目的核心亮点、技术方案、商业模式、团队优势...',
    sample:'请为我的「AI驱动智慧校园服务平台」生成路演PPT框架，核心亮点是RAG知识库技术，目标是华为ICT大赛答辩。',
    streamId:'pitch-deck' },

  { id:'swot',       icon:'activity', color:'#7C3AED', bg:'#F5F0FF',
    title:'SWOT 分析',         desc:'AI 基于项目信息生成 SWOT 分析（优势、劣势、机会、威胁），辅助项目决策。',
    placeholder:'请描述你的项目、团队、市场环境、竞争对手...',
    sample:'请对我的「AI驱动智慧校园服务平台」做SWOT分析，团队3人CS专业，目标是高校市场，竞争对手是华为智慧校园和科大讯飞。',
    streamId:'swot-analysis' },

  { id:'report',     icon:'barchart', color:'#FF7D00', bg:'#FFF7E8',
    title:'赛事分析报告',     desc:'AI 分析指定赛事的参赛情况、获奖趋势、团队表现，生成综合分析报告。',
    placeholder:'请输入赛事名称或描述需要分析的赛事...',
    sample:'请分析2026年华为ICT创新大赛的参赛趋势、获奖分布和团队表现。',
    streamId:'competition-report' },

  { id:'studyplan',  icon:'calendar', color:'#00B42A', bg:'#E8FFED',
    title:'备赛计划生成',     desc:'根据赛事信息和团队情况，AI 生成科学的备赛计划，包含阶段规划、分工建议和风险预案。',
    placeholder:'请描述：目标赛事、团队情况、可用时间、当前进度...',
    sample:'我们准备参加2026年华为ICT大赛，团队4人，2个CS+1个设计+1个商科，还有8周时间，目前技术原型已完成60%。',
    streamId:'study-plan' },
];

// ── Tool API mapping ─────────────────────────────────────
const toolApiMap = {
  biz:       (input) => aiToolsAPI.businessPlan({ prompt: input }),
  market:    (input) => aiToolsAPI.marketAnalysis({ prompt: input }),
  improve:   (input) => aiToolsAPI.improvement({ prompt: input }),
  tech:      (input) => aiToolsAPI.techRoute({ prompt: input }),
  resource:  (input) => aiToolsAPI.resourceMatch({ prompt: input }),
  advisor:   (input) => aiToolsAPI.advisor({ prompt: input }),
  pitchdeck: (input) => aiToolsAPI.pitchDeck({ prompt: input }),
  swot:      (input) => aiToolsAPI.swotAnalysis({ prompt: input }),
  report:    (input) => aiToolsAPI.competitionReport({ prompt: input }),
  studyplan: (input) => aiToolsAPI.studyPlan({ prompt: input }),
};

// ── Tool interface (with real SSE streaming) ──────────────
const ToolInterface = ({ tool, onBack }) => {
  const [input, setInput] = React.useState(tool.sample || '');
  const [output, setOutput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [charCount, setCharCount] = React.useState(0);
  const outputRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const stream = async () => {
    setLoading(true);
    setDone(false);
    setOutput('');
    setCharCount(0);

    // Try real SSE streaming first
    if (tool.streamId && aiToolsStreamAPI) {
      const stream = aiToolsStreamAPI.stream(tool.streamId, { input })
        .onChunk((chunk) => {
          setOutput(prev => {
            const next = prev + chunk;
            setCharCount(next.length);
            return next;
          });
          // Auto-scroll
          if (outputRef.current) {
            requestAnimationFrame(() => {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            });
          }
        })
        .onDone(() => {
          setLoading(false);
          setDone(true);
        })
        .onError((err) => {
          console.error('Stream error, falling back:', err);
          // Fallback to non-streaming API
          fallbackFetch();
        });
      streamRef.current = stream;
      stream.start();
    } else {
      fallbackFetch();
    }
  };

  const fallbackFetch = async () => {
    try {
      const apiFn = toolApiMap[tool.id];
      if (apiFn) {
        const res = await apiFn(input);
        setOutput(res.result || res.content || JSON.stringify(res));
      } else {
        setOutput('⚠️ 该工具暂不可用');
      }
    } catch (e) {
      console.error('AI tool error:', e);
      setOutput('生成失败，请稍后重试。错误信息：' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.abort(); };
  }, []);

  // Simple markdown-ish renderer
  const renderMd = (txt) => {
    const lines = txt.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# '))  return <div key={i} style={{ fontSize:16, fontWeight:800, color:'#1F2329', marginBottom:8, marginTop: i>0?16:0 }}>{line.slice(2)}</div>;
      if (line.startsWith('## ')) return <div key={i} style={{ fontSize:14, fontWeight:700, color:'#1F2329', marginBottom:6, marginTop:14 }}>{line.slice(3)}</div>;
      if (line.startsWith('### '))return <div key={i} style={{ fontSize:13, fontWeight:600, color:'#3370FF', marginBottom:4, marginTop:10 }}>{line.slice(4)}</div>;
      if (line.startsWith('| ') || line.startsWith('|--')) {
        if (line.startsWith('|--')) return null;
        const cells = line.split('|').filter(c => c.trim());
        const isHeader = i < lines.length-1 && lines[i+1]?.startsWith('|--');
        return <div key={i} style={{ display:'grid', gridTemplateColumns:`repeat(${cells.length},1fr)`, gap:1, marginBottom:1 }}>
          {cells.map((c,ci) => <div key={ci} style={{ padding:'6px 10px', background: isHeader?'#F0F5FF':'#FAFBFC', fontSize:12, fontWeight: isHeader?600:400, color: isHeader?'#3370FF':'#1F2329', border:'1px solid #E5E6E8', borderRadius:3 }}>{c.trim()}</div>)}
        </div>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'#1F2329', marginBottom:3, paddingLeft:4 }}><span style={{ color:'#3370FF', flexShrink:0 }}>•</span>{line.slice(2)}</div>;
      if (line.startsWith('```')) return <div key={i} style={{ fontFamily:'monospace', fontSize:11 }}></div>;
      if (line.match(/^\d+\./)) return <div key={i} style={{ fontSize:13, color:'#1F2329', marginBottom:4, paddingLeft:4 }}>{line}</div>;
      if (line.trim() === '') return <div key={i} style={{ height:6 }}></div>;
      // inline bold **text**
      const bold = line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      return <div key={i} style={{ fontSize:13, color:'#1F2329', lineHeight:1.8, marginBottom:2 }} dangerouslySetInnerHTML={{ __html: bold }}/>;
    });
  };

  return (
    <PageWrap>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, height:'calc(100vh - 120px)' }}>
        {/* Left: Input */}
        <Card style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:tool.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ic n={tool.icon} s={18} c={tool.color}/>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#1F2329' }}>{tool.title}</div>
              <div style={{ fontSize:11, color:'#8F959E' }}>{tool.desc.slice(0,40)}...</div>
            </div>
          </div>
          <Divider/>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#1F2329', display:'block', marginBottom:8 }}>输入你的需求</label>
            <textarea
              value={input} onChange={e => setInput(e.target.value)}
              style={{ width:'100%', height:'calc(100% - 30px)', border:'1px solid #E5E6E8', borderRadius:8, padding:'12px 14px', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.7, color:'#1F2329', boxSizing:'border-box' }}
              placeholder={tool.placeholder}
            />
          </div>
          <Btn full icon={loading ? <Spinner size={14} color="#fff"/> : <Ic n="sparkle" s={14} c="#fff"/>} onClick={stream} disabled={loading || !input.trim()}>
            {loading ? 'AI 生成中...' : '开始生成'}
          </Btn>
        </Card>

        {/* Right: Output */}
        <Card style={{ padding:20, display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: loading?'#FF7D00':done?'#00B42A':'#E5E6E8', animation: loading?'pulse 1s infinite':undefined }}></div>
              <span style={{ fontSize:13, fontWeight:600, color:'#1F2329' }}>{loading ? (charCount > 0 ? `AI 生成中... (${charCount}字)` : 'AI 生成中...') : done ? `生成完成 (${charCount}字)` : '等待输入'}</span>
            </div>
            {done && <Btn size="sm" variant="secondary" icon={<Ic n="download" s={12} c="#646A73"/>}>导出</Btn>}
          </div>
          <div style={{ flex:1, overflow:'auto', background:'#FAFBFC', borderRadius:8, padding:16, border:'1px solid #F0F1F3', lineHeight:1.8 }}>
            {output ? renderMd(output) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'#8F959E' }}>
                <Ic n="sparkle" s={32} c="#C9CDD4"/>
                <div style={{ fontSize:13 }}>AI 生成结果将显示在这里</div>
                <div style={{ fontSize:11 }}>在左侧输入需求，点击「开始生成」</div>
              </div>
            )}
            {loading && <span style={{ display:'inline-block', width:8, height:16, background:'#3370FF', animation:'blink .8s infinite', borderRadius:1, marginLeft:2, verticalAlign:'text-bottom' }}></span>}
          </div>
        </Card>
      </div>
    </PageWrap>
  );
};

// ── AI Tools grid ─────────────────────────────────────────
const AITools = () => {
  const [active, setActive] = React.useState(null);
  const { navigate } = React.useContext(AppContext);

  if (active) return (
    <div>
      <div style={{ padding:'12px 24px', background:'#fff', borderBottom:'1px solid #E5E6E8', display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={() => setActive(null)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#646A73', fontSize:13 }}>
          <Ic n="chevl" s={15} c="#646A73"/>返回工具箱
        </button>
      </div>
      <ToolInterface tool={active} onBack={() => setActive(null)}/>
    </div>
  );

  return (
    <PageWrap>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7C3AED,#3370FF)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Ic n="sparkle" s={18} c="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#1F2329' }}>AI 工具箱</div>
            <div style={{ fontSize:12, color:'#8F959E' }}>10 个 AI 辅助工具，基于 RAG 技术和往届项目库，支持实时流式生成</div>
          </div>
        </div>
      </div>

      {/* RAG info banner */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'linear-gradient(90deg,#EEF3FF,#F5F0FF)', border:'1px solid #E0D7FF', borderRadius:10, marginBottom:20 }}>
        <Ic n="layers" s={18} c="#7C3AED"/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:2 }}>知识库已接入 1,247 份往届项目</div>
          <div style={{ fontSize:12, color:'#646A73' }}>包含近 5 年全国各类竞赛获奖作品，AI 分析结果更有参考价值</div>
        </div>
        <div style={{ display:'flex', gap:12, flexShrink:0 }}>
          {[{ v:'1,247', l:'项目入库' }, { v:'89%', l:'检索准确率' }, { v:'28s', l:'平均响应' }].map(s => (
            <div key={s.l} style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#7C3AED' }}>{s.v}</div>
              <div style={{ fontSize:10, color:'#8F959E' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {TOOLS.map(tool => (
          <Card key={tool.id} hover onClick={() => setActive(tool)} style={{ padding:20, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:tool.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Ic n={tool.icon} s={22} c={tool.color}/>
              </div>
              <Ic n="chevr" s={14} c="#C9CDD4"/>
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:'#1F2329', marginBottom:6 }}>{tool.title}</div>
            <div style={{ fontSize:12, color:'#646A73', lineHeight:1.6 }}>{tool.desc}</div>
            <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end' }}>
              <span style={{ fontSize:12, fontWeight:500, color:tool.color }}>立即使用 →</span>
            </div>
          </Card>
        ))}
      </div>
    </PageWrap>
  );
};

Object.assign(window, { AITools });
