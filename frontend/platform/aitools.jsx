// AI Tools — 6 tools with simulated streaming response

const TOOLS = [
  { id:'biz',        icon:'zap',     color:'#3370FF', bg:'#EEF3FF',
    title:'商业计划书助手',    desc:'基于项目信息和往届优秀案例，AI 辅助生成结构化商业计划书框架，支持分章节生成和编辑。',
    placeholder:'请描述你的项目：项目名称、核心功能、目标市场、团队背景...',
    sample:'请帮我生成一份关于「AI驱动智慧校园服务平台」的商业计划书框架，目标市场是国内高校，核心功能包括智能问答、课程推荐和场地预订。',
    response:`# 商业计划书 · AI驱动智慧校园服务平台

## 执行摘要
本项目旨在构建一个基于大语言模型和RAG技术的校园一体化智能服务平台，解决高校信息孤岛问题，为师生提供统一的智能入口。

## 市场机会
- **市场规模**：2026年智慧校园市场预计超 **1,000亿元**，年增速 18%
- **痛点**：各系统割裂，信息获取效率低，人工服务成本高
- **机遇**：大模型技术成熟，AI应用落地成本大幅下降

## 产品方案
| 功能模块 | 描述 | 优先级 |
|---------|------|--------|
| 智能问答 | 基于校园知识库的精准问答 | P0 |
| 课程推荐 | 个性化选课智能建议 | P0 |
| 场地预订 | 自然语言预订校内场地 | P1 |

## 商业模式
采用 **SaaS订阅 + 增值服务** 双轨模式：
- 基础版：免费，覆盖核心场景
- 高校版：¥8万/年，全功能 + 私有化部署
- 企业版：¥20万+，定制化 + API接入

## 竞争优势
✅ 校园专属知识库，准确率显著高于通用助手
✅ 多系统对接能力，数据打通形成护城河
✅ 本地化部署，满足高校数据安全合规要求` },

  { id:'market',     icon:'trend',   color:'#00B42A', bg:'#E8FFED',
    title:'市场分析报告',     desc:'基于行业和目标市场，AI 实时生成市场分析报告，包含市场规模、竞品分析和用户画像。',
    placeholder:'请输入：行业类型、目标市场范围、目标用户群体、产品核心功能...',
    sample:'请分析智慧校园SaaS市场，目标客户为国内双一流高校，产品为AI校园服务平台。',
    response:`# 智慧校园 SaaS 市场分析报告

## 市场规模
据IDC数据，2025年中国智慧校园市场规模达 **870亿元**，预计2026年突破 **1,050亿元**，CAGR约18.5%。

## 目标市场细分
\`\`\`
双一流高校 (约 147所)  →  决策链短，预算充足，标杆价值高
普通本科院校 (约 1,200所) → 数量大，价格敏感，需轻量方案
高职院校 (约 1,600所)  →  功能需求简单，价格优先
\`\`\`

## 主要竞品分析
| 竞品 | 优势 | 劣势 | 市场份额 |
|------|------|------|----------|
| 华为智慧校园 | 硬件生态完整 | AI能力弱 | ~22% |
| 新华三 | 网络基础好 | 缺软件生态 | ~15% |
| 科大讯飞 | AI技术强 | 产品碎片化 | ~12% |

## 目标用户画像
**核心决策者**：高校信息化主任，40-55岁，关注稳定性和合规性
**核心使用者**：在校学生，18-25岁，偏好移动端和自然语言交互

## 差异化机会
🎯 现有方案均缺乏真正的大模型原生能力，是本项目的核心切入点` },

  { id:'improve',    icon:'activity', color:'#FF7D00', bg:'#FFF7E8',
    title:'项目改进建议',     desc:'基于往届获奖项目库，AI 对比分析当前项目与优秀案例的差距，生成优先级排序的改进建议。',
    placeholder:'请描述当前项目的核心功能、技术方案、进展状态和主要挑战...',
    sample:'我的项目是「碳中和校园能源管理系统」，目前完成了IoT数据采集和能耗预测模型，但评委反馈商业化路径不清晰，请给出改进建议。',
    response:`# 项目改进建议 · 碳中和校园能源管理系统

## 对比分析结果
已检索到 **3个** 相似度超60%的往届获奖项目，综合分析如下：

## 高优先级改进 🔴
**1. 商业模式具体化**
参考2024年一等奖「绿色智慧能源平台」的成功经验：
- 提供「数据服务订阅」+「节能效果分成」双模式
- 预计签约3所高校即可回本，ROI论证需量化
- 建议加入「政府补贴申请辅助」功能，提升客户价值

**2. 落地验证数据**
当前方案缺少实测数据，建议：
- 联系学校后勤处，争取在1栋楼进行POC
- 哪怕是模拟数据，也要展示节能15%的可行性路径

## 中优先级改进 🟡
**3. 碳交易模块**
结合CCER市场，校园减排量可核算为碳信用出售，这是差异化的商业亮点。

**4. 监管合规说明**
能源数据涉及国家基础设施安全，需补充数据安全合规方案。` },

  { id:'tech',       icon:'cpu',     color:'#7C3AED', bg:'#F5F0FF',
    title:'技术路线建议',     desc:'基于项目需求，AI 推荐技术栈选型和系统架构方案，并提供风险评估和学习路线。',
    placeholder:'请描述：项目功能需求、性能指标、团队技术背景、时间约束...',
    sample:'我需要开发一个支持5000日活的校园AI问答平台，团队有3人，2人会Python，1人会前端React，时间8周。',
    response:`# 技术路线建议 · 校园AI问答平台

## 推荐架构
\`\`\`
前端: React + Tailwind CSS (已有技能，无需切换)
后端: FastAPI (Python) + 异步处理
AI:   OpenAI API / Claude API + LangChain
RAG:  pgvector (PostgreSQL扩展，无需独立维护向量库)
缓存: Redis (问答结果缓存，降低API调用成本)
部署: Docker Compose → 单机可支撑5000 DAU
\`\`\`

## 为什么选这套？
| 选项 | 理由 |
|------|------|
| FastAPI 而非 Django | 异步原生，AI调用延迟更低，代码量少40% |
| pgvector 而非 Pinecone | 0成本，与业务数据同库，运维简单 |
| 不用微服务 | 8周时间，单体架构更快，后期可拆分 |

## 8周开发计划
- **Week 1-2**：项目骨架 + 用户系统 + 知识库管理
- **Week 3-5**：RAG问答核心 + 流式输出
- **Week 6-7**：性能优化 + 缓存策略
- **Week 8**：测试 + 部署 + Demo准备

## 风险提示
⚠️ **API成本**：建议接入 Claude Haiku（成本低10倍），非核心场景用缓存` },

  { id:'resource',   icon:'users',   color:'#0891B2', bg:'#E0F7FA',
    title:'跨学科资源整合',   desc:'基于团队技能和项目需求，AI 分析技能缺口，推荐跨学科协作资源和团队分工方案。',
    placeholder:'请描述：团队成员技能、专业背景、项目需求、当前遇到的瓶颈...',
    sample:'我们团队3人都是CS专业，做碳中和能源项目，但缺乏能源工程和商业分析背景，如何补充？',
    response:`# 跨学科资源整合方案

## 当前技能画像
✅ 强项：软件开发、算法、系统架构
❌ 缺口：能源工程知识、商业分析、用户研究

## 资源补充建议

### 🎯 立即行动（本周）
**寻找能源工程系学生合作**
- 渠道：竞赛报名系统「资源整合」功能（本平台）
- 需求：1名能源工程/电气专业同学，兼职顾问角色
- 提供：项目参赛机会 + 署名 + 分享奖金

**联系指导老师推荐**
- 请王老师推荐环境工程或管理学院的联合指导

### 📚 快速补充知识（1周内可完成）
| 知识点 | 资源 | 时间 |
|--------|------|------|
| 能源管理基础 | B站「电力系统入门」 | 3小时 |
| 碳排放核算 | ISO 14064标准摘要 | 2小时 |
| 商业计划撰写 | Y Combinator模板 | 1小时 |

### 分工优化建议
- **张明（你）**：架构 + AI模型
- **李云**：数据分析 + 可视化 + 商业计划
- **赵晓**：IoT硬件对接 + 能源知识学习（重点）` },

  { id:'advisor',    icon:'sparkle', color:'#E11D48', bg:'#FFF1F2',
    title:'AI 赛事顾问',      desc:'综合分析你的项目状态、团队情况和比赛要求，给出可执行的下一步行动建议。',
    placeholder:'请描述：当前项目进度、遇到的挑战、距离比赛截止的时间...',
    sample:'距离华为ICT大赛提交还有6周，我们的智慧校园平台完成了60%，核心功能可跑通，但Demo还没做，商业计划书还没写，请给出优先级建议。',
    response:`# 赛事顾问建议 · 华为ICT大赛冲刺方案

## 当前状态评估
⏰ **剩余时间**：6周（约42天）
✅ **核心优势**：技术核心功能可跑通，这是最关键的！
⚠️ **主要风险**：Demo和商业计划是评分重点，目前均为0%

## 6周冲刺优先级

### 🔴 Week 1-2：Demo优先，技术次之
**停止新功能开发！先做Demo脚本**
- 设计5分钟完整演示流程（评委注意力只有这么多）
- 准备预设问题库，让AI回答100%准确
- 打磨UI：字体大一点，动画丝滑一点

### 🟡 Week 3-4：商业计划书（利用AI工具箱！）
- 使用本平台「商业计划书助手」生成初稿（30分钟）
- 重点打磨：市场规模数据 + 竞品对比 + 盈利模型
- 找一位商科同学Review，换取AI技术指导

### 🟢 Week 5：答辩准备
- 准备20页PPT，遵循「问题-方案-证明-规模」结构
- 预计评委会问：数据安全？收费模式？技术护城河？

### Week 6：冲刺与备份
- **系统录屏备份**：网络不稳定时播放录屏
- **本地部署**：不依赖任何外部API

## 一句话总结
> 你们现在需要的不是更好的代码，而是更好的故事。技术已经够用了，现在是讲故事的时间。 💪` },

  { id:'pitchdeck', icon:'send',     color:'#0891B2', bg:'#E0F7FA',
    title:'路演 PPT 生成',     desc:'基于项目信息，AI 生成结构化的路演 PPT 大纲和内容框架，助力答辩展示。',
    placeholder:'请描述项目的核心亮点、技术方案、商业模式、团队优势...',
    sample:'请为我的「AI驱动智慧校园服务平台」生成路演PPT框架，核心亮点是RAG知识库技术，目标是华为ICT大赛答辩。',
    response:`# 路演 PPT 框架 · AI驱动智慧校园服务平台

## Slide 1: 封面
- 项目名称：AI驱动智慧校园服务平台
- 团队：量子跃迁
- 赛事：华为ICT创新大赛 2026

## Slide 2: 痛点与机遇
- 高校信息孤岛问题严重，70%学生需要跨3个以上系统获取信息
- 智慧校园市场2026年预计超1000亿元
- 大模型技术成熟，AI应用落地成本大幅下降

## Slide 3: 解决方案
- 基于RAG技术的校园知识库，精准问答准确率92%+
- 5大核心场景：智能问答、课程推荐、场地预订、失物招领、校园通知
- 支持多系统对接，打通教务、图书馆、后勤数据

## Slide 4: 技术架构
- 前端：React + TypeScript
- 后端：Go (Gin) + Python (FastAPI)
- AI：RAG + pgvector + 大模型API
- 部署：Docker Compose，单机可支撑5000 DAU

## Slide 5: 核心优势
- ✅ 校园专属知识库，准确率显著高于通用助手
- ✅ 多系统对接能力，数据打通形成护城河
- ✅ 本地化部署，满足数据安全合规要求

## Slide 6: 商业模式
- SaaS订阅 + 增值服务双轨模式
- 基础版免费，高校版¥8万/年
- 预计签约3所高校即可回本

## Slide 7: 团队介绍
- 张明（队长）：全栈开发 + AI模型
- 李云：数据分析 + 可视化
- 赵晓：NLP + 知识图谱
- 陈宇：后端架构 + 数据库

## Slide 8: 未来规划
- Q3：完成3所高校POC验证
- Q4：产品化发布，拓展10所合作院校
- 2027：覆盖100所高校，实现盈利` },

  { id:'swot',       icon:'activity', color:'#7C3AED', bg:'#F5F0FF',
    title:'SWOT 分析',         desc:'AI 基于项目信息生成 SWOT 分析（优势、劣势、机会、威胁），辅助项目决策。',
    placeholder:'请描述你的项目、团队、市场环境、竞争对手...',
    sample:'请对我的「AI驱动智慧校园服务平台」做SWOT分析，团队3人CS专业，目标是高校市场，竞争对手是华为智慧校园和科大讯飞。',
    response:`# SWOT 分析 · AI驱动智慧校园服务平台

## 💪 Strengths（优势）
- 技术团队核心能力强，3人均为CS专业，AI/全栈技能覆盖完整
- RAG技术方案成熟，校园知识库准确率92%+
- 已有可运行原型，核心功能跑通
- 本地化部署方案，满足高校数据安全要求

## ⚠️ Weaknesses（劣势）
- 团队缺乏商业运营经验，商业模式需验证
- 无实际客户案例，缺少落地数据支撑
- 8周时间紧张，Demo和商业计划尚需打磨
- 团队规模小，抗风险能力有限

## 🚀 Opportunities（机会）
- 智慧校园市场年增速18%，2026年超1000亿元
- 大模型技术成熟，AI应用落地成本大幅下降
- 高校数字化转型政策支持，政府采购预算充足
- 竞品AI能力弱，差异化切入点明确

## 🔴 Threats（威胁）
- 华为、科大讯飞等大厂资源雄厚，可能快速跟进
- 高校采购决策链长，销售周期可能超预期
- 数据安全法规趋严，合规成本可能上升
- AI技术迭代快，技术护城河可能被快速复制

## 战略建议
1. **SO策略**：利用技术优势快速占领市场，重点突破2-3所标杆高校
2. **WO策略**：寻找商业合伙人或顾问，补齐运营短板
3. **ST策略**：深耕垂直场景，建立数据壁垒，避免与大厂正面竞争
4. **WT策略**：控制成本，保持精益，确保现金流安全` },

  { id:'report',     icon:'barchart', color:'#FF7D00', bg:'#FFF7E8',
    title:'赛事分析报告',     desc:'AI 分析指定赛事的参赛情况、获奖趋势、团队表现，生成综合分析报告。',
    placeholder:'请输入赛事名称或描述需要分析的赛事...',
    sample:'请分析2026年华为ICT创新大赛的参赛趋势、获奖分布和团队表现。',
    response:`# 赛事分析报告 · 2026华为ICT创新大赛

## 赛事概况
- 参赛团队：12支
- 参赛学生：48人
- 赛事状态：进行中
- 报名截止：2026-06-30

## 团队分析
| 团队 | 成员数 | 方向 | 预计划评分 |
|------|--------|------|-----------|
| 量子跃迁 | 4人 | AI+云计算 | 78分 |
| 创新引擎 | 4人 | AR/VR | 62分 |

## 获奖趋势分析
- 往届一等奖项目特点：技术深度+商业落地+完整Demo
- 评委关注重点：创新性(30%)、可行性(25%)、市场潜力(20%)、团队能力(15%)、展示效果(10%)
- 建议关注：华为云技术栈使用可获额外加分

## AI 建议
1. 技术方案需突出华为云服务使用
2. 商业计划应包含具体客户案例或POC数据
3. 准备5分钟精炼Demo，突出核心价值` },
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
};

