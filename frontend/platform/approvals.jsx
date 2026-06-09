// Approvals — with AI review embedded for pre_plan type

const statusLabel = {
  pending:'待处理', teacher_pending:'待处理', admin_pending:'待处理',
  teacher_confirm:'待确认', approved:'已通过', rejected:'已驳回', waiting:'等待中',
};
const stepStatusIcon = {
  approved: { bg:'#E8FFED', c:'#00B42A', icon:'check' },
  rejected: { bg:'#FFECE8', c:'#F53F3F', icon:'x'    },
  pending:  { bg:'#FFF7E8', c:'#FF7D00', icon:'clock' },
  waiting:  { bg:'#F7F8FA', c:'#8F959E', icon:'clock' },
};

// ── AI Review card (embedded in approval) ─────────────────
const AIReviewEmbed = ({ reviewId }) => {
  const review = mockData.aiReviews[reviewId];
  if (!review) return null;
  const dim = [
    { k:'feasibility',  l:'可行性' },
    { k:'innovation',   l:'创新性' },
    { k:'completeness', l:'完整性' },
    { k:'marketFit',    l:'市场适配' },
  ];
  const scoreColor = review.score >= 80 ? '#00B42A' : review.score >= 65 ? '#FF7D00' : '#F53F3F';
  return (
    <div style={{ background:'linear-gradient(135deg,#F5F0FF 0%,#FAFBFF 100%)', border:'1px solid #E0D7FF', borderRadius:10, padding:16, marginTop:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
        <div style={{ width:22, height:22, borderRadius:6, background:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center' }}><Ic n="sparkle" s={12} c="#fff"/></div>
        <span style={{ fontSize:13, fontWeight:600, color:'#7C3AED' }}>AI 智能审核报告</span>
        <span style={{ marginLeft:'auto', fontSize:11, color:'#8F959E' }}>审核于 {review.reviewedAt}</span>
      </div>
      <div style={{ display:'flex', gap:16, marginBottom:14 }}>
        {/* Score circle */}
        <div style={{ flexShrink:0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" fill="none" stroke="#EDE9FF" strokeWidth="7"/>
            <circle cx="36" cy="36" r="28" fill="none" stroke={scoreColor} strokeWidth="7"
              strokeDasharray={`${2*Math.PI*28}`}
              strokeDashoffset={`${2*Math.PI*28*(1-review.score/100)}`}
              strokeLinecap="round" transform="rotate(-90 36 36)"/>
            <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill={scoreColor}>{review.score}</text>
          </svg>
          <div style={{ textAlign:'center', fontSize:10, color:'#8F959E', marginTop:2 }}>综合评分</div>
        </div>
        {/* Dimension bars */}
        <div style={{ flex:1 }}>
          {dim.map(d => (
            <div key={d.k} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
              <span style={{ fontSize:11, color:'#646A73', width:52, flexShrink:0 }}>{d.l}</span>
              <ProgBar value={review.breakdown[d.k]} color="#7C3AED" h={5} label={true}/>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize:12, color:'#646A73', lineHeight:1.7, background:'#fff', borderRadius:7, padding:'10px 12px', marginBottom:10 }}>{review.summary}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {review.suggestions.map((s,i) => (
          <div key={i} style={{ display:'flex', gap:8, fontSize:12 }}>
            <Prio level={s.priority}/>
            <span style={{ color:'#8F959E', fontWeight:500, flexShrink:0 }}>{s.category}</span>
            <span style={{ color:'#1F2329' }}>{s.content}</span>
          </div>
        ))}
      </div>
      {review.similar.length > 0 && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #E5D8FF' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#8F959E', marginBottom:6 }}>参考相似项目</div>
          {review.similar.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, padding:'4px 0' }}>
              <span style={{ color:'#646A73' }}>{s.title}</span>
              <span style={{ color:'#7C3AED', fontWeight:600, background:'#F5F0FF', padding:'1px 8px', borderRadius:10 }}>相似度 {s.sim}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Workflow timeline ─────────────────────────────────────
const WorkflowTimeline = ({ steps }) => (
  <div style={{ padding:'4px 0' }}>
    {steps.map((step, i) => {
      const sc = stepStatusIcon[step.status] || stepStatusIcon.waiting;
      return (
        <div key={i} style={{ display:'flex', gap:12, marginBottom: i < steps.length-1 ? 0 : 0 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:sc.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ic n={sc.icon} s={13} c={sc.c}/>
            </div>
            {i < steps.length - 1 && <div style={{ width:1, flex:1, background:'#E5E6E8', minHeight:20 }}></div>}
          </div>
          <div style={{ flex:1, paddingBottom: i < steps.length-1 ? 16 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:step.comment ? 4 : 0 }}>
              <div>
                <span style={{ fontSize:13, fontWeight:500, color:'#1F2329' }}>{step.label}</span>
                <span style={{ fontSize:12, color:'#8F959E', marginLeft:8 }}>{step.approver}</span>
              </div>
              <span style={{ fontSize:11, color:'#8F959E' }}>
                {step.actedAt || (step.status === 'pending' ? '处理中…' : step.status === 'waiting' ? '等待上一步完成' : '')}
              </span>
            </div>
            {step.comment && (
              <div style={{ fontSize:12, color:'#646A73', background:'#F7F8FA', padding:'8px 10px', borderRadius:6, lineHeight:1.6, marginTop:4 }}>{step.comment}</div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

// ── Approval detail modal ─────────────────────────────────
const ApprovalModal = ({ approval, role, onClose, onAction }) => {
  const [comment, setComment] = React.useState('');
  const [acting, setActing] = React.useState(false);
  const canAct = (role === 'admin' && ['pending','admin_pending'].includes(approval.status)) ||
                 (role === 'teacher' && ['teacher_pending','teacher_confirm'].includes(approval.status));

  const typeNameMap = { registration:'报名审批', pre_plan:'预备方案审批', reward:'奖励审批' };

  const handle = async (action) => {
    setActing(action);
    try {
      await onAction(approval.id, action, comment);
      onClose();
    } catch (e) {
      // Error toast is already shown by onAction
    } finally {
      setActing(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`审批详情 · ${typeNameMap[approval.type] || approval.type}`} width={640}
      footer={canAct ? (
        <>
          <Btn variant="secondary" onClick={onClose} disabled={!!acting}>取消</Btn>
          <Btn variant="danger" disabled={!!acting} onClick={() => handle('reject')}
            icon={acting==='reject' ? <Spinner size={13} color="#fff"/> : <Ic n="x" s={13} c="#fff"/>}>
            {acting==='reject' ? '处理中...' : '驳回'}
          </Btn>
          <Btn disabled={!!acting} onClick={() => handle('approve')}
            icon={acting==='approve' ? <Spinner size={13} color="#fff"/> : <Ic n="check" s={13} c="#fff"/>}>
            {acting==='approve' ? '处理中...' : '通过'}
          </Btn>
        </>
      ) : <Btn variant="secondary" onClick={onClose}>关闭</Btn>}
    >
      {/* Subject */}
      <div style={{ padding:'12px 14px', background:'#F7F8FA', borderRadius:8, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#1F2329', marginBottom:6 }}>{approval.subject}</div>
        <div style={{ display:'flex', gap:16, fontSize:12, color:'#8F959E' }}>
          <span>提交人：{typeof approval.submitter === 'object' ? approval.submitter?.name : approval.submitter}</span>
          <span>赛事：{approval.compName}</span>
          <span>提交时间：{approval.createdAt}</span>
        </div>
      </div>

      {/* Details for registration */}
      {approval.type === 'registration' && approval.details && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:8 }}>申请信息</div>
          <div style={{ fontSize:13, color:'#646A73', lineHeight:1.7 }}>
            <div><span style={{ color:'#8F959E' }}>团队名称：</span>{approval.teamName}</div>
            {approval.details.teamSize && <div><span style={{ color:'#8F959E' }}>团队人数：</span>{approval.details.teamSize} 人</div>}
            {approval.details.motivation && <div style={{ marginTop:8 }}><span style={{ color:'#8F959E' }}>报名动机：</span>{approval.details.motivation}</div>}
          </div>
        </div>
      )}

      {/* Reward details */}
      {approval.type === 'reward' && approval.details && (
        <div style={{ marginBottom:16, padding:'12px 14px', background:'#FFF7E8', borderRadius:8, border:'1px solid #FFD591' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#FF7D00', marginBottom:6 }}>获奖详情</div>
          <div style={{ fontSize:13, color:'#646A73' }}>
            <span style={{ marginRight:16 }}>获奖队伍数：{approval.details.awardCount} 支</span>
            <span>总奖金：{approval.details.totalPrize}</span>
          </div>
        </div>
      )}

      {/* AI Review for pre_plan */}
      {approval.type === 'pre_plan' && approval.aiReviewId && (
        <AIReviewEmbed reviewId={approval.aiReviewId}/>
      )}

      {/* Workflow steps */}
      <div style={{ marginTop:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:10 }}>审批进度</div>
        <WorkflowTimeline steps={approval.steps}/>
      </div>

      {/* Comment input */}
      {canAct && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#1F2329', marginBottom:8 }}>审批意见（可选）</div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="填写审批意见..."
            rows={3}
            style={{ width:'100%', border:'1px solid #E5E6E8', borderRadius:7, padding:'10px 12px', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', color:'#1F2329', lineHeight:1.6, boxSizing:'border-box' }}
          />
        </div>
      )}
    </Modal>
  );
};

// ── Approvals page ────────────────────────────────────────
const Approvals = () => {
  const { role } = React.useContext(AppContext);
  const { add: addToast } = useToast();
  const [tab, setTab] = React.useState('pending');
  const [selected, setSelected] = React.useState(null);
  const [approvals, setApprovals] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await workflowsAPI.list({ tab });
      setApprovals(data.approvals || []);
    } catch (e) {
      console.error('Failed to fetch approvals:', e);
      addToast('加载审批列表失败: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchApprovals(); }, [tab]);

  const typeNameMap = { registration:'报名审批', pre_plan:'预备方案审批', reward:'奖励审批' };

  const pendingStatuses = ['pending','teacher_pending','admin_pending','teacher_confirm'];
  const pending = approvals.filter(a => {
    if (role === 'admin')   return ['pending','admin_pending','teacher_confirm'].includes(a.status);
    if (role === 'teacher') return ['teacher_pending','teacher_confirm'].includes(a.status);
    return pendingStatuses.includes(a.status);
  });
  const done = approvals.filter(a => ['approved','rejected'].includes(a.status));
  const list = tab === 'pending' ? pending : done;

  const handleAction = async (id, action, comment) => {
    try {
      if (action === 'approve') {
        await workflowsAPI.approve(id, comment);
      } else {
        await workflowsAPI.reject(id, comment);
      }
      // Refresh list
      const data = await workflowsAPI.list({ tab });
      setApprovals(data.approvals || []);
      addToast(action === 'approve' ? '审批已通过' : '审批已驳回', action === 'approve' ? 'success' : 'error');
    } catch (e) {
      console.error('Failed to process approval:', e);
      addToast('操作失败: ' + e.message, 'error');
    }
  };

  const typeIcon = { registration:'checksq', pre_plan:'file', reward:'gift' };
  const typeIconColor = { registration:'#3370FF', pre_plan:'#7C3AED', reward:'#FF7D00' };
  const typeIconBg   = { registration:'#EEF3FF', pre_plan:'#F5F0FF', reward:'#FFF7E8' };

  return (
    <PageWrap>
      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, background:'#fff', border:'1px solid #E5E6E8', borderRadius:8, padding:4, marginBottom:16, width:'fit-content' }}>
        {[['pending',`待处理 (${pending.length})`],['done',`已处理 (${done.length})`]].map(([k,l]) => (
          <div key={k} onClick={() => setTab(k)} style={{ padding:'6px 18px', borderRadius:6, fontSize:13, cursor:'pointer', fontWeight: tab===k ? 600 : 400, background: tab===k ? '#3370FF':'transparent', color: tab===k ? '#fff':'#646A73', transition:'all .15s' }}>{l}</div>
        ))}
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:60 }}>
            <Spinner size={20} color="#3370FF"/>
            <span style={{ marginLeft:10, fontSize:13, color:'#8F959E' }}>加载中...</span>
          </div>
        ) : list.length === 0 ? (
          <Empty text={tab === 'pending' ? '暂无待处理审批' : '暂无已处理记录'} sub={tab === 'pending' ? '所有审批请求都已处理完毕 🎉' : ''}/>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7F8FA' }}>
                {['类型','申请内容','提交人 / 赛事','提交时间','当前进度','状态','操作'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'#8F959E', borderBottom:'1px solid #E5E6E8', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < list.length-1 ? '1px solid #F7F8FA':'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ width:32, height:32, borderRadius:8, background: typeIconBg[a.type] || '#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Ic n={typeIcon[a.type] || 'file'} s={15} c={typeIconColor[a.type] || '#646A73'}/>
                    </div>
                  </td>
                  <td style={{ padding:'14px 16px', maxWidth:260 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1F2329', marginBottom:2 }}>{a.subject || (a.teamName ? `${a.teamName}` : a.type)}</div>
                    <div style={{ fontSize:12, color:'#8F959E' }}>{typeNameMap[a.type] || a.type}</div>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontSize:13, color:'#1F2329' }}>{typeof a.submitter === 'object' ? a.submitter?.name : a.submitter}</div>
                    <div style={{ fontSize:12, color:'#8F959E' }}>{a.compName || a.competitionName || ''}</div>
                  </td>
                  <td style={{ padding:'14px 16px', fontSize:12, color:'#646A73', whiteSpace:'nowrap' }}>{a.createdAt}</td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {a.steps.map((s,si) => (
                        <div key={si} style={{ width:20, height:6, borderRadius:3, background: s.status==='approved'?'#00B42A':s.status==='rejected'?'#F53F3F':s.status==='pending'?'#FF7D00':'#E5E6E8' }} title={`步骤${si+1}: ${s.status}`}></div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:'#8F959E', marginTop:3 }}>步骤 {a.currentStep}/{a.totalSteps}</div>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <Badge label={a.status==='approved'?'已通过':a.status==='rejected'?'已驳回':'待处理'} status={a.status==='approved'?'approved':a.status==='rejected'?'rejected':'pending'}/>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <Btn size="sm" variant="ghost" onClick={() => setSelected(a)} icon={<Ic n="eye" s={12} c="#3370FF"/>}>查看</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selected && (
        <ApprovalModal
          approval={selected}
          role={role}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </PageWrap>
  );
};

Object.assign(window, { Approvals, AIReviewEmbed, WorkflowTimeline });
