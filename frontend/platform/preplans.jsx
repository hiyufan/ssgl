// Pre-plans — Submit form + Full AI review display

const planStatusMap = {
  submitted:    { label:'已提交',   status:'under_review' },
  under_review: { label:'审核中',   status:'under_review' },
  reviewed:     { label:'已审核',   status:'approved'     },
  approved:     { label:'已通过',   status:'approved'     },
  rejected:     { label:'已驳回',   status:'rejected'     },
  draft:        { label:'草稿',     status:'draft'        },
};

// ── Full AI Review Card ───────────────────────────────────
const AIReviewFull = ({ review }) => {
  const scoreColor = review.score >= 80 ? '#00B42A' : review.score >= 65 ? '#FF7D00' : '#F53F3F';
  const scoreLabel = review.score >= 80 ? '优秀' : review.score >= 65 ? '良好' : '待改进';
  const dims = [
    { k:'feasibility',  l:'可行性',   icon:'check'    },
    { k:'innovation',   l:'创新性',   icon:'sparkle'  },
    { k:'completeness', l:'完整性',   icon:'file'     },
    { k:'marketFit',    l:'市场适配', icon:'trend'    },
  ];
  return (
    <div style={{ border:'1px solid #E0D7FF', borderRadius:10, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Ic n="sparkle" s={16} c="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>AI 智能审核报告</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:1 }}>基于 RAG 技术和往届项目库分析生成</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>审核于 {review.reviewedAt}</div>
      </div>

      <div style={{ background:'#FEFCFF', padding:20 }}>
        {/* Score + dims */}
        <div style={{ display:'flex', gap:20, marginBottom:20 }}>
          {/* Big score */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 24px', background:'#fff', borderRadius:10, border:'1px solid #E5D8FF', flexShrink:0 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="38" fill="none" stroke="#EDE9FF" strokeWidth="8"/>
              <circle cx="48" cy="48" r="38" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={`${2*Math.PI*38}`}
                strokeDashoffset={`${2*Math.PI*38*(1-review.score/100)}`}
                strokeLinecap="round" transform="rotate(-90 48 48)"/>
              <text x="48" y="44" textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="800" fill={scoreColor}>{review.score}</text>
              <text x="48" y="63" textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#8F959E">/ 100</text>
            </svg>
            <div style={{ fontSize:13, fontWeight:700, color:scoreColor, marginTop:4 }}>{scoreLabel}</div>
            <div style={{ fontSize:11, color:'#8F959E', marginTop:2 }}>综合评分</div>
          </div>
          {/* Dimension bars */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:12 }}>各维度评分</div>
            {dims.map(d => (
              <div key={d.k} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#646A73' }}>
                    <Ic n={d.icon} s={13} c="#7C3AED"/>{d.l}
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#7C3AED' }}>{review.breakdown[d.k]}</span>
                </div>
                <ProgBar value={review.breakdown[d.k]} color="#7C3AED" h={7} label={false}/>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding:'14px 16px', background:'#fff', borderRadius:8, border:'1px solid #E5D8FF', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#7C3AED', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
            <Ic n="info" s={13} c="#7C3AED"/>AI 分析摘要
          </div>
          <div style={{ fontSize:13, color:'#1F2329', lineHeight:1.8 }}>{review.summary}</div>
        </div>

        {/* Suggestions */}
        <div style={{ marginBottom: review.similar.length > 0 ? 16 : 0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:10 }}>改进建议</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {review.suggestions.map((s,i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'12px 14px', background:'#fff', borderRadius:8, border:'1px solid #F0EBFF' }}>
                <Prio level={s.priority}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#7C3AED', marginBottom:3 }}>{s.category}</div>
                  <div style={{ fontSize:13, color:'#1F2329', lineHeight:1.6 }}>{s.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Similar projects */}
        {review.similar.length > 0 && (
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:10 }}>参考往届项目 (RAG 检索)</div>
            {review.similar.map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#fff', borderRadius:7, border:'1px solid #F0EBFF', marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, color:'#1F2329', fontWeight:500 }}>{s.title}</div>
                  <div style={{ fontSize:11, color:'#8F959E', marginTop:2 }}>{s.year}年参赛作品</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:56, height:5, background:'#EDE9FF', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ width:`${s.sim}%`, height:'100%', background:'#7C3AED', borderRadius:99 }}></div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#7C3AED' }}>相似度 {s.sim}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Pre-plan detail ───────────────────────────────────────
const PrePlanDetail = ({ plan, onBack }) => (
  <PageWrap>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {/* Left: plan content */}
      <div>
        <Card style={{ padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1F2329', marginBottom:4 }}>{plan.title}</div>
              <div style={{ fontSize:12, color:'#8F959E' }}>{plan.team?.name} · {plan.competition?.title}</div>
            </div>
            <Badge label={planStatusMap[plan.status]?.label || plan.status} status={plan.status}/>
          </div>
          {[
            { label:'技术栈',    value: plan.tech_stack       },
            { label:'目标受众',  value: plan.target_audience  },
            { label:'市场分析',  value: plan.market_analysis  },
            { label:'创新点',    value: plan.innovation       },
            { label:'预期成果',  value: plan.expected_outcome },
            { label:'时间规划',  value: plan.timeline         },
          ].map(f => (
            <div key={f.label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#8F959E', marginBottom:4 }}>{f.label}</div>
              <div style={{ fontSize:13, color:'#1F2329', lineHeight:1.7, padding:'10px 12px', background:'#F7F8FA', borderRadius:7 }}>{f.value}</div>
            </div>
          ))}
          <div style={{ fontSize:12, color:'#8F959E', marginTop:8 }}>提交时间：{plan.submitted_at}</div>
        </Card>
      </div>
      {/* Right: AI review */}
      <div>
        {plan.ai_review_score != null ? (
          <AIReviewFull review={{ score: plan.ai_review_score, reviewedAt: plan.submitted_at, breakdown: { feasibility: 0, innovation: 0, completeness: 0, marketFit: 0 }, summary: plan.ai_review_notes || '', suggestions: [], similar: [] }}/>
        ) : (
          <Card style={{ padding:40, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <Spinner size={28} color="#7C3AED"/>
            <div style={{ fontSize:13, color:'#8F959E' }}>AI 审核进行中...</div>
          </Card>
        )}
      </div>
    </div>
  </PageWrap>
);

// ── Pre-plan submit form ──────────────────────────────────
const PrePlanForm = ({ onClose }) => {
  const [form, setForm] = React.useState({ title:'', techStack:'', targetAudience:'', marketAnalysis:'', innovation:'', expectedOutcome:'', timeline:'' });
  const [submitting, setSubmitting] = React.useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]:v }));
  const fields = [
    { k:'title',           l:'项目名称',   ph:'例如：AI驱动的智慧校园服务平台',   rows:1 },
    { k:'techStack',       l:'技术栈',     ph:'前端、后端、数据库、AI框架等',      rows:2 },
    { k:'targetAudience',  l:'目标受众',   ph:'描述你的核心用户群体和使用场景',    rows:2 },
    { k:'marketAnalysis',  l:'市场分析',   ph:'市场规模、竞品分析、差异化优势...',  rows:3 },
    { k:'innovation',      l:'创新点',     ph:'项目的核心创新点和技术亮点',        rows:2 },
    { k:'expectedOutcome', l:'预期成果',   ph:'项目完成后的交付物和可量化指标',    rows:2 },
    { k:'timeline',        l:'时间规划',   ph:'各阶段的里程碑计划',               rows:2 },
  ];
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await prePlansAPI.create({
        title: form.title,
        tech_stack: form.techStack,
        target_audience: form.targetAudience,
        market_analysis: form.marketAnalysis,
        innovation: form.innovation,
        expected_outcome: form.expectedOutcome,
        timeline: form.timeline,
      });
      onClose();
    } catch (e) {
      console.error('Error creating pre-plan:', e);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal open={true} onClose={onClose} title="提交预计划" width={600}
      footer={<><Btn variant="secondary" onClick={onClose}>取消</Btn><Btn onClick={handleSubmit} disabled={submitting} icon={submitting ? <Spinner size={13} color="#fff"/> : <Ic n="send" s={13} c="#fff"/>}>{submitting ? '提交中...' : '提交预计划'}</Btn></>}
    >
      <div style={{ display:'flex', gap:8, padding:'10px 12px', background:'#EEF3FF', borderRadius:8, marginBottom:16, fontSize:12, color:'#3370FF' }}>
        <Ic n="sparkle" s={14} c="#3370FF"/>
        提交后将自动触发 AI 智能审核，生成评分和改进建议，同时进入人工审批流程。
      </div>
      {fields.map(f => (
        <div key={f.k} style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#1F2329', marginBottom:6 }}>{f.l}</label>
          {f.rows === 1 ? (
            <input value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.ph}
              style={{ width:'100%', padding:'8px 12px', border:'1px solid #E5E6E8', borderRadius:7, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
          ) : (
            <textarea value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.ph} rows={f.rows}
              style={{ width:'100%', padding:'8px 12px', border:'1px solid #E5E6E8', borderRadius:7, fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }}/>
          )}
        </div>
      ))}
    </Modal>
  );
};

// ── Pre-plans page ────────────────────────────────────────
const PrePlans = () => {
  const { role } = React.useContext(AppContext);
  const [selected, setSelected] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [plans, setPlans] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await prePlansAPI.list();
        setPlans(res.pre_plans || []);
      } catch (e) {
        console.error('Error fetching pre-plans:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  if (selected) return <PrePlanDetail plan={selected} onBack={() => setSelected(null)}/>;

  return (
    <PageWrap>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:600, color:'#1F2329' }}>预计划管理</div>
          <div style={{ fontSize:12, color:'#8F959E', marginTop:2 }}>管理赛事预计划，查看 AI 审核结果</div>
        </div>
        {role === 'student' && <Btn icon={<Ic n="plus" s={14} c="#fff"/>} onClick={() => setShowForm(true)}>提交预计划</Btn>}
      </div>

      {plans.length === 0 ? (
        <Card style={{ padding:20 }}><Empty text="暂无预计划" sub="点击「提交预计划」开始你的参赛之旅"/></Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {plans.map(p => (
            <Card key={p.id} hover onClick={() => setSelected(p)} style={{ padding:20 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ flex:1, paddingRight:10 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#1F2329', marginBottom:3, lineHeight:1.4 }}>{p.title}</div>
                  <div style={{ fontSize:12, color:'#8F959E' }}>{p.team?.name} · {p.competition?.title}</div>
                </div>
                <Badge label={planStatusMap[p.status]?.label || p.status} status={p.status}/>
              </div>
              <div style={{ fontSize:12, color:'#646A73', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.tech_stack}</div>
              {p.ai_review_score != null && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#F5F0FF', borderRadius:7 }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center' }}><Ic n="sparkle" s={11} c="#fff"/></div>
                  <span style={{ fontSize:12, color:'#7C3AED', fontWeight:500 }}>AI 评分</span>
                  <span style={{ fontSize:18, fontWeight:800, color:'#7C3AED', marginLeft:'auto' }}>{p.ai_review_score}</span>
                  <span style={{ fontSize:11, color:'#8F959E' }}>/ 100</span>
                </div>
              )}
              <div style={{ fontSize:11, color:'#8F959E', marginTop:10 }}>提交于 {p.submitted_at}</div>
            </Card>
          ))}
        </div>
      )}
      {showForm && <PrePlanForm onClose={() => setShowForm(false)}/>}
    </PageWrap>
  );
};

Object.assign(window, { PrePlans, AIReviewFull });
