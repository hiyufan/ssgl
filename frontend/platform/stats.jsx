// Statistics — Charts and analytics

// ── Mini bar chart (SVG) ──────────────────────────────────
const BarChart = ({ data, valueKey, labelKey, color='#3370FF', height=120 }) => {
  const max = Math.max(...data.map(d => d[valueKey]));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d[valueKey] / max) : 0;
        const barH = Math.max(pct * (height - 28), 4);
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:10, color:'#8F959E', fontWeight:500 }}>{d[valueKey]}</div>
            <div style={{ width:'100%', height:barH, background: color, borderRadius:'3px 3px 0 0', opacity:0.85, transition:'height .5s ease', minHeight:4 }}></div>
            <div style={{ fontSize:10, color:'#8F959E', whiteSpace:'nowrap' }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Line chart (SVG) ─────────────────────────────────────
const LineChart = ({ data, valueKey, labelKey, color='#3370FF', width=400, height=100 }) => {
  const vals = data.map(d => d[valueKey]);
  const max = Math.max(...vals) * 1.2 || 1;
  const min = 0;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (width - 20) + 10;
    const y = height - 20 - ((v - min) / (max - min)) * (height - 30);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ');
  const fill = pts.map((p, i) => `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ') +
               ` L${pts[pts.length-1][0]},${height} L${pts[0][0]},${height} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#grad-${color.slice(1)})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={color} strokeWidth="2"/>
      ))}
    </svg>
  );
};

