// Records: Teams, Awards, Evaluations — combined page

// ─────────────── TEAMS ───────────────────────────────────
const Teams = () => {
  const { role } = React.useContext(AppContext);
  const [selected, setSelected] = React.useState(null);
  const [teams, setTeams] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await teamsAPI.list();
        setTeams(res.teams || []);
      } catch (e) {
        console.error('Error fetching teams:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  if (selected) {
    const members = selected.members || [];
    return (
      <PageWrap>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
          <Card style={{ padding:20 }}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ width:64, height:64, borderRadius:16, background:'#EEF3FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                <Ic n="users" s={28} c="#3370FF"/>
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'#1F2329', marginBottom:4 }}>{selected.name}</div>
              <Badge label={selected.status === 'completed' ? '已完成' : '参赛中'} status={selected.status === 'completed' ? 'completed' : 'active'}/>
            </div>
            <Divider style={{ margin:'14px 0' }}/>
            {[
              { l:'参赛赛事', v: selected.competition?.title },
              { l:'指导教师', v: selected.competition?.organizer?.name || '-' },
              { l:'团队人数', v: `${members.length} 人` },
              { l:'队长',    v: selected.leader?.name },
              { l:'最终排名', v: '-' },
              { l:'得分',    v: '-' },
            ].map(item => (
              <div key={item.l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F7F8FA', fontSize:13 }}>
                <span style={{ color:'#8F959E' }}>{item.l}</span>
                <span style={{ color:'#1F2329', fontWeight:500 }}>{item.v}</span>
              </div>
            ))}
            <div style={{ marginTop:16, display:'flex', gap:8 }}>
              <Btn variant="secondary" full onClick={() => setSelected(null)}>返回</Btn>
              {role !== 'student' && <Btn full>发送消息</Btn>}
            </div>
          </Card>
          <Card style={{ padding:20 }}>
            <SHead title="团队成员" action={role === 'student' && <Btn size="sm" variant="secondary" icon={<Ic n="plus" s={12} c="#646A73"/>}>邀请成员</Btn>}/>
            {members.map(m => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #F7F8FA' }}>
                <Avatar name={m.user?.name || ''} size={40} idx={m.id}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'#1F2329' }}>{m.user?.name}</span>
                    {m.role === 'leader' && <span style={{ padding:'1px 6px', background:'#EEF3FF', color:'#3370FF', borderRadius:4, fontSize:11, fontWeight:600 }}>队长</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#8F959E', marginBottom:6 }}>{m.user?.role} · 加入于 {m.joined_at}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {(m.user?.skills || []).map(s => <Tag key={s} label={s}/>)}
                  </div>
                </div>
                {role !== 'student' && (
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn size="sm" variant="secondary" icon={<Ic n="eye" s={12} c="#646A73"/>}>查看</Btn>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <SHead title={role === 'student' ? '我的团队' : role === 'teacher' ? '指导团队' : '全部团队'} sub={`共 ${teams.length} 支团队`}/>
        {role === 'student' && !teams.find(t => t.myTeam) && (
          <Btn icon={<Ic n="plus" s={14} c="#fff"/>}>创建团队</Btn>
        )}
      </div>
      {teams.length === 0 ? (
        <Card style={{ padding:20 }}><Empty text="暂无团队" sub="参加赛事后在此查看你的团队信息"/></Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {teams.map(t => (
            <Card key={t.id} hover onClick={() => setSelected(t)} style={{ padding:20 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'#EEF3FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Ic n="users" s={20} c="#3370FF"/>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#1F2329' }}>{t.name}</div>
                    <div style={{ fontSize:12, color:'#8F959E' }}>队长：{t.leader?.name}</div>
                  </div>
                </div>
                <Badge label={t.status === 'completed' ? '已完成' : '参赛中'} status={t.status === 'completed' ? 'completed' : 'active'}/>
              </div>
              <Divider style={{ margin:'10px 0' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#646A73' }}>
                <span><Ic n="trophy" s={12} c="#8F959E" style={{ display:'inline', marginRight:4 }}/>{t.competition?.title}</span>
                <span>{t.members?.length || 0} 人</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrap>
  );
};

// ─────────────── AWARDS ──────────────────────────────────
const rankStyle = { '一等奖':{ c:'#D97706', bg:'#FFFBEB' }, '二等奖':{ c:'#6B7280', bg:'#F9FAFB' }, '三等奖':{ c:'#92400E', bg:'#FEF3C7' } };

const Awards = () => {
  const { role } = React.useContext(AppContext);
  const [awards, setAwards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await awardsAPI.list();
        setAwards(res.awards || []);
      } catch (e) {
        console.error('Error fetching awards:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const list = filter === 'all' ? awards : awards.filter(a => a.status === filter);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  return (
    <PageWrap>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', gap:4, background:'#fff', border:'1px solid #E5E6E8', borderRadius:8, padding:4 }}>
          {[['all','全部'],['teacher_confirm','待确认'],['settled','已结算']].map(([k,l]) => (
            <div key={k} onClick={() => setFilter(k)} style={{ padding:'5px 14px', borderRadius:6, fontSize:13, cursor:'pointer', fontWeight:filter===k?600:400, background:filter===k?'#3370FF':'transparent', color:filter===k?'#fff':'#646A73', transition:'all .15s' }}>{l}</div>
          ))}
        </div>
        {role === 'admin' && <Btn icon={<Ic n="plus" s={14} c="#fff"/>}>提名获奖</Btn>}
      </div>
      <Card style={{ padding:0, overflow:'hidden' }}>
        <Table
          cols={[
            { key:'rank_name', title:'奖项等级', render: v => {
              const s = rankStyle[v] || { c:'#646A73', bg:'#F7F8FA' };
              return <span style={{ fontWeight:700, color:s.c, background:s.bg, padding:'3px 10px', borderRadius:6, fontSize:13 }}>{v === '一等奖' ? '🥇' : v === '二等奖' ? '🥈' : '🥉'} {v}</span>;
            }},
            { key:'team',  title:'获奖团队', render: v => <span style={{ fontWeight:600 }}>{v?.name || '-'}</span> },
            { key:'team',  title:'队长', render: v => v?.leader?.name || '-' },
            { key:'competition', title:'赛事', render: v => <span style={{ color:'#646A73' }}>{v?.title || '-'}</span> },
            { key:'prize_amount',     title:'奖金', render: v => <span style={{ color:'#00B42A', fontWeight:700 }}>¥{v?.toLocaleString() || '0'}</span> },
            { key:'status',    title:'状态', render: v => <Badge label={v==='settled'?'已结算':v==='teacher_confirm'?'待教师确认':'处理中'} status={v}/> },
            { key:'id', title:'操作', render: (_, row) => (
              <div style={{ display:'flex', gap:6 }}>
                {row.status === 'teacher_confirm' && role === 'teacher' && (
                  <Btn size="sm" icon={<Ic n="check" s={12} c="#fff"/>}>确认</Btn>
                )}
                {row.status === 'teacher_confirm' && role === 'admin' && (
                  <Btn size="sm" variant="secondary">核定</Btn>
                )}
                {row.status === 'settled' && (
                  <Btn size="sm" variant="secondary" icon={<Ic n="eye" s={12} c="#646A73"/>}>查看</Btn>
                )}
              </div>
            )},
          ]}
          rows={list}
          emptyText="暂无获奖记录"
        />
      </Card>
    </PageWrap>
  );
};

// ─────────────── EVALUATIONS ─────────────────────────────
const Evaluations = () => {
  const { role } = React.useContext(AppContext);
  const [submitting, setSubmitting] = React.useState(null);
  const [ratings, setRatings] = React.useState({ teaching:0, communication:0, availability:0, overall:0 });
  const [feedback, setFeedback] = React.useState('');
  const [done, setDone] = React.useState(false);
  const [evaluations, setEvaluations] = React.useState([]);
  const [teacherStats, setTeacherStats] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [evalRes, statsRes] = await Promise.all([
          evaluationsAPI.list(),
          role !== 'student' ? statsAPI.teachers() : Promise.resolve({ teachers: [] }),
        ]);
        setEvaluations(evalRes.evaluations || []);
        setTeacherStats(statsRes.teachers || []);
      } catch (e) {
        console.error('Error fetching evaluations:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  const myPending = evaluations.filter(e => e.status === 'draft');
  const submitted = evaluations.filter(e => e.status === 'submitted');

  const handleSubmit = async (ev) => {
    setSubmitting('loading');
    try {
      await evaluationsAPI.create({
        teacher_id: ev.teacher_id || ev.teacher?.id,
        competition_id: ev.competition_id || ev.competition?.id,
        teaching: ratings.teaching,
        communication: ratings.communication,
        availability: ratings.availability,
        overall: ratings.overall,
        feedback,
      });
      setDone(true);
    } catch (e) {
      console.error('Error submitting evaluation:', e);
    } finally {
      setSubmitting(null);
    }
  };

  if (submitting === 'form') {
    const ev = myPending[0];
    return (
      <PageWrap>
        <Card style={{ padding:28, maxWidth:580, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <Avatar name={ev.teacher?.name || ''} size={56} idx={ev.teacher_id} style={{ margin:'0 auto 12px' }}/>
            <div style={{ fontSize:18, fontWeight:700, color:'#1F2329', marginBottom:4 }}>评价 {ev.teacher?.name} 老师</div>
            <div style={{ fontSize:13, color:'#8F959E' }}>{ev.competition?.title} · 指导评价</div>
          </div>
          <Divider style={{ margin:'16px 0' }}/>
          {[
            { k:'teaching',      l:'教学水平',   sub:'老师的专业知识和授课质量' },
            { k:'communication', l:'沟通能力',   sub:'沟通方式和响应及时性' },
            { k:'availability',  l:'指导时间',   sub:'指导时间安排和可用性' },
            { k:'overall',       l:'总体评价',   sub:'对老师整体满意程度' },
          ].map(d => (
            <div key={d.k} style={{ marginBottom:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#1F2329' }}>{d.l}</div>
                <div style={{ fontSize:12, color:'#8F959E' }}>{d.sub}</div>
              </div>
              <Stars value={ratings[d.k]} onChange={v => setRatings(p => ({...p,[d.k]:v}))} size={24}/>
            </div>
          ))}
          <div style={{ marginTop:16 }}>
            <label style={{ fontSize:13, fontWeight:500, color:'#1F2329', display:'block', marginBottom:8 }}>文字反馈（可选）</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} placeholder="分享你的真实感受，帮助老师了解自己的优势和改进空间..."
              style={{ width:'100%', border:'1px solid #E5E6E8', borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', lineHeight:1.6, boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <Btn variant="secondary" full onClick={() => setSubmitting(null)}>取消</Btn>
            <Btn full disabled={Object.values(ratings).some(v => v === 0)} onClick={() => handleSubmit(ev)}
              icon={submitting === 'loading' ? <Spinner size={13} color="#fff"/> : <Ic n="send" s={13} c="#fff"/>}>
              {submitting === 'loading' ? '提交中...' : '提交评价'}
            </Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {role === 'student' ? (
        <>
          <SHead title="教师评价" sub="对指导老师进行评价，帮助提升教学质量"/>
          {done && (
            <div style={{ display:'flex', gap:10, padding:'12px 16px', background:'#E8FFED', border:'1px solid #AFF4C6', borderRadius:8, marginBottom:16, fontSize:13, color:'#00B42A' }}>
              <Ic n="check" s={16} c="#00B42A"/>评价提交成功！感谢你的反馈。
            </div>
          )}
          {myPending.length > 0 && !done && (
            <Card style={{ padding:20, marginBottom:16, border:'1px solid #FFD591', background:'#FFFBE6' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#FFF7E8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Ic n="star" s={20} c="#FF7D00"/>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1F2329' }}>你有 {myPending.length} 条评价待提交</div>
                    <div style={{ fontSize:12, color:'#8F959E' }}>{myPending[0].teacher?.name} 老师 · {myPending[0].competition?.title}</div>
                  </div>
                </div>
                <Btn onClick={() => setSubmitting('form')} icon={<Ic n="star" s={13} c="#fff"/>}>立即评价</Btn>
              </div>
            </Card>
          )}
          <Card style={{ padding:20 }}>
            <SHead title="历史评价记录"/>
            {submitted.length === 0 ? (
              <Empty text="暂无评价记录"/>
            ) : submitted.map(ev => (
              <div key={ev.id} style={{ padding:'16px 0', borderBottom:'1px solid #F7F8FA' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <Avatar name={ev.teacher?.name || ''} size={36} idx={ev.teacher_id}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{ev.teacher?.name}</div>
                    <div style={{ fontSize:11, color:'#8F959E' }}>{ev.competition?.title} · {ev.submitted_at}</div>
                  </div>
                  <div style={{ marginLeft:'auto' }}><Stars value={ev.overall} size={14}/></div>
                </div>
                <div style={{ fontSize:13, color:'#646A73', lineHeight:1.6 }}>{ev.feedback}</div>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <>
          <SHead title={role === 'teacher' ? '我的评价汇总' : '教师评价管理'} sub="学生对教师的评价数据"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14, marginBottom:20 }}>
            {teacherStats.filter(t => role === 'teacher' ? true : true).map(t => (
              <Card key={t.id} style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <Avatar name={t.name} size={44} idx={t.id}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#1F2329' }}>{t.name}</div>
                    <div style={{ fontSize:12, color:'#8F959E' }}>教师</div>
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <div style={{ fontSize:22, fontWeight:800, color:'#FAAD14' }}>{t.avg_overall?.toFixed(1) || '-'}</div>
                    <div style={{ fontSize:10, color:'#8F959E' }}>综合评分</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <div style={{ flex:1, textAlign:'center', padding:'8px', background:'#F7F8FA', borderRadius:7 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#646A73' }}>{t.evaluation_count}</div>
                    <div style={{ fontSize:10, color:'#8F959E' }}>评价数</div>
                  </div>
                </div>
                <Stars value={Math.round(t.avg_overall || 0)} size={14}/>
              </Card>
            ))}
          </div>
          <Card style={{ padding:20 }}>
            <SHead title="最近评价"/>
            {submitted.map(ev => (
              <div key={ev.id} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid #F7F8FA' }}>
                <Avatar name={ev.student?.name || ''} size={36} idx={ev.student_id}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{ev.student?.name}</span>
                    <span style={{ fontSize:11, color:'#8F959E' }}>评价了 {ev.teacher?.name}</span>
                    <div style={{ marginLeft:'auto' }}><Stars value={ev.overall} size={13}/></div>
                  </div>
                  <div style={{ fontSize:12, color:'#646A73', lineHeight:1.6 }}>{ev.feedback}</div>
                  <div style={{ fontSize:11, color:'#8F959E', marginTop:4 }}>{ev.submitted_at}</div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </PageWrap>
  );
};

Object.assign(window, { Teams, Awards, Evaluations });
