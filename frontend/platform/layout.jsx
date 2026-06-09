// Layout: Icons, AppContext, Sidebar, TopBar, Layout wrapper

const AppContext = React.createContext({});

// ── Feather-style Icon component ──────────────────────────
const Ic = ({ n, s=16, c='currentColor', sw=1.8 }) => {
  const P = {
    home:      <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    trophy:    <><circle cx="12" cy="9" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
    users:     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    checksq:   <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    barchart:  <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    cpu:       <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    gift:      <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>,
    star:      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    bell:      <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    chevr:     <polyline points="9 18 15 12 9 6"/>,
    chevd:     <polyline points="6 9 12 15 18 9"/>,
    chevl:     <polyline points="15 18 9 12 15 6"/>,
    x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    check:     <polyline points="20 6 9 17 4 12"/>,
    clock:     <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    cal:       <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    pin:       <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    edit:      <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    eye:       <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    file:      <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    trend:     <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    zap:       <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    user:      <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    layers:    <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    activity:  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    sparkle:   <><path d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z"/><circle cx="5" cy="18" r="1.5" fill={c} stroke="none"/><circle cx="19" cy="5" r="1" fill={c} stroke="none"/></>,
    medal:     <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
    download:  <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    info:      <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', flexShrink:0 }}>
      {P[n] || null}
    </svg>
  );
};

// ── Role config ───────────────────────────────────────────
const ROLE_CFG = {
  admin: {
    label:'管理员', tagBg:'#F0F5FF', tagColor:'#1F2329',
    nav:[
      { id:'dashboard',    icon:'home',    label:'首页'     },
      { section:'赛事管理' },
      { id:'competitions', icon:'trophy',  label:'赛事管理' },
      { id:'teams',        icon:'users',   label:'团队管理' },
      { section:'审批与结算' },
      { id:'approvals',    icon:'checksq', label:'审批中心', badge:3 },
      { id:'awards',       icon:'gift',    label:'获奖管理' },
      { section:'评估与分析' },
      { id:'evaluations',  icon:'star',    label:'学生评价' },
      { id:'stats',        icon:'barchart',label:'统计分析' },
      { section:'AI 能力' },
      { id:'aitools',      icon:'sparkle', label:'AI 工具箱' },
      { divider:true },
      { id:'users',        icon:'user',    label:'用户管理' },
    ],
  },
  teacher: {
    label:'指导教师', tagBg:'#EEF3FF', tagColor:'#3370FF',
    nav:[
      { id:'dashboard',    icon:'home',    label:'首页'     },
      { section:'赛事管理' },
      { id:'competitions', icon:'trophy',  label:'赛事列表' },
      { id:'teams',        icon:'users',   label:'指导团队' },
      { section:'审批与结算' },
      { id:'approvals',    icon:'checksq', label:'待办审批', badge:2 },
      { id:'awards',       icon:'gift',    label:'获奖确认' },
      { section:'评估与分析' },
      { id:'evaluations',  icon:'star',    label:'评价中心' },
      { id:'stats',        icon:'barchart',label:'统计分析' },
      { section:'AI 能力' },
      { id:'aitools',      icon:'sparkle', label:'AI 工具箱' },
    ],
  },
  student: {
    label:'参赛学生', tagBg:'#F5F0FF', tagColor:'#7C3AED',
    nav:[
      { id:'dashboard',    icon:'home',    label:'首页'     },
      { section:'赛事管理' },
      { id:'competitions', icon:'trophy',  label:'赛事大厅' },
      { id:'teams',        icon:'users',   label:'我的团队' },
      { section:'项目管理' },
      { id:'preplans',     icon:'file',    label:'预计划管理' },
      { section:'AI 能力' },
      { id:'aitools',      icon:'sparkle', label:'AI 工具箱' },
      { section:'评价' },
      { id:'evaluations',  icon:'star',    label:'提交评价' },
    ],
  },
};

const PAGE_LABELS = {
  dashboard:'首页', competitions:'赛事管理', teams:'团队管理', approvals:'审批中心',
  preplans:'预计划管理', awards:'获奖管理', evaluations:'学生评价', stats:'统计分析',
  aitools:'AI 工具箱', users:'用户管理',
};

