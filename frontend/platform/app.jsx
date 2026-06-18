// Main App — routing + context provider + render
// Reference globals from window to avoid Babel scope issues
const AuthProvider = window.AuthProvider;
const useAuth = window.useAuth;
const LoginPage = window.LoginPage;

// ── Users page (admin) ────────────────────────────────────
const UsersPage = () => {
  const allUsers = [
    { id:1, name:'刘志远', role:'admin',   dept:'教务处管理中心', email:'liuzy@univ.edu.cn',  status:'active', createdAt:'2026-01-01' },
    { id:2, name:'王建国', role:'teacher', dept:'计算机科学学院', email:'wangjg@univ.edu.cn',  status:'active', createdAt:'2026-01-05' },
    { id:3, name:'张明',   role:'student', dept:'软件工程2023级', email:'zhangm@stu.edu.cn',   status:'active', createdAt:'2026-02-10' },
    { id:4, name:'李云',   role:'student', dept:'数据科学2023级', email:'liyun@stu.edu.cn',    status:'active', createdAt:'2026-02-11' },
    { id:5, name:'赵晓',   role:'student', dept:'人工智能2023级', email:'zhaox@stu.edu.cn',    status:'active', createdAt:'2026-02-12' },
    { id:6, name:'陈宇',   role:'student', dept:'计算机科学2022级', email:'chenyu@stu.edu.cn', status:'active', createdAt:'2026-02-13' },
    { id:7, name:'刘洋',   role:'student', dept:'软件工程2023级', email:'liuyang@stu.edu.cn',  status:'active', createdAt:'2026-03-01' },
    { id:8, name:'周静',   role:'student', dept:'计算机科学2023级', email:'zhouj@stu.edu.cn',  status:'active', createdAt:'2026-03-02' },
    { id:10, name:'陈晓梅', role:'teacher', dept:'人工智能学院',  email:'chenxm@univ.edu.cn',  status:'active', createdAt:'2026-01-06' },
    { id:11, name:'李明远', role:'teacher', dept:'信息工程学院',  email:'limy@univ.edu.cn',    status:'active', createdAt:'2026-01-07' },
  ];
  const roleLabels = { admin:'管理员', teacher:'教师', student:'学生' };
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const list = allUsers.filter(u =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (search === '' || u.name.includes(search) || u.email.includes(search))
  );
  return (
    <PageWrap>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <div style={{ display:'flex', gap:4, background:'#fff', border:'1px solid #E5E6E8', borderRadius:8, padding:4 }}>
          {[['all','全部'],['admin','管理员'],['teacher','教师'],['student','学生']].map(([k,l]) => (
            <div key={k} onClick={() => setRoleFilter(k)} style={{ padding:'5px 14px', borderRadius:6, fontSize:13, cursor:'pointer', fontWeight:roleFilter===k?600:400, background:roleFilter===k?'#3370FF':'transparent', color:roleFilter===k?'#fff':'#646A73', transition:'all .15s' }}>{l}</div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, background:'#fff', border:'1px solid #E5E6E8', borderRadius:6, padding:'6px 12px', flex:1 }}>
          <Ic n="search" s={13} c="#8F959E"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索用户姓名或邮箱..." style={{ border:'none', outline:'none', fontSize:13, background:'none', width:'100%', fontFamily:'inherit' }}/>
        </div>
        <Btn icon={<Ic n="plus" s={14} c="#fff"/>}>添加用户</Btn>
      </div>
      <Card style={{ padding:0, overflow:'hidden' }}>
        <Table
          cols={[
            { key:'name', title:'用户', render: (v, row) => (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Avatar name={v} size={32} idx={row.id}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{v}</div>
                  <div style={{ fontSize:11, color:'#8F959E' }}>{row.email}</div>
                </div>
              </div>
            )},
            { key:'role',  title:'角色', render: v => {
              const cfg = { admin:{ bg:'#F0F5FF', c:'#1F2329' }, teacher:{ bg:'#EEF3FF', c:'#3370FF' }, student:{ bg:'#F5F0FF', c:'#7C3AED' } };
              const s = cfg[v] || {};
              return <span style={{ padding:'2px 8px', borderRadius:10, fontSize:12, fontWeight:500, ...s }}>{roleLabels[v]}</span>;
            }},
            { key:'dept',      title:'院系 / 年级' },
            { key:'createdAt', title:'注册时间', render: v => <span style={{ color:'#8F959E' }}>{v}</span> },
            { key:'status', title:'状态', render: v => <Badge label={v==='active'?'正常':'已禁用'} status={v==='active'?'approved':'rejected'}/> },
            { key:'id', title:'操作', render: () => (
              <div style={{ display:'flex', gap:6 }}>
                <Btn size="sm" variant="secondary" icon={<Ic n="edit" s={12} c="#646A73"/>}>编辑</Btn>
              </div>
            )},
          ]}
          rows={list}
        />
      </Card>
    </PageWrap>
  );
};

// ── App with routing ──────────────────────────────────────
const App = () => {
  const [role, setRole] = React.useState('admin');
  const [page, setPage] = React.useState('dashboard');
  const [pageData, setPageData] = React.useState(null);

  // Save state across refreshes
  React.useEffect(() => {
    const saved = localStorage.getItem('cmp_state');
    if (saved) {
      try {
        const { role: r, page: p } = JSON.parse(saved);
        if (r) setRole(r);
        if (p) setPage(p);
      } catch (e) {}
    }
  }, []);
  React.useEffect(() => {
    localStorage.setItem('cmp_state', JSON.stringify({ role, page }));
  }, [role, page]);

  const navigate = (p, data) => {
    setPage(p);
    setPageData(data || null);
  };

  const ctx = { role, setRole, page, navigate, pageData };
  const pageTitle = PAGE_LABELS[page] || '首页';

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard/>;
      case 'competitions':  return <Competitions/>;
      case 'teams':         return <Teams/>;
      case 'approvals':     return <Approvals/>;
      case 'preplans':      return <PrePlans/>;
      case 'aitools':       return <AITools/>;
      case 'stats':         return <Stats/>;
      case 'awards':        return <Awards/>;
      case 'evaluations':   return <Evaluations/>;
      case 'users':         return <UsersPage/>;
      case 'calendar':      return <CalendarPage/>;
      case 'knowledgebase': return <KnowledgeBase/>;
      case 'showcase':      return <ShowcasePage/>;
      default:              return <Dashboard/>;
    }
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <AppContext.Provider value={ctx}>
          <Layout pageTitle={pageTitle}>
            {renderPage()}
          </Layout>
        </AppContext.Provider>
      </ToastProvider>
    </AuthProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
