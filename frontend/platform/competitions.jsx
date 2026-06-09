// Competitions — List + Detail views (API-integrated)

const CompStatus = {
  ongoing:   '进行中',
  published: '报名中',
  draft:     '草稿',
  completed: '已完成',
  cancelled: '已取消',
};

const TypeNameMap = { hackathon:'黑客马拉松', innovation:'创新创业', research:'学术科技' };

const typeColor = { hackathon:'#3370FF', innovation:'#00B42A', research:'#FF7D00' };
const typeBg    = { hackathon:'#EEF3FF', innovation:'#E8FFED', research:'#FFF7E8' };

// ── Normalize API competition object ─────────────────────
const normalizeComp = (c) => {
  let tags = c.tags;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  if (!Array.isArray(tags)) tags = [];

  return {
    ...c,
    desc: c.description || c.desc || '',
    typeName: TypeNameMap[c.type] || c.type || '',
    statusName: CompStatus[c.status] || c.status || '',
    registrationDeadline: c.registration_deadline || c.registrationDeadline || '',
    startDate: c.start_date || c.startDate || '',
    endDate: c.end_date || c.endDate || '',
    maxTeam: c.max_team_size || c.maxTeam || 0,
    minTeam: c.min_team_size || c.minTeam || 0,
    teamsCount: c.teams_count ?? c.teamsCount ?? 0,
    organizer: c.organizer || '',
    tags,
  };
};

