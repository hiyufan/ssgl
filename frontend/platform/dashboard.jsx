// Dashboard v3 — Admin/Teacher keep previous design; Student gets full visual redesign
const useAuth = window.useAuth;

// ── Count-up hook ─────────────────────────────────────────
const useCountUp = (target, duration=800) => {
  const str = String(target);
  const isNum = /^\d+\.?\d*$/.test(str);
  const num = isNum ? parseFloat(str) : NaN;
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (!isNum) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(num % 1 === 0 ? Math.round(eased * num) : parseFloat((eased * num).toFixed(1)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return isNum ? val : target;
};

// ── Stat card (admin/teacher) ────────────────────────────
const StatCard = ({ icon, label, value, sub, trend, accent='#3370FF', onClick }) => {
  const displayed = useCountUp(value);
  const [hov, setHov] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'#fff', border:`1px solid ${hov?'#C0C4CC':'#E5E6E8'}`, borderRadius:10,
        padding:'18px 20px 16px', borderTop:`3px solid ${hov?accent:accent+'99'}`,
        cursor:onClick?'pointer':'default', transition:'all .18s', boxShadow:hov?'0 4px 14px rgba(0,0,0,.07)':'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:12, color:'#8F959E', fontWeight:500 }}>{label}</span>
        {icon && <div style={{ opacity:.4 }}><Ic n={icon} s={13} c="#8F959E"/></div>}
      </div>
      <div style={{ fontSize:28, fontWeight:800, color:'#1F2329', lineHeight:1, marginBottom:6, fontVariantNumeric:'tabular-nums' }}>{displayed}</div>
      {sub && <div style={{ fontSize:12, color:'#8F959E', marginBottom:4 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize:11, color:trend>=0?'#00B42A':'#F53F3F', display:'inline-flex', alignItems:'center', gap:3, background:trend>=0?'#E8FFED':'#FFECE8', padding:'2px 7px', borderRadius:99, fontWeight:600 }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% 较上月
        </div>
      )}
    </div>
  );
};

const ActivityRow = ({ iconColor='#646A73', title, sub, time, action }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #F7F8FA' }}>
    <div style={{ width:6, height:6, borderRadius:'50%', background:iconColor, flexShrink:0, marginTop:1 }}></div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:13, color:'#1F2329', fontWeight:500, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:'#8F959E' }}>{sub}</div>}
    </div>
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
      {time && <span style={{ fontSize:11, color:'#C9CDD4' }}>{time}</span>}
      {action}
    </div>
  </div>
);