// ── Donut chart (SVG) ────────────────────────────────────
const DonutChart = ({ segments, size=120 }) => {
  const r = 40, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="18"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset * circ / total + circ * 0.25}
              strokeLinecap="butt"/>
          );
          offset += seg.value;
          return el;
        })}
        <text x="60" y="57" textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="800" fill="#1F2329">{total}</text>
        <text x="60" y="72" textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#8F959E">总计</text>
      </svg>
      <div style={{ flex:1 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:seg.color, flexShrink:0 }}></div>
            <span style={{ fontSize:12, color:'#646A73', flex:1 }}>{seg.label}</span>
            <span style={{ fontSize:12, fontWeight:600, color:'#1F2329' }}>{seg.value}</span>
            <span style={{ fontSize:11, color:'#8F959E' }}>{Math.round(seg.value/total*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Mini trend indicator ──────────────────────────────────
const TrendBadge = ({ val }) => (
  <span style={{ fontSize:11, color: val>=0?'#00B42A':'#F53F3F', display:'inline-flex', alignItems:'center', gap:2 }}>
    {val >= 0 ? '↑' : '↓'} {Math.abs(val)}%
  </span>
);

// ── Stats page ────────────────────────────────────────────
const Stats = () => {
  const [range, setRange] = React.useState('6m');
  const { role } = React.useContext(AppContext);
  const [overview, setOverview] = React.useState(null);
  const [compStats, setCompStats] = React.useState([]);
  const [teacherStats, setTeacherStats] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [ovRes, compRes, teachRes] = await Promise.all([
          statsAPI.overview(),
          statsAPI.competitions(),
          role !== 'student' ? statsAPI.teachers() : Promise.resolve({ teachers: [] }),
        ]);
        setOverview(ovRes);
        setCompStats(compRes.competitions || []);
        setTeacherStats(teachRes.teachers || []);
      } catch (e) {
        console.error('Error fetching stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  const kpis = [
    { icon:'trophy',  iconBg:'#EEF3FF',  c:'#3370FF', label:'赛事总数',   value: overview?.total_competitions || 0,   sub:`进行中 ${overview?.ongoing_competitions || 0}` },
    { icon:'users',   iconBg:'#E8FFED',  c:'#00B42A', label:'参赛团队',   value: overview?.total_teams || 0,  sub:`学生 ${overview?.total_students || 0} 人` },
    { icon:'checksq', iconBg:'#FFF7E8',  c:'#FF7D00', label:'总用户数',   value: overview?.total_users || 0, sub:`教师 ${overview?.total_teachers || 0} 人` },
    { icon:'medal',   iconBg:'#F5F0FF',  c:'#7C3AED', label:'教师总数',   value: overview?.total_teachers || 0,  sub:'本学期' },
  ];

  // Build competition chart data
  const compChartData = compStats.map(c => ({ m: c.title?.slice(0, 6) || '-', teams: c.team_count, approvals: c.pre_plan_count, awards: c.award_count }));

  return (
    <PageWrap>
      {/* Range filter */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ fontSize:14, color:'#646A73' }}>数据统计</div>
        <div style={{ display:'flex', gap:2, background:'#fff', border:'1px solid #E5E6E8', borderRadius:7, padding:3 }}>
          {[['1m','近1月'],['3m','近3月'],['6m','近6月'],['1y','近1年']].map(([k,l]) => (
            <div key={k} onClick={() => setRange(k)} style={{ padding:'5px 14px', borderRadius:5, fontSize:12, cursor:'pointer', fontWeight:range===k?600:400, background:range===k?'#3370FF':'transparent', color:range===k?'#fff':'#646A73', transition:'all .15s' }}>{l}</div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {kpis.map(k => (
          <Card key={k.label} style={{ padding:'14px 16px' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:k.iconBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <Ic n={k.icon} s={16} c={k.c}/>
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:'#1F2329', lineHeight:1, marginBottom:3 }}>{k.value}</div>
            <div style={{ fontSize:11, color:'#8F959E', marginBottom:4 }}>{k.label}</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:'#8F959E' }}>{k.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        <Card style={{ padding:20 }}>
          <SHead title="赛事参赛趋势" sub="各赛事团队数量"/>
          {compChartData.length > 0 ? (
            <>
              <LineChart data={compChartData} valueKey="teams" labelKey="m" color="#3370FF" width={500} height={110}/>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                {compChartData.map(d => <span key={d.m} style={{ fontSize:10, color:'#8F959E', flex:1, textAlign:'center' }}>{d.m}</span>)}
              </div>
            </>
          ) : <Empty text="暂无赛事数据"/>}
        </Card>
        <Card style={{ padding:20 }}>
          <SHead title="赛事状态分布"/>
          <DonutChart segments={[
            { label:'进行中', value: overview?.ongoing_competitions || 0, color:'#3370FF' },
            { label:'已完成', value: (overview?.total_competitions || 0) - (overview?.ongoing_competitions || 0), color:'#00B42A' },
          ]}/>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <Card style={{ padding:20 }}>
          <SHead title="各赛事预计划数" sub="预计划提交情况"/>
          {compChartData.length > 0 ? <BarChart data={compChartData} valueKey="approvals" labelKey="m" color="#7C3AED" height={130}/> : <Empty text="暂无数据"/>}
        </Card>
        <Card style={{ padding:20 }}>
          <SHead title="各赛事获奖数" sub="奖项颁发情况"/>
          {compChartData.length > 0 ? <BarChart data={compChartData} valueKey="awards" labelKey="m" color="#00B42A" height={130}/> : <Empty text="暂无数据"/>}
        </Card>
      </div>

      {/* Teacher leaderboard */}
      {role !== 'student' && teacherStats.length > 0 && (
        <Card style={{ padding:20 }}>
          <SHead title="教师指导排行榜" sub="综合排名"/>
          <Table
            cols={[
              { key:'_rank', title:'排名', width:60, render: (_, __, idx) => {
                const medals = ['🥇','🥈','🥉'];
                return <span style={{ fontSize:16 }}>{medals[idx] || `#${idx+1}`}</span>;
              }},
              { key:'name',     title:'教师', render: (v, row) => (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Avatar name={v} size={30} idx={row.id}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{v}</div>
                  </div>
                </div>
              )},
              { key:'avg_overall',title:'平均评分',  render: v => (
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ color:'#FAAD14', fontSize:14 }}>★</span>
                  <span style={{ fontWeight:600 }}>{v?.toFixed(1) || '-'}</span>
                </div>
              )},
              { key:'evaluation_count',title:'评价数',   render: v => `${v || 0} 条` },
            ]}
            rows={teacherStats.map((t, i) => ({ ...t, _rank: i+1 }))}
          />
        </Card>
      )}
    </PageWrap>
  );
};

Object.assign(window, { Stats, BarChart, LineChart, DonutChart });