// ── Competition Card ──────────────────────────────────────
const CompCard = ({ c, onClick }) => (
  <Card hover onClick={onClick} style={{ padding:20, marginBottom:12 }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
      <div style={{ flex:1, minWidth:0, paddingRight:12 }}>
        <div style={{ fontSize:15, fontWeight:600, color:'#1F2329', marginBottom:6, lineHeight:1.4 }}>{c.title}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
          <span style={{ padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, background: typeBg[c.type], color: typeColor[c.type] }}>{c.typeName}</span>
          {c.tags.map(t => <Tag key={t} label={t}/>)}
        </div>
        <div style={{ fontSize:13, color:'#646A73', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{c.desc}</div>
      </div>
      <Badge label={c.statusName} status={c.status}/>
    </div>
    <div style={{ height:1, background:'#F0F1F3', margin:'10px 0' }}></div>
    <div style={{ display:'flex', gap:20 }}>
      {[
        { icon:'pin',   v: c.location },
        { icon:'cal',   v: `报名截止 ${c.registrationDeadline}` },
        { icon:'users', v: `${c.teamsCount} / ${c.maxTeam * 10} 支团队` },
        { icon:'zap',   v: c.prize },
      ].map(item => (
        <div key={item.icon} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#646A73' }}>
          <Ic n={item.icon} s={13} c="#8F959E"/>{item.v}
        </div>
      ))}
    </div>
  </Card>
);

// ── Competition Detail ────────────────────────────────────
const CompDetail = ({ comp: rawComp, onBack }) => {
  const comp = normalizeComp(rawComp);
  const [tab, setTab] = React.useState('info');
  const [relTeams, setRelTeams] = React.useState([]);
  const [relAwards, setRelAwards] = React.useState([]);
  const [detailLoading, setDetailLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDetail = async () => {
      try {
        const [teamsRes, awardsRes] = await Promise.all([
          teamsAPI.list({ competition_id: comp.id }).catch(() => ({ teams: [] })),
          awardsAPI.list({ competition_id: comp.id }).catch(() => ({ awards: [] })),
        ]);
        setRelTeams(teamsRes.teams || []);
        setRelAwards(awardsRes.awards || []);
      } catch (e) {
        console.error('CompDetail fetch error:', e);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [comp.id]);

  return (
    <PageWrap>
      {/* Header card */}
      <Card style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
        <div style={{ background:`linear-gradient(135deg, ${typeColor[comp.type]}15 0%, ${typeColor[comp.type]}05 100%)`, borderBottom:'1px solid #E5E6E8', padding:'24px 28px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, background: typeBg[comp.type], color: typeColor[comp.type] }}>{comp.typeName}</span>
                <Badge label={comp.statusName} status={comp.status}/>
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:'#1F2329', lineHeight:1.3, maxWidth:600 }}>{comp.title}</div>
            </div>
            {comp.status === 'published' && <Btn icon={<Ic n="plus" s={14} c="#fff"/>}>立即报名</Btn>}
            {comp.status === 'draft' && <Btn variant="secondary" icon={<Ic n="edit" s={14} c="#646A73"/>}>编辑赛事</Btn>}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:20 }}>
            {[
              { icon:'pin',   v: comp.location },
              { icon:'cal',   v: `${comp.startDate} — ${comp.endDate}` },
              { icon:'users', v: `${comp.minTeam}–${comp.maxTeam} 人/队，已有 ${comp.teamsCount} 支` },
              { icon:'zap',   v: comp.prize },
            ].map(item => (
              <div key={item.icon} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#646A73' }}>
                <Ic n={item.icon} s={14} c={typeColor[comp.type]}/>{item.v}
              </div>
            ))}
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display:'flex', gap:0, padding:'0 28px', borderBottom:'1px solid #E5E6E8' }}>
          {[['info','赛事简介'],['teams','参赛团队'],['awards','获奖名单']].map(([k,l]) => (
            <div key={k} onClick={() => setTab(k)} style={{ padding:'12px 16px', fontSize:13, fontWeight: tab===k ? 600 : 400, color: tab===k ? '#3370FF':'#646A73', borderBottom: tab===k ? '2px solid #3370FF':'2px solid transparent', cursor:'pointer', marginBottom:-1, transition:'all .15s' }}>{l}</div>
          ))}
        </div>
      </Card>

      {/* Tab content */}
      {tab === 'info' && (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
          <Card style={{ padding:20 }}>
            <SHead title="赛事介绍"/>
            <p style={{ fontSize:14, color:'#646A73', lineHeight:1.8, margin:'0 0 16px' }}>{comp.desc}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
              {comp.tags.map(t => <Tag key={t} label={t} color={typeColor[comp.type]}/>)}
            </div>
          </Card>
          <Card style={{ padding:20 }}>
            <SHead title="报名信息"/>
            {[
              ['报名截止', comp.registrationDeadline],
              ['比赛时间', `${comp.startDate} — ${comp.endDate}`],
              ['团队规模', `${comp.minTeam} — ${comp.maxTeam} 人`],
              ['赛事地点', comp.location],
              ['奖项设置', comp.prize],
              ['主办方',   comp.organizer],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F7F8FA', fontSize:13 }}>
                <span style={{ color:'#8F959E' }}>{l}</span>
                <span style={{ color:'#1F2329', fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab === 'teams' && (
        <Card style={{ padding:20 }}>
          <SHead title={`参赛团队 (${relTeams.length})`} action={<Btn size="sm" icon={<Ic n="download" s={13} c="#646A73"/>} variant="secondary">导出</Btn>}/>
          {detailLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner/></div> :
            relTeams.length === 0 ? <Empty text="暂无参赛团队" sub="赛事发布后团队即可报名参加"/> : (
              <Table
                cols={[
                  { key:'name',    title:'团队名称', render: v => <span style={{ fontWeight:600 }}>{v}</span> },
                  { key:'leader',  title:'队长'  },
                  { key:'members', title:'人数', render: v => `${v} 人` },
                  { key:'teacher', title:'指导教师' },
                  { key:'score',   title:'得分', render: v => v ? <span style={{ color:'#3370FF', fontWeight:600 }}>{v}</span> : '—' },
                  { key:'rank',    title:'排名', render: v => v ? <span style={{ color:'#FF7D00', fontWeight:700 }}>第 {v} 名</span> : '—' },
                  { key:'status',  title:'状态', render: (v, row) => <Badge label={v==='completed'?'已完成':'参赛中'} status={v==='completed'?'completed':'active'}/> },
                ]}
                rows={relTeams}
              />
            )
          }
        </Card>
      )}
      {tab === 'awards' && (
        <Card style={{ padding:20 }}>
          <SHead title="获奖名单"/>
          {detailLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner/></div> :
            relAwards.length === 0 ? <Empty text="暂无获奖信息" sub="赛事结束后获奖名单将在此展示"/> : (
              <Table
                cols={[
                  { key:'rankName', title:'奖项', render: v => {
                    const c = v==='一等奖'?'#FF7D00':v==='二等奖'?'#646A73':'#CD7F32';
                    return <span style={{ fontWeight:700, color:c }}>🏆 {v}</span>;
                  }},
                  { key:'teamName', title:'团队', render: v => <span style={{ fontWeight:600 }}>{v}</span> },
                  { key:'leader',   title:'队长'  },
                  { key:'teacher',  title:'指导教师' },
                  { key:'prize',    title:'奖金', render: v => <span style={{ color:'#00B42A', fontWeight:600 }}>{v}</span> },
                  { key:'status',   title:'状态', render: v => <Badge label={v==='settled'?'已结算':v==='teacher_confirm'?'待确认':'处理中'} status={v}/> },
                ]}
                rows={relAwards}
              />
            )
          }
        </Card>
      )}
    </PageWrap>
  );
};

// ── Competition List ──────────────────────────────────────
const Competitions = () => {
  const { navigate } = React.useContext(AppContext);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [competitions, setCompetitions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {};
        if (filter !== 'all') params.status = filter;
        if (search) params.search = search;
        const data = await competitionsAPI.list(params);
        setCompetitions((data.competitions || []).map(normalizeComp));
      } catch (e) {
        console.error('Error fetching competitions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filter, search]);

  if (selected) return <CompDetail comp={selected} onBack={() => setSelected(null)}/>;

  const statusFilters = [
    { k:'all', l:'全部' },
    { k:'ongoing', l:'进行中' },
    { k:'published', l:'报名中' },
    { k:'completed', l:'已完成' },
    { k:'draft', l:'草稿' },
  ];

  return (
    <PageWrap>
      {/* Filter + actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:12 }}>
        <div style={{ display:'flex', gap:4, background:'#fff', border:'1px solid #E5E6E8', borderRadius:8, padding:4 }}>
          {statusFilters.map(f => (
            <div key={f.k} onClick={() => setFilter(f.k)} style={{ padding:'5px 14px', borderRadius:6, fontSize:13, cursor:'pointer', fontWeight: filter===f.k ? 600 : 400, background: filter===f.k ? '#3370FF' : 'transparent', color: filter===f.k ? '#fff' : '#646A73', transition:'all .15s' }}>{f.l}</div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, background:'#fff', border:'1px solid #E5E6E8', borderRadius:6, padding:'6px 12px' }}>
            <Ic n="search" s={13} c="#8F959E"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索赛事..." style={{ border:'none', outline:'none', fontSize:13, background:'none', width:160, fontFamily:'inherit' }}/>
          </div>
          <Btn icon={<Ic n="plus" s={14} c="#fff"/>}>创建赛事</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32}/></div>
      ) : competitions.length === 0 ? (
        <Card style={{ padding:20 }}><Empty text="没有找到相关赛事"/></Card>
      ) : competitions.map(c => (
        <CompCard key={c.id} c={c} onClick={() => setSelected(c)}/>
      ))}
    </PageWrap>
  );
};

Object.assign(window, { Competitions });