// ── Sidebar ───────────────────────────────────────────────
const Sidebar = () => {
  const { role, setRole, page, navigate } = React.useContext(AppContext);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const cfg = ROLE_CFG[role];
  const u = mockData.users[role];
  return (
    <div style={{
      width:220, minWidth:220, height:'100vh',
      background: '#fff',
      borderRight: '1px solid #E5E6E8',
      display:'flex', flexDirection:'column', flexShrink:0, position:'relative', zIndex:10,
      transition: 'all 0.3s',
    }}>
      {/* Logo */}
      <div style={{ height:56, display:'flex', alignItems:'center', gap:10, padding:'0 16px', borderBottom:'1px solid #E5E6E8', flexShrink:0 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 6px rgba(37,99,235,.35)' }}>
          <Ic n="layers" s={15} c="#fff" sw={2}/>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#1F2329', letterSpacing:'-0.3px', lineHeight:1.2 }}>竞赛管理平台</div>
          <div style={{ fontSize:10, color:'#8F959E', letterSpacing:'0.2px' }}>AI 驱动全流程管理</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex:1, overflow:'auto', padding:'8px 0' }}>
        {cfg.nav.map((item, i) => {
          if (item.divider) return <div key={i} style={{ height:1, background:'#F0F1F3', margin:'6px 16px' }}></div>;
          if (item.section) return (
            <div key={i} style={{ padding:'12px 20px 3px', fontSize:10, fontWeight:700, color:'#B0B5BF', textTransform:'uppercase', letterSpacing:'0.8px' }}>{item.section}</div>
          );
          const active = page === item.id;
          return (
            <NavItem key={item.id} item={item} active={active} onClick={() => navigate(item.id)}/>
          );
        })}
      </div>

      {/* Role switcher */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid #E5E6E8', flexShrink:0, position:'relative' }}>
        {pickerOpen && (
          <div style={{ position:'absolute', bottom:72, left:12, right:12, background:'#fff', border:'1px solid #E5E6E8', borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.12)', padding:6, zIndex:200 }}>
            {['admin','teacher','student'].map(r => {
              const rc = ROLE_CFG[r];
              const ru = mockData.users[r];
              const isActive = r === role;
              return (
                <div key={r}
                  onClick={() => { setRole(r); setPickerOpen(false); navigate('dashboard'); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:7, cursor:'pointer', background: isActive ? '#EEF3FF' : 'transparent' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F7F8FA'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#EEF3FF' : 'transparent'; }}
                >
                  <div style={{ width:28, height:28, borderRadius:'50%', background:rc.tagBg, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{ru.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1F2329' }}>{ru.name}</div>
                    <div style={{ fontSize:11, color:'#8F959E' }}>{rc.label}</div>
                  </div>
                  {isActive && <Ic n="check" s={14} c={'#3370FF'}/>}
                </div>
              );
            })}
          </div>
        )}
        <div
          onClick={() => setPickerOpen(p => !p)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, cursor:'pointer', border:'1px solid #E5E6E8', background:'#FAFBFC' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
          onMouseLeave={e => e.currentTarget.style.background = '#FAFBFC'}
        >
          <div style={{ width:28, height:28, borderRadius:'50%', background:cfg.tagBg, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{u.avatar}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#1F2329', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
            <div style={{ fontSize:11, color:'#8F959E' }}>{cfg.label}</div>
          </div>
          <Ic n={pickerOpen ? 'chevd' : 'chevr'} s={13} c={'#8F959E'}/>
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ item, active, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', margin:'1px 8px', padding:'7px 12px', borderRadius:6, cursor:'pointer',
        background: active ? '#EEF3FF' : hov ? '#F7F8FA' : 'transparent',
        color: active ? '#3370FF' : hov ? '#1F2329' : '#646A73',
        transition:'all .12s',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Ic n={item.icon} s={15} c={active ? '#3370FF' : hov ? '#1F2329' : '#8F959E'}/>
        <span style={{ fontSize:13, fontWeight: active ? 500 : 400 }}>{item.label}</span>
      </div>
      {item.badge ? (
        <span style={{ background:'#F53F3F', color:'#fff', borderRadius:9, fontSize:10, fontWeight:700, padding:'1px 5px', minWidth:16, textAlign:'center', lineHeight:'16px' }}>{item.badge}</span>
      ) : null}
    </div>
  );
};

// ── TopBar ────────────────────────────────────────────────
const TopBar = ({ title, back }) => {
  const { role, navigate } = React.useContext(AppContext);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const unread = mockData.notifications.filter(n => !n.read).length;
  const cfg = ROLE_CFG[role];
  const u = mockData.users[role];

  return (
    <div style={{
      height:56,
      background: '#fff',
      borderBottom: '1px solid #E5E6E8',
      display:'flex', alignItems:'center', padding:'0 24px', gap:12, flexShrink:0,
      transition: 'all 0.3s',
    }}>
      {back && (
        <button onClick={back} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#646A73', padding:'4px 0', marginRight:4, fontSize:13 }}>
          <Ic n="chevl" s={16} c="#646A73"/>{back.label || '返回'}
        </button>
      )}
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:16, fontWeight:600, color:'#1F2329' }}>{title}</span>
      </div>

      {/* Search */}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F7F8FA', border:'1px solid #F0F1F3', borderRadius:6, padding:'6px 12px', width:200, flexShrink:0 }}>
        <Ic n="search" s={13} c="#8F959E"/>
        <input placeholder="搜索..." style={{ border:'none', background:'none', fontSize:13, color:'#1F2329', width:'100%', outline:'none', fontFamily:'inherit' }}/>
      </div>

      {/* Notification bell */}
      <div style={{ position:'relative' }}>
        <button
          onClick={() => setNotifOpen(p => !p)}
          style={{ width:36, height:36, borderRadius:8, background: notifOpen ? '#EEF3FF' : 'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}
          onMouseEnter={e => { if (!notifOpen) e.currentTarget.style.background = '#F7F8FA'; }}
          onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <Ic n="bell" s={18} c="#646A73"/>
          {unread > 0 && <span style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'#F53F3F', border:'1.5px solid #fff' }}></span>}
        </button>
        {notifOpen && (
          <div style={{ position:'absolute', top:44, right:0, width:320, background:'#fff', border:'1px solid #E5E6E8', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:300, overflow:'hidden', animation:'fadeUp .15s ease' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #F0F1F3', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:600, fontSize:13 }}>消息通知</span>
              {unread > 0 && <span style={{ fontSize:11, color:'#3370FF', cursor:'pointer' }}>{unread} 条未读</span>}
            </div>
            {mockData.notifications.map(n => (
              <div key={n.id} style={{ display:'flex', gap:12, padding:'12px 16px', borderBottom:'1px solid #F7F8FA', background: n.read ? '#fff' : '#FAFBFF' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background: n.read ? 'transparent' : '#3370FF', marginTop:5, flexShrink:0 }}></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#1F2329', marginBottom:3 }}>{n.title}</div>
                  <div style={{ fontSize:12, color:'#646A73', lineHeight:1.5 }}>{n.message}</div>
                  <div style={{ fontSize:11, color:'#8F959E', marginTop:4 }}>{n.at}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role badge */}
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px', background:cfg.tagBg, border:'none', borderRadius:20, flexShrink:0 }}>
        <div style={{ width:22, height:22, borderRadius:'50%', background:cfg.tagColor, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>{u.avatar}</div>
        <span style={{ fontSize:12, fontWeight:500, color:cfg.tagColor }}>{u.name}</span>
        <span style={{ fontSize:11, color: cfg.tagColor + '99' }}>/ {cfg.label}</span>
      </div>
    </div>
  );
};

// ── Main Layout wrapper ───────────────────────────────────
const Layout = ({ children, pageTitle, back }) => {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <TopBar title={pageTitle} back={back}/>
        <div style={{
          flex:1, overflow:'auto',
          background: '#F7F8FA',
          transition: 'background 0.3s',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Page container ────────────────────────────────────────
const PageWrap = ({ children, style:s={} }) => (
  <div style={{ padding:24, minHeight:'100%', ...s }}>{children}</div>
);

Object.assign(window, { AppContext, Ic, ROLE_CFG, PAGE_LABELS, Layout, PageWrap, NavItem });