// ── Admin Dashboard ───────────────────────────────────────
const DashAdmin = ({ navigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState(null);
  const [competitions, setCompetitions] = React.useState([]);
  const [pending, setPending] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, compRes, wfRes] = await Promise.all([
          statsAPI.overview(),
          competitionsAPI.list(),
          workflowsAPI.list({ tab: 'pending' }),
        ]);
        setStats(statsRes);
        setCompetitions(compRes.competitions || []);
        setPending(wfRes.workflows || []);
      } catch (e) {
        console.error('DashAdmin fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
  const statusNameMap = { draft:'草稿', published:'报名中', ongoing:'进行中', completed:'已完成', cancelled:'已取消' };
  const typeColor = { registration:'#3370FF', pre_plan:'#7C3AED', reward:'#FF7D00', default:'#8F959E' };
  const getStatusColor = (s) => s==='ongoing'?'#3370FF':s==='published'?'#00B42A':s==='completed'?'#7C3AED':'#C9CDD4';

  return (
    <PageWrap>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:22, fontWeight:700, color:'#1F2329', marginBottom:4, letterSpacing:'-0.3px' }}>你好，{user?.name || '管理员'} 👋</div>
        <div style={{ fontSize:13, color:'#8F959E' }}>今天是 {dateStr} — 共有 <span style={{ color:'#FF7D00', fontWeight:600 }}>{pending.length} 个</span>审批待处理</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        <StatCard label="活跃赛事"   value={stats?.ongoing_competitions || 0}  icon="trophy"  accent="#3370FF" sub={`共 ${stats?.total_competitions || 0} 个赛事`}  onClick={() => navigate('competitions')}/>
        <StatCard label="参赛团队"   value={stats?.total_teams || 0}           icon="users"   accent="#00B42A" sub={`${stats?.total_students || 0} 名学生参赛`}/>
        <StatCard label="待处理审批" value={pending.length}                    icon="checksq" accent="#FF7D00" sub="请尽快处理" onClick={() => navigate('approvals')}/>
        <StatCard label="总用户数"   value={stats?.total_users || 0}           icon="medal"   accent="#7C3AED" sub={`教师 ${stats?.total_teachers || 0} · 学生 ${stats?.total_students || 0}`}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Card style={{ padding:20 }}>
          <SHead title="待处理审批" action={<Btn size="sm" variant="ghost" onClick={() => navigate('approvals')}>查看全部 →</Btn>}/>
          {pending.length === 0
            ? <Empty text="暂无待办" sub="所有审批已处理完毕"/>
            : pending.slice(0,4).map(a => (
                <ActivityRow key={a.id} iconColor={typeColor[a.type]||typeColor.default} title={a.title || a.type} sub={`${a.submitter?.name || ''} · ${a.type}`} time={a.created_at?.split('T')[0] || ''} action={<Badge label="待处理" status="pending"/>}/>
              ))
          }
        </Card>
        <Card style={{ padding:20 }}>
          <SHead title="赛事概览" action={<Btn size="sm" variant="ghost" onClick={() => navigate('competitions')}>管理 →</Btn>}/>
          {competitions.length === 0
            ? <Empty text="暂无赛事" sub="还没有创建任何赛事"/>
            : competitions.map(c => (
                <ActivityRow key={c.id} iconColor={getStatusColor(c.status)} title={c.title} sub={`${c.location || '待定'}`} time={c.end_date?.split('T')[0] || ''} action={<Badge label={statusNameMap[c.status] || c.status} status={c.status}/>}/>
              ))
          }
        </Card>
      </div>
    </PageWrap>
  );
};

// ── Teacher Dashboard ─────────────────────────────────────
const DashTeacher = ({ navigate }) => {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = React.useState([]);
  const [pending, setPending] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, wfRes] = await Promise.all([
          teamsAPI.list(),
          workflowsAPI.list({ tab: 'pending' }),
        ]);
        setMyTeams(teamsRes.teams || []);
        setPending(wfRes.workflows || []);
      } catch (e) {
        console.error('DashTeacher fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  return (
    <PageWrap>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:22, fontWeight:700, color:'#1F2329', marginBottom:4 }}>你好，{user?.name || '老师'}老师 👋</div>
        <div style={{ fontSize:13, color:'#8F959E' }}>指导 <span style={{ color:'#1F2329', fontWeight:600 }}>{myTeams.length} 支</span>参赛团队，有 <span style={{ color:'#FF7D00', fontWeight:600 }}>{pending.length} 个</span>审批待处理</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        <StatCard label="指导团队数" value={myTeams.length} icon="users"   accent="#3370FF" onClick={() => navigate('teams')}/>
        <StatCard label="待办审批"   value={pending.length} icon="checksq" accent="#FF7D00" onClick={() => navigate('approvals')}/>
        <StatCard label="指导团队"   value={myTeams.length} icon="medal"   accent="#00B42A" sub="参赛中"/>
        <StatCard label="待审核"     value={pending.length} icon="star"    accent="#FAAD14" sub="审批项"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Card style={{ padding:20 }}>
          <SHead title="待办审批" action={<Btn size="sm" variant="ghost" onClick={() => navigate('approvals')}>查看全部 →</Btn>}/>
          {pending.length === 0 ? <Empty text="暂无待办" sub="所有审批已处理完毕"/> : pending.slice(0,4).map(a => (
            <ActivityRow key={a.id} iconColor="#FF7D00" title={a.title || a.type} sub={`${a.submitter?.name || ''} · ${a.created_at?.split('T')[0] || ''}`} action={<Badge label="待处理" status="pending"/>}/>
          ))}
        </Card>
        <Card style={{ padding:20 }}>
          <SHead title="指导团队" action={<Btn size="sm" variant="ghost" onClick={() => navigate('teams')}>查看详情 →</Btn>}/>
          {myTeams.length === 0
            ? <Empty text="暂无团队" sub="还没有指导的参赛团队"/>
            : myTeams.map(t => (
                <ActivityRow key={t.id} iconColor="#3370FF" title={t.name} sub={`${t.competition?.title || ''} · ${t.members?.length || 0} 人`} action={<Badge label={t.status==='completed'?'已完成':'参赛中'} status={t.status==='completed'?'completed':'active'}/>}/>
              ))
          }
        </Card>
      </div>
    </PageWrap>
  );
};