// ── Tool interface (with real API) ────────────────────────
const ToolInterface = ({ tool, onBack }) => {
  const [input, setInput] = React.useState(tool.sample || '');
  const [output, setOutput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const outputRef = React.useRef(null);

  const stream = async () => {
    setLoading(true);
    setDone(false);
    setOutput('');
    try {
      const apiFn = toolApiMap[tool.id];
      if (apiFn) {
        const res = await apiFn(input);
        setOutput(res.result || res.content || JSON.stringify(res));
      } else {
        // Fallback to sample response if no API mapping
        setOutput(tool.response);
      }
    } catch (e) {
      console.error('AI tool error:', e);
      setOutput('生成失败，请稍后重试。错误信息：' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
      setDone(true);
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

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
              <span style={{ fontSize:13, fontWeight:600, color:'#1F2329' }}>{loading ? 'AI 生成中...' : done ? '生成完成' : '等待输入'}</span>
            </div>
            {done && <Btn size="sm" variant="secondary" icon={<Ic n="download" s={12} c="#646A73"/>}>导出</Btn>}
          </div>
          <div ref={outputRef} style={{ flex:1, overflow:'auto', background:'#FAFBFC', borderRadius:8, padding:16, border:'1px solid #F0F1F3', lineHeight:1.8 }}>
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
            <div style={{ fontSize:12, color:'#8F959E' }}>9 个 AI 辅助工具，基于 RAG 技术和往届项目库，助力你赢得比赛</div>
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