// ════════════════════════════════════════════════════════
// STUDENT DASHBOARD — fully visual redesign
// ════════════════════════════════════════════════════════

// ── Action tile (student) ─────────────────────────────────
const ActionTile = ({ icon, label, badge, badgeColor='#7C3AED', sub, accent='#3370FF', bg='#EEF3FF', topGradient, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'#fff', border:`1.5px solid ${hov ? accent : '#E5E6E8'}`, borderRadius:16, padding:22, cursor:'pointer',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? `0 12px 32px ${accent}20` : '0 1px 3px rgba(0,0,0,.04)',
        transition:'all .22s cubic-bezier(.16,1,.3,1)', position:'relative', overflow:'hidden' }}>
      {topGradient && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${accent},${accent}88)`, borderRadius:'16px 16px 0 0' }}></div>}
      <div style={{ width:48, height:48, borderRadius:14, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <Ic n={icon} s={24} c={accent}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
        <span style={{ fontSize:14, fontWeight:700, color:'#1F2329' }}>{label}</span>
        {badge && <span style={{ padding:'2px 7px', background:`${badgeColor}18`, color:badgeColor, borderRadius:20, fontSize:11, fontWeight:700 }}>{badge}</span>}
      </div>
      <div style={{ fontSize:12, color:'#8F959E', lineHeight:1.5 }}>{sub}</div>
      <div style={{ position:'absolute', bottom:18, right:18, opacity:hov?1:0, transform:hov?'translateX(0)':'translateX(-4px)', transition:'all .15s' }}>
        <Ic n="chevr" s={16} c={accent}/>
      </div>
    </div>
  );
};

// ── Journey step tracker ──────────────────────────────────
const JourneyTrack = ({ steps }) => (
  <div style={{ display:'flex', alignItems:'flex-start' }}>
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, flex:0, minWidth:52 }}>
          <div style={{
            width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13,
            background: s.done ? '#3370FF' : s.active ? '#fff' : 'rgba(255,255,255,.12)',
            border: s.active ? '2.5px solid #3370FF' : s.done ? '2.5px solid #3370FF' : 'none',
            color: s.done ? '#fff' : s.active ? '#3370FF' : 'rgba(255,255,255,.3)',
            boxShadow: s.active ? '0 0 0 5px rgba(51,112,255,.22)' : 'none',
            transition:'all .3s',
          }}>
            {s.done ? '✓' : i+1}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, fontWeight:s.active?700:400, color:s.done||s.active?'#fff':'rgba(255,255,255,.35)', whiteSpace:'nowrap' }}>{s.label}</div>
            {s.sub && <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{s.sub}</div>}
          </div>
        </div>
        {i < steps.length - 1 && (
          <div style={{ flex:1, height:2, background:s.done?'rgba(99,149,255,.6)':'rgba(255,255,255,.12)', margin:'15px 6px 0', borderRadius:2, transition:'background .3s' }}></div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── Student Dashboard ─────────────────────────────────────
const DashStudent = ({ navigate }) => {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = React.useState([]);
  const [myPlans, setMyPlans] = React.useState([]);
  const [myAwards, setMyAwards] = React.useState([]);
  const [competitions, setCompetitions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, plansRes, awardsRes, compRes] = await Promise.all([
          teamsAPI.list(),
          prePlansAPI.list(),
          awardsAPI.list(),
          competitionsAPI.list({ status: 'published' }),
        ]);
        setMyTeams(teamsRes.teams || []);
        setMyPlans(plansRes.pre_plans || plansRes.plans || []);
        setMyAwards(awardsRes.awards || []);
        setCompetitions(compRes.competitions || []);
      } catch (e) {
        console.error('DashStudent fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  const myTeam = myTeams[0] || null;
  const myComp = myTeam?.competition || null;
  const myPlan = myPlans[0] || null;
  const myAward = myAwards[0] || null;

  // Build journey steps based on actual data
  const planStatus = myPlan?.status;
  const hasAward = !!myAward;
  const steps = [
    { label:'报名',   sub:'',         done: !!myTeam },
    { label:'预计划', sub: planStatus === 'approved' ? '已通过' : planStatus === 'submitted' ? '审核中' : planStatus === 'rejected' ? '已退回' : '待提交', done: planStatus === 'approved', active: planStatus === 'submitted' || planStatus === 'draft' },
    { label:'执行',   sub:'',         todo: true },
    { label:'评奖',   sub:'',         done: hasAward, todo: !hasAward },
  ];

  // Days until competition end
  const daysLeft = myComp?.end_date ? Math.max(0, Math.ceil((new Date(myComp.end_date) - new Date()) / 86400000)) : null;

  return (
    <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Hero competition card ──────────────── */}
      <div style={{ borderRadius:18, background:'linear-gradient(135deg,#0D1B2A 0%,#1A3A6B 45%,#2D1B69 100%)', padding:'28px 32px', position:'relative', overflow:'hidden' }}>
        {/* decorative blobs */}
        <div style={{ position:'absolute', right:-50, top:-70, width:260, height:260, borderRadius:'50%', background:'rgba(99,149,255,.1)', pointerEvents:'none' }}></div>
        <div style={{ position:'absolute', right:90, bottom:-70, width:180, height:180, borderRadius:'50%', background:'rgba(124,58,237,.12)', pointerEvents:'none' }}></div>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(51,112,255,.25)', borderRadius:20, padding:'5px 12px', marginBottom:12 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#60A5FA', animation:'pulse 2s infinite' }}></div>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.9)', fontWeight:600, letterSpacing:'0.3px' }}>{myTeam ? '参赛中' : '未报名'}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:'#fff', lineHeight:1.3, marginBottom:10, letterSpacing:'-0.3px' }}>
                {myComp?.title || '暂无赛事'}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:14, fontSize:12, color:'rgba(255,255,255,.55)' }}>
                {myTeam && <span>👥 {myTeam.name} · {myTeam.members?.length || 0} 人</span>}
                {myComp?.location && <span>📍 {myComp.location}</span>}
              </div>
            </div>
            {daysLeft !== null && (
              <div style={{ textAlign:'center', background:'rgba(255,255,255,.09)', borderRadius:14, padding:'14px 20px', flexShrink:0, backdropFilter:'blur(8px)' }}>
                <div style={{ fontSize:38, fontWeight:900, color:'#fff', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{daysLeft}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:4 }}>天后截止</div>
              </div>
            )}
          </div>
          <JourneyTrack steps={steps}/>
        </div>
      </div>

      {/* ── Quick action tiles ─────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <ActionTile icon="file" label="预计划管理" badge={myPlan?.ai_review_score ? `AI ${myPlan.ai_review_score}分` : myPlan ? (planStatus === 'approved' ? '已通过' : planStatus === 'submitted' ? '审核中' : '草稿') : '未创建'} badgeColor="#7C3AED" sub={myPlan ? '查看预计划详情' : '创建你的预计划'} accent="#7C3AED" bg="#F5F0FF" topGradient onClick={() => navigate('preplans')}/>
        <ActionTile icon="sparkle" label="AI 工具箱" sub="6 个智能助手 · 一键生成" accent="#3370FF" bg="#EEF3FF" topGradient onClick={() => navigate('aitools')}/>
        <ActionTile icon="star" label="评价老师" badge="待完成" badgeColor="#FF7D00" sub={myTeam?.leader?.name ? `${myTeam.leader.name}` : '评价你的指导老师'} accent="#FAAD14" bg="#FFFBE6" onClick={() => navigate('evaluations')}/>
      </div>

      {/* ── AI suggestion ──────────────────────── */}
      {myPlan?.ai_review_notes && (
        <div style={{ background:'linear-gradient(90deg,#F5F0FF 0%,#EEF3FF 100%)', border:'1px solid #DDD6FE', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#7C3AED 0%,#3370FF 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 3px 10px rgba(124,58,237,.3)' }}>
            <Ic n="sparkle" s={17} c="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7C3AED', marginBottom:3 }}>AI 赛事顾问</div>
            <div style={{ fontSize:13, color:'#1F2329', lineHeight:1.6 }}>
              {myPlan.ai_review_score && <span>预计划评分 <strong style={{ color:'#7C3AED' }}>{myPlan.ai_review_score} 分</strong>。</span>}
              {myPlan.ai_review_notes}
            </div>
          </div>
          <Btn size="sm" variant="ghost" style={{ flexShrink:0, color:'#7C3AED' }} onClick={() => navigate('preplans')}>查看详情 →</Btn>
        </div>
      )}

      {/* ── Award banner ───────────────────────── */}
      {myAward && (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 22px', background:'linear-gradient(90deg,#FFFBE6 0%,#FFF7E8 100%)', border:'1px solid #FFD591', borderRadius:14 }}>
          <span style={{ fontSize:30, lineHeight:1 }}>🏆</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1F2329' }}>恭喜！荣获 {myAward.rank_name}</div>
            <div style={{ fontSize:12, color:'#8F959E', marginTop:2 }}>{myAward.competition?.title || ''} · {myAward.prize_name || ''} {myAward.prize_amount ? `¥${myAward.prize_amount}` : ''}</div>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => navigate('awards')}>查看详情</Btn>
        </div>
      )}

      {/* ── Competition explore strip ──────────── */}
      {competitions.length > 0 && (
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:12 }}>可报名赛事</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {competitions.slice(0,4).map(c => (
              <div key={c.id} onClick={() => navigate('competitions')} style={{ background:'#fff', border:'1.5px solid #E5E6E8', borderRadius:12, padding:'16px 18px', cursor:'pointer', display:'flex', gap:14, alignItems:'center', transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#3370FF'; e.currentTarget.style.boxShadow='0 4px 12px rgba(51,112,255,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#E5E6E8'; e.currentTarget.style.boxShadow='none'; }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#3370FF,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ic n="trophy" s={20} c="#fff"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1F2329', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                  <div style={{ fontSize:12, color:'#8F959E' }}>截止 {c.registration_deadline?.split('T')[0] || '待定'} · {c.prize || ''}</div>
                </div>
                <Btn size="sm" icon={<Ic n="plus" s={12} c="#fff"/>}>报名</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Dashboard switcher ────────────────────────────────────
const Dashboard = () => {
  const { role, navigate } = React.useContext(AppContext);
  if (role === 'admin')   return <DashAdmin navigate={navigate}/>;
  if (role === 'teacher') return <DashTeacher navigate={navigate}/>;
  return <DashStudentRedesign navigate={navigate}/>;
};

Object.assign(window, { Dashboard, StatCard, useCountUp, ActionTile });
